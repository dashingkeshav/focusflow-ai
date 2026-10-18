const { pool } = require("../config/db");

function mapSession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    _id: row.id,

    userId: row.user_id,

    title: row.title,

    startTime: row.start_time
      ? new Date(row.start_time)
      : null,

    endTime: row.end_time
      ? new Date(row.end_time)
      : null,

    durationSeconds: Number(
      row.duration_seconds ?? 0
    ),

    avgFocusScore:
      row.avg_focus_score == null
        ? null
        : Number(row.avg_focus_score),

    finalFocusScore:
      row.final_focus_score == null
        ? null
        : Number(row.final_focus_score),

    tabSwitches: Number(
      row.tab_switches ?? 0
    ),

    idleTimeSeconds: Number(
      row.idle_time_seconds ?? 0
    ),

    cameraDistractions: Number(
      row.camera_distractions ?? 0
    ),

    warningCount: Number(
      row.warning_count ?? 0
    ),

    blockedAttempts: Number(
      row.blocked_attempts ?? 0
    ),

    distractionEvents: Number(
      row.distraction_events ?? 0
    ),

    lastTelemetryAt: row.last_telemetry_at
      ? new Date(row.last_telemetry_at)
      : null,

    keyboardEvents: Number(
      row.keyboard_events ?? 0
    ),

    mouseEvents: Number(
      row.mouse_events ?? 0
    ),

    focusScoreSamples: Number(
      row.focus_score_samples ?? 0
    ),

    status: row.status,

    // ── Smart Focus Mode fields ──
    taskId: row.task_id || null,
    subject: row.subject || "",
    strictness: row.strictness || "balanced",
    mode: row.mode || row.strictness || "balanced",
    plannedDurationSeconds: Number(row.planned_duration_seconds ?? 0),
    pausedAt: row.paused_at ? new Date(row.paused_at) : null,
    pausedSeconds: Number(row.paused_seconds ?? 0),
    browserProtection: row.browser_protection !== false,
    allowedSites: Array.isArray(row.allowed_sites) ? row.allowed_sites : [],
    blockedSites: Array.isArray(row.blocked_sites) ? row.blocked_sites : [],
    warningSites: Array.isArray(row.warning_sites) ? row.warning_sites : [],
    escalatedDomains: row.escalated_domains && typeof row.escalated_domains === "object" ? row.escalated_domains : {},
    productiveSeconds: Number(row.productive_seconds ?? 0),
    distractionDomainCount: Number(row.distraction_domain_count ?? 0),
    notes: row.notes || null,
    taskOutcome: row.task_outcome || null,

    createdAt: row.created_at
      ? new Date(row.created_at)
      : null,

    updatedAt: row.updated_at
      ? new Date(row.updated_at)
      : null,
  };
}


async function create(data = {}, queryable = pool) {
  if (!data.userId) {
    throw new Error(
      "Session userId is required."
    );
  }

  const taskId = data.taskId || data.task_id || null;
  const plannedDurationSeconds = Number(data.plannedDurationSeconds ?? 0);

  if (!Number.isInteger(plannedDurationSeconds) || plannedDurationSeconds < 0 || plannedDurationSeconds > 28800) {
    throw new Error("Session planned duration must be an integer from 0 to 28800 seconds.");
  }

  if (taskId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      const error = new Error("Task not found or does not belong to you.");
      error.code = "TASK_NOT_OWNED";
      throw error;
    }

    const ownedTask = await queryable.query(
      "SELECT id FROM tasks WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [taskId, data.userId]
    );
    if (!ownedTask.rows.length) {
      const error = new Error("Task not found or does not belong to you.");
      error.code = "TASK_NOT_OWNED";
      throw error;
    }
  }

  const result = await queryable.query(
    `
    INSERT INTO sessions (
      user_id,
      task_id,
      title,
      start_time,
      end_time,
      duration_seconds,
      avg_focus_score,
      final_focus_score,
      tab_switches,
      idle_time_seconds,
      camera_distractions,
      warning_count,
      blocked_attempts,
      distraction_events,
      status,
      subject,
      strictness,
      mode,
      planned_duration_seconds,
      browser_protection,
      allowed_sites,
      blocked_sites,
      warning_sites
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, $22, $23
    )
    RETURNING *
    `,
    [
      data.userId,
      taskId,
      data.title || "Study Focus Session",
      data.startTime || new Date(),
      data.endTime || null,
      data.durationSeconds ?? 0,
      data.avgFocusScore ?? null,
      data.finalFocusScore ?? null,
      data.tabSwitches ?? 0,
      data.idleTimeSeconds ?? 0,
      data.cameraDistractions ?? 0,
      data.warningCount ?? 0,
      data.blockedAttempts ?? 0,
      data.distractionEvents ?? 0,
      data.status || "active",
      data.subject || null,
      data.strictness || "balanced",
      data.mode || data.strictness || "balanced",
      plannedDurationSeconds,
      data.browserProtection ?? true,
      JSON.stringify(data.allowedSites || []),
      JSON.stringify(data.blockedSites || []),
      JSON.stringify(data.warningSites || []),
    ]
  );

  return mapSession(
    result.rows[0]
  );
}

async function findOwnedTask(taskId, userId) {
  if (!taskId || !userId) {
    return null;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, title, estimated_duration
     FROM tasks
     WHERE id = $1 AND user_id = $2`,
    [taskId, userId]
  );
  return result.rows[0] || null;
}


async function findOne(filter = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (filter.id || filter._id) {
    conditions.push(
      `id = $${index++}`
    );

    values.push(
      filter.id || filter._id
    );
  }

  if (filter.userId) {
    conditions.push(
      `user_id = $${index++}`
    );

    values.push(
      filter.userId
    );
  }

  if (filter.status) {
    conditions.push(
      `status = $${index++}`
    );

    values.push(
      filter.status
    );
  }

  if (!conditions.length) {
    throw new Error(
      "Session.findOne requires a filter."
    );
  }

  const result = await pool.query(
    `
    SELECT *
    FROM sessions
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT 1
    `,
    values
  );

  return mapSession(
    result.rows[0]
  );
}


async function find(filter = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (filter.userId) {
    conditions.push(
      `user_id = $${index++}`
    );

    values.push(
      filter.userId
    );
  }

  if (filter.status) {
    conditions.push(
      `status = $${index++}`
    );

    values.push(
      filter.status
    );
  }

  const where =
    conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const limit =
    Number.isInteger(filter.limit) && filter.limit > 0
      ? filter.limit
      : null;
  if (limit != null) {
    values.push(limit);
  }

  const result = await pool.query(
    `
    SELECT *
    FROM sessions
    ${where}
    ORDER BY start_time DESC
    ${limit != null ? `LIMIT $${values.length}` : ""}
    `,
    values
  );

  return result.rows.map(
    mapSession
  );
}


async function findById(id) {
  const result = await pool.query(
    `
    SELECT *
    FROM sessions
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return mapSession(
    result.rows[0]
  );
}


async function findOneAndUpdate(
  filter = {},
  update = {},
  options = {}
) {
  const current =
    await findOne(filter);

  if (!current) {
    return null;
  }

  const source =
    update.$set || update;

  const mapping = {
    title: "title",
    startTime: "start_time",
    endTime: "end_time",
    durationSeconds: "duration_seconds",
    avgFocusScore: "avg_focus_score",
    finalFocusScore: "final_focus_score",
    tabSwitches: "tab_switches",
    idleTimeSeconds: "idle_time_seconds",
    cameraDistractions: "camera_distractions",
    warningCount: "warning_count",
    blockedAttempts: "blocked_attempts",
    distractionEvents: "distraction_events",
    status: "status",
    subject: "subject",
    strictness: "strictness",
    mode: "mode",
    plannedDurationSeconds: "planned_duration_seconds",
    pausedAt: "paused_at",
    pausedSeconds: "paused_seconds",
    browserProtection: "browser_protection",
    allowedSites: "allowed_sites",
    blockedSites: "blocked_sites",
    warningSites: "warning_sites",
    escalatedDomains: "escalated_domains",
    productiveSeconds: "productive_seconds",
    distractionDomainCount: "distraction_domain_count",
    lastTelemetryAt: "last_telemetry_at",
    keyboardEvents: "keyboard_events",
    mouseEvents: "mouse_events",
    focusScoreSamples: "focus_score_samples",
    notes: "notes",
    taskOutcome: "task_outcome",
  };

  const encode = (key, value) =>
    ["allowedSites", "blockedSites", "warningSites"].includes(key)
      ? JSON.stringify(value || [])
      : ["escalatedDomains"].includes(key)
        ? JSON.stringify(value || {})
        : value;

  const sets = [];
  const values = [];
  let index = 1;

  for (
    const [key, value] of Object.entries(source)
  ) {
    if (mapping[key]) {
      sets.push(
        `${mapping[key]} = $${index++}`
      );
      values.push(encode(key, value));
    }
  }

  if (!sets.length) {
    return current;
  }

  sets.push("updated_at = NOW()");

  values.push(current.id);
  const idParameter = index++;
  let ownershipCondition = "";
  if (filter.userId) {
    values.push(filter.userId);
    ownershipCondition = ` AND user_id = $${index}`;
  }

  const result = await pool.query(
    `
    UPDATE sessions
    SET ${sets.join(", ")}
    WHERE id = $${idParameter}${ownershipCondition}
    RETURNING *
    `,
    values
  );

  return mapSession(
    result.rows[0]
  );
}


async function updateMany(
  filter = {},
  update = {}
) {
  const conditions = [];
  const filterValues = [];
  let filterIndex = 1;

  if (filter.userId) {
    conditions.push(
      `user_id = $${filterIndex++}`
    );

    filterValues.push(
      filter.userId
    );
  }

  if (filter.status) {
    conditions.push(
      `status = $${filterIndex++}`
    );

    filterValues.push(
      filter.status
    );
  }

  if (!conditions.length) {
    throw new Error(
      "Session.updateMany requires a filter."
    );
  }

  const source =
    update.$set || update;

  const mapping = {
    title: "title",
    startTime: "start_time",
    endTime: "end_time",
    durationSeconds: "duration_seconds",
    avgFocusScore: "avg_focus_score",
    finalFocusScore: "final_focus_score",
    tabSwitches: "tab_switches",
    idleTimeSeconds: "idle_time_seconds",
    cameraDistractions: "camera_distractions",
    warningCount: "warning_count",
    blockedAttempts: "blocked_attempts",
    distractionEvents: "distraction_events",
    status: "status",
    subject: "subject",
    strictness: "strictness",
    mode: "mode",
    plannedDurationSeconds: "planned_duration_seconds",
    pausedAt: "paused_at",
    pausedSeconds: "paused_seconds",
    browserProtection: "browser_protection",
    allowedSites: "allowed_sites",
    blockedSites: "blocked_sites",
    warningSites: "warning_sites",
    escalatedDomains: "escalated_domains",
    productiveSeconds: "productive_seconds",
    distractionDomainCount: "distraction_domain_count",
    lastTelemetryAt: "last_telemetry_at",
    keyboardEvents: "keyboard_events",
    mouseEvents: "mouse_events",
    focusScoreSamples: "focus_score_samples",
  };

  const encode = (key, value) =>
    ["allowedSites", "blockedSites", "warningSites"].includes(key)
      ? JSON.stringify(value || [])
      : ["escalatedDomains"].includes(key)
        ? JSON.stringify(value || {})
        : value;

  const sets = [];
  const values = [...filterValues];
  let index = filterIndex;

  for (
    const [key, value] of Object.entries(source)
  ) {
    if (mapping[key]) {
      sets.push(
        `${mapping[key]} = $${index++}`
      );

      values.push(encode(key, value));
    }
  }

  if (!sets.length) {
    return {
      acknowledged: true,
      modifiedCount: 0,
    };
  }

  sets.push("updated_at = NOW()");

  const result = await pool.query(
    `
    UPDATE sessions
    SET ${sets.join(", ")}
    WHERE ${conditions.join(" AND ")}
    `,
    values
  );

  return {
    acknowledged: true,
    modifiedCount: result.rowCount,
  };
}


module.exports = {
  create,
  findOwnedTask,
  findOne,
  find,
  findById,
  findOneAndUpdate,
  updateMany,
};