const { pool } = require("../config/db");

function mapActivityEvent(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    _id: row.id,

    userId: row.user_id,

    sessionId: row.session_id,

    eventType: row.event_type,

    details: row.details,

    domain: row.domain,

    warningNumber:
      row.warning_number == null
        ? null
        : Number(row.warning_number),

    timestamp: row.timestamp
      ? new Date(row.timestamp)
      : null,

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
      "ActivityEvent userId is required."
    );
  }

  if (!data.sessionId) {
    throw new Error(
      "ActivityEvent sessionId is required."
    );
  }

  if (!data.eventType) {
    throw new Error(
      "ActivityEvent eventType is required."
    );
  }

  const result = await pool.query(
    `
    INSERT INTO activity_events (
      user_id,
      session_id,
      event_type,
      details,
      domain,
      warning_number,
      timestamp
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7
    )
    RETURNING *
    `,
    [
      data.userId,
      data.sessionId,
      data.eventType,
      data.details || null,
      data.domain || null,
      data.warningNumber ?? null,
      data.timestamp || new Date(),
    ]
  );

  return mapActivityEvent(
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

  if (filter.sessionId) {
    conditions.push(
      `session_id = $${index++}`
    );

    values.push(
      filter.sessionId
    );
  }

  if (filter.eventType) {
    conditions.push(
      `event_type = $${index++}`
    );

    values.push(
      filter.eventType
    );
  }

  const where =
    conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await pool.query(
    `
    SELECT *
    FROM activity_events
    ${where}
    ORDER BY timestamp DESC
    `,
    values
  );

  return result.rows.map(
    mapActivityEvent
  );
}


module.exports = {
  create,
  find,
};