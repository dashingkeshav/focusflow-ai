# OTP-Based Password Reset - Testing Guide

## Complete Implementation Summary

Your FocusFlow AI password reset system now uses **6-digit OTP codes** sent via Gmail with a 15-minute expiration.

### What's Ready ✅

**Backend:**
- ✅ User model with `resetOTP` and `resetOTPExpire` fields
- ✅ OTP generation (random 6-digit code)
- ✅ OTP verification logic with expiration check
- ✅ Email sending with OTP display
- ✅ Three new/modified endpoints:
  - `POST /api/auth/forgot-password` - Generates & sends OTP
  - `POST /api/auth/verify-otp` - Validates OTP code
  - `POST /api/auth/reset-password` - Updates password after OTP verification

**Frontend:**
- ✅ `/forgot-password` page with two-step workflow:
  1. Enter email → receive code
  2. Enter 6-digit code → verify
  3. Redirects to reset password page
- ✅ `/reset-password` page with password strength validation
- ✅ Proper error messages and loading states

### How to Test

#### Step 1: Start the Servers
```bash
# Terminal 1 - Backend (from backend folder)
npm start

# Terminal 2 - Frontend (from frontend folder)
npm run dev
```

#### Step 2: Navigate to Password Reset
1. Go to `http://localhost:3000/login`
2. Click "Forgot password?" link
3. You'll be on `http://localhost:3000/forgot-password`

#### Step 3: Request OTP Code
1. Enter your Gmail email (e.g., `your.email@gmail.com`)
2. Click "Send Reset Code"
3. Check your Gmail inbox for the code
4. The code will display in **large text (48px font)** in a professional email

**Expected Email Subject:** "Password Reset Code - FocusFlow AI"

#### Step 4: Verify OTP
1. Copy the 6-digit code from your email
2. Paste into the code field (appears after step 3)
3. Click "Verify & Continue"
4. You'll be redirected to the reset password page with the code verified

#### Step 5: Set New Password
1. Enter your new password (must meet requirements):
   - ✅ At least 8 characters
   - ✅ 1 uppercase letter
   - ✅ 1 lowercase letter
   - ✅ 1 number
   - ✅ 1 special character (@$!%*?&)
2. Confirm password
3. Click "Reset Password"
4. You'll see a success message and auto-redirect to login
5. Login with your new password!

---

## Testing Scenarios

### ✅ Happy Path (Should Work)
- [x] Enter valid email → receive code → enter code → reset password → login

### ⚠️ Edge Cases to Test
1. **Expired OTP** - Wait 15+ minutes after requesting code, try to use it
   - Expected: "OTP has expired. Please request a new password reset."

2. **Invalid OTP** - Enter wrong code
   - Expected: "Invalid OTP. Please try again."

3. **Wrong Password Strength** - Try password without uppercase, numbers, etc.
   - Expected: Visual checklist shows missing requirements, submit disabled

4. **Mismatched Passwords** - Enter different values in password fields
   - Expected: "Passwords do not match"

5. **Resend Code** - Click "Change Email" to request a new code
   - Expected: Can change email and request a new code

---

## Email Configuration (Already Set)

Your `.env` file has Gmail SMTP configured:
```env
GMAIL_USER=marutijogdankar21@gmail.com
GMAIL_PASSWORD=cgjxtfmfhjibfltq
FRONTEND_URL=http://localhost:3000
```

**Note:** The password is a Google App Password (not your Gmail password). This is secure for SMTP.

---

## Troubleshooting

### Issue: No Email Received

**Check 1:** Backend running and logs show "OTP email sent to..."
```bash
# Look for this in backend console:
ForgotPassword: OTP email sent to your.email@gmail.com
```

**Check 2:** Check spam/promotions folder in Gmail

**Check 3:** Verify .env has correct Gmail credentials

**Check 4:** Check if MongoDB connection is working
```bash
# Look for this in backend console:
ForgotPassword: OTP saved for your.email@gmail.com
```

### Issue: "JSON Parse Error" or "<!DOCTYPE..."

This was already fixed by updating the frontend API base URL. Should not occur now.

### Issue: Code expired immediately

OTP is valid for **15 minutes**. If less time, request a new one using "Change Email" button.

---

## File Changes Made

**Backend:**
- `src/controllers/authController.js` - Rewritten for OTP flow
- `src/routes/authRoutes.js` - Added `/verify-otp` endpoint
- `src/utils/otpService.js` - Created (OTP generation/validation)
- `src/models/User.js` - Added resetOTP fields

**Frontend:**
- `app/forgot-password/page.tsx` - Rewritten for two-step workflow
- `app/reset-password/page.tsx` - Updated for OTP-based reset

---

## Success Indicators 🎉

You'll know it's working when:
1. ✅ Email arrives in inbox within 5 seconds of submitting
2. ✅ Code is 6 random digits (e.g., 427591)
3. ✅ You can verify the code and proceed
4. ✅ Password update completes successfully
5. ✅ You can login with the new password

**Go test it now!** 🚀
