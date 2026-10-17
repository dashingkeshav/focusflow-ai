const express = require("express");

const router = express.Router();

const authController =
  require("../controllers/authController");

const authMiddleware =
  require("../middleware/authMiddleware");


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

// Current user (session verification)
router.get(
  "/me",
  authMiddleware,
  authController.getMe
);

// Complete onboarding
router.post(
  "/complete-onboarding",
  authMiddleware,
  authController.completeOnboarding
);

// Get onboarding status
router.get(
  "/onboarding-status",
  authMiddleware,
  authController.getOnboardingStatus
);


module.exports = router;