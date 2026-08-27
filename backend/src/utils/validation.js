const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


function validateEmail(email) {
  if (
    typeof email !== "string"
  ) {
    return false;
  }

  return EMAIL_REGEX.test(
    email.trim()
  );
}


function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[@$!%*?&]/.test(password)
  );
}


function getPasswordErrors(password) {
  const errors = [];

  if (
    typeof password !== "string" ||
    password.length < 8
  ) {
    errors.push(
      "Password must be at least 8 characters long"
    );
  }

  if (!/[a-z]/.test(password)) {
    errors.push(
      "Password must contain at least one lowercase letter"
    );
  }

  if (!/[A-Z]/.test(password)) {
    errors.push(
      "Password must contain at least one uppercase letter"
    );
  }

  if (!/\d/.test(password)) {
    errors.push(
      "Password must contain at least one number"
    );
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (@$!%*?&)"
    );
  }

  return errors;
}


function sanitizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}


module.exports = {
  validateEmail,
  validatePassword,
  getPasswordErrors,
  sanitizeEmail,
};