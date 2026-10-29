const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `      if (action === "start") {
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
      }

      await pool.query(
        \`UPDATE focus_rooms
         SET timer_status = $1, timer_start_time = $2, timer_elapsed_seconds = $3, timer_duration_seconds = $4, updated_at = now()
         WHERE id = $5\`,
        [timerStatus, timerStartTime, timerElapsedSeconds, timerDuration, roomId]
      );

      io.to(\`collab_room:\${roomId}\`).emit("room_timer_sync", {
        roomId,
        timerStatus,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
      });`;

const replacement = `      if (action === "start") {
        timerStatus = "running";
        timerStartTime = now;
        timerElapsedSeconds = 0;

        try {
          const activeMembers = await pool.query(
            \`SELECT user_id, active_session_id FROM focus_room_members WHERE room_id = $1 AND left_at IS NULL\`,
            [roomId]
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
                [memberSession.id, roomId, m.user_id]
              );
            } catch (mErr) {
              console.warn("Could not create member session via socket:", mErr.message);
            }
          }
        } catch (_) {}
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

        try {
          const activeMembers = await pool.query(
            \`SELECT user_id, active_session_id FROM focus_room_members WHERE room_id = $1 AND left_at IS NULL\`,
            [roomId]
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
                  [roomId, m.user_id]
                );
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      await pool.query(
        \`UPDATE focus_rooms
         SET timer_status = $1, timer_start_time = $2, timer_elapsed_seconds = $3, timer_duration_seconds = $4, updated_at = now()
         WHERE id = $5\`,
        [timerStatus, timerStartTime, timerElapsedSeconds, timerDuration, roomId]
      );

      io.to(\`collab_room:\${roomId}\`).emit("room_timer_sync", {
        roomId,
        timerStatus,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
        taskTitle: room.title,
      });

      io.to(\`collab_room:\${roomId}\`).emit("room_session_state", {
        roomId,
        status: timerStatus,
        action,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
      });`;

const normalizedCode = code.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedCode.includes(normalizedTarget)) {
  const updated = normalizedCode.replace(normalizedTarget, replacement);
  fs.writeFileSync('backend/server.js', updated);
  console.log('Successfully updated backend/server.js');
} else {
  console.log('Target not found in backend/server.js');
}

