const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// =====================================================
// CONFIGURATION
// =====================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  "FocusFlow AI <onboarding@resend.dev>";

// Owner email registered with the Resend account (allowed by Resend sandbox)
const RESEND_OWNER_EMAIL = (
  process.env.RESEND_OWNER_EMAIL ||
  process.env.CONTACT_EMAIL ||
  "keerav2007@gmail.com"
).toLowerCase().trim();

// Gmail SMTP configuration (sends to ANY user without custom domain)
const GMAIL_USER = process.env.GMAIL_USER || process.env.EMAIL_USER || 'keshavkokre30@gmail.com';
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.EMAIL_PASS || 'lflqyymhyyjaixmf';

// Generic SMTP configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || GMAIL_PASS;

const APP_URL = process.env.APP_URL || "http://localhost:3000";

// =====================================================
// CLIENT INITIALIZATION
// =====================================================

let resendClient = null;
if (RESEND_API_KEY) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log("✅ Resend client initialized.");
  } catch (err) {
    console.warn("⚠️ Failed to initialize Resend client:", err.message);
  }
}

let nodemailerTransporter = null;

function initializeTransporter() {
  if (GMAIL_USER && GMAIL_PASS) {
    nodemailerTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS.replace(/\s+/g, ""), // strip spaces if copied from Google
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
    console.log(`✅ Nodemailer Gmail SMTP configured for: ${GMAIL_USER} (sends to ALL users)`);
    return;
  }

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    nodemailerTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log(`✅ Nodemailer custom SMTP configured: ${SMTP_HOST}:${SMTP_PORT}`);
    return;
  }
}

initializeTransporter();

// =====================================================
// STARTUP DIAGNOSTICS
// =====================================================

(() => {
  const hasSMTP = Boolean(nodemailerTransporter);
  const hasResend = Boolean(resendClient);
  const isSandboxFrom = RESEND_FROM_EMAIL.includes("onboarding@resend.dev");

  if (hasSMTP) {
    // Already logged inside initializeTransporter — nothing extra needed
    return;
  }

  if (hasResend && !isSandboxFrom) {
    console.log("✅ [Email] Resend configured with a verified domain — emails will deliver to ALL recipients.");
    return;
  }

  if (hasResend && isSandboxFrom) {
    console.warn("\n" + "⚠️".repeat(36));
    console.warn("⚠️  [EMAIL CONFIG WARNING]");
    console.warn("   Resend is using 'onboarding@resend.dev' (sandbox/test sender).");
    console.warn("   Emails will ONLY deliver to the Resend account owner email.");
    console.warn("   ALL OTHER USER EMAILS WILL BE BLOCKED BY RESEND.");
    console.warn("   To fix this, choose ONE of:");
    console.warn("   👉 Option A (Easiest): Add GMAIL_USER + GMAIL_APP_PASSWORD to backend/.env");
    console.warn("   👉 Option B: Verify a custom domain at resend.com/domains and set RESEND_FROM_EMAIL");
    console.warn("⚠️".repeat(36) + "\n");
    return;
  }

  console.warn("\n" + "-".repeat(70));
  console.warn("ℹ️  [EMAIL] No live email provider configured.");
  console.warn("   Emails will be SIMULATED (logged to console only — not delivered).");
  console.warn("   Set GMAIL_USER + GMAIL_APP_PASSWORD or RESEND_API_KEY in backend/.env");
  console.warn("-".repeat(70) + "\n");
})();

// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =====================================================
// CORE MULTI-PROVIDER SENDER
// =====================================================

async function sendEmail({ to, subject, html, text, replyTo, purpose = "notification", meta = {} }) {
  const recipientEmail = String(to).toLowerCase().trim();
  const fromAddress = GMAIL_USER
    ? `"FocusFlow AI" <${GMAIL_USER}>`
    : RESEND_FROM_EMAIL;

  // 1. Try Nodemailer SMTP first if configured (reaches ALL recipients worldwide)
  if (nodemailerTransporter) {
    try {
      const mailOptions = {
        from: fromAddress,
        to: recipientEmail,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, " "),
      };
      if (replyTo) {
        mailOptions.replyTo = replyTo;
      }
      const info = await nodemailerTransporter.sendMail(mailOptions);
      console.log(`✅ [Nodemailer SMTP] Email (${purpose}) sent to ${recipientEmail} [ID: ${info.messageId}]`);
      return { success: true, provider: "nodemailer", messageId: info.messageId };
    } catch (smtpErr) {
      console.error(`❌ [Nodemailer SMTP Error] Failed to send to ${recipientEmail}:`, smtpErr.message);
      // Fall through to try Resend if available
    }
  }

  // 2. Try Resend if configured
  if (resendClient) {
    const isSandboxDomain = RESEND_FROM_EMAIL.includes("onboarding@resend.dev");
    const isOwner = recipientEmail === RESEND_OWNER_EMAIL;

    // If sandbox domain and not owner, Resend will throw 403.
    // If not owner on sandbox domain, we can either attempt or preempt gracefully.
    try {
      const resendOptions = {
        from: RESEND_FROM_EMAIL,
        to: [recipientEmail],
        subject,
        html,
      };
      if (replyTo) {
        resendOptions.replyTo = replyTo;
      }
      const result = await resendClient.emails.send(resendOptions);

      if (!result || result.error) {
        const errorMsg = result?.error?.message || "Unknown Resend error";
        const isSandboxIssue =
          isSandboxDomain ||
          result?.error?.statusCode === 403 ||
          result?.error?.statusCode === 422 ||
          errorMsg.toLowerCase().includes("only send testing emails") ||
          errorMsg.toLowerCase().includes("testing email address");

        if (isSandboxIssue) {
          logSandboxRestrictionWarning(recipientEmail, purpose, meta);
          return {
            success: false,
            simulated: true,
            provider: "resend_sandbox_restricted",
            reason: errorMsg,
            meta,
          };
        }

        throw new Error(`Resend rejected email: ${errorMsg}`);
      }

      console.log(`✅ [Resend] Email (${purpose}) sent to ${recipientEmail} [ID: ${result.data?.id}]`);
      return { success: true, provider: "resend", id: result.data?.id };
    } catch (err) {
      const msg = err?.message || String(err);
      const isSandboxIssue =
        isSandboxDomain ||
        err?.statusCode === 403 ||
        err?.statusCode === 422 ||
        msg.toLowerCase().includes("only send testing emails") ||
        msg.toLowerCase().includes("testing email address") ||
        msg.toLowerCase().includes("validation_error");

      if (isSandboxIssue) {
        logSandboxRestrictionWarning(recipientEmail, purpose, meta);
        return {
          success: false,
          simulated: true,
          provider: "resend_sandbox_restricted",
          reason: msg,
          meta,
        };
      }

      console.error(`❌ [Resend Error] Failed to send email to ${recipientEmail}:`, msg);
      throw err;
    }
  }

  // 3. Fallback when neither SMTP nor Resend can deliver live
  logNoProviderWarning(recipientEmail, purpose, meta);
  return {
    success: false,
    simulated: true,
    provider: "simulated_console",
    meta,
  };
}

function logSandboxRestrictionWarning(recipient, purpose, meta) {
  console.log("\n" + "=".repeat(74));
  console.log("⚠️  [EMAIL ADVISORY: RESEND SANDBOX RESTRICTION]");
  console.log(`   Destination Recipient : ${recipient}`);
  console.log(`   Resend Account Owner  : ${RESEND_OWNER_EMAIL}`);
  console.log(`   Email Category        : ${purpose}`);
  if (meta?.otp) {
    console.log(`   🔑 GENERATED OTP CODE  : >>> ${meta.otp} <<<`);
  }
  console.log("   Notice: Resend's free 'onboarding@resend.dev' sender only delivers");
  console.log("   to the registered account owner. To send live emails to ANY user:");
  console.log("   👉 Option A (Recommended): Add GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env");
  console.log("   👉 Option B: Verify a custom domain at resend.com/domains");
  console.log("=".repeat(74) + "\n");
}

function logNoProviderWarning(recipient, purpose, meta) {
  console.log("\n" + "-".repeat(70));
  console.log(`ℹ️  [DEV EMAIL LOG - NO LIVE PROVIDER] To: ${recipient} | Type: ${purpose}`);
  if (meta?.otp) {
    console.log(`🔑 PASSWORD RESET CODE: ${meta.otp}`);
  }
  console.log("-".repeat(70) + "\n");
}

// =====================================================
// 1. SEND LOGIN NOTIFICATION EMAIL
// =====================================================

async function sendLoginEmail(email, userName, securityDetails = {}) {
  const safeName = escapeHtml(userName || "FocusFlow User");
  const safeEmail = escapeHtml(email);
  const loginTimeStr = securityDetails.timestamp || new Date().toUTCString();
  const ipAddress = escapeHtml(securityDetails.ip || "Client IP recorded");
  const userAgent = escapeHtml(securityDetails.userAgent || "Web Browser");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Login Detected — FocusFlow AI</title>
</head>
<body style="margin:0; padding:40px 20px; background:#08080c; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e4e4e7;">
  <div style="max-width:580px; margin:0 auto; background:#12121a; border:1px solid rgba(255,255,255,0.1); border-radius:20px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
    
    <div style="padding:32px; background:linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4); color:#ffffff;">
      <h1 style="margin:0; font-size:24px; font-weight:800; tracking-tight: -0.5px;">FocusFlow <span style="font-weight:300; opacity:0.9;">AI</span></h1>
      <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Security Alert: New Sign-In</p>
    </div>

    <div style="padding:32px; color:#e4e4e7;">
      <h2 style="margin:0 0 16px; font-size:18px; font-weight:700; color:#ffffff;">New login detected, ${safeName}</h2>
      <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#a1a1aa;">
        Your FocusFlow AI account was successfully accessed. If this was you, no further action is required.
      </p>

      <div style="margin:24px 0; padding:20px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#a78bfa; margin-bottom:12px;">Sign-In Details</div>
        <table style="width:100%; border-collapse:collapse; font-size:13px; color:#d4d4d8;">
          <tr>
            <td style="padding:6px 0; color:#71717a; width:110px;">Account:</td>
            <td style="padding:6px 0; font-weight:600; color:#ffffff;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#71717a;">Date & Time:</td>
            <td style="padding:6px 0; font-weight:500;">${loginTimeStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#71717a;">IP Address:</td>
            <td style="padding:6px 0; font-family:monospace;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#71717a;">Device/Browser:</td>
            <td style="padding:6px 0;">${userAgent}</td>
          </tr>
        </table>
      </div>

      <p style="margin:24px 0 0; font-size:12px; color:#71717a; line-height:1.5;">
        If you did not initiate this login, please reset your password immediately or contact your administrator.
      </p>
    </div>

    <div style="padding:16px 32px; background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); text-align:center; font-size:11px; color:#52525b;">
      FocusFlow AI Productivity Suite · Secure Authentication System
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail({
    to: email,
    subject: "New FocusFlow AI login detected",
    html,
    purpose: "login_notification",
    meta: { user: safeName, ip: ipAddress },
  });
}

// =====================================================
// 2. SEND WELCOME / REGISTRATION EMAIL
// =====================================================

async function sendWelcomeEmail(email, userName) {
  const safeName = escapeHtml(userName || "there");
  const safeEmail = escapeHtml(email);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to FocusFlow AI</title>
</head>
<body style="margin:0; padding:40px 20px; background:#08080c; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e4e4e7;">
  <div style="max-width:580px; margin:0 auto; background:#12121a; border:1px solid rgba(255,255,255,0.1); border-radius:20px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
    
    <div style="padding:36px 32px; background:linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4); color:#ffffff;">
      <h1 style="margin:0; font-size:26px; font-weight:800;">FocusFlow <span style="font-weight:300; opacity:0.9;">AI</span></h1>
      <p style="margin:8px 0 0; font-size:15px; opacity:0.95;">Your Intelligent Productivity Copilot</p>
    </div>

    <div style="padding:32px; color:#e4e4e7;">
      <h2 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#ffffff;">Welcome aboard, ${safeName}! 🎉</h2>
      <p style="margin:0 0 20px; font-size:14px; line-height:1.7; color:#a1a1aa;">
        Your account (<strong style="color:#ffffff;">${safeEmail}</strong>) has been successfully created. FocusFlow AI is designed to help you reach your goals with smart AI scheduling, camera focus monitoring, and distraction protection.
      </p>

      <div style="margin:24px 0; padding:20px; background:rgba(167,139,250,0.06); border:1px solid rgba(167,139,250,0.2); border-radius:14px;">
        <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#c4b5fd; margin-bottom:12px;">🚀 Quick Next Steps:</div>
        <ul style="margin:0; padding-left:20px; font-size:13px; line-height:1.8; color:#d4d4d8;">
          <li><strong>Complete Onboarding:</strong> Tailor your focus window and daily goal hours.</li>
          <li><strong>Try AI Planner:</strong> Break down large goals into practical, time-blocked schedules.</li>
          <li><strong>Enable Focus Monitoring:</strong> Use camera insights to maintain high focus scores.</li>
        </ul>
      </div>

      <div style="text-align:center; margin-top:28px;">
        <a href="${APP_URL}/dashboard" style="display:inline-block; padding:12px 28px; background:linear-gradient(135deg, #7c3aed, #4f46e5); color:#ffffff; font-size:14px; font-weight:700; border-radius:12px; text-decoration:none;">Open FocusFlow Dashboard →</a>
      </div>
    </div>

    <div style="padding:16px 32px; background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); text-align:center; font-size:11px; color:#52525b;">
      FocusFlow AI Productivity Suite · Welcome Confirmation
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail({
    to: email,
    subject: "Welcome to FocusFlow AI",
    html,
    purpose: "welcome_registration",
    meta: { user: safeName },
  });
}

// =====================================================
// 3. SEND PASSWORD RESET OTP EMAIL
// =====================================================

async function sendPasswordResetOTPEmail(email, otp, userName) {
  const safeName = escapeHtml(userName || "User");
  const safeEmail = escapeHtml(email);
  const safeOtp = escapeHtml(otp);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FocusFlow AI Password Reset</title>
</head>
<body style="margin:0; padding:40px 20px; background:#08080c; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e4e4e7;">
  <div style="max-width:580px; margin:0 auto; background:#12121a; border:1px solid rgba(255,255,255,0.1); border-radius:20px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
    
    <div style="padding:32px; background:linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4); color:#ffffff;">
      <h1 style="margin:0; font-size:24px; font-weight:800;">FocusFlow <span style="font-weight:300; opacity:0.9;">AI</span></h1>
      <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Password Reset Verification Code</p>
    </div>

    <div style="padding:32px; color:#e4e4e7;">
      <h2 style="margin:0 0 16px; font-size:18px; font-weight:700; color:#ffffff;">Hello ${safeName},</h2>
      <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#a1a1aa;">
        We received a request to reset your FocusFlow AI password for <strong style="color:#ffffff;">${safeEmail}</strong>. Use the security code below:
      </p>

      <div style="margin:28px 0; padding:24px; text-align:center; border-radius:16px; background:linear-gradient(135deg, #7c3aed, #06b6d4);">
        <div style="color:#ffffff; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase;">YOUR VERIFICATION CODE</div>
        <div style="margin-top:10px; color:#ffffff; font-size:42px; font-weight:800; letter-spacing:8px; font-family:monospace;">${safeOtp}</div>
      </div>

      <div style="padding:14px; background:rgba(249,115,22,0.1); border:1px solid rgba(249,115,22,0.3); color:#fdba74; border-radius:10px; font-size:13px; line-height:1.5;">
        ⚠️ This code expires in <strong>15 minutes</strong>. Do not share it with anyone.
      </div>

      <p style="margin-top:24px; color:#71717a; font-size:12px;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>

    <div style="padding:16px 32px; background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); text-align:center; font-size:11px; color:#52525b;">
      FocusFlow AI Productivity Suite · Account Security
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail({
    to: email,
    subject: "Password Reset Code - FocusFlow AI",
    html,
    purpose: "password_reset_otp",
    meta: { otp: safeOtp, user: safeName },
  });
}

// =====================================================
// 4. SEND PASSWORD CHANGED CONFIRMATION EMAIL
// =====================================================

async function sendPasswordChangedEmail(email, userName) {
  const safeName = escapeHtml(userName || "User");
  const safeEmail = escapeHtml(email);
  const changeTimeStr = new Date().toUTCString();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Changed — FocusFlow AI</title>
</head>
<body style="margin:0; padding:40px 20px; background:#08080c; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e4e4e7;">
  <div style="max-width:580px; margin:0 auto; background:#12121a; border:1px solid rgba(255,255,255,0.1); border-radius:20px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
    <div style="padding:32px; background:linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4); color:#ffffff;">
      <h1 style="margin:0; font-size:24px; font-weight:800;">FocusFlow <span style="font-weight:300; opacity:0.9;">AI</span></h1>
      <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Password Changed Successfully</p>
    </div>
    <div style="padding:32px; color:#e4e4e7;">
      <h2 style="margin:0 0 16px; font-size:18px; font-weight:700; color:#ffffff;">Your password has been updated, ${safeName}</h2>
      <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#a1a1aa;">
        The password for your FocusFlow AI account (<strong style="color:#ffffff;">${safeEmail}</strong>) was successfully changed.
      </p>
      <div style="margin:24px 0; padding:20px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#a78bfa; margin-bottom:12px;">Change Details</div>
        <table style="width:100%; border-collapse:collapse; font-size:13px; color:#d4d4d8;">
          <tr><td style="padding:6px 0; color:#71717a; width:110px;">Account:</td><td style="padding:6px 0; font-weight:600; color:#ffffff;">${safeEmail}</td></tr>
          <tr><td style="padding:6px 0; color:#71717a;">Changed At:</td><td style="padding:6px 0; font-weight:500;">${changeTimeStr}</td></tr>
        </table>
      </div>
      <div style="padding:14px; background:rgba(249,115,22,0.1); border:1px solid rgba(249,115,22,0.3); color:#fdba74; border-radius:10px; font-size:13px; line-height:1.5;">
        ⚠️ If you did NOT make this change, reset your password immediately.
      </div>
      <p style="margin-top:24px; color:#71717a; font-size:12px;">You can now log in with your new password.</p>
    </div>
    <div style="padding:16px 32px; background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); text-align:center; font-size:11px; color:#52525b;">
      FocusFlow AI Productivity Suite · Account Security
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail({
    to: email,
    subject: "Your FocusFlow AI password was changed",
    html,
    purpose: "password_changed",
    meta: { user: safeName },
  });
}

module.exports = {
  sendLoginEmail,
  sendWelcomeEmail,
  sendPasswordResetOTPEmail,
  sendPasswordChangedEmail,
  sendEmail,
  APP_URL,
};
