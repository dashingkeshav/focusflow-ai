/**
 * FocusFlow AI — JWT Secret Security Validation
 *
 * Enforces production security invariants for JWT authentication:
 * - In production: strictly requires a non-placeholder secret with minimum 32 characters.
 * - Fails safely with a fatal exception if missing or weak.
 * - In development/test: allows development secrets while issuing warnings.
 */

const INSECURE_PLACEHOLDERS = new Set([
  "change_this_secret_in_environment",
  "focusflow_ai_phase2_secret_key_2026",
  "secret",
  "secret123",
  "jwt_secret",
  "jwt_secret_key",
  "test_jwt_secret_key_12345",
  "default",
  "default_secret",
  "password",
  "admin",
  "12345678",
]);

function getValidatedJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      throw new Error(
        "FATAL SECURITY VIOLATION: JWT_SECRET environment variable is not configured. " +
        "A strong, random secret (minimum 32 characters) must be configured in production."
      );
    }
    console.warn("⚠️ [JWT Security Warning] JWT_SECRET is unset. Using temporary development fallback.");
    return "dev_fallback_secret_focusflow_2026_untrusted";
  }

  const normalized = secret.toLowerCase();
  if (isProduction) {
    if (INSECURE_PLACEHOLDERS.has(normalized)) {
      throw new Error(
        "FATAL SECURITY VIOLATION: Insecure or default placeholder JWT_SECRET detected in production. " +
        "You must configure a strong, unique secret in production environment variables."
      );
    }

    if (secret.length < 32) {
      throw new Error(
        `FATAL SECURITY VIOLATION: JWT_SECRET is too short for production (${secret.length} chars). ` +
        "Production JWT secrets must be at least 32 characters long with high entropy."
      );
    }
  }

  return secret;
}

module.exports = {
  getValidatedJwtSecret,
  INSECURE_PLACEHOLDERS,
};
