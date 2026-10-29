
function sanitizeCollabCode(raw) {
  if (!raw) return "";
  const match = String(raw).match(/((?:fc|rm)-[a-f0-9]+)/i);
  if (match) return match[1].toLowerCase();
  return String(raw).replace(/^.*[?&](?:join|code)=/, '').replace(/^#/, '').trim();
}
const crypto = require("crypto");
const { pool } = require("../config/db");
const Session = require("../models/Session");
const { createNotification } = require("../utils/notificationService");
const socketHub = require("../utils/socketHub");
const {
  checkRoomHostingLimit,
  checkCircleCreationLimit,
  checkCircleMemberCapacity,
  checkPodCreationLimit,
  checkPodMemberCapacity,
  checkUnblockRequestLimit,
} = require("../utils/entitlements");

function generateSecureCode(prefix = "") {
  return (prefix ? prefix + "-" : "") + crypto.randomBytes(4).toString("hex");
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

/*
=====================================================
1. FOCUS ROOMS CONTROLLERS
=====================================================
*/

exports.listRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, category, filter = "all" } = req.query;

    const params = [userId];
    let query = `
      SELECT r.*,
             u.name AS host_name,
             u.email AS host_email,
             COUNT(m.id) FILTER (WHERE m.left_at IS NULL)::int AS participant_count,
             EXISTS(
               SELECT 1 FROM focus_room_members rm
               WHERE rm.room_id = r.id AND rm.user_id = $1 AND rm.left_at IS NULL
             ) AS is_member
      FROM focus_rooms r
      JOIN users u ON u.id = r.host_user_id
      LEFT JOIN focus_room_members m ON m.room_id = r.id
      WHERE (
        r.is_public = true
        OR r.host_user_id = $1
        OR EXISTS (
          SELECT 1 FROM focus_room_members rm
          WHERE rm.room_id = r.id AND rm.user_id = $1 AND rm.left_at IS NULL
        )
      )
      AND r.status <> 'ended' AND r.title NOT LIKE 'QA %' AND r.title NOT LIKE 'Autonomous QA %'
    `;

    if (filter === "my") {
      query += ` AND (r.host_user_id = $1 OR EXISTS (SELECT 1 FROM focus_room_members rm WHERE rm.room_id = r.id AND rm.user_id = $1 AND rm.left_at IS NULL))`;
    } else if (filter === "active") {
      query += ` AND r.timer_status = 'running'`;
    } else if (filter === "discover") {
      query += ` AND r.is_public = true AND r.status = 'open'`;
    }

    if (category && category !== "all") {
      params.push(category);
      query += ` AND r.category = $${params.length}`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      query += ` AND r.title ILIKE $${params.length}`;
    }

    query += `
      GROUP BY r.id, u.id
      ORDER BY r.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, rooms: result.rows });
  } catch (error) {
    console.error("listRooms error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to list focus rooms." });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description = null,
      category = "general",
      isPublic = false,
      maxParticipants = 4,
      durationSeconds = 1500,
      podId = null,
      taskId = null,
      helpRequestId = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Room title is required." });
    }

    const hostCheck = await checkRoomHostingLimit(userId, maxParticipants);
    if (!hostCheck.allowed) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: hostCheck.message,
        limit: hostCheck.limit,
        upgradeUrl: hostCheck.upgradeUrl,
      });
    }

    const inviteCode = generateSecureCode("rm");
    const safeDuration = Math.max(300, Math.min(14400, Number(durationSeconds) || 1500));
    const safeMax = Math.min(hostCheck.limit, Math.max(2, Number(maxParticipants) || 4));

    const insertResult = await pool.query(
      `INSERT INTO focus_rooms (
        host_user_id, title, description, category, is_public, max_participants,
        invite_code, status, timer_status, timer_duration_seconds,
        pod_id, task_id, help_request_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', 'idle', $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        title.trim().slice(0, 255),
        description ? description.trim() : null,
        category.trim().slice(0, 64),
        Boolean(isPublic),
        safeMax,
        inviteCode,
        safeDuration,
        podId || null,
        taskId || null,
        helpRequestId || null,
      ]
    );

    const room = insertResult.rows[0];

    // Automatically join host as member
    await pool.query(
      `INSERT INTO focus_room_members (room_id, user_id, role, presence_status)
       VALUES ($1, $2, 'host', 'online')`,
      [room.id, userId]
    );

    return res.status(201).json({ success: true, room });
  } catch (error) {
    console.error("createRoom error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create focus room." });
  }
};

exports.getRoomByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: "Invite code is required." });
    }

    const result = await pool.query(
      `SELECT r.*,
              u.name AS host_name,
              COUNT(m.id) FILTER (WHERE m.left_at IS NULL)::int AS participant_count
       FROM focus_rooms r
       JOIN users u ON u.id = r.host_user_id
       LEFT JOIN focus_room_members m ON m.room_id = r.id
       WHERE r.invite_code = $1
       GROUP BY r.id, u.id`,
      [cleanCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found with this code." });
    }

    return res.json({ success: true, room: result.rows[0] });
  } catch (error) {
    console.error("getRoomByCode error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to find room." });
  }
};

exports.getRoomDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const roomRes = await pool.query(
      `SELECT r.*,
              u.name AS host_name,
              u.email AS host_email
       FROM focus_rooms r
       JOIN users u ON u.id = r.host_user_id
       WHERE r.id = $1`,
      [id]
    );

    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found." });
    }

    const room = roomRes.rows[0];

    // Membership check: public OR user is host OR user is member
    const memberRes = await pool.query(
      `SELECT m.*, u.name, u.email
       FROM focus_room_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.room_id = $1 AND m.left_at IS NULL
       ORDER BY m.role DESC, m.joined_at ASC`,
      [id]
    );

    const isMember = memberRes.rows.some((m) => m.user_id === userId);
    if (!room.is_public && room.host_user_id !== userId && !isMember) {
      return res.status(403).json({ success: false, message: "Private room. You must join with an invite code." });
    }

    return res.json({
      success: true,
      room,
      participants: memberRes.rows,
      isHost: room.host_user_id === userId,
      isMember,
    });
  } catch (error) {
    console.error("getRoomDetails error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load room details." });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { inviteCode } = req.body;
    const cleanInviteCode = sanitizeCollabCode(inviteCode);

    const roomRes = await pool.query(`SELECT * FROM focus_rooms WHERE id = $1`, [id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found." });
    }

    const room = roomRes.rows[0];

    if (room.status === "ended") {
      return res.status(400).json({ success: false, message: "This focus room has ended." });
    }

    if (room.status === "locked" && room.host_user_id !== userId) {
      return res.status(403).json({ success: false, message: "This room is currently locked by the host." });
    }

    // Verify private access
    if (!room.is_public && room.host_user_id !== userId) {
      if (!inviteCode || inviteCode.trim() !== room.invite_code) {
        // Check if already an existing member
        const existing = await pool.query(
          `SELECT 1 FROM focus_room_members WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
          [id, userId]
        );
        if (existing.rows.length === 0) {
          return res.status(403).json({ success: false, message: "Valid invite code required for private rooms." });
        }
      }
    }

    // Capacity check
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM focus_room_members WHERE room_id = $1 AND left_at IS NULL AND user_id <> $2`,
      [id, userId]
    );
    const activeOthers = countRes.rows[0]?.count || 0;

    if (activeOthers >= room.max_participants) {
      return res.status(400).json({ success: false, message: "Focus room is at maximum capacity." });
    }

    // Upsert membership
    await pool.query(
      `INSERT INTO focus_room_members (room_id, user_id, role, presence_status, left_at, joined_at)
       VALUES ($1, $2, 'member', 'online', NULL, now())
       ON CONFLICT (room_id, user_id)
       DO UPDATE SET left_at = NULL, presence_status = 'online', updated_at = now()`,
      [id, userId]
    );

    // Socket notification
    const io = req.app.get("io");
    if (io) {
      io.to(`collab_room:${id}`).emit("room_presence_update", {
        roomId: id,
        userId,
        action: "joined",
      });
    }

    return res.json({ success: true, message: "Joined focus room successfully." });
  } catch (error) {
    console.error("joinRoom error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to join room." });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      `UPDATE focus_room_members
       SET left_at = now(), presence_status = 'offline'
       WHERE room_id = $1 AND user_id = $2`,
      [id, userId]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`collab_room:${id}`).emit("room_presence_update", {
        roomId: id,
        userId,
        action: "left",
      });
    }

    return res.json({ success: true, message: "Left focus room." });
  } catch (error) {
    console.error("leaveRoom error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to leave room." });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, category, status, isPublic } = req.body;

    const roomRes = await pool.query(`SELECT * FROM focus_rooms WHERE id = $1`, [id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found." });
    }

    const room = roomRes.rows[0];
    if (room.host_user_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the host can modify room settings." });
    }

    const updates = [];
    const values = [id];

    if (title && title.trim()) {
      values.push(title.trim().slice(0, 255));
      updates.push(`title = $${values.length}`);
    }
    if (category) {
      values.push(category.trim().slice(0, 64));
      updates.push(`category = $${values.length}`);
    }
    if (status && ["open", "locked", "ended"].includes(status)) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    if (typeof isPublic === "boolean") {
      values.push(isPublic);
      updates.push(`is_public = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.json({ success: true, room });
    }

    updates.push("updated_at = now()");

    const result = await pool.query(
      `UPDATE focus_rooms SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      values
    );

    return res.json({ success: true, room: result.rows[0] });
  } catch (error) {
    console.error("updateRoom error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update room." });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const hostId = req.user.id;
    const { id } = req.params;
    const { memberUserId } = req.body;

    const roomRes = await pool.query(`SELECT * FROM focus_rooms WHERE id = $1`, [id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found." });
    }

    const room = roomRes.rows[0];
    if (room.host_user_id !== hostId) {
      return res.status(403).json({ success: false, message: "Only the host can remove participants." });
    }

    if (memberUserId === hostId) {
      return res.status(400).json({ success: false, message: "Host cannot remove themselves. End the room instead." });
    }

    await pool.query(
      `UPDATE focus_room_members
       SET left_at = now(), presence_status = 'offline'
       WHERE room_id = $1 AND user_id = $2`,
      [id, memberUserId]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`collab_room:${id}`).emit("room_presence_update", {
        roomId: id,
        userId: memberUserId,
        action: "removed",
      });
    }

    return res.json({ success: true, message: "Participant removed." });
  } catch (error) {
    console.error("removeMember error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove member." });
  }
};

exports.controlRoomTimer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { action, durationSeconds } = req.body;

    const roomRes = await pool.query(`SELECT * FROM focus_rooms WHERE id = $1`, [id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found." });
    }

    const room = roomRes.rows[0];
    if (room.host_user_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the room host can control the shared timer." });
    }

    let timerStatus = room.timer_status;
    let timerStartTime = room.timer_start_time;
    let timerElapsedSeconds = Number(room.timer_elapsed_seconds) || 0;
    let timerDuration = Number(durationSeconds) || Number(room.timer_duration_seconds) || 1500;

    const now = new Date();

    if (action === "start") {
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
      `UPDATE focus_rooms
       SET timer_status = $1,
           timer_start_time = $2,
           timer_elapsed_seconds = $3,
           timer_duration_seconds = $4,
           updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [timerStatus, timerStartTime, timerElapsedSeconds, timerDuration, id]
    );

    const updatedRoom = updateRes.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(`collab_room:${id}`).emit("room_timer_sync", {
        roomId: id,
        timerStatus,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
      });
    }

    return res.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error("controlRoomTimer error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to control timer." });
  }
};

exports.startRoomSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const roomRes = await pool.query(`SELECT * FROM focus_rooms WHERE id = $1`, [id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found." });
    }
    const room = roomRes.rows[0];

    // Use existing Session model to initiate authentic personal session
    const session = await Session.create({
      userId,
      title: `Focus Room: ${room.title}`,
      plannedDurationSeconds: room.timer_duration_seconds || 1500,
      startTime: new Date(),
      status: "active",
    });

    // Link session to room member record
    await pool.query(
      `UPDATE focus_room_members
       SET active_session_id = $1
       WHERE room_id = $2 AND user_id = $3`,
      [session.id, id, userId]
    );

    return res.status(201).json({ success: true, session });
  } catch (error) {
    console.error("startRoomSession error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to start room focus session." });
  }
};

exports.completeRoomSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const memberRes = await pool.query(
      `SELECT active_session_id FROM focus_room_members WHERE room_id = $1 AND user_id = $2`,
      [id, userId]
    );

    const activeSessionId = memberRes.rows[0]?.active_session_id;
    if (activeSessionId) {
      await Session.findOneAndUpdate(
        { id: activeSessionId, userId },
        { status: "completed", endTime: new Date() }
      );
      await pool.query(
        `UPDATE focus_room_members SET active_session_id = NULL WHERE room_id = $1 AND user_id = $2`,
        [id, userId]
      );
    }

    return res.json({ success: true, message: "Personal focus session saved." });
  } catch (error) {
    console.error("completeRoomSession error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to complete room session." });
  }
};

/*
=====================================================
2. FOCUS CIRCLES CONTROLLERS
=====================================================
*/

exports.listCircles = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT c.*,
              u.name AS owner_name,
              cm.role AS user_role,
              COUNT(m.id)::int AS member_count
       FROM focus_circles c
       JOIN users u ON u.id = c.owner_user_id
       JOIN focus_circle_members cm ON cm.circle_id = c.id AND cm.user_id = $1 AND cm.status = 'active'
       LEFT JOIN focus_circle_members m ON m.circle_id = c.id AND m.status = 'active'
       WHERE c.status = 'active'
       GROUP BY c.id, u.id, cm.role
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return res.json({ success: true, circles: result.rows });
  } catch (error) {
    console.error("listCircles error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to list circles." });
  }
};

exports.createCircle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, category = "general" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Circle name is required." });
    }

    const check = await checkCircleCreationLimit(userId);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: check.message,
        limit: check.limit,
        upgradeUrl: check.upgradeUrl,
      });
    }

    const inviteCode = generateSecureCode("fc");

    const circleRes = await pool.query(
      `INSERT INTO focus_circles (owner_user_id, name, description, category, max_members, invite_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        name.trim().slice(0, 255),
        description ? description.trim() : null,
        category.trim().slice(0, 64),
        check.maxMembers,
        inviteCode,
      ]
    );

    const circle = circleRes.rows[0];

    // Add owner as active member
    await pool.query(
      `INSERT INTO focus_circle_members (circle_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [circle.id, userId]
    );

    return res.status(201).json({ success: true, circle });
  } catch (error) {
    console.error("createCircle error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create circle." });
  }
};

exports.getCircleByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT c.*,
              u.name AS owner_name,
              COUNT(m.id)::int AS member_count
       FROM focus_circles c
       JOIN users u ON u.id = c.owner_user_id
       LEFT JOIN focus_circle_members m ON m.circle_id = c.id AND m.status = 'active'
       WHERE c.invite_code = $1 AND c.status = 'active'
       GROUP BY c.id, u.id`,
      [cleanCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus Circle not found." });
    }

    return res.json({ success: true, circle: result.rows[0] });
  } catch (error) {
    console.error("getCircleByCode error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to find circle." });
  }
};

exports.acceptCircleInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.params;

    const circleRes = await pool.query(
      `SELECT * FROM focus_circles WHERE invite_code = $1 AND status = 'active'`,
      [code.trim()]
    );

    if (circleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus Circle not found or closed." });
    }

    const circle = circleRes.rows[0];

    // Check existing active membership
    const existing = await pool.query(
      `SELECT * FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2`,
      [circle.id, userId]
    );

    if (existing.rows.length > 0 && existing.rows[0].status === "active") {
      return res.json({ success: true, message: "Already a member.", circleId: circle.id });
    }

    // Capacity check based on circle owner's entitlement
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM focus_circle_members WHERE circle_id = $1 AND status = 'active'`,
      [circle.id]
    );
    const currentCount = countRes.rows[0]?.count || 0;

    const capCheck = await checkCircleMemberCapacity(circle.owner_user_id, currentCount);
    if (!capCheck.allowed) {
      return res.status(400).json({ success: false, message: capCheck.message });
    }

    await pool.query(
      `INSERT INTO focus_circle_members (circle_id, user_id, role, status)
       VALUES ($1, $2, 'member', 'active')
       ON CONFLICT (circle_id, user_id)
       DO UPDATE SET status = 'active', joined_at = now()`,
      [circle.id, userId]
    );

    // Notify circle owner
    const io = req.app.get("io");
    await createNotification({
      userId: circle.owner_user_id,
      title: "New Circle Member",
      message: `${req.user.name || "A new member"} has joined ${circle.name}.`,
      type: "success",
      link: `/dashboard/focus-circles`,
      io,
    }).catch(() => {});

    return res.json({ success: true, message: "Joined Circle successfully.", circleId: circle.id });
  } catch (error) {
    console.error("acceptCircleInvite error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to join circle." });
  }
};

exports.getCircleDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const circleRes = await pool.query(
      `SELECT c.*, u.name AS owner_name
       FROM focus_circles c
       JOIN users u ON u.id = c.owner_user_id
       WHERE c.id = $1`,
      [id]
    );

    if (circleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus Circle not found." });
    }

    const circle = circleRes.rows[0];

    // Membership verification
    const memberCheck = await pool.query(
      `SELECT role FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );

    if (memberCheck.rows.length === 0 && circle.owner_user_id !== userId) {
      return res.status(403).json({ success: false, message: "You are not a member of this Circle." });
    }

    const membersRes = await pool.query(
      `SELECT m.*, u.name, u.email,
              (
                SELECT COUNT(*)::int
                FROM focus_circle_commitments fcc
                WHERE fcc.circle_id = m.circle_id AND fcc.user_id = m.user_id AND fcc.is_completed = true
              ) AS completed_checkins
       FROM focus_circle_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.circle_id = $1 AND m.status = 'active'
       ORDER BY m.role DESC, m.joined_at ASC`,
      [id]
    );

    // Get current week's commitments
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    const commitRes = await pool.query(
      `SELECT fcc.*, u.name AS user_name
       FROM focus_circle_commitments fcc
       JOIN users u ON u.id = fcc.user_id
       WHERE fcc.circle_id = $1 AND fcc.week_number = $2 AND fcc.year = $3`,
      [id, currentWeek, currentYear]
    );

    return res.json({
      success: true,
      circle,
      members: membersRes.rows,
      commitments: commitRes.rows,
      currentWeek,
      currentYear,
      userRole: memberCheck.rows[0]?.role || (circle.owner_user_id === userId ? "owner" : null),
    });
  } catch (error) {
    console.error("getCircleDetails error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load Circle details." });
  }
};

exports.setCircleCommitment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { commitment } = req.body;

    if (!commitment || !commitment.trim()) {
      return res.status(400).json({ success: false, message: "Commitment text is required." });
    }

    const memberCheck = await pool.query(
      `SELECT 1 FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Must be an active Circle member to set commitments." });
    }

    const now = new Date();
    const week = getWeekNumber(now);
    const year = now.getFullYear();

    const result = await pool.query(
      `INSERT INTO focus_circle_commitments (circle_id, user_id, week_number, year, commitment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (circle_id, user_id, week_number, year)
       DO UPDATE SET commitment = $5, updated_at = now()
       RETURNING *`,
      [id, userId, week, year, commitment.trim()]
    );

    return res.json({ success: true, commitment: result.rows[0] });
  } catch (error) {
    console.error("setCircleCommitment error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to set commitment." });
  }
};

exports.checkInCircleCommitment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { completionNote } = req.body;

    const now = new Date();
    const week = getWeekNumber(now);
    const year = now.getFullYear();

    const result = await pool.query(
      `UPDATE focus_circle_commitments
       SET is_completed = true,
           completion_note = $1,
           checked_in_at = now(),
           updated_at = now()
       WHERE circle_id = $2 AND user_id = $3 AND week_number = $4 AND year = $5
       RETURNING *`,
      [completionNote ? completionNote.trim() : null, id, userId, week, year]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No active commitment found for this week to check in." });
    }

    return res.json({ success: true, commitment: result.rows[0] });
  } catch (error) {
    console.error("checkInCircleCommitment error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to check in." });
  }
};

exports.removeCircleMember = async (req, res) => {
  try {
    const actorId = req.user.id;
    const { id } = req.params;
    const { memberUserId } = req.body;

    const circleRes = await pool.query(`SELECT * FROM focus_circles WHERE id = $1`, [id]);
    if (circleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Circle not found." });
    }

    const circle = circleRes.rows[0];
    const isOwner = circle.owner_user_id === actorId;
    const isSelf = memberUserId === actorId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    if (isOwner && isSelf) {
      return res.status(400).json({ success: false, message: "Owner cannot leave. Archive the circle instead." });
    }

    await pool.query(
      `UPDATE focus_circle_members SET status = 'left' WHERE circle_id = $1 AND user_id = $2`,
      [id, memberUserId]
    );

    return res.json({ success: true, message: isSelf ? "Left circle." : "Member removed." });
  } catch (error) {
    console.error("removeCircleMember error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove member." });
  }
};

/*
=====================================================
3. PROJECT PODS CONTROLLERS
=====================================================
*/

exports.listPods = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT p.*,
              u.name AS owner_name,
              pm.role AS user_role,
              COUNT(DISTINCT m.id)::int AS member_count,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done')::int AS completed_task_count,
              COUNT(DISTINCT t.id) FILTER (WHERE t.is_blocked = true OR t.status = 'blocked')::int AS blocked_task_count
       FROM project_pods p
       JOIN users u ON u.id = p.owner_user_id
       JOIN project_pod_members pm ON pm.pod_id = p.id AND pm.user_id = $1 AND pm.status = 'active'
       LEFT JOIN project_pod_members m ON m.pod_id = p.id AND m.status = 'active'
       LEFT JOIN project_pod_tasks t ON t.pod_id = p.id
       WHERE p.status <> 'archived'
       GROUP BY p.id, u.id, pm.role
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return res.json({ success: true, pods: result.rows });
  } catch (error) {
    console.error("listPods error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to list pods." });
  }
};

exports.createPod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Project Pod name is required." });
    }

    const check = await checkPodCreationLimit(userId);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: check.message,
        limit: check.limit,
        upgradeUrl: check.upgradeUrl,
      });
    }

    const inviteCode = generateSecureCode("pod");

    const podRes = await pool.query(
      `INSERT INTO project_pods (owner_user_id, name, description, max_members, invite_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name.trim().slice(0, 255), description ? description.trim() : null, check.maxMembers, inviteCode]
    );

    const pod = podRes.rows[0];

    // Add owner
    await pool.query(
      `INSERT INTO project_pod_members (pod_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [pod.id, userId]
    );

    // Record activity
    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, 'pod_created', $3)`,
      [pod.id, userId, JSON.stringify({ name: pod.name })]
    );

    return res.status(201).json({ success: true, pod });
  } catch (error) {
    console.error("createPod error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create Project Pod." });
  }
};

exports.getPodByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT p.*,
              u.name AS owner_name,
              COUNT(m.id)::int AS member_count
       FROM project_pods p
       JOIN users u ON u.id = p.owner_user_id
       LEFT JOIN project_pod_members m ON m.pod_id = p.id AND m.status = 'active'
       WHERE p.invite_code = $1 AND p.status <> 'archived'
       GROUP BY p.id, u.id`,
      [code.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project Pod not found." });
    }

    return res.json({ success: true, pod: result.rows[0] });
  } catch (error) {
    console.error("getPodByCode error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to find pod." });
  }
};

exports.acceptPodInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.params;

    const podRes = await pool.query(
      `SELECT * FROM project_pods WHERE invite_code = $1 AND status <> 'archived'`,
      [code.trim()]
    );

    if (podRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project Pod not found or archived." });
    }

    const pod = podRes.rows[0];

    const existing = await pool.query(
      `SELECT * FROM project_pod_members WHERE pod_id = $1 AND user_id = $2`,
      [pod.id, userId]
    );

    if (existing.rows.length > 0 && existing.rows[0].status === "active") {
      return res.json({ success: true, message: "Already a member.", podId: pod.id });
    }

    // Capacity check based on pod owner's plan
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM project_pod_members WHERE pod_id = $1 AND status = 'active'`,
      [pod.id]
    );
    const currentCount = countRes.rows[0]?.count || 0;

    const capCheck = await checkPodMemberCapacity(pod.owner_user_id, currentCount);
    if (!capCheck.allowed) {
      return res.status(400).json({ success: false, message: capCheck.message });
    }

    await pool.query(
      `INSERT INTO project_pod_members (pod_id, user_id, role, status)
       VALUES ($1, $2, 'member', 'active')
       ON CONFLICT (pod_id, user_id)
       DO UPDATE SET status = 'active', joined_at = now()`,
      [pod.id, userId]
    );

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, 'member_joined', $3)`,
      [pod.id, userId, JSON.stringify({ userName: req.user.name })]
    );

    return res.json({ success: true, message: "Joined Project Pod successfully.", podId: pod.id });
  } catch (error) {
    console.error("acceptPodInvite error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to join Project Pod." });
  }
};

exports.getPodDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const podRes = await pool.query(
      `SELECT p.*, u.name AS owner_name
       FROM project_pods p
       JOIN users u ON u.id = p.owner_user_id
       WHERE p.id = $1`,
      [id]
    );

    if (podRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project Pod not found." });
    }

    const pod = podRes.rows[0];

    const memberCheck = await pool.query(
      `SELECT role FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );

    if (memberCheck.rows.length === 0 && pod.owner_user_id !== userId) {
      return res.status(403).json({ success: false, message: "You are not a member of this Project Pod." });
    }

    const membersRes = await pool.query(
      `SELECT pm.*, u.name, u.email
       FROM project_pod_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.pod_id = $1 AND pm.status = 'active'
       ORDER BY pm.role DESC, pm.joined_at ASC`,
      [id]
    );

    const milestonesRes = await pool.query(
      `SELECT * FROM project_pod_milestones WHERE pod_id = $1 ORDER BY due_date ASC NULLS LAST, created_at ASC`,
      [id]
    );

    const tasksRes = await pool.query(
      `SELECT t.*, u.name AS assigned_user_name, c.name AS created_user_name
       FROM project_pod_tasks t
       LEFT JOIN users u ON u.id = t.assigned_to_user_id
       LEFT JOIN users c ON c.id = t.created_by_user_id
       WHERE t.pod_id = $1
       ORDER BY t.created_at DESC`,
      [id]
    );

    const activitiesRes = await pool.query(
      `SELECT a.*, u.name AS user_name
       FROM project_pod_activities a
       JOIN users u ON u.id = a.user_id
       WHERE a.pod_id = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [id]
    );

    return res.json({
      success: true,
      pod,
      members: membersRes.rows,
      milestones: milestonesRes.rows,
      tasks: tasksRes.rows,
      activities: activitiesRes.rows,
      userRole: memberCheck.rows[0]?.role || (pod.owner_user_id === userId ? "owner" : null),
    });
  } catch (error) {
    console.error("getPodDetails error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load pod details." });
  }
};

exports.createPodMilestone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Milestone title is required." });
    }

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    const result = await pool.query(
      `INSERT INTO project_pod_milestones (pod_id, title, description, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, title.trim().slice(0, 255), description ? description.trim() : null, dueDate || null]
    );

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, 'milestone_created', $3)`,
      [id, userId, JSON.stringify({ title: result.rows[0].title })]
    );

    return res.status(201).json({ success: true, milestone: result.rows[0] });
  } catch (error) {
    console.error("createPodMilestone error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create milestone." });
  }
};

exports.createPodTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      title,
      description,
      milestoneId = null,
      assignedToUserId = null,
      priority = "medium",
      status = "todo",
      dueDate = null,
      notes = null,
      linkUrl = null,
      isBlocked = false,
      blockerReason = null,
      personalTaskId = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required." });
    }

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Must be a Pod member to add tasks." });
    }

    // Assignee verification if assigned
    if (assignedToUserId) {
      const assignCheck = await pool.query(
        `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
        [id, assignedToUserId]
      );
      if (assignCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: "Assignee must be a member of this Pod." });
      }
    }

    const result = await pool.query(
      `INSERT INTO project_pod_tasks (
        pod_id, milestone_id, title, description, assigned_to_user_id,
        priority, status, due_date, notes, link_url, is_blocked,
        blocker_reason, personal_task_id, created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        milestoneId || null,
        title.trim().slice(0, 255),
        description ? description.trim() : null,
        assignedToUserId || null,
        ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
        ["todo", "in_progress", "blocked", "done"].includes(status) ? status : "todo",
        dueDate || null,
        notes || null,
        linkUrl || null,
        Boolean(isBlocked),
        blockerReason || null,
        personalTaskId || null,
        userId,
      ]
    );

    const task = result.rows[0];

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, 'task_created', $3)`,
      [id, userId, JSON.stringify({ taskId: task.id, title: task.title })]
    );

    return res.status(201).json({ success: true, task });
  } catch (error) {
    console.error("createPodTask error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create task." });
  }
};

exports.updatePodTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, taskId } = req.params;
    const {
      title,
      description,
      status,
      priority,
      assignedToUserId,
      dueDate,
      notes,
      linkUrl,
      isBlocked,
      blockerReason,
      milestoneId,
    } = req.body;

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    const taskRes = await pool.query(
      `SELECT * FROM project_pod_tasks WHERE id = $1 AND pod_id = $2`,
      [taskId, id]
    );
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const updates = [];
    const values = [taskId, id];

    if (title && title.trim()) {
      values.push(title.trim().slice(0, 255));
      updates.push(`title = $${values.length}`);
    }
    if (description !== undefined) {
      values.push(description ? description.trim() : null);
      updates.push(`description = $${values.length}`);
    }
    if (status && ["todo", "in_progress", "blocked", "done"].includes(status)) {
      values.push(status);
      updates.push(`status = $${values.length}`);
      if (status === "blocked") {
        updates.push("is_blocked = true");
      } else if (status === "done") {
        updates.push("is_blocked = false");
      }
    }
    if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
      values.push(priority);
      updates.push(`priority = $${values.length}`);
    }
    if (assignedToUserId !== undefined) {
      values.push(assignedToUserId || null);
      updates.push(`assigned_to_user_id = $${values.length}`);
    }
    if (dueDate !== undefined) {
      values.push(dueDate || null);
      updates.push(`due_date = $${values.length}`);
    }
    if (notes !== undefined) {
      values.push(notes || null);
      updates.push(`notes = $${values.length}`);
    }
    if (linkUrl !== undefined) {
      values.push(linkUrl || null);
      updates.push(`link_url = $${values.length}`);
    }
    if (typeof isBlocked === "boolean") {
      values.push(isBlocked);
      updates.push(`is_blocked = $${values.length}`);
    }
    if (blockerReason !== undefined) {
      values.push(blockerReason || null);
      updates.push(`blocker_reason = $${values.length}`);
    }
    if (milestoneId !== undefined) {
      values.push(milestoneId || null);
      updates.push(`milestone_id = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.json({ success: true, task: taskRes.rows[0] });
    }

    updates.push("updated_at = now()");

    const result = await pool.query(
      `UPDATE project_pod_tasks SET ${updates.join(", ")} WHERE id = $1 AND pod_id = $2 RETURNING *`,
      values
    );

    const updated = result.rows[0];

    // Activity logging
    let action = "task_updated";
    if (status === "done") action = "task_completed";
    else if (isBlocked || status === "blocked") action = "task_blocked";

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, action, JSON.stringify({ taskId: updated.id, title: updated.title, status: updated.status })]
    );

    return res.json({ success: true, task: updated });
  } catch (error) {
    console.error("updatePodTask error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update task." });
  }
};

exports.launchRoomFromPod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { taskId, milestoneId } = req.body;

    const podRes = await pool.query(`SELECT * FROM project_pods WHERE id = $1`, [id]);
    if (podRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Pod not found." });
    }

    const pod = podRes.rows[0];

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Must be a Pod member to launch a room." });
    }

    const hostCheck = await checkRoomHostingLimit(userId, 4);
    if (!hostCheck.allowed) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: hostCheck.message,
        upgradeUrl: hostCheck.upgradeUrl,
      });
    }

    let title = `${pod.name} Work Session`;
    if (taskId) {
      const tRes = await pool.query(`SELECT title FROM project_pod_tasks WHERE id = $1`, [taskId]);
      if (tRes.rows[0]) title = `${pod.name}: ${tRes.rows[0].title}`;
    }

    const inviteCode = generateSecureCode("rm");
    const roomRes = await pool.query(
      `INSERT INTO focus_rooms (
        host_user_id, title, category, is_public, max_participants,
        invite_code, status, timer_status, timer_duration_seconds, pod_id, task_id
      )
      VALUES ($1, $2, 'coding', false, $3, $4, 'open', 'idle', 1500, $5, $6)
      RETURNING *`,
      [userId, title.slice(0, 255), hostCheck.limit, inviteCode, id, taskId || null]
    );

    const room = roomRes.rows[0];

    await pool.query(
      `INSERT INTO focus_room_members (room_id, user_id, role, presence_status)
       VALUES ($1, $2, 'host', 'online')`,
      [room.id, userId]
    );

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, 'room_launched', $3)`,
      [id, userId, JSON.stringify({ roomId: room.id, title: room.title })]
    );

    return res.status(201).json({ success: true, room });
  } catch (error) {
    console.error("launchRoomFromPod error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to launch room." });
  }
};

/*
=====================================================
4. UNBLOCK EXCHANGE CONTROLLERS
=====================================================
*/

exports.listUnblockRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter = "all", category, q } = req.query;

    const params = [userId];
    let query = `
      SELECT r.*,
             u.name AS requester_name,
             u.email AS requester_email,
             COUNT(o.id)::int AS offer_count,
             EXISTS(
               SELECT 1 FROM unblock_offers uo
               WHERE uo.request_id = r.id AND uo.helper_user_id = $1
             ) AS has_offered,
             CASE
               WHEN r.scope_type = 'pod' THEN (SELECT name FROM project_pods WHERE id = r.scope_id)
               WHEN r.scope_type = 'circle' THEN (SELECT name FROM focus_circles WHERE id = r.scope_id)
               ELSE 'Scoped Group'
             END AS scope_name
      FROM unblock_requests r
      JOIN users u ON u.id = r.requester_user_id
      LEFT JOIN unblock_offers o ON o.request_id = r.id
      WHERE (
        -- Requester always sees their own
        r.requester_user_id = $1
        -- Or member of the scoped pod
        OR (
          r.scope_type = 'pod' AND EXISTS (
            SELECT 1 FROM project_pod_members pm
            WHERE pm.pod_id = r.scope_id AND pm.user_id = $1 AND pm.status = 'active'
          )
        )
        -- Or member of the scoped circle
        OR (
          r.scope_type = 'circle' AND EXISTS (
            SELECT 1 FROM focus_circle_members cm
            WHERE cm.circle_id = r.scope_id AND cm.user_id = $1 AND cm.status = 'active'
          )
        )
      )
    `;

    if (filter === "my") {
      query += ` AND r.requester_user_id = $1`;
    } else if (filter === "needs_help" || filter === "open") {
      query += ` AND r.requester_user_id <> $1 AND r.status IN ('open', 'offered')`;
    } else if (filter === "helping") {
      query += ` AND (r.accepted_helper_user_id = $1 OR EXISTS (SELECT 1 FROM unblock_offers uo WHERE uo.request_id = r.id AND uo.helper_user_id = $1))`;
    } else if (filter === "resolved") {
      query += ` AND r.status = 'resolved'`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      query += ` AND (r.title ILIKE $\${params.length} OR r.description ILIKE $\${params.length})`;
    }

    if (category && category !== "all") {
      params.push(category);
      query += ` AND r.category = $${params.length}`;
    }

    query += `
      GROUP BY r.id, u.id
      ORDER BY r.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error("listUnblockRequests error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to list unblock requests." });
  }
};

exports.createUnblockRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category = "technical",
      scopeType,
      scopeId,
      podTaskId = null,
      circleCommitmentId = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Description is required." });
    }
    if (!scopeType || !scopeId || !["pod", "circle"].includes(scopeType)) {
      return res.status(400).json({
        success: false,
        message: "Valid scopeType ('pod' or 'circle') and scopeId are required to avoid public spam.",
      });
    }

    // Rate limit check based on rolling 7-day period
    const limitCheck = await checkUnblockRequestLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: limitCheck.message,
        limit: limitCheck.limit,
        upgradeUrl: limitCheck.upgradeUrl,
      });
    }

    // Membership verification in the selected scope
    if (scopeType === "pod") {
      const pmCheck = await pool.query(
        `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
        [scopeId, userId]
      );
      if (pmCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: "You must be an active member of this Project Pod." });
      }
    } else {
      const cmCheck = await pool.query(
        `SELECT 1 FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'active'`,
        [scopeId, userId]
      );
      if (cmCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: "You must be an active member of this Focus Circle." });
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO unblock_requests (
        requester_user_id, title, description, category,
        scope_type, scope_id, pod_task_id, circle_commitment_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        title.trim().slice(0, 255),
        description.trim(),
        ["technical", "feedback", "brainstorming", "accountability", "decision_support", "other"].includes(category)
          ? category
          : "technical",
        scopeType,
        scopeId,
        podTaskId || null,
        circleCommitmentId || null,
      ]
    );

    const request = insertRes.rows[0];

    // Notify other members of this pod/circle
    const io = req.app.get("io");
    if (scopeType === "pod") {
      const members = await pool.query(
        `SELECT user_id FROM project_pod_members WHERE pod_id = $1 AND user_id <> $2 AND status = 'active'`,
        [scopeId, userId]
      );
      for (const m of members.rows) {
        createNotification({
          userId: m.user_id,
          title: "New Unblock Request",
          message: `${req.user.name || "A member"} needs help with: "${request.title}"`,
          type: "info",
          link: "/dashboard/unblock-exchange",
          io,
        }).catch(() => {});
      }
    } else {
      const members = await pool.query(
        `SELECT user_id FROM focus_circle_members WHERE circle_id = $1 AND user_id <> $2 AND status = 'active'`,
        [scopeId, userId]
      );
      for (const m of members.rows) {
        createNotification({
          userId: m.user_id,
          title: "Circle Help Needed",
          message: `${req.user.name || "A circle member"} posted an Unblock request: "${request.title}"`,
          type: "info",
          link: "/dashboard/unblock-exchange",
          io,
        }).catch(() => {});
      }
    }

    return res.status(201).json({ success: true, request });
  } catch (error) {
    console.error("createUnblockRequest error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create unblock request." });
  }
};

exports.getUnblockDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const reqRes = await pool.query(
      `SELECT r.*,
              u.name AS requester_name,
              u.email AS requester_email,
              h.name AS helper_name
       FROM unblock_requests r
       JOIN users u ON u.id = r.requester_user_id
       LEFT JOIN users h ON h.id = r.accepted_helper_user_id
       WHERE r.id = $1`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Unblock request not found." });
    }

    const request = reqRes.rows[0];

    // Authorization: requester OR member of scoped pod/circle
    let authorized = request.requester_user_id === userId;
    if (!authorized) {
      if (request.scope_type === "pod") {
        const check = await pool.query(
          `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
          [request.scope_id, userId]
        );
        authorized = check.rows.length > 0;
      } else {
        const check = await pool.query(
          `SELECT 1 FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'active'`,
          [request.scope_id, userId]
        );
        authorized = check.rows.length > 0;
      }
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    const offersRes = await pool.query(
      `SELECT o.*, u.name AS helper_name, u.email AS helper_email
       FROM unblock_offers o
       JOIN users u ON u.id = o.helper_user_id
       WHERE o.request_id = $1
       ORDER BY o.created_at ASC`,
      [id]
    );

    return res.json({
      success: true,
      request,
      offers: offersRes.rows,
      isRequester: request.requester_user_id === userId,
    });
  } catch (error) {
    console.error("getUnblockDetails error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load unblock request details." });
  }
};

exports.offerHelp = async (req, res) => {
  try {
    const helperId = req.user.id;
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Offer message is required." });
    }

    const reqRes = await pool.query(`SELECT * FROM unblock_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const request = reqRes.rows[0];
    if (request.requester_user_id === helperId) {
      return res.status(400).json({ success: false, message: "You cannot offer help on your own request." });
    }
    if (["resolved", "cancelled", "expired"].includes(request.status)) {
      return res.status(400).json({ success: false, message: "This request is no longer open." });
    }

    // Verify helper is member of scope
    if (request.scope_type === "pod") {
      const pmCheck = await pool.query(
        `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
        [request.scope_id, helperId]
      );
      if (pmCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: "Must be a member of the Pod to offer help." });
      }
    } else {
      const cmCheck = await pool.query(
        `SELECT 1 FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'active'`,
        [request.scope_id, helperId]
      );
      if (cmCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: "Must be a member of the Circle to offer help." });
      }
    }

    const offerRes = await pool.query(
      `INSERT INTO unblock_offers (request_id, helper_user_id, message)
       VALUES ($1, $2, $3)
       ON CONFLICT (request_id, helper_user_id)
       DO UPDATE SET message = $3, updated_at = now()
       RETURNING *`,
      [id, helperId, message.trim()]
    );

    // Update status to offered if currently open
    if (request.status === "open") {
      await pool.query(`UPDATE unblock_requests SET status = 'offered' WHERE id = $1`, [id]);
    }

    // Notify requester
    const io = req.app.get("io");
    await createNotification({
      userId: request.requester_user_id,
      title: "Help Offered on Your Request",
      message: `${req.user.name || "A member"} offered help on: "${request.title}"`,
      type: "success",
      link: `/dashboard/unblock-exchange`,
      io,
    }).catch(() => {});

    return res.status(201).json({ success: true, offer: offerRes.rows[0] });
  } catch (error) {
    console.error("offerHelp error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to submit help offer." });
  }
};

exports.acceptOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { helperUserId } = req.body;

    const reqRes = await pool.query(`SELECT * FROM unblock_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const request = reqRes.rows[0];
    if (request.requester_user_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the requester can accept offers." });
    }

    await pool.query(
      `UPDATE unblock_offers SET status = 'accepted' WHERE request_id = $1 AND helper_user_id = $2`,
      [id, helperUserId]
    );

    await pool.query(
      `UPDATE unblock_offers SET status = 'declined' WHERE request_id = $1 AND helper_user_id <> $2`,
      [id, helperUserId]
    );

    const updateRes = await pool.query(
      `UPDATE unblock_requests
       SET status = 'accepted', accepted_helper_user_id = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [helperUserId, id]
    );

    // Notify accepted helper
    const io = req.app.get("io");
    await createNotification({
      userId: helperUserId,
      title: "Offer Accepted!",
      message: `${req.user.name || "Requester"} accepted your help offer on "${request.title}".`,
      type: "success",
      link: `/dashboard/unblock-exchange`,
      io,
    }).catch(() => {});

    return res.json({ success: true, request: updateRes.rows[0] });
  } catch (error) {
    console.error("acceptOffer error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to accept offer." });
  }
};

exports.resolveUnblockRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { outcomeNotes } = req.body;

    const reqRes = await pool.query(`SELECT * FROM unblock_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const request = reqRes.rows[0];
    if (request.requester_user_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the requester can resolve this request." });
    }

    const result = await pool.query(
      `UPDATE unblock_requests
       SET status = 'resolved',
           outcome_notes = $1,
           updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [outcomeNotes ? outcomeNotes.trim() : null, id]
    );

    const resolvedReq = result.rows[0];
    const io = req.app.get("io");

    // If request was tied to a pod task, automatically unblock the task in the pod!
    if (request.pod_task_id && request.scope_type === "pod") {
      await pool.query(
        `UPDATE project_pod_tasks
         SET is_blocked = false, status = 'in_progress', blocker_reason = null, updated_at = now()
         WHERE id = $1 AND pod_id = $2`,
        [request.pod_task_id, request.scope_id]
      ).catch(() => {});

      await pool.query(
        `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
         VALUES ($1, $2, 'task_unblocked', $3)`,
        [request.scope_id, userId, JSON.stringify({ taskId: request.pod_task_id, reason: outcomeNotes || "Resolved via Unblock Exchange" })]
      ).catch(() => {});

      socketHub.broadcastToPod(io, request.scope_id, "pod_task_updated", {
        taskId: request.pod_task_id,
        isBlocked: false,
        status: "in_progress",
      });
    }

    // Broadcast unblock resolution
    socketHub.broadcastToUnblock(io, id, "unblock_status_updated", resolvedReq);

    // Notify accepted helper
    if (request.accepted_helper_user_id) {
      createNotification({
        userId: request.accepted_helper_user_id,
        title: "Unblock Request Resolved 🎉",
        message: `${req.user.name || "Requester"} marked "${request.title}" as resolved. Thank you for your help!`,
        type: "achievement",
        link: "/dashboard/unblock-exchange",
        io,
      }).catch(() => {});
    }

    return res.json({ success: true, request: resolvedReq });
  } catch (error) {
    console.error("resolveUnblockRequest error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to resolve request." });
  }
};

exports.cancelUnblockRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE unblock_requests
       SET status = 'cancelled', updated_at = now()
       WHERE id = $1 AND requester_user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found or unauthorized." });
    }

    return res.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error("cancelUnblockRequest error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to cancel request." });
  }
};

exports.launchRoomFromUnblock = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const reqRes = await pool.query(`SELECT * FROM unblock_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const request = reqRes.rows[0];
    if (request.requester_user_id !== userId && request.accepted_helper_user_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the requester or accepted helper can launch this session." });
    }

    const hostCheck = await checkRoomHostingLimit(userId, 4);
    if (!hostCheck.allowed) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: hostCheck.message,
        upgradeUrl: hostCheck.upgradeUrl,
      });
    }

    const inviteCode = generateSecureCode("rm");
    const roomRes = await pool.query(
      `INSERT INTO focus_rooms (
        host_user_id, title, category, is_public, max_participants,
        invite_code, status, timer_status, timer_duration_seconds, help_request_id
      )
      VALUES ($1, $2, 'general', false, $3, $4, 'open', 'idle', 1500, $5)
      RETURNING *`,
      [userId, `Unblock Session: ${request.title.slice(0, 100)}`, hostCheck.limit, inviteCode, id]
    );

    const room = roomRes.rows[0];

    // Host joins
    await pool.query(
      `INSERT INTO focus_room_members (room_id, user_id, role, presence_status)
       VALUES ($1, $2, 'host', 'online')`,
      [room.id, userId]
    );

    // Update request with room link and in_progress status
    await pool.query(
      `UPDATE unblock_requests SET room_id = $1, status = 'in_progress', updated_at = now() WHERE id = $2`,
      [room.id, id]
    );

    // If requester launched, notify helper; if helper launched, notify requester
    const targetUserId = request.requester_user_id === userId ? request.accepted_helper_user_id : request.requester_user_id;
    if (targetUserId) {
      const io = req.app.get("io");
      createNotification({
        userId: targetUserId,
        title: "Unblock Focus Room Ready",
        message: `Your help room for "${request.title}" is ready. Click to join.`,
        type: "success",
        link: `/dashboard/focus-rooms/${room.id}`,
        io,
      }).catch(() => {});
    }

    return res.status(201).json({ success: true, room });
  } catch (error) {
    console.error("launchRoomFromUnblock error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to launch unblock room." });
  }
};

/*
=====================================================
5. FOCUS ROOM MESSAGES (QUIET CHAT & STATUS PINGS)
=====================================================
*/

exports.getRoomMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const roomRes = await pool.query(`SELECT is_public, host_user_id FROM focus_rooms WHERE id = $1`, [id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Focus room not found." });
    }

    const room = roomRes.rows[0];
    const mCheck = await pool.query(
      `SELECT 1 FROM focus_room_members WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, userId]
    );

    if (!room.is_public && room.host_user_id !== userId && mCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Must be a room member to view messages." });
    }

    const result = await pool.query(
      `SELECT m.*, u.name AS user_name
       FROM focus_room_messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.room_id = $1
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [id]
    );

    return res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error("getRoomMessages error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load room messages." });
  }
};

exports.postRoomMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content, messageType = "chat" } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content cannot be empty." });
    }

    const mCheck = await pool.query(
      `SELECT 1 FROM focus_room_members WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, userId]
    );
    if (mCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Must be an active room member to send messages." });
    }

    const msgRes = await pool.query(
      `INSERT INTO focus_room_messages (room_id, user_id, content, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, content.trim().slice(0, 500), ["chat", "status", "milestone"].includes(messageType) ? messageType : "chat"]
    );

    const userRes = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
    const message = {
      ...msgRes.rows[0],
      user_name: userRes.rows[0]?.name || req.user.name || "Collaborator",
    };

    const io = req.app.get("io");
    socketHub.broadcastToRoom(io, id, "room_message_broadcast", message);

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("postRoomMessage error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to post message." });
  }
};

/*
=====================================================
6. CIRCLE HISTORY & LIFECYCLE
=====================================================
*/

exports.getCircleHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const memberCheck = await pool.query(
      `SELECT 1 FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Must be a member to view Circle history." });
    }

    // Fetch past 8 weeks commitments for this circle
    const historyRes = await pool.query(
      `SELECT c.*, u.name AS user_name
       FROM focus_circle_commitments c
       JOIN users u ON u.id = c.user_id
       WHERE c.circle_id = $1
       ORDER BY c.year DESC, c.week_number DESC, c.created_at ASC
       LIMIT 100`,
      [id]
    );

    // Calculate weekly check-in stats
    const totalCommitments = historyRes.rows.length;
    const completedCommitments = historyRes.rows.filter((c) => c.is_completed).length;
    const consistencyRate = totalCommitments > 0 ? Math.round((completedCommitments / totalCommitments) * 100) : 100;

    // Calculate user's consecutive weekly streak in this circle
    const userCommits = historyRes.rows.filter((c) => c.user_id === userId);
    let streak = 0;
    for (const uc of userCommits) {
      if (uc.is_completed) streak += 1;
      else break;
    }

    return res.json({
      success: true,
      history: historyRes.rows,
      stats: {
        totalCommitments,
        completedCommitments,
        consistencyRate,
        userStreak: streak,
      },
    });
  } catch (error) {
    console.error("getCircleHistory error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load Circle history." });
  }
};

exports.archiveCircle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const circleRes = await pool.query(`SELECT * FROM focus_circles WHERE id = $1`, [id]);
    if (circleRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Circle not found." });
    }

    if (circleRes.rows[0].owner_user_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the owner can archive this Circle." });
    }

    await pool.query(`UPDATE focus_circles SET status = 'archived', updated_at = now() WHERE id = $1`, [id]);

    const io = req.app.get("io");
    socketHub.broadcastToCircle(io, id, "circle_archived", { circleId: id });

    return res.json({ success: true, message: "Circle archived successfully." });
  } catch (error) {
    console.error("archiveCircle error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to archive Circle." });
  }
};

/*
=====================================================
7. POD MILESTONE & TASK MUTATIONS
=====================================================
*/

exports.updatePodMilestone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, milestoneId } = req.params;
    const { title, description, dueDate, isCompleted } = req.body;

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    const msRes = await pool.query(
      `SELECT * FROM project_pod_milestones WHERE id = $1 AND pod_id = $2`,
      [milestoneId, id]
    );
    if (msRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    const updates = [];
    const values = [milestoneId, id];

    if (title && title.trim()) {
      values.push(title.trim().slice(0, 255));
      updates.push(`title = $${values.length}`);
    }
    if (description !== undefined) {
      values.push(description ? description.trim() : null);
      updates.push(`description = $${values.length}`);
    }
    if (dueDate !== undefined) {
      values.push(dueDate || null);
      updates.push(`due_date = $${values.length}`);
    }
    if (typeof isCompleted === "boolean") {
      values.push(isCompleted);
      updates.push(`is_completed = $${values.length}`);
      if (isCompleted) {
        updates.push(`completed_at = now()`);
      } else {
        updates.push(`completed_at = NULL`);
      }
    }

    updates.push("updated_at = now()");

    const result = await pool.query(
      `UPDATE project_pod_milestones SET ${updates.join(", ")} WHERE id = $1 AND pod_id = $2 RETURNING *`,
      values
    );

    const updatedMilestone = result.rows[0];

    // Activity log
    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        id,
        userId,
        isCompleted ? "milestone_completed" : "milestone_updated",
        JSON.stringify({ milestoneId: updatedMilestone.id, title: updatedMilestone.title, isCompleted }),
      ]
    );

    const io = req.app.get("io");
    socketHub.broadcastToPod(io, id, "pod_milestone_updated", updatedMilestone);

    return res.json({ success: true, milestone: updatedMilestone });
  } catch (error) {
    console.error("updatePodMilestone error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update milestone." });
  }
};

exports.deletePodMilestone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, milestoneId } = req.params;

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    const delRes = await pool.query(
      `DELETE FROM project_pod_milestones WHERE id = $1 AND pod_id = $2 RETURNING title`,
      [milestoneId, id]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, 'milestone_deleted', $3)`,
      [id, userId, JSON.stringify({ title: delRes.rows[0].title })]
    );

    const io = req.app.get("io");
    socketHub.broadcastToPod(io, id, "pod_milestone_deleted", { milestoneId });

    return res.json({ success: true, message: "Milestone deleted." });
  } catch (error) {
    console.error("deletePodMilestone error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete milestone." });
  }
};

exports.deletePodTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, taskId } = req.params;

    const memberCheck = await pool.query(
      `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    const delRes = await pool.query(
      `DELETE FROM project_pod_tasks WHERE id = $1 AND pod_id = $2 RETURNING title`,
      [taskId, id]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, 'task_deleted', $3)`,
      [id, userId, JSON.stringify({ title: delRes.rows[0].title })]
    );

    const io = req.app.get("io");
    socketHub.broadcastToPod(io, id, "pod_task_deleted", { taskId });

    return res.json({ success: true, message: "Task deleted." });
  } catch (error) {
    console.error("deletePodTask error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete task." });
  }
};

exports.removePodMember = async (req, res) => {
  try {
    const actorId = req.user.id;
    const { id } = req.params;
    const { memberUserId } = req.body;

    const podRes = await pool.query(`SELECT * FROM project_pods WHERE id = $1`, [id]);
    if (podRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project Pod not found." });
    }

    const pod = podRes.rows[0];
    const isOwner = pod.owner_user_id === actorId;
    const isSelf = memberUserId === actorId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ success: false, message: "Permission denied." });
    }

    if (isOwner && isSelf) {
      return res.status(400).json({ success: false, message: "Owner cannot leave their own Pod. Archive the Pod instead." });
    }

    await pool.query(
      `UPDATE project_pod_members SET status = 'left' WHERE pod_id = $1 AND user_id = $2`,
      [id, memberUserId]
    );

    await pool.query(
      `INSERT INTO project_pod_activities (pod_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [
        id,
        actorId,
        isSelf ? "member_left" : "member_removed",
        JSON.stringify({ memberUserId }),
      ]
    );

    const io = req.app.get("io");
    socketHub.broadcastToPod(io, id, "pod_member_updated", { memberUserId, status: "left" });

    return res.json({ success: true, message: isSelf ? "Left Project Pod." : "Member removed." });
  } catch (error) {
    console.error("removePodMember error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove member." });
  }
};

exports.archivePod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const podRes = await pool.query(`SELECT * FROM project_pods WHERE id = $1`, [id]);
    if (podRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project Pod not found." });
    }

    if (podRes.rows[0].owner_user_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the owner can archive this Pod." });
    }

    await pool.query(`UPDATE project_pods SET status = 'archived', updated_at = now() WHERE id = $1`, [id]);

    const io = req.app.get("io");
    socketHub.broadcastToPod(io, id, "pod_archived", { podId: id });

    return res.json({ success: true, message: "Project Pod archived successfully." });
  } catch (error) {
    console.error("archivePod error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to archive Pod." });
  }
};

/*
=====================================================
8. UNBLOCK OFFER RETRACTION
=====================================================
*/

exports.deleteOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, offerId } = req.params;

    const offerRes = await pool.query(
      `SELECT o.*, r.status AS request_status
       FROM unblock_offers o
       JOIN unblock_requests r ON r.id = o.request_id
       WHERE o.id = $1 AND o.request_id = $2`,
      [offerId, id]
    );

    if (offerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    const offer = offerRes.rows[0];
    if (offer.helper_user_id !== userId) {
      return res.status(403).json({ success: false, message: "You can only retract your own offer." });
    }

    if (offer.status === "accepted") {
      return res.status(400).json({ success: false, message: "Accepted offers cannot be retracted." });
    }

    await pool.query(`DELETE FROM unblock_offers WHERE id = $1`, [offerId]);

    const io = req.app.get("io");
    socketHub.broadcastToUnblock(io, id, "unblock_offer_deleted", { offerId, requestId: id });

    return res.json({ success: true, message: "Offer retracted." });
  } catch (error) {
    console.error("deleteOffer error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete offer." });
  }
};

