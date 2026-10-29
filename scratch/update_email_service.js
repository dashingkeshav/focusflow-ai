const fs = require('fs');

let content = fs.readFileSync('backend/src/utils/emailService.js', 'utf8');
const normalized = content.replace(/\r\n/g, '\n');

const target = `nodemailerTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS.replace(/\\s+/g, ""), // strip spaces if copied from Google
      },
    });`;

const replacement = `nodemailerTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS.replace(/\\s+/g, ""), // strip spaces if copied from Google
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });`;

if (normalized.includes(target)) {
  const updated = normalized.replace(target, replacement);
  fs.writeFileSync('backend/src/utils/emailService.js', updated.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated emailService.js');
} else {
  console.log('Target not found in emailService.js');
}
