const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not configured in backend environment variables."
  );
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => {
  console.log("✅ Supabase PostgreSQL connection established.");
});

pool.on("error", (error) => {
  console.error(
    "❌ Unexpected PostgreSQL pool error:",
    error
  );
});

async function testDatabaseConnection() {
  const result = await pool.query(
    "SELECT NOW() AS current_time"
  );

  console.log(
    "✅ Database connection successful:",
    result.rows[0].current_time
  );

  return result.rows[0];
}

module.exports = {
  pool,
  testDatabaseConnection,
};