@echo off
echo 🚀 Starting deployment to Vercel...

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Build the project
echo 📦 Building project...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Please fix the errors and try again.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🌐 Deploying to Vercel...
vercel --prod

echo 🎉 Deployment complete!
echo 📝 Don't forget to:
echo    1. Set environment variables in Vercel dashboard
echo    2. Update Facebook app redirect URI
echo    3. Update client API URL
pause
