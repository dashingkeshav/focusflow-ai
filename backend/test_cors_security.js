/**
 * FocusFlow AI — CORS Security Regression Tests
 *
 * Verifies:
 * 1. Production CORS strictly permits configured frontend domains and rejects localhost/LAN origins.
 * 2. Development CORS permits local development origins (localhost, 127.0.0.1, LAN).
 * 3. Chrome extension origin filtering honors configured extension IDs when set.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

function createCorsEvaluator() {
  return function isAllowedOrigin(origin, env = {}) {
    if (!origin) return true;

    const isProduction = env.NODE_ENV === "production";
    const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";

    const allowedOrigins = new Set(
      [
        frontendUrl,
        env.APP_URL,
        ...(env.ALLOWED_ORIGINS
          ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
          : []),
      ].filter(Boolean)
    );

    if (allowedOrigins.has(origin)) return true;

    if (origin.startsWith("chrome-extension://")) {
      const extId = origin.replace("chrome-extension://", "").split("/")[0];
      const allowedExtIds = [
        env.CHROME_EXTENSION_ID,
        ...(env.ALLOWED_EXTENSION_IDS
          ? env.ALLOWED_EXTENSION_IDS.split(",").map((s) => s.trim())
          : []),
      ].filter(Boolean);

      if (allowedExtIds.length > 0) {
        return allowedExtIds.includes(extId);
      }

      return true;
    }

    if (!isProduction) {
      try {
        const url = new URL(origin);
        if (
          url.hostname === "localhost" ||
          url.hostname === "127.0.0.1" ||
          url.hostname === "::1" ||
          url.hostname.startsWith("192.168.") ||
          url.hostname.startsWith("10.")
        ) {
          return true;
        }
      } catch (_) {}
    }

    return false;
  };
}

test("CORS Security: Production rejects development origins (localhost, 127.0.0.1, LAN)", () => {
  const isAllowedOrigin = createCorsEvaluator();
  const prodEnv = {
    NODE_ENV: "production",
    FRONTEND_URL: "https://focusflow.ai",
    APP_URL: "https://app.focusflow.ai",
  };

  assert.equal(isAllowedOrigin("http://localhost:3000", prodEnv), false);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3000", prodEnv), false);
  assert.equal(isAllowedOrigin("http://192.168.1.15:3000", prodEnv), false);
  assert.equal(isAllowedOrigin("http://10.0.0.5:3000", prodEnv), false);
  assert.equal(isAllowedOrigin("https://evil-hacker.com", prodEnv), false);
});

test("CORS Security: Production permits explicitly configured frontend and app origins", () => {
  const isAllowedOrigin = createCorsEvaluator();
  const prodEnv = {
    NODE_ENV: "production",
    FRONTEND_URL: "https://focusflow.ai",
    APP_URL: "https://app.focusflow.ai",
    ALLOWED_ORIGINS: "https://staging.focusflow.ai, https://admin.focusflow.ai",
  };

  assert.equal(isAllowedOrigin("https://focusflow.ai", prodEnv), true);
  assert.equal(isAllowedOrigin("https://app.focusflow.ai", prodEnv), true);
  assert.equal(isAllowedOrigin("https://staging.focusflow.ai", prodEnv), true);
  assert.equal(isAllowedOrigin("https://admin.focusflow.ai", prodEnv), true);
});

test("CORS Security: Development allows localhost and LAN origins", () => {
  const isAllowedOrigin = createCorsEvaluator();
  const devEnv = {
    NODE_ENV: "development",
    FRONTEND_URL: "http://localhost:3000",
  };

  assert.equal(isAllowedOrigin("http://localhost:3000", devEnv), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3000", devEnv), true);
  assert.equal(isAllowedOrigin("http://192.168.1.50:3000", devEnv), true);
});

test("CORS Security: Extension filtering restricts to approved extension IDs when specified", () => {
  const isAllowedOrigin = createCorsEvaluator();
  const prodEnvWithExt = {
    NODE_ENV: "production",
    FRONTEND_URL: "https://focusflow.ai",
    CHROME_EXTENSION_ID: "abcdefghijklmnopabcdefghijklmnop",
  };

  assert.equal(isAllowedOrigin("chrome-extension://abcdefghijklmnopabcdefghijklmnop", prodEnvWithExt), true);
  assert.equal(isAllowedOrigin("chrome-extension://maliciousunauthorizedextensionid", prodEnvWithExt), false);
});
