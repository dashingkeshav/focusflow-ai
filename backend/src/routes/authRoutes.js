const express = require("express");

const router = express.Router();

const authController =
  require("../controllers/authController");


// =====================================================
// AUTH ROUTES
// =====================================================

// Register
router.post(
  "/register",
  authController.register
);

// Login
router.post(
  "/login",
  authController.login
);

// Forgot password
router.post(
  "/forgot-password",
  authController.forgotPassword
);

// Verify password reset OTP
router.post(
  "/verify-otp",
  authController.verifyOTP
);

// Reset password
router.post(
  "/reset-password",
  authController.resetPassword
);


module.exports = router;