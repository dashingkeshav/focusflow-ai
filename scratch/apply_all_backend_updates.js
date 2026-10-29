const fs = require('fs');

// 1. Update migrate.js
let mig = fs.readFileSync('backend/src/config/migrate.js', 'utf8').replace(/\r\n/g, '\n');
const migTarget = `    -- Safe forward-only additions\n    ALTER TABLE focus_rooms ADD COLUMN IF NOT EXISTS description text;`;
const migRepl = `    -- Safe forward-only additions\n    ALTER TABLE focus_rooms ADD COLUMN IF NOT EXISTS description text;\n    ALTER TABLE focus_room_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();\n    ALTER TABLE focus_circle_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();\n\n    CREATE INDEX IF NOT EXISTS idx_focus_room_members_presence\n      ON focus_room_members (room_id, presence_status);\n\n    CREATE INDEX IF NOT EXISTS idx_focus_room_members_active_session\n      ON focus_room_members (active_session_id)\n      WHERE active_session_id IS NOT NULL;`;

if (!mig.includes('ALTER TABLE focus_room_members ADD COLUMN IF NOT EXISTS updated_at')) {
  if (mig.includes(migTarget)) {
    mig = mig.replace(migTarget, migRepl);
    fs.writeFileSync('backend/src/config/migrate.js', mig);
    console.log('Successfully updated migrate.js');
  } else {
    console.log('migTarget not found');
  }
}

// 2. Update collaborationController.js
let ctrl = fs.readFileSync('backend/src/controllers/collaborationController.js', 'utf8').replace(/\r\n/g, '\n');

// 2.1 controlRoomTimer
const oldTimerControl = `    if (action === "start") {
      timerStatus = "running";
      timerStartTime = now;
      timerElapsedSeconds = 0;
    } else if (action === "pause") {
      if (timerStatus === "running" && timerStartTime) {
        const added = Math.floor((now.getTime() - new Date(timerStartTime).getTime()) / 1000);
        timerElapsedSeconds += Math.max(0, added);
      }
      timerStatus = "paused";
      timerStartTime = null;
    } else if (action === "resume") {
      timerStatus = "running";
      timerStartTime = now;
    } else if (action === "reset") {
      timerStatus = "idle";
      timerStartTime = null;
      timerElapsedSeconds = 0;
    } else if (action === "complete") {
      timerStatus = "completed";
      timerStartTime = null;
      timerElapsedSeconds = timerDuration;
    } else {
      return res.status(400).json({ success: false, message: "Invalid timer action." });
    }

    const updateRes = await pool.query(
      \`UPDATE focus_rooms
       SET timer_status = $1,
           timer_start_time = $2,
           timer_elapsed_seconds = $3,
           timer_duration_seconds = $4,
           updated_at = now()
       WHERE id = $5
       RETURNING *\`,
      [timerStatus, timerStartTime, timerElapsedSeconds, timerDuration, id]
    );

    const updatedRoom = updateRes.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(\`collab_room:\${id}\`).emit("room_timer_sync", {
        roomId: id,
        timerStatus,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
      });
    }`;

const newTimerControl = `    if (action === "start") {
      timerStatus = "running";
      timerStartTime = now;
      timerElapsedSeconds = 0;

      // Automatically provision/link authentic Session records for all active room members
      try {
        const activeMembers = await pool.query(
          \`SELECT user_id, active_session_id FROM focus_room_members WHERE room_id = $1 AND left_at IS NULL\`,
          [id]
        );
        for (const m of activeMembers.rows) {
          try {
            const memberSession = await Session.create({
              userId: m.user_id,
              title: \`Focus Room: \${room.title}\`,
              plannedDurationSeconds: timerDuration,
              startTime: now,
              status: "active",
            });
            await pool.query(
              \`UPDATE focus_room_members SET active_session_id = $1 WHERE room_id = $2 AND user_id = $3\`,
              [memberSession.id, id, m.user_id]
            );
          } catch (mErr) {
            console.warn("Could not create member session:", mErr.message);
          }
        }
      } catch (memErr) {
        console.warn("Failed querying active room members:", memErr.message);
      }
    } else if (action === "pause") {
      if (timerStatus === "running" && timerStartTime) {
        const added = Math.floor((now.getTime() - new Date(timerStartTime).getTime()) / 1000);
        timerElapsedSeconds += Math.max(0, added);
      }
      timerStatus = "paused";
      timerStartTime = null;
    } else if (action === "resume") {
      timerStatus = "running";
      timerStartTime = now;
    } else if (action === "reset") {
      timerStatus = "idle";
      timerStartTime = null;
      timerElapsedSeconds = 0;
    } else if (action === "complete") {
      timerStatus = "completed";
      timerStartTime = null;
      timerElapsedSeconds = timerDuration;

      // Complete sessions for all active room members
      try {
        const activeMembers = await pool.query(
          \`SELECT user_id, active_session_id FROM focus_room_members WHERE room_id = $1 AND left_at IS NULL\`,
          [id]
        );
        for (const m of activeMembers.rows) {
          if (m.active_session_id) {
            try {
              await Session.findOneAndUpdate(
                { id: m.active_session_id, userId: m.user_id },
                { status: "completed", endTime: now, durationSeconds: timerDuration }
              );
              await pool.query(
                \`UPDATE focus_room_members SET active_session_id = NULL WHERE room_id = $1 AND user_id = $2\`,
                [id, m.user_id]
              );
            } catch (cErr) {
              console.warn("Could not complete member session:", cErr.message);
            }
          }
        }
      } catch (compErr) {
        console.warn("Failed completing member sessions:", compErr.message);
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid timer action." });
    }

    const updateRes = await pool.query(
      \`UPDATE focus_rooms
       SET timer_status = $1,
           timer_start_time = $2,
           timer_elapsed_seconds = $3,
           timer_duration_seconds = $4,
           updated_at = now()
       WHERE id = $5
       RETURNING *\`,
      [timerStatus, timerStartTime, timerElapsedSeconds, timerDuration, id]
    );

    const updatedRoom = updateRes.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(\`collab_room:\${id}\`).emit("room_timer_sync", {
        roomId: id,
        timerStatus,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
        taskTitle: room.title,
      });

      io.to(\`collab_room:\${id}\`).emit("room_session_state", {
        roomId: id,
        status: timerStatus,
        action,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
      });
    }`;

if (ctrl.includes(oldTimerControl)) {
  ctrl = ctrl.replace(oldTimerControl, newTimerControl);
  console.log('Replaced timer control in controller');
} else {
  console.log('oldTimerControl not found');
}

// 2.2 acceptCircleInvite
const oldAccept = `    // Notify circle owner
    const io = req.app.get("io");
    await createNotification({
      userId: circle.owner_user_id,
      title: "New Circle Member",
      message: \`\${req.user.name || "A new member"} has joined \${circle.name}.\`,
      type: "success",
      link: \`/dashboard/focus-circles\`,
      io,
    }).catch(() => {});

    return res.json({ success: true, message: "Joined Circle successfully.", circleId: circle.id });`;

const newAccept = `    // Notify circle owner and broadcast to circle
    const io = req.app.get("io");
    if (io) {
      io.to(\`collab_circle:\${circle.id}\`).emit("circle_member_joined", {
        circleId: circle.id,
        userId,
        name: req.user.name,
      });
    }

    await createNotification({
      userId: circle.owner_user_id,
      title: "New Circle Member",
      message: \`\${req.user.name || "A new member"} has joined \${circle.name}.\`,
      type: "success",
      link: \`/dashboard/focus-circles\`,
      io,
    }).catch(() => {});

    return res.json({ success: true, message: "Joined Circle successfully.", circleId: circle.id });`;

if (ctrl.includes(oldAccept)) {
  ctrl = ctrl.replace(oldAccept, newAccept);
  console.log('Replaced acceptCircleInvite in controller');
} else {
  console.log('oldAccept not found');
}

// 2.3 setCircleCommitment
const oldCommit = `    return res.json({ success: true, commitment: result.rows[0] });
  } catch (error) {
    console.error("setCircleCommitment error:", error.message);`;

const newCommit = `    const io = req.app.get("io");
    if (io) {
      io.to(\`collab_circle:\${id}\`).emit("circle_commitment_updated", {
        circleId: id,
        userId,
        week,
        year,
      });
    }

    return res.json({ success: true, commitment: result.rows[0] });
  } catch (error) {
    console.error("setCircleCommitment error:", error.message);`;

if (ctrl.includes(oldCommit)) {
  ctrl = ctrl.replace(oldCommit, newCommit);
  console.log('Replaced setCircleCommitment in controller');
} else {
  console.log('oldCommit not found');
}

// 2.4 checkInCircleCommitment
const oldCheckIn = `    return res.json({ success: true, commitment: result.rows[0] });
  } catch (error) {
    console.error("checkInCircleCommitment error:", error.message);`;

const newCheckIn = `    const io = req.app.get("io");
    if (io) {
      io.to(\`collab_circle:\${id}\`).emit("circle_checkin_updated", {
        circleId: id,
        userId,
        week,
        year,
      });
    }

    return res.json({ success: true, commitment: result.rows[0] });
  } catch (error) {
    console.error("checkInCircleCommitment error:", error.message);`;

if (ctrl.includes(oldCheckIn)) {
  ctrl = ctrl.replace(oldCheckIn, newCheckIn);
  console.log('Replaced checkInCircleCommitment in controller');
} else {
  console.log('oldCheckIn not found');
}

// 2.5 removeCircleMember
const oldRemove = `    await pool.query(
      \`UPDATE focus_circle_members SET status = 'left' WHERE circle_id = $1 AND user_id = $2\`,
      [id, memberUserId]
    );

    return res.json({ success: true, message: isSelf ? "Left circle." : "Member removed." });`;

const newRemove = `    await pool.query(
      \`UPDATE focus_circle_members SET status = 'left' WHERE circle_id = $1 AND user_id = $2\`,
      [id, memberUserId]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(\`collab_circle:\${id}\`).emit("circle_member_left", {
        circleId: id,
        memberUserId,
      });
    }

    return res.json({ success: true, message: isSelf ? "Left circle." : "Member removed." });`;

if (ctrl.includes(oldRemove)) {
  ctrl = ctrl.replace(oldRemove, newRemove);
  console.log('Replaced removeCircleMember in controller');
} else {
  console.log('oldRemove not found');
}

fs.writeFileSync('backend/src/controllers/collaborationController.js', ctrl);
console.log('Finished updating backend/src/controllers/collaborationController.js');

