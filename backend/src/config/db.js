const { Pool } = require("pg");
const fs = require("fs");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured in backend environment variables.");
}

// Extract hostname for SNI servername in TLS negotiation and determine if local
let dbHostname = "";
let connectionString = process.env.DATABASE_URL;

try {
  const urlObj = new URL(process.env.DATABASE_URL);
  if (urlObj.hostname) {
    dbHostname = urlObj.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  }

  // Remove SSL-related query parameters that could conflict with or weaken explicit TLS configuration
  const sslParams = ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey"];
  let modified = false;
  for (const param of sslParams) {
    if (urlObj.searchParams.has(param)) {
      urlObj.searchParams.delete(param);
      modified = true;
    }
  }
  if (modified) {
    connectionString = urlObj.toString();
  }
} catch (_) {}

const isLocalHost =
  dbHostname === "localhost" ||
  dbHostname === "127.0.0.1" ||
  dbHostname === "::1";

const path = require("path");

// Provider-supported CA certificate loading via standard environment variables or built-in bundle
let caCert;
if (process.env.DATABASE_SSL_CA) {
  try {
    if (fs.existsSync(process.env.DATABASE_SSL_CA)) {
      caCert = fs.readFileSync(process.env.DATABASE_SSL_CA, "utf8");
    } else {
      caCert = process.env.DATABASE_SSL_CA;
    }
  } catch (_) {
    caCert = process.env.DATABASE_SSL_CA;
  }
} else if (process.env.PGSSLROOTCERT) {
  try {
    if (fs.existsSync(process.env.PGSSLROOTCERT)) {
      caCert = fs.readFileSync(process.env.PGSSLROOTCERT, "utf8");
    }
  } catch (_) {}
}

// Fallback to built-in Supabase trusted root and intermediate CA bundle if connecting to Supabase
if (!caCert) {
  const builtinCaPath = path.resolve(__dirname, "supabase-ca.pem");
  if (fs.existsSync(builtinCaPath)) {
    try {
      caCert = fs.readFileSync(builtinCaPath, "utf8");
    } catch (_) {}
  }
}

// In production, rejectUnauthorized defaults to true to strictly validate TLS certificates.
// Can be overridden in non-production environments if explicitly specified.
const isProduction = process.env.NODE_ENV === "production";
const rejectUnauthorized =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== undefined
    ? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true"
    : true;

const sslConfig = isLocalHost
  ? false
  : {
      rejectUnauthorized,
      ...(dbHostname ? { servername: dbHostname } : {}),
      ...(caCert ? { ca: caCert } : {}),
    };

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on("error", (err) => {
  console.warn("⚠️ [PostgreSQL Pool] Client warning:", err.message);
});

async function testDatabaseConnection(maxRetries = 3, retryDelayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT NOW() AS current_time");
        console.log("✅ Database connection successful:", result.rows[0].current_time);
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(
        `⚠️ Database connection attempt ${attempt}/${maxRetries} failed:`,
        err.message
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      } else {
        throw err;
      }
    }
  }
}

module.exports = {
  pool,
  testDatabaseConnection,
};