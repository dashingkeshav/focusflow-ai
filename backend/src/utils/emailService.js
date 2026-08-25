const nodemailer = require('nodemailer');

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'your-email@gmail.com',
    pass: process.env.GMAIL_PASSWORD || 'your-app-password'
  }
});

// Send login confirmation email
const sendLoginEmail = async (email, userName) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Login Confirmation - FocusFlow AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 30px; border-radius: 10px; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome Back! 👋</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="margin: 0 0 20px 0; color: #333;">Hi <strong>${userName}</strong>,</p>
            <p style="margin: 0 0 20px 0; color: #555;">You have successfully logged in to your FocusFlow AI account. Your focus tracking session is ready to begin!</p>
            
            <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #06b6d4; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0369a1;">
                <strong>Login Details:</strong><br/>
                Email: ${email}<br/>
                Time: ${new Date().toLocaleString()}
              </p>
            </div>

            <p style="margin: 20px 0; color: #555;">If this wasn't you, please secure your account immediately by changing your password.</p>
            
            <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                Best regards,<br/>
                <strong>FocusFlow AI Team</strong><br/>
                <em>Your AI-Powered Study Focus Companion</em>
              </p>
            </div>
          </div>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #888;">
            <p style="margin: 0;">© 2026 FocusFlow AI. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Login email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending login email:', error);
    return false;
  }
};

// Send password reset OTP email
const sendPasswordResetOTPEmail = async (email, otp, userName) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Your Password Reset Code - FocusFlow AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 30px; border-radius: 10px; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset Code 🔐</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="margin: 0 0 20px 0; color: #333;">Hi <strong>${userName}</strong>,</p>
            <p style="margin: 0 0 20px 0; color: #555;">You requested to reset your password. Use the code below to proceed:</p>
            
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 30px 0;">
              <p style="margin: 0; color: white; font-size: 12px;">Your Reset Code:</p>
              <p style="margin: 10px 0 0 0; color: white; font-size: 48px; font-weight: bold; letter-spacing: 10px; font-family: monospace;">
                ${otp}
              </p>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>⏱️ This code expires in 15 minutes.</strong>
              </p>
            </div>

            <p style="margin: 20px 0; color: #555;">
              <strong>Security Tip:</strong> Never share this code with anyone. FocusFlow AI support will never ask for your reset code.
            </p>
            
            <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                Best regards,<br/>
                <strong>FocusFlow AI Team</strong><br/>
                <em>Your AI-Powered Study Focus Companion</em>
              </p>
            </div>
          </div>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #888;">
            <p style="margin: 0;">© 2026 FocusFlow AI. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    return false;
  }
};

module.exports = {
  sendLoginEmail,
  sendPasswordResetOTPEmail,
  transporter
};
