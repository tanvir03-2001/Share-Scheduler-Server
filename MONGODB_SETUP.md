# MongoDB Setup Guide

This guide will help you set up MongoDB for the Facebook Auto Post server.

## Prerequisites

1. **MongoDB Installation**
   - Install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Or use MongoDB Atlas (cloud database) - recommended for production

2. **Node.js Dependencies**
   - The required packages (`mongoose` and `@types/mongoose`) are already installed

## Local MongoDB Setup

### Option 1: Local MongoDB Installation

1. **Install MongoDB Community Server**
   ```bash
   # Windows (using Chocolatey)
   choco install mongodb

   # macOS (using Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community

   # Ubuntu/Debian
   sudo apt-get install mongodb
   ```

2. **Start MongoDB Service**
   ```bash
   # Windows
   net start MongoDB

   # macOS
   brew services start mongodb/brew/mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

3. **Verify Installation**
   ```bash
   mongosh
   ```

### Option 2: Docker (Recommended for Development)

1. **Run MongoDB in Docker**
   ```bash
   docker run --name mongodb -p 27017:27017 -d mongo:latest
   ```

2. **Verify Container is Running**
   ```bash
   docker ps
   ```

## Environment Configuration

1. **Create Environment File**
   Create a `.env` file in the server directory with the following variables:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Client URL for CORS
   CLIENT_URL=http://localhost:3000

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/facebook-auto-post

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

2. **Update MongoDB URI**
   - For local MongoDB: `mongodb://localhost:27017/facebook-auto-post`
   - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/facebook-auto-post`

## Database Models

The application uses the following MongoDB models:

### User Model
- **Fields**: email, name, password, role, isEmailVerified, emailVerificationToken, emailVerificationExpires, passwordResetToken, passwordResetExpires, isActive, lastLogin
- **Indexes**: email (unique), emailVerificationToken, passwordResetToken, isActive

### RefreshToken Model
- **Fields**: token, userId, expiresAt, isRevoked
- **Indexes**: token (unique), userId, expiresAt (TTL)
- **TTL**: Automatic cleanup of expired tokens

## Running the Application

1. **Start the Server**
   ```bash
   cd server
   npm run dev
   ```

2. **Verify Database Connection**
   - Check console output for "Connected to MongoDB successfully"
   - The application will automatically create the test admin user if it doesn't exist

## Test User Credentials

After starting the server, you can use these test credentials:
- **Email**: admin@sharescheduler.com
- **Password**: admin123

## MongoDB Atlas Setup (Production)

1. **Create Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free account

2. **Create Cluster**
   - Choose "Build a Database"
   - Select "FREE" tier
   - Choose your preferred cloud provider and region

3. **Configure Access**
   - Create a database user
   - Whitelist your IP address (or use 0.0.0.0/0 for development)

4. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Update `MONGODB_URI` in your `.env` file

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure MongoDB is running
   - Check if port 27017 is available
   - Verify connection string format

2. **Authentication Failed**
   - Check username/password in connection string
   - Ensure user has proper permissions

3. **Database Not Found**
   - MongoDB creates databases automatically when first document is inserted
   - This is normal behavior

### Useful Commands

```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ismaster')"

# List databases
mongosh --eval "show dbs"

# Connect to specific database
mongosh facebook-auto-post

# View collections
db.getCollectionNames()

# View users
db.users.find().pretty()
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production
3. **Enable MongoDB authentication** for production
4. **Use MongoDB Atlas** for production deployments
5. **Regularly backup** your database

## Next Steps

1. Set up your `.env` file with proper configuration
2. Start the server and verify database connection
3. Test user registration and login functionality
4. Consider setting up MongoDB Atlas for production use
