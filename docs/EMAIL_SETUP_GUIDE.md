# Email Configuration Guide for FocusFlow AI

This guide explains how to set up email functionality for login confirmations and password resets.

## Overview

The FocusFlow AI backend now includes:
- **Email Validation**: Validates email format before processing
- **Login Confirmation Emails**: Sends a confirmation email after successful login
- **Forgot Password**: Allow users to request password reset via email
- **Password Reset**: Users can reset their password using a secure reset link
- **Password Strength Validation**: Ensures passwords meet security requirements

## Password Requirements

Passwords must contain:
- At least 8 characters
- 1 uppercase letter (A-Z)
- 1 lowercase letter (a-z)
- 1 number (0-9)
- 1 special character (@$!%*?&)

## Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** in the left sidebar
3. Scroll to "How you sign in to Google"
4. Enable **2-Step Verification**

### Step 2: Create an App Password

1. Go to Google Account Security: https://myaccount.google.com/apppasswords
2. Select **App**: Mail
3. Select **Device**: Windows PC (or your device)
4. Click **Generate**
5. Copy the 16-character password shown

### Step 3: Configure Environment Variables

Create or update your `.env` file in the backend directory:

```
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key
MONGODB_URI=your-mongodb-uri
```

**Important**: 
- Use your actual Gmail address for `GMAIL_USER`
- Use the 16-character app password (spaces included) for `GMAIL_PASSWORD`
- Never commit `.env` to version control

## Alternative Email Providers

### Using Outlook/Hotmail

```
GMAIL_USER=your-email@outlook.com
GMAIL_PASSWORD=your-password
```

Change `nodemailer` configuration in `src/utils/emailService.js`:

```javascript
const transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});
```

### Using Custom SMTP Server

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
```

## API Endpoints

### Login
- **POST** `/api/auth/login`
- **Request**: `{ email, password }`
- **Response**: `{ success, token, user, message }`
- **Action**: Sends login confirmation email

### Register
- **POST** `/api/auth/register`
- **Request**: `{ name, email, password, confirmPassword }`
- **Response**: `{ success, token, user, message }`
- **Action**: Creates user and sends confirmation email

### Forgot Password
- **POST** `/api/auth/forgot-password`
- **Request**: `{ email }`
- **Response**: `{ success, message }`
- **Action**: Sends password reset link to email (valid for 1 hour)

### Reset Password
- **POST** `/api/auth/reset-password`
- **Request**: `{ token, newPassword, confirmPassword }`
- **Response**: `{ success, message }`
- **Action**: Updates password and clears reset token

## Email Templates

### Login Confirmation Email
- Confirms successful login
- Shows login timestamp and email
- Alerts user if unauthorized

### Password Reset Email
- Provides secure reset link
- Link expires in 1 hour
- Warns about link expiration

## Frontend Pages

### Login Page (`/login`)
- Email and password validation
- "Forgot password?" link
- Login confirmation message
- Demo access option

### Forgot Password Page (`/forgot-password`)
- Email input
- Success confirmation message
- Back to login link

### Reset Password Page (`/reset-password?token=xxx`)
- Password strength indicator
- Real-time validation
- Requirements checklist
- Confirm password field

## Troubleshooting

### Emails Not Sending
1. Check `.env` file is properly configured
2. Verify Gmail app password is correct (16 characters with spaces)
3. Check server logs for error messages
4. Ensure 2-Factor Authentication is enabled on Gmail

### Gmail Authentication Failed
- Regenerate app password
- Verify email address spelling
- Check if GMAIL_USER and GMAIL_PASSWORD are correct

### Reset Link Not Working
- Ensure FRONTEND_URL is correct in `.env`
- Check if token has expired (valid for 1 hour)
- Verify backend is running

### Password Validation Fails
- Password must meet all requirements
- Check for special characters: @$!%*?&
- Ensure uppercase and lowercase are present

## Testing

You can test the email functionality using:

```bash
# Test login with email
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}'

# Test forgot password
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test reset password
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"reset_token_here","newPassword":"NewPass@123","confirmPassword":"NewPass@123"}'
```

## Security Best Practices

1. **Never share app passwords** - They grant full access to your email
2. **Use strong passwords** - Enforce the password requirements
3. **Secure reset tokens** - Tokens expire after 1 hour
4. **HTTPS only** - Use HTTPS in production to secure email transmission
5. **Keep dependencies updated** - Regularly update nodemailer and other packages
6. **Monitor login attempts** - Track failed login attempts
7. **Use environment variables** - Never hardcode credentials

## Production Deployment

For production environments:

1. Use a robust email service:
   - SendGrid
   - AWS SES
   - Mailgun
   - Firebase Cloud Messaging

2. Update FRONTEND_URL to your domain:
   ```
   FRONTEND_URL=https://yourdomain.com
   ```

3. Use strong JWT_SECRET:
   ```
   JWT_SECRET=your-very-long-random-secret-key-2026
   ```

4. Enable HTTPS everywhere

5. Set up email rate limiting to prevent abuse

6. Monitor email delivery and failures

## Dependencies

Required npm packages:
- `nodemailer` - Email sending
- `validator` - Email validation
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens

Install with:
```bash
npm install
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify environment configuration
4. Check email provider documentation
