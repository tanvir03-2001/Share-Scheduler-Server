# Environment Variables Setup Guide

## 📁 Environment Files তৈরি করুন

### 1. Backend Environment File
`server` folder এ `.env` file তৈরি করুন এবং নিচের content copy করুন:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/facebook-auto-post

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-change-this-in-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Client Configuration
CLIENT_URL=http://localhost:3000

# Facebook App Configuration
FACEBOOK_APP_ID=your-facebook-app-id-here
FACEBOOK_APP_SECRET=your-facebook-app-secret-here
FACEBOOK_REDIRECT_URI=http://localhost:5000/api/facebook/callback

# Email Configuration (Optional - for email verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourapp.com
```

### 2. Frontend Environment File
`client` folder এ `.env.local` file তৈরি করুন এবং নিচের content copy করুন:

```env
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🔧 যা যা Change করতে হবে:

### Backend (.env) এ:
1. **FACEBOOK_APP_ID** - আপনার Facebook App এর ID
2. **FACEBOOK_APP_SECRET** - আপনার Facebook App এর Secret
3. **JWT_SECRET** - একটি random string (production এ strong password ব্যবহার করুন)
4. **JWT_REFRESH_SECRET** - আরেকটি random string
5. **MONGODB_URI** - যদি আপনার MongoDB URL আলাদা হয়
6. **EMAIL_* variables** - যদি email verification চান

### Frontend (.env.local) এ:
1. **NEXT_PUBLIC_API_URL** - যদি আপনার backend অন্য port এ run করে

## 📋 Step by Step:

### Step 1: Backend Environment
```bash
# server folder এ যান
cd server

# .env file তৈরি করুন
touch .env

# file এ content paste করুন (উপরে দেওয়া content)
```

### Step 2: Frontend Environment
```bash
# client folder এ যান
cd client

# .env.local file তৈরি করুন
touch .env.local

# file এ content paste করুন (উপরে দেওয়া content)
```

### Step 3: Facebook App Setup
1. Facebook Developers এ যান
2. নতুন App তৈরি করুন
3. App ID এবং App Secret copy করুন
4. `.env` file এ paste করুন

## 🚨 Important Notes:

1. **`.env` files কখনো Git এ commit করবেন না**
2. **Facebook App Secret কখনো frontend এ পাঠাবেন না**
3. **Production এ strong passwords ব্যবহার করুন**
4. **MongoDB connection string সঠিক আছে কিনা check করুন**

## 🔍 Verification:

### Backend Check:
```bash
cd server
npm run dev
# Server start হলে environment variables load হয়েছে
```

### Frontend Check:
```bash
cd client
npm run dev
# Client start হলে API URL সঠিক আছে
```

## 🆘 Troubleshooting:

### যদি Environment Variables Load না হয়:
1. File name সঠিক আছে কিনা check করুন (`.env` এবং `.env.local`)
2. File location সঠিক আছে কিনা check করুন
3. Server restart করুন
4. File permissions check করুন

### যদি Facebook Connection কাজ না করে:
1. Facebook App ID এবং Secret সঠিক আছে কিনা
2. Redirect URI Facebook app এ set আছে কিনা
3. Facebook app এ required permissions add আছে কিনা

---

**Note**: এই template files (`env-template.txt`) reference হিসেবে রাখুন, কিন্তু actual `.env` files তৈরি করুন।
