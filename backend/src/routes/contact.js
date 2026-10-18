const express = require("express");
const { sendEmail } = require("../utils/emailService");

const router = express.Router();

const DEFAULT_SUPPORT_EMAIL = "keerav2007@gmail.com";
const contactEmail = process.env.CONTACT_EMAIL || DEFAULT_SUPPORT_EMAIL;

/*
=====================================================
POST /api/contact
Accepts support & help queries and routes them directly
to keerav2007@gmail.com via Nodemailer Gmail SMTP / Resend.
=====================================================
*/

router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      message,
      subject,
      category,
    } = req.body;

    /*
    -----------------------------------------------
    Validation
    -----------------------------------------------
    */

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required.",
      });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMessage = String(message).trim();
    const cleanSubject = subject ? String(subject).trim() : "";
    const cleanCategory = category ? String(category).trim() : "General Inquiry";

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const targetEmail = contactEmail || DEFAULT_SUPPORT_EMAIL;

    /*
    -----------------------------------------------
    Subject and Content Formatting
    -----------------------------------------------
    */

    const emailSubject = cleanSubject
      ? `[FocusFlow AI Support] ${cleanSubject} — from ${cleanName}`
      : `[FocusFlow AI Support] Inquiry from ${cleanName}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 650px; margin: 0 auto; padding: 24px; color: #111827; background: #ffffff; border-radius: 14px; border: 1px solid #e5e7eb;">
        <div style="border-bottom: 2px solid #FF4500; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #FF4500; margin: 0 0 4px 0; font-size: 22px; font-weight: 700;">
            ⚡ FocusFlow AI — Support & Help Query
          </h2>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">
            A user has submitted a support query through FocusFlow AI.
          </p>
        </div>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; width: 120px; font-weight: 600;">User Name:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">${escapeHtml(cleanName)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">User Email:</td>
              <td style="padding: 6px 0;"><a href="mailto:${escapeHtml(cleanEmail)}" style="color: #FF4500; text-decoration: none; font-weight: 600;">${escapeHtml(cleanEmail)}</a></td>
            </tr>
            ${cleanCategory ? `
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Category:</td>
              <td style="padding: 6px 0; color: #111827;">${escapeHtml(cleanCategory)}</td>
            </tr>` : ""}
            ${cleanSubject ? `
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Subject:</td>
              <td style="padding: 6px 0; color: #111827;">${escapeHtml(cleanSubject)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Received At:</td>
              <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">${new Date().toUTCString()}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 24px;">
          <h4 style="color: #374151; margin: 0 0 8px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">User Message:</h4>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">
${escapeHtml(cleanMessage)}
          </div>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p style="margin: 0;">Hit <strong>Reply</strong> to directly message <a href="mailto:${escapeHtml(cleanEmail)}" style="color: #FF4500;">${escapeHtml(cleanEmail)}</a>.</p>
          <p style="margin: 4px 0 0;">FocusFlow AI Support System · Delivered to ${targetEmail}</p>
        </div>
      </div>
    `;

    const emailText = `
FocusFlow AI Support Query
------------------------------------
From: ${cleanName} (${cleanEmail})
Category: ${cleanCategory}
Subject: ${cleanSubject || "General Inquiry"}
Date: ${new Date().toUTCString()}

Message:
${cleanMessage}

Reply directly to this email to respond to ${cleanEmail}.
    `.trim();

    /*
    -----------------------------------------------
    Send email via unified multi-provider service
    -----------------------------------------------
    */

    const emailResult = await sendEmail({
      to: targetEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      replyTo: cleanEmail,
      purpose: "support_query",
      meta: {
        fromUser: cleanEmail,
        userName: cleanName,
        category: cleanCategory,
      },
    });

    console.log(`✅ Support query from ${cleanEmail} dispatched to ${targetEmail}:`, emailResult);

    return res.status(200).json({
      success: true,
      message: "Your message has been sent to our support team. We will get back to you shortly.",
      recipient: targetEmail,
    });
  } catch (error) {
    console.error("❌ Contact route error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send your message right now. Please try again or write directly to keerav2007@gmail.com.",
    });
  }
});

/*
=====================================================
HTML ESCAPE
=====================================================
*/

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = router;