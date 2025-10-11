# Facebook Auto Post - Server

This is the backend server for the Facebook Auto Post application, built with Express.js, TypeScript, and MongoDB.

## 🚀 Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Facebook Integration**: OAuth2 authentication and API integration
- **MongoDB Database**: User data and session management
- **Email Service**: Email verification and notifications
- **Security**: Helmet, CORS, and session management
- **TypeScript**: Full type safety and modern development experience

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Passport.js
- **Email**: Nodemailer
- **Security**: Helmet, CORS, bcryptjs

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Facebook Developer Account
- Email service (Gmail recommended)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   - MongoDB connection string
   - JWT secrets
   - Facebook App credentials
   - Email service credentials

4. **Database Setup**
   - Make sure MongoDB is running
   - The application will automatically create necessary collections

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Other Commands
```bash
# Build TypeScript
npm run build

# Start with nodemon (development)
npm run start:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📁 Project Structure

```
server/
├── src/
│   ├── app.ts                 # Main application entry point
│   ├── server.ts             # Server configuration
│   ├── config/               # Configuration files
│   │   ├── database.ts       # MongoDB connection
│   │   └── passport.ts       # Passport.js configuration
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── modules/              # Feature modules
│   │   ├── auth/             # Authentication routes & controllers
│   │   ├── facebook/         # Facebook integration
│   │   └── user/             # User management
│   ├── routes/               # Route definitions
│   ├── services/             # Business logic services
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── dist/                     # Compiled JavaScript (generated)
├── scripts/                  # Utility scripts
└── package.json
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Yes |
| `CLIENT_URL` | Frontend application URL | Yes |
| `FACEBOOK_APP_ID` | Facebook App ID | Yes |
| `FACEBOOK_APP_SECRET` | Facebook App Secret | Yes |
| `SESSION_SECRET` | Session secret for Passport.js | Yes |
| `EMAIL_HOST` | SMTP server host | Optional |
| `EMAIL_USER` | SMTP username | Optional |
| `EMAIL_PASS` | SMTP password | Optional |

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/facebook` - Facebook OAuth login
- `GET /api/auth/facebook/callback` - Facebook OAuth callback

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `DELETE /api/user/account` - Delete user account

### Facebook Integration
- `GET /api/facebook/pages` - Get user's Facebook pages
- `POST /api/facebook/post` - Create Facebook post
- `GET /api/facebook/posts` - Get user's posts

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
1. Build the application: `npm run build`
2. Set production environment variables
3. Start the server: `npm start`

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify connection string in `.env`

2. **Facebook OAuth Issues**
   - Verify Facebook App credentials
   - Check redirect URIs in Facebook Developer Console

3. **JWT Token Issues**
   - Ensure JWT secrets are set
   - Check token expiration settings

4. **Email Service Issues**
   - Verify SMTP credentials
   - Check Gmail app password setup

## 📝 Development Notes

- The server runs on port 5000 by default
- CORS is configured for localhost:3000 (client)
- All routes are prefixed with `/api`
- JWT tokens expire in 1 day, refresh tokens in 7 days
- Facebook integration requires proper app setup in Facebook Developer Console

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.
