# Server Deployment Guide for Vercel

## Prerequisites
1. Vercel account
2. MongoDB Atlas account (for production database)
3. Facebook App configured
4. Environment variables ready

## Step 1: Build the Project
```bash
cd server
npm run build
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from server directory
cd server
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: facebook-auto-post-server
# - Directory: ./
# - Override settings? No
```

### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Set Root Directory to `server`
5. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Step 3: Environment Variables

Add these environment variables in Vercel dashboard:

### Required Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/facebook-auto-post
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-client-domain.vercel.app
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=https://your-server-domain.vercel.app/api/facebook/callback
```

### Optional Variables (for email):
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourapp.com
```

## Step 4: Update Facebook App Settings
1. Go to Facebook Developer Console
2. Update Valid OAuth Redirect URIs:
   - Add: `https://your-server-domain.vercel.app/api/facebook/callback`
3. Update App Domains:
   - Add: `your-server-domain.vercel.app`

## Step 5: Update Client Configuration
Update your client's API base URL to point to the deployed server:
```
NEXT_PUBLIC_API_URL=https://your-server-domain.vercel.app
```

## Troubleshooting

### Common Issues:
1. **Build fails**: Make sure TypeScript compiles without errors
2. **Database connection fails**: Check MongoDB URI and network access
3. **CORS errors**: Verify CLIENT_URL matches your frontend domain
4. **Facebook auth fails**: Check redirect URI and app settings

### Logs:
Check Vercel function logs in the dashboard for debugging.

## Production Checklist:
- [ ] Environment variables set
- [ ] Database connection working
- [ ] Facebook app configured
- [ ] CORS settings correct
- [ ] Client URL updated
- [ ] SSL certificate active
- [ ] Error handling working
- [ ] Logging configured
