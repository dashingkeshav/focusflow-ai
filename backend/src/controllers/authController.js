const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const {
  sendLoginEmail,
  sendWelcomeEmail,
  sendPasswordResetOTPEmail,
  sendPasswordChangedEmail,
} = require("../utils/emailService");

const {
  validateEmail,
  getPasswordErrors,
  sanitizeEmail,
} = require("../utils/validation");

const {
  generateOTPWithExpiry,
  verifyOTP,
} = require("../utils/otpService");


// =====================================================
// CONFIG
// =====================================================

const { getValidatedJwtSecret } = require("../utils/jwtSecurity");
const JWT_SECRET = getValidatedJwtSecret();


// =====================================================
// BRUTE-FORCE / EMAIL-BOMB GUARDS (in-memory, single instance)
// =====================================================

const OTP_MAX_ATTEMPTS = 5;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 3;

const otpFailedAttempts = new Map();
const otpRequestTimestamps = new Map();

function getRecentOtpRequests(email) {
  const now = Date.now();
  const stamps = (otpRequestTimestamps.get(email) || []).filter(
    (t) => now - t < OTP_REQUEST_WINDOW_MS
  );
  otpRequestTimestamps.set(email, stamps);
  return stamps;
}

function isOtpLocked(email) {
  return (otpFailedAttempts.get(email) || 0) >= OTP_MAX_ATTEMPTS;
}

function recordOtpFailure(email) {
  otpFailedAttempts.set(email, (otpFailedAttempts.get(email) || 0) + 1);
}

function clearOtpFailures(email) {
  otpFailedAttempts.delete(email);
}


// =====================================================
// HELPER
// =====================================================

function createToken(user) {
  return jwt.sign(
    {
      id: user.id || user._id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function safeUserResponse(user, planInfo = { plan: "free", isPro: false }) {
  return {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    dailyGoalHours: user.dailyGoalHours ?? 4,
    streakDays: user.streakDays ?? 0,
    emailVerified: Boolean(user.emailVerified),
    onboardingCompleted: Boolean(user.onboardingCompleted),
    onboardingAnswers: user.onboardingAnswers || null,
    plan: planInfo.plan || "free",
    isPro: Boolean(planInfo.isPro),
  };
}


// =====================================================
// REGISTER
// =====================================================

exports.register = async (req, res) => {
  try {

    const {
      name,
      email,
      password,
      confirmPassword,
    } = req.body;


    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }


    // -------------------------------------------------
    // NAME
    // -------------------------------------------------

    const cleanName = String(name).trim();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters",
      });
    }


    // -------------------------------------------------
    // EMAIL
    // -------------------------------------------------

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid email address",
      });
    }

    const sanitizedEmail =
      sanitizeEmail(email);


    // -------------------------------------------------
    // PASSWORD
    // -------------------------------------------------

    const passwordErrors =
      getPasswordErrors(password);

    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Password is too weak",
        errors: passwordErrors,
      });
    }


    // -------------------------------------------------
    // PASSWORD MATCH
    // -------------------------------------------------

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }


    // -------------------------------------------------
    // EXISTING USER
    // -------------------------------------------------

    const existingUser =
      await User.findOne({
        email: sanitizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this email",
      });
    }


    // -------------------------------------------------
    // HASH PASSWORD
    // -------------------------------------------------

    const hashedPassword =
      await bcrypt.hash(password, 12);


    // -------------------------------------------------
    // CREATE USER
    // -------------------------------------------------

    const user = await User.create({
      name: cleanName,

      email: sanitizedEmail,

      password: hashedPassword,

      dailyGoalHours: 4,

      streakDays: 0,

      emailVerified: true,
    });


    // -------------------------------------------------
    // JWT
    // -------------------------------------------------

    const token =
      createToken(user);


    // -------------------------------------------------
    // WELCOME EMAIL (awaited so failures are reported honestly)
    // -------------------------------------------------

    let welcomeEmailSent = false;

    try {
      const emailPromise = sendWelcomeEmail(sanitizedEmail, cleanName);
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ success: false, timedOut: true }), 4000));
      const emailRes = await Promise.race([emailPromise, timeoutPromise]);
      welcomeEmailSent = Boolean(emailRes?.success);
    } catch (emailError) {
      console.error(
        "Registration welcome email failed:",
        emailError?.message ||
          emailError
      );
    }


    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(201).json({

      success: true,

      message:
        welcomeEmailSent
          ? "Registration successful. A welcome email has been sent to your inbox."
          : "Registration successful. (Welcome email could not be sent right now.)",

      emailSent: welcomeEmailSent,

      token,

      user:
        safeUserResponse(user),
    });


  } catch (error) {

    console.error(
      "Register error:",
      error
    );


    // PostgreSQL unique constraint
    if (
      error.code === "23505"
    ) {

      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this email",
      });
    }


    return res.status(500).json({

      success: false,

      message:
        "Registration failed. Please try again.",
    });
  }
};


// =====================================================
// LOGIN
// =====================================================

exports.login = async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;


    // -------------------------------------------------
    // REQUIRED
    // -------------------------------------------------

    if (!email || !password) {

      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }


    // -------------------------------------------------
    // EMAIL VALIDATION
    // -------------------------------------------------

    if (!validateEmail(email)) {

      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid email address",
      });
    }


    const sanitizedEmail =
      sanitizeEmail(email);


    // -------------------------------------------------
    // FIND USER
    // -------------------------------------------------

    const user =
      await User.findOne({
        email: sanitizedEmail,
      });


    if (!user) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }


    // -------------------------------------------------
    // PASSWORD
    // -------------------------------------------------

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!validPassword) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }


    // -------------------------------------------------
    // UPDATE LAST LOGIN
    // -------------------------------------------------

    user.lastLogin =
      new Date();

    await user.save();


    // -------------------------------------------------
    // TOKEN
    // -------------------------------------------------

    const token =
      createToken(user);


    // -------------------------------------------------
    // LOGIN EMAIL (async, non-blocking)
    // -------------------------------------------------

    // Send login notification email asynchronously without blocking the response
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    sendLoginEmail(
      sanitizedEmail,
      user.name,
      {
        ip: clientIp,
        userAgent: userAgent,
        timestamp: new Date().toUTCString(),
      }
    ).then(() => {
      console.log(
        "Login confirmation email sent to:",
        sanitizedEmail
      );
    }).catch((emailError) => {
      console.warn(
        "Login confirmation email failed:",
        emailError?.message ||
          emailError
      );
    });


    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    const { getUserPlan } = require("../utils/entitlements");
    const planInfo = await getUserPlan(user.id || user._id);

    return res.status(200).json({

      success: true,

      message:
        "Login successful",

      token,

      user:
        safeUserResponse(user, planInfo),
    });


  } catch (error) {

    console.error(
      "Login error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Login failed. Please try again.",
    });
  }
};


// =====================================================
// FORGOT PASSWORD
// =====================================================

exports.forgotPassword = async (req, res) => {

  try {

    const { email } = req.body;


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!email) {

      return res.status(400).json({
        success: false,
        message:
          "Email is required",
      });
    }


    if (!validateEmail(email)) {

      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid email address",
      });
    }


    const sanitizedEmail =
      sanitizeEmail(email);


    // -------------------------------------------------
    // FIND USER
    // -------------------------------------------------

    const user =
      await User.findOne({
        email: sanitizedEmail,
      });


    /*
     * Do not reveal whether an account exists.
     */

    const genericMessage =
      "If an account exists with this email, you will receive a password reset code shortly.";


    if (!user) {

      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }


    // -------------------------------------------------
    // REQUEST THROTTLE (prevents email bombing)
    // -------------------------------------------------

    const recentRequests =
      getRecentOtpRequests(sanitizedEmail);

    if (recentRequests.length >= OTP_MAX_REQUESTS_PER_WINDOW) {

      return res.status(429).json({
        success: false,
        message:
          "Too many password reset requests. Please try again in a few minutes.",
      });
    }

    recentRequests.push(Date.now());

    otpRequestTimestamps.set(
      sanitizedEmail,
      recentRequests
    );


    // -------------------------------------------------
    // GENERATE OTP
    // -------------------------------------------------

    const {
      otp,
      expiry,
    } =
      generateOTPWithExpiry(15);


    // -------------------------------------------------
    // SAVE OTP
    // -------------------------------------------------

    user.resetOTP = otp;

    user.resetOTPExpire =
      new Date(expiry);


    await user.save();


    // -------------------------------------------------
    // SEND RESET EMAIL (awaited — supports SMTP and Resend)
    // -------------------------------------------------

    let emailRes = null;
    try {
      emailRes = await sendPasswordResetOTPEmail(
        sanitizedEmail,
        otp,
        user.name
      );
    } catch (emailError) {
      console.error(
        "Password reset email failed:",
        emailError?.message ||
          emailError
      );

      user.resetOTP = null;
      user.resetOTPExpire = null;

      await user.save().catch(() => {});

      return res.status(500).json({
        success: false,
        message:
          "Failed to send the password reset email. Please try again in a moment.",
      });
    }

    console.log(
      `Password reset OTP generated for: ${sanitizedEmail} (Provider: ${emailRes?.provider || "default"})`
    );

    const isDev = process.env.NODE_ENV !== "production";
    const isSimulated = emailRes?.simulated;

    return res.status(200).json({
      success: true,
      message: isSimulated
        ? "Password reset code generated. (Check server logs or configure Gmail SMTP to receive direct emails)."
        : "If an account exists with this email, you will receive a password reset code shortly.",
      emailSent: Boolean(emailRes?.success),
      ...(isDev && isSimulated ? { debugOtp: otp } : {}),
    });


  } catch (error) {

    console.error(
      "Forgot password error:",
      error
    );


    /*
     * Generic response also helps prevent account
     * enumeration.
     */

    return res.status(200).json({

      success: true,

      message:
        "If an account exists with this email, you will receive a password reset code shortly.",
    });
  }
};


// =====================================================
// VERIFY OTP
// =====================================================

exports.verifyOTP = async (req, res) => {

  try {

    const {
      email,
      otp,
    } = req.body;


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!email || !otp) {

      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }


    if (!validateEmail(email)) {

      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid email address",
      });
    }


    const sanitizedEmail =
      sanitizeEmail(email);


    // -------------------------------------------------
    // FIND USER
    // -------------------------------------------------

    const user =
      await User.findOne({
        email: sanitizedEmail,
      });


    if (!user) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }


    // -------------------------------------------------
    // BRUTE-FORCE LOCKOUT
    // -------------------------------------------------

    if (isOtpLocked(sanitizedEmail)) {

      return res.status(429).json({
        success: false,
        message:
          "Too many invalid attempts. Please request a new code.",
      });
    }


    // -------------------------------------------------
    // VERIFY
    // -------------------------------------------------

    const verification =
      verifyOTP(
        String(otp),
        user.resetOTP,
        user.resetOTPExpire
      );


    if (!verification.valid) {

      recordOtpFailure(sanitizedEmail);

      return res.status(400).json({
        success: false,
        message:
          verification.message ||
          "Invalid or expired OTP",
      });
    }


    clearOtpFailures(sanitizedEmail);


    return res.status(200).json({

      success: true,

      message:
        "OTP verified successfully. You can now reset your password.",
    });


  } catch (error) {

    console.error(
      "Verify OTP error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Failed to verify OTP. Please try again.",
    });
  }
};


// =====================================================
// RESET PASSWORD
// =====================================================

exports.resetPassword = async (req, res) => {

  try {

    const {
      email,
      otp,
      newPassword,
      confirmPassword,
    } = req.body;


    // -------------------------------------------------
    // REQUIRED
    // -------------------------------------------------

    if (
      !email ||
      !otp ||
      !newPassword ||
      !confirmPassword
    ) {

      return res.status(400).json({
        success: false,
        message:
          "All fields are required",
      });
    }


    // -------------------------------------------------
    // EMAIL
    // -------------------------------------------------

    if (!validateEmail(email)) {

      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid email address",
      });
    }


    // -------------------------------------------------
    // PASSWORD STRENGTH
    // -------------------------------------------------

    const passwordErrors =
      getPasswordErrors(
        newPassword
      );


    if (passwordErrors.length > 0) {

      return res.status(400).json({

        success: false,

        message:
          "Password is too weak",

        errors:
          passwordErrors,
      });
    }


    // -------------------------------------------------
    // PASSWORD MATCH
    // -------------------------------------------------

    if (
      newPassword !==
      confirmPassword
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match",
      });
    }


    const sanitizedEmail =
      sanitizeEmail(email);


    // -------------------------------------------------
    // FIND USER
    // -------------------------------------------------

    const user =
      await User.findOne({
        email: sanitizedEmail,
      });


    if (!user) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }


    // -------------------------------------------------
    // BRUTE-FORCE LOCKOUT
    // -------------------------------------------------

    if (isOtpLocked(sanitizedEmail)) {

      return res.status(429).json({
        success: false,
        message:
          "Too many invalid attempts. Please request a new code.",
      });
    }


    // -------------------------------------------------
    // VERIFY OTP AGAIN
    // -------------------------------------------------

    const verification =
      verifyOTP(
        String(otp),
        user.resetOTP,
        user.resetOTPExpire
      );


    if (!verification.valid) {

      recordOtpFailure(sanitizedEmail);

      return res.status(400).json({
        success: false,
        message:
          verification.message ||
          "Invalid or expired OTP",
      });
    }


    clearOtpFailures(sanitizedEmail);


    // -------------------------------------------------
    // HASH NEW PASSWORD
    // -------------------------------------------------

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      );


    // -------------------------------------------------
    // UPDATE USER
    // -------------------------------------------------

    user.password =
      hashedPassword;

    user.resetOTP =
      null;

    user.resetOTPExpire =
      null;

    user.resetToken =
      null;

    user.resetTokenExpire =
      null;

    user.updatedAt =
      new Date();


    await user.save();


    // -------------------------------------------------
    // SEND PASSWORD CHANGED CONFIRMATION EMAIL (awaited, non-fatal)
    // -------------------------------------------------

    let changeEmailSent = false;

    try {
      await sendPasswordChangedEmail(
        sanitizedEmail,
        user.name
      );
      changeEmailSent = true;
    } catch (emailError) {
      console.error(
        "Password changed email failed:",
        emailError?.message || emailError
      );
    }


    // -------------------------------------------------
    // SUCCESS
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      emailSent: changeEmailSent,

      message:
        "Password has been reset successfully. You can now login with your new password.",
    });


  } catch (error) {

    console.error(
      "Reset password error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Failed to reset password. Please try again.",
    });
  }
};


// =====================================================
// COMPLETE ONBOARDING
// =====================================================

exports.completeOnboarding = async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user with onboarding data using direct SQL to avoid model issues
    const { pool } = require("../config/db");
    await pool.query(
      `
      UPDATE users
      SET onboarding_completed = true,
          onboarding_answers = $1
      WHERE id = $2
      `,
      [
        Array.isArray(answers) ? JSON.stringify(answers) : null,
        userId
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete onboarding. Please try again.",
    });
  }
};


// =====================================================
// GET ONBOARDING STATUS
// =====================================================

exports.getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      onboardingCompleted: Boolean(user.onboardingCompleted),
      onboardingAnswers: user.onboardingAnswers || null,
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get onboarding status. Please try again.",
    });
  }
};

// =====================================================
// GET CURRENT USER (session verification)
// =====================================================

exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists.",
      });
    }

    const { getUserPlan } = require("../utils/entitlements");
    const planInfo = await getUserPlan(user.id || user._id);

    return res.status(200).json({
      success: true,
      user: safeUserResponse(user, planInfo),
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify session.",
    });
  }
};
