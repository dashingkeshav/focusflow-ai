const { Resend } = require("resend");


// =====================================================
// CONFIGURATION
// =====================================================

const RESEND_API_KEY =
  process.env.RESEND_API_KEY;

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  "FocusFlow AI <onboarding@resend.dev>";

const APP_URL =
  process.env.APP_URL ||
  "http://localhost:3000";


// =====================================================
// RESEND CLIENT
// =====================================================

let resend = null;

if (RESEND_API_KEY) {
  resend = new Resend(
    RESEND_API_KEY
  );

  console.log(
    "✅ Resend email service configured."
  );
} else {
  console.warn(
    "⚠️ RESEND_API_KEY is not configured. Email sending is disabled until it is added to backend/.env."
  );
}


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
// CHECK EMAIL SERVICE
// =====================================================

function ensureResendConfigured() {

  if (!resend) {
    throw new Error(
      "Resend is not configured. Add RESEND_API_KEY to backend/.env and restart the server."
    );
  }

}


// =====================================================
// SEND LOGIN EMAIL
// =====================================================

async function sendLoginEmail(
  email,
  userName
) {

  ensureResendConfigured();

  const safeName =
    escapeHtml(userName);

  const safeEmail =
    escapeHtml(email);


  try {

    const result =
      await resend.emails.send({

        from:
          EMAIL_FROM,

        to:
          [email],

        subject:
          "Login Confirmation - FocusFlow AI",

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FocusFlow AI Login</title>
</head>

<body
  style="
    margin:0;
    padding:40px 20px;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      max-width:600px;
      margin:0 auto;
      background:#ffffff;
      border:1px solid #e2e8f0;
      border-radius:18px;
      overflow:hidden;
    "
  >

    <div
      style="
        padding:30px;
        color:#ffffff;
        background:
          linear-gradient(
            135deg,
            #7c3aed,
            #4f46e5,
            #06b6d4
          );
      "
    >

      <h1 style="margin:0;">
        FocusFlow AI
      </h1>

      <p
        style="
          margin:8px 0 0;
          opacity:.9;
        "
      >
        Login Confirmation
      </p>

    </div>


    <div
      style="
        padding:30px;
        color:#172033;
      "
    >

      <h2>
        Welcome back, ${safeName}!
      </h2>

      <p
        style="
          color:#64748b;
          line-height:1.7;
        "
      >
        Your FocusFlow AI account was
        successfully signed in.
      </p>

      <div
        style="
          margin-top:20px;
          padding:16px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:12px;
        "
      >

        <strong>
          Account:
        </strong>

        <br>

        ${safeEmail}

      </div>

      <p
        style="
          margin-top:24px;
          color:#94a3b8;
          font-size:13px;
        "
      >
        If you did not perform this login,
        please secure your account.
      </p>

    </div>

  </div>

</body>
</html>
        `,
      });


    console.log(
      `✅ Login email sent to ${email}`
    );

    return result;

  } catch (error) {

    console.error(
      "❌ Login email error:",
      error
    );

    throw error;
  }
}


// =====================================================
// PASSWORD RESET OTP EMAIL
// =====================================================

async function sendPasswordResetOTPEmail(
  email,
  otp,
  userName
) {

  ensureResendConfigured();

  const safeName =
    escapeHtml(userName);

  const safeEmail =
    escapeHtml(email);

  const safeOtp =
    escapeHtml(otp);


  try {

    const result =
      await resend.emails.send({

        from:
          EMAIL_FROM,

        to:
          [email],

        subject:
          "Password Reset Code - FocusFlow AI",

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FocusFlow AI Password Reset</title>
</head>

<body
  style="
    margin:0;
    padding:40px 20px;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      max-width:600px;
      margin:0 auto;
      background:#ffffff;
      border:1px solid #e2e8f0;
      border-radius:18px;
      overflow:hidden;
    "
  >

    <div
      style="
        padding:30px;
        color:#ffffff;
        background:
          linear-gradient(
            135deg,
            #7c3aed,
            #4f46e5,
            #06b6d4
          );
      "
    >

      <h1 style="margin:0;">
        FocusFlow AI
      </h1>

      <p
        style="
          margin:8px 0 0;
          opacity:.9;
        "
      >
        Password Reset
      </p>

    </div>


    <div
      style="
        padding:30px;
        color:#172033;
      "
    >

      <h2>
        Hi ${safeName},
      </h2>

      <p
        style="
          color:#64748b;
          line-height:1.7;
        "
      >
        We received a request to reset
        your FocusFlow AI password.
      </p>


      <div
        style="
          margin:28px 0;
          padding:25px;
          text-align:center;
          border-radius:14px;
          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #06b6d4
            );
        "
      >

        <div
          style="
            color:#ffffff;
            font-size:12px;
            font-weight:bold;
          "
        >
          YOUR RESET CODE
        </div>

        <div
          style="
            margin-top:12px;
            color:#ffffff;
            font-size:42px;
            font-weight:bold;
            letter-spacing:8px;
            font-family:monospace;
          "
        >
          ${safeOtp}
        </div>

      </div>


      <div
        style="
          padding:15px;
          background:#fff7ed;
          color:#9a3412;
          border-radius:10px;
          line-height:1.6;
        "
      >

        This code expires in
        <strong>15 minutes</strong>.

      </div>


      <p
        style="
          margin-top:25px;
          color:#64748b;
          font-size:13px;
        "
      >
        Never share this code with anyone.
      </p>


      <div
        style="
          margin-top:18px;
          color:#94a3b8;
          font-size:12px;
        "
      >
        Account: ${safeEmail}
      </div>

    </div>

  </div>

</body>
</html>
        `,
      });


    console.log(
      `✅ Password reset email sent to ${email}`
    );

    return result;

  } catch (error) {

    console.error(
      "❌ Password reset email error:",
      error
    );

    throw error;
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sendLoginEmail,
  sendPasswordResetOTPEmail,
  APP_URL,
};