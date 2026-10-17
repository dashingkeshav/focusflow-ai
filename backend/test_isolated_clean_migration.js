/**
 * FocusFlow AI — Isolated Clean-Database Migration Test
 * 
 * Verifies that the complete database migration suite executes cleanly from a
 * greenfield (0 tables) PostgreSQL database to a fully initialized production schema.
 *
 * SAFETY GUARD:
 * This test will NEVER run against the shared production Supabase database.
 * It requires an explicit TEST_DATABASE_URL pointing to an isolated test database
 * (e.g., local Docker PostgreSQL on localhost:5432/focusflow_clean_test).
 *
 * Usage:
 *   TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/focusflow_clean_test" node test_isolated_clean_migration.js
 */

const assert = require("node:assert/strict");

function sanitizeError(err) {
  if (!err) return "Unknown error";
  const str = err.stack || err.message || String(err);
  return str.replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:******@");
}

const testDbUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDbUrl) {
  console.error("======================================================================");
  console.error("🛡️  ISOLATED CLEAN-DATABASE MIGRATION TEST: SAFETY NOTICE");
  console.error("======================================================================");
  console.error("❌ ERROR: Missing required TEST_DATABASE_URL environment variable.");
  console.error("To prevent accidental execution against the shared Supabase database,");
  console.error("this test requires an explicit TEST_DATABASE_URL environment variable.");
  console.error("\nRequirements for TEST_DATABASE_URL:");
  console.error("  1. Host must be a local PostgreSQL instance (localhost, 127.0.0.1, or ::1)");
  console.error("  2. Database name must be explicitly 'focusflow_clean_test'");
  console.error("\nTo run this test against an isolated PostgreSQL instance:");
  console.error("  1. Start a clean local PostgreSQL container:");
  console.error("     docker run --name pg-clean-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine");
  console.error("  2. Create test database:");
  console.error("     docker exec -it pg-clean-test psql -U postgres -c \"CREATE DATABASE focusflow_clean_test;\"");
  console.error("  3. Run migration test against the clean database:");
  console.error("     TEST_DATABASE_URL=\"postgresql://postgres:<password>@localhost:5432/focusflow_clean_test\" node backend/test_isolated_clean_migration.js");
  console.error("======================================================================\n");
  process.exit(1);
}

// Parse and validate the database URL
let parsedUrl;
try {
  parsedUrl = new URL(testDbUrl);
} catch {
  console.error("❌ SAFETY VIOLATION: TEST_DATABASE_URL is not a valid URL.");
  console.error("Expected format: postgresql://<user>:<password>@localhost:5432/focusflow_clean_test");
  process.exit(1);
}

const protocol = parsedUrl.protocol.toLowerCase();
if (protocol !== "postgresql:" && protocol !== "postgres:") {
  console.error(`❌ SAFETY VIOLATION: Invalid database protocol '${protocol}'. Expected 'postgresql:' or 'postgres:'.`);
  process.exit(1);
}

const rawHost = parsedUrl.hostname.toLowerCase();
const normalizedHost = rawHost.replace(/^\[|\]$/g, "");
const ALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

if (!ALLOWED_LOCAL_HOSTS.has(normalizedHost) || rawHost.includes("supabase")) {
  console.error(`❌ SAFETY VIOLATION: Target host '${parsedUrl.hostname}' is not an allowed local host.`);
  console.error("Clean migration tests must only run on an isolated local PostgreSQL instance (localhost, 127.0.0.1, or ::1).");
  console.error("Remote database hosts and Supabase instances are strictly prohibited.");
  process.exit(1);
}

const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
const dbName = pathParts.length > 0 ? pathParts[0] : "";
if (pathParts.length !== 1 || dbName !== "focusflow_clean_test") {
  console.error("❌ SAFETY VIOLATION: Target database name must be explicitly 'focusflow_clean_test'.");
  console.error(`Received database name: '${dbName || "(none)"}'.`);
  process.exit(1);
}

// Override DATABASE_URL before requiring db config
process.env.DATABASE_URL = testDbUrl;
const { pool } = require("./src/config/db");
const { runMigrations } = require("./src/config/migrate");

const EXPECTED_TABLES = [
  "users",
  "sessions",
  "activity_events",
  "domain_classifications",
  "user_plans",
  "plan_versions",
  "goals",
  "tasks",
  "calendar_events",
  "achievement_definitions",
  "user_achievements",
  "user_subscriptions",
  "billing_webhook_events",
  "user_feature_usage",
  "notifications",
];

async function runCleanMigrationVerification() {
  console.log("======================================================================");
  console.log("🧪 TESTING CLEAN DATABASE MIGRATION ON ISOLATED POSTGRESQL");
  console.log(`Target: Host='${parsedUrl.hostname}', Port=${parsedUrl.port || 5432}, DB='${dbName}'`);
  console.log("======================================================================\n");

  let testPassed = false;

  try {
    // 1. Verify connection
    const client = await pool.connect();
    console.log("✓ Connected to isolated test database");

    // 2. Verify public schema contains zero existing base tables before applying migrations
    let beforeTables;
    try {
      beforeTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
      `);
    } finally {
      client.release();
    }

    const initialTableNames = beforeTables.rows.map((r) => r.table_name);
    console.log(`✓ Initial state check: ${initialTableNames.length} existing base table(s) in public schema`);

    if (initialTableNames.length > 0) {
      throw new Error(
        `Safety check failed: Database 'public' schema is not clean. Expected 0 base tables, but found ${initialTableNames.length}: ${initialTableNames.join(", ")}. Aborting test safely.`
      );
    }
    console.log("✓ Greenfield database confirmed: public schema is completely clean");

    // 3. Execute migrations (first run)
    console.log("\n▶ Running full migration suite (initial run)...");
    await runMigrations();
    console.log("✓ Migration execution finished without unhandled errors");

    // 4. Verify all expected tables exist
    const afterTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const createdTables = new Set(afterTablesResult.rows.map((r) => r.table_name));

    console.log(`\n▶ Verifying required tables created (found ${createdTables.size} tables in public schema):`);
    for (const tableName of EXPECTED_TABLES) {
      assert.equal(
        createdTables.has(tableName),
        true,
        `Table '${tableName}' must exist in isolated database after migration`
      );
      console.log(`  ✓ Table '${tableName}' verified`);
    }

    // 5. Verify default achievements seeded
    const achCount = await pool.query("SELECT COUNT(*) FROM achievement_definitions");
    assert.ok(
      Number(achCount.rows[0].count) >= 6,
      "achievement_definitions must be seeded with default achievements"
    );
    console.log(`✓ Achievement definitions seeded (${achCount.rows[0].count} definitions verified)`);

    // 6. Test Idempotency: Reload migration module so its SQL executes again
    console.log("\n▶ Verifying migration idempotency (second run with reloaded module)...");
    delete require.cache[require.resolve("./src/config/migrate")];
    const { runMigrations: runMigrationsSecondRun } = require("./src/config/migrate");
    await runMigrationsSecondRun();
    console.log("✓ Second migration execution succeeded cleanly (idempotent DDL confirmed)");

    // Verify all expected tables remain present after second run
    const afterSecondResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tablesAfterSecondRun = new Set(afterSecondResult.rows.map((r) => r.table_name));
    for (const tableName of EXPECTED_TABLES) {
      assert.equal(
        tablesAfterSecondRun.has(tableName),
        true,
        `Table '${tableName}' must still exist after idempotent re-run`
      );
    }

    const achCountSecond = await pool.query("SELECT COUNT(*) FROM achievement_definitions");
    assert.equal(
      Number(achCountSecond.rows[0].count),
      Number(achCount.rows[0].count),
      "Achievement definitions count must remain unchanged after idempotent re-run"
    );
    console.log(`✓ Data integrity verified after second run (${achCountSecond.rows[0].count} achievement definitions retained)`);

    console.log("\n======================================================================");
    console.log("🎉 CLEAN-DATABASE MIGRATION TEST PASSED (100% VERIFIED) ✅");
    console.log("======================================================================\n");
    testPassed = true;
  } catch (err) {
    console.error("\n❌ Clean migration test failed:", sanitizeError(err));
    testPassed = false;
  } finally {
    // Ensure the PostgreSQL pool is closed cleanly before exiting on both success and failure
    try {
      await pool.end();
      console.log("✓ Database pool closed cleanly");
    } catch (poolErr) {
      console.warn("⚠️ Warning closing database pool:", sanitizeError(poolErr));
    }
  }

  if (!testPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCleanMigrationVerification().catch((fatalErr) => {
  console.error("❌ Fatal runner error:", sanitizeError(fatalErr));
  process.exit(1);
});
