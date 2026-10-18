/**
 * FocusFlow AI — JWT Secret Security Regression Tests
 *
 * Verifies:
 * 1. Missing JWT_SECRET throws a fatal error in production.
 * 2. Insecure/default placeholder secrets throw a fatal error in production.
 * 3. Short secrets (< 32 chars) throw a fatal error in production.
 * 4. High-entropy, strong secrets (>= 32 chars) pass validation in production.
 * 5. Development mode allows fallback with security warning.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { getValidatedJwtSecret, INSECURE_PLACEHOLDERS } = require("./src/utils/jwtSecurity");

test("JWT Security: Missing JWT_SECRET throws in production", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";

    assert.throws(
      () => getValidatedJwtSecret(),
      /FATAL SECURITY VIOLATION: JWT_SECRET environment variable is not configured/
    );
  } finally {
    process.env.JWT_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("JWT Security: Default/placeholder secrets throw in production", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = "production";

    for (const placeholder of INSECURE_PLACEHOLDERS) {
      process.env.JWT_SECRET = placeholder;
      assert.throws(
        () => getValidatedJwtSecret(),
        /FATAL SECURITY VIOLATION: Insecure or default placeholder JWT_SECRET detected/,
        `Expected placeholder '${placeholder}' to be rejected in production`
      );
    }
  } finally {
    process.env.JWT_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("JWT Security: Short secret (< 32 chars) throws in production", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "short_secret_only_24_chars";

    assert.throws(
      () => getValidatedJwtSecret(),
      /FATAL SECURITY VIOLATION: JWT_SECRET is too short for production/
    );
  } finally {
    process.env.JWT_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("JWT Security: Strong high-entropy secret (>= 32 chars) passes in production", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = "production";
    const strongSecret = "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f";
    process.env.JWT_SECRET = strongSecret;

    const validated = getValidatedJwtSecret();
    assert.equal(validated, strongSecret);
  } finally {
    process.env.JWT_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("JWT Security: Development mode allows fallback with warning when unset", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "development";

    const secret = getValidatedJwtSecret();
    assert.equal(typeof secret, "string");
    assert.equal(secret.length > 0, true);
  } finally {
    process.env.JWT_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  }
});
