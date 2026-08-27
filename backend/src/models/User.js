const { pool } = require("../config/db");

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    _id: row.id,

    name: row.name,
    email: row.email,
    password: row.password,

    dailyGoalHours: Number(
      row.daily_goal_hours ?? 4
    ),

    streakDays: Number(
      row.streak_days ?? 0
    ),

    resetToken: row.reset_token,
    resetTokenExpire: row.reset_token_expire
      ? new Date(row.reset_token_expire)
      : null,

    resetOTP: row.reset_otp,
    resetOTPExpire: row.reset_otp_expire
      ? new Date(row.reset_otp_expire)
      : null,

    lastLogin: row.last_login
      ? new Date(row.last_login)
      : null,

    emailVerified:
      Boolean(row.email_verified),

    createdAt: row.created_at
      ? new Date(row.created_at)
      : null,

    updatedAt: row.updated_at
      ? new Date(row.updated_at)
      : null,

    async save() {
      const result = await pool.query(
        `
        UPDATE users
        SET
          name = $1,
          email = LOWER($2),
          password = $3,
          daily_goal_hours = $4,
          streak_days = $5,
          reset_token = $6,
          reset_token_expire = $7,
          reset_otp = $8,
          reset_otp_expire = $9,
          last_login = $10,
          email_verified = $11
        WHERE id = $12
        RETURNING *
        `,
        [
          this.name,
          this.email,
          this.password,
          this.dailyGoalHours,
          this.streakDays,
          this.resetToken,
          this.resetTokenExpire,
          this.resetOTP,
          this.resetOTPExpire,
          this.lastLogin,
          this.emailVerified,
          this.id,
        ]
      );

      return mapUser(result.rows[0]);
    },
  };
}


async function findOne(filter = {}) {
  let result;

  if (filter.email) {
    result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [
        String(filter.email)
          .trim()
          .toLowerCase(),
      ]
    );
  } else if (filter.id) {
    result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [filter.id]
    );
  } else if (filter._id) {
    result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [filter._id]
    );
  } else {
    throw new Error(
      "User.findOne requires email, id, or _id."
    );
  }

  return mapUser(
    result.rows[0]
  );
}


async function findById(id) {
  const result = await pool.query(
    `
    SELECT *
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return mapUser(
    result.rows[0]
  );
}


async function create(data = {}) {
  const name =
    String(data.name || "").trim();

  const email =
    String(data.email || "")
      .trim()
      .toLowerCase();

  const password =
    String(data.password || "");

  if (!name) {
    throw new Error(
      "Name is required."
    );
  }

  if (!email) {
    throw new Error(
      "Email is required."
    );
  }

  if (!password) {
    throw new Error(
      "Password is required."
    );
  }

  const result = await pool.query(
    `
    INSERT INTO users (
      name,
      email,
      password,
      daily_goal_hours,
      streak_days,
      reset_token,
      reset_token_expire,
      reset_otp,
      reset_otp_expire,
      last_login,
      email_verified
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11
    )
    RETURNING *
    `,
    [
      name,
      email,
      password,
      data.dailyGoalHours ?? 4,
      data.streakDays ?? 0,
      data.resetToken ?? null,
      data.resetTokenExpire ?? null,
      data.resetOTP ?? null,
      data.resetOTPExpire ?? null,
      data.lastLogin ?? null,
      data.emailVerified ?? false,
    ]
  );

  return mapUser(
    result.rows[0]
  );
}


module.exports = {
  findOne,
  findById,
  create,
};