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

    avgFocusScore: Number(
      row.avg_focus_score ?? 100
    ),

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

    status: row.status,

    createdAt: row.created_at
      ? new Date(row.created_at)
      : null,

    updatedAt: row.updated_at
      ? new Date(row.updated_at)
      : null,
  };
}


async function create(data = {}) {
  if (!data.userId) {
    throw new Error(
      "Session userId is required."
    );
  }

  const result = await pool.query(
    `
    INSERT INTO sessions (
      user_id,
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
      status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING *
    `,
    [
      data.userId,
      data.title || "Study Focus Session",
      data.startTime || new Date(),
      data.endTime || null,
      data.durationSeconds ?? 0,
      data.avgFocusScore ?? 100,
      data.finalFocusScore ?? null,
      data.tabSwitches ?? 0,
      data.idleTimeSeconds ?? 0,
      data.cameraDistractions ?? 0,
      data.warningCount ?? 0,
      data.blockedAttempts ?? 0,
      data.distractionEvents ?? 0,
      data.status || "active",
    ]
  );

  return mapSession(
    result.rows[0]
  );
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

  const result = await pool.query(
    `
    SELECT *
    FROM sessions
    ${where}
    ORDER BY start_time DESC
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
  };

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
      values.push(value);
    }
  }

  if (!sets.length) {
    return current;
  }

  sets.push("updated_at = NOW()");

  values.push(current.id);

  const result = await pool.query(
    `
    UPDATE sessions
    SET ${sets.join(", ")}
    WHERE id = $${index}
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
  };

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

      values.push(value);
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
  findOne,
  find,
  findById,
  findOneAndUpdate,
  updateMany,
};