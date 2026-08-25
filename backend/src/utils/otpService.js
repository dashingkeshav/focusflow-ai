// OTP (One-Time Password) Utility for password resets

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate OTP with expiry time (15 minutes by default)
const generateOTPWithExpiry = (expiryMinutes = 15) => {
  const otp = generateOTP();
  const expiry = Date.now() + expiryMinutes * 60 * 1000;
  return { otp, expiry };
};

// Verify OTP (check if it matches and hasn't expired)
const verifyOTP = (providedOTP, storedOTP, expiry) => {
  if (!storedOTP || !expiry) {
    return { valid: false, message: 'OTP not found. Please request a new password reset.' };
  }

  if (Date.now() > expiry) {
    return { valid: false, message: 'OTP has expired. Please request a new password reset.' };
  }

  if (providedOTP !== storedOTP) {
    return { valid: false, message: 'Invalid OTP. Please try again.' };
  }

  return { valid: true, message: 'OTP verified successfully.' };
};

module.exports = {
  generateOTP,
  generateOTPWithExpiry,
  verifyOTP
};
