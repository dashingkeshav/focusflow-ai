const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const {
  sendLoginEmail,
  sendPasswordResetOTPEmail,
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

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "focusflow_ai_phase2_secret_key_2026";


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

function safeUserResponse(user) {
  return {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    dailyGoalHours: user.dailyGoalHours ?? 4,
    streakDays: user.streakDays ?? 0,
    emailVerified: Boolean(user.emailVerified),
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
    // WELCOME EMAIL
    // -------------------------------------------------

    try {

      await sendLoginEmail(
        sanitizedEmail,
        cleanName
      );

    } catch (emailError) {

      console.warn(
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
        "Registration successful",

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
    // LOGIN EMAIL
    // -------------------------------------------------

    try {

      await sendLoginEmail(
        sanitizedEmail,
        user.name
      );

    } catch (emailError) {

      console.warn(
        "Login confirmation email failed:",
        emailError?.message ||
          emailError
      );

    }


    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      message:
        "Login successful",

      token,

      user:
        safeUserResponse(user),
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
    // SEND RESET EMAIL
    // -------------------------------------------------

    try {

      await sendPasswordResetOTPEmail(
        sanitizedEmail,
        otp,
        user.name
      );

      console.log(
        "Password reset OTP sent to:",
        sanitizedEmail
      );

    } catch (emailError) {

      console.error(
        "Password reset email failed:",
        emailError?.message ||
          emailError
      );

      /*
       * Do not expose internal email errors.
       * Return the generic response.
       */
    }


    return res.status(200).json({

      success: true,

      message:
        "If an account exists with this email, you will receive a password reset code shortly.",
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
    // VERIFY
    // -------------------------------------------------

    const verification =
      verifyOTP(
        String(otp),
        user.resetOTP,
        user.resetOTPExpire
      );


    if (!verification.valid) {

      return res.status(400).json({
        success: false,
        message:
          verification.message ||
          "Invalid or expired OTP",
      });
    }


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
    // VERIFY OTP AGAIN
    // -------------------------------------------------

    const verification =
      verifyOTP(
        String(otp),
        user.resetOTP,
        user.resetOTPExpire
      );


    if (!verification.valid) {

      return res.status(400).json({
        success: false,
        message:
          verification.message ||
          "Invalid or expired OTP",
      });
    }


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
    // SUCCESS
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

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