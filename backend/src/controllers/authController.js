const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendLoginEmail, sendPasswordResetOTPEmail } = require('../utils/emailService');
const { validateEmail, validatePassword, getPasswordErrors, sanitizeEmail } = require('../utils/validation');
const { generateOTPWithExpiry, verifyOTP } = require('../utils/otpService');

exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate all fields
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Validate password strength
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is too weak',
        errors: passwordErrors 
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = await User.create({ 
      name: name.trim(), 
      email: sanitizedEmail, 
      password: hashedPassword,
      emailVerified: true
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'focusflow_ai_phase2_secret_key_2026',
      { expiresIn: '7d' }
    );

    // Send login email (non-blocking - don't fail registration if email fails)
    try {
      await sendLoginEmail(sanitizedEmail, name);
    } catch (e) {
      console.warn('Registration: failed to send welcome email', e && e.message ? e.message : e);
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! A confirmation email has been sent.',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        dailyGoalHours: user.dailyGoalHours 
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Find user by email
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'focusflow_ai_phase2_secret_key_2026',
      { expiresIn: '7d' }
    );

    // Send login confirmation email (do not block login if email sending fails)
    try {
      await sendLoginEmail(sanitizedEmail, user.name);
    } catch (e) {
      console.warn('Login: failed to send confirmation email', e && e.message ? e.message : e);
    }

    return res.json({
      success: true,
      message: 'Login successful! A confirmation email has been sent.',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        dailyGoalHours: user.dailyGoalHours 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);
    console.log('ForgotPassword: received request for', sanitizedEmail);

    // Find user (handle DB connectivity issues gracefully)
    let user;
    try {
      user = await User.findOne({ email: sanitizedEmail });
      console.log('ForgotPassword: user lookup result:', !!user);
    } catch (dbErr) {
      console.warn('ForgotPassword: database lookup failed, returning generic success to avoid leaking info', dbErr && dbErr.message ? dbErr.message : dbErr);
      return res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset code shortly.' 
      });
    }

    if (!user) {
      // Don't reveal if email exists for security reasons
      return res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset code shortly.' 
      });
    }

    // Generate OTP (6-digit code valid for 15 minutes)
    const { otp, expiry } = generateOTPWithExpiry(15);
    
    // Save OTP to user
    user.resetOTP = otp;
    user.resetOTPExpire = new Date(expiry);
    
    try {
      await user.save();
      console.log(`ForgotPassword: OTP saved for ${sanitizedEmail}`);
    } catch (saveErr) {
      console.warn('ForgotPassword: failed to save OTP to DB, returning generic success', saveErr && saveErr.message ? saveErr.message : saveErr);
      return res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset code shortly.' 
      });
    }

    // Send reset OTP email (best-effort). Don't reveal email existence; respond success regardless.
    try {
      await sendPasswordResetOTPEmail(sanitizedEmail, otp, user.name);
      console.log(`ForgotPassword: OTP email sent to ${sanitizedEmail}`);
    } catch (e) {
      console.warn('ForgotPassword: failed to send reset OTP email', e && e.message ? e.message : e);
      // continue - still return success to the client for security
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Password reset code has been sent to your email. It expires in 15 minutes.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process password reset request.' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate inputs
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Find user
    let user;
    try {
      user = await User.findOne({ email: sanitizedEmail });
    } catch (dbErr) {
      console.error('VerifyOTP: database lookup failed', dbErr);
      return res.status(500).json({ success: false, message: 'Failed to verify OTP. Please try again.' });
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Verify OTP
    const verification = verifyOTP(otp.toString(), user.resetOTP, user.resetOTPExpire);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    // OTP is valid - return success
    return res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully. You can now reset your password.' 
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP. Please try again.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Validate password strength
    const passwordErrors = getPasswordErrors(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is too weak',
        errors: passwordErrors 
      });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Find user
    let user;
    try {
      user = await User.findOne({ email: sanitizedEmail });
    } catch (dbErr) {
      console.error('ResetPassword: database lookup failed', dbErr);
      return res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Verify OTP before resetting password
    const verification = verifyOTP(otp.toString(), user.resetOTP, user.resetOTPExpire);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    user.password = hashedPassword;
    user.resetOTP = null;
    user.resetOTPExpire = null;
    
    try {
      await user.save();
    } catch (saveErr) {
      console.error('ResetPassword: failed to save new password', saveErr);
      return res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
  }
};

