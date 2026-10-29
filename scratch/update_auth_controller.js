const fs = require('fs');

let content = fs.readFileSync('backend/src/controllers/authController.js', 'utf8');
const normalized = content.replace(/\r\n/g, '\n');

const target = `    let welcomeEmailSent = false;

    try {
      const emailRes = await sendWelcomeEmail(
        sanitizedEmail,
        cleanName
      );
      welcomeEmailSent = Boolean(emailRes?.success);
    } catch (emailError) {
      console.error(
        "Registration welcome email failed:",
        emailError?.message ||
          emailError
      );
    }`;

const replacement = `    let welcomeEmailSent = false;

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
    }`;

if (normalized.includes(target)) {
  const updated = normalized.replace(target, replacement);
  fs.writeFileSync('backend/src/controllers/authController.js', updated.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated authController.js');
} else {
  console.log('Target not found in authController.js');
}
