# Email Service Setup Guide

## Forgot Password Functionality

The forgot password functionality has been fixed and now properly sends password reset emails. However, you need to configure the email service for it to work.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/facebook-auto-post

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production

# Email Service Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password as `EMAIL_PASS` (not your regular Gmail password)

3. **Update the environment variables**:
   - Set `EMAIL_USER` to your Gmail address
   - Set `EMAIL_PASS` to the generated app password
   - Set `EMAIL_FROM` to your Gmail address

## What Was Fixed

1. **Frontend API Integration**: Updated `AuthContext.tsx` to use the proper `apiClient.forgotPassword()` method instead of direct fetch calls
2. **Backend Email Service**: Fixed `auth.service.ts` to actually send password reset emails using the email service
3. **API Interface Consistency**: Updated the `ResetPasswordRequest` interface to match the backend expectations
4. **Error Handling**: Improved error handling and logging for email sending

## Testing the Forgot Password Flow

1. Start the server: `cd server && npm run dev`
2. Start the client: `cd client && npm run dev`
3. Navigate to the forgot password page
4. Enter a valid email address
5. Check the server logs for email sending status
6. Check the email inbox for the password reset link

## Troubleshooting

- **Email not sending**: Check the server logs for email service connection errors
- **Invalid credentials**: Verify your Gmail app password is correct
- **CORS errors**: Ensure `CORS_ORIGIN` matches your frontend URL
- **Database errors**: Verify MongoDB is running and `MONGODB_URI` is correct

The forgot password functionality should now work properly once the email service is configured!
