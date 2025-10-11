# Facebook Auto Post Server

Express.js server with TypeScript for the Facebook Auto Post application.

## Features

- ✅ Express.js with TypeScript
- ✅ JWT-based authentication system
- ✅ User registration and login
- ✅ Facebook OAuth integration
- ✅ MongoDB database with Mongoose
- ✅ Email service for notifications
- ✅ Password reset functionality
- ✅ Middleware for validation and error handling
- ✅ CORS and security headers

## Folder Structure

```
server/
├── src/
│   ├── app.ts                 # Main application file
│   ├── server.ts             # Server configuration
│   ├── routes/               # Route definitions
│   │   └── home.routes.ts    # Home routes
│   ├── utils/                # Utility functions
│   │   ├── logger.ts         # Logging utility
│   │   └── response.ts       # Response helper
│   ├── middleware/           # Custom middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   └── modules/              # Feature modules
│       ├── auth/             # Authentication module
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.routes.ts
│       │   ├── auth.types.ts
│       │   └── auth.validator.ts
│       └── user/             # User management module
│           ├── user.controller.ts
│           ├── user.service.ts
│           └── user.routes.ts
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── README.md
```

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on port 5000 by default.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## API Endpoints

### Home Routes
- `GET /` - Server status
- `GET /health` - Health check

### Authentication Routes (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh-token` - Refresh access token
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password

### User Routes (`/api/users`)
- `GET /` - Get all users (admin only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user (admin only)

### Facebook Routes (`/api/facebook`) - *Coming Soon*
- Facebook OAuth integration service is implemented
- Routes will be added in future updates

## Environment Variables

Create a `.env` file in the server root:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/facebook-auto-post

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Facebook App Configuration
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:5000/api/facebook/auth/callback
```

## Default Port

The server runs on port **5000** by default.

## Development Features

- **Hot Reload**: Uses ts-node-dev for automatic server restart on file changes
- **TypeScript**: Full TypeScript support with strict type checking
- **ESLint**: Code linting and formatting
- **Error Handling**: Comprehensive error handling middleware
- **Validation**: Request validation middleware
- **Authentication**: JWT-based authentication with refresh tokens
- **Logging**: Structured logging utility
- **Database**: MongoDB with Mongoose ODM
- **Email Service**: Gmail SMTP integration for notifications

