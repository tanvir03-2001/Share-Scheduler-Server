# JWT Token System Documentation

## Overview
The server now implements a secure JWT-based authentication system with access tokens and refresh tokens.

## Token Types

### Access Token
- **Purpose**: Short-lived token for API authentication
- **Expiration**: 15 minutes
- **Usage**: Included in Authorization header for protected routes
- **Format**: `Bearer <access_token>`

### Refresh Token
- **Purpose**: Long-lived token for obtaining new access tokens
- **Expiration**: 7 days
- **Usage**: Used to refresh expired access tokens
- **Storage**: Should be stored securely (httpOnly cookie recommended)

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

#### POST /api/auth/login
Login user and receive tokens
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/auth/refresh-token
Refresh access token using refresh token
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/auth/logout
Logout user and invalidate refresh token
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/logout-all-devices
Logout from all devices (requires authentication)
**Headers:** `Authorization: Bearer <access_token>`

### Protected Endpoints

All protected endpoints require the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

#### GET /api/auth/profile
Get user profile

#### PUT /api/auth/profile
Update user profile

## Security Features

1. **Password Hashing**: Uses bcrypt with 12 salt rounds
2. **JWT Signing**: Tokens are signed with secret keys
3. **Token Rotation**: Refresh tokens are rotated on each use
4. **Token Validation**: Comprehensive token verification
5. **Secure Headers**: Proper CORS and security headers

## Environment Variables

Create a `.env` file with the following variables:

```env
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-here
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-here
PORT=3001
NODE_ENV=development
```

## Usage Example

1. **Register/Login**: Get access and refresh tokens
2. **API Calls**: Use access token in Authorization header
3. **Token Refresh**: When access token expires, use refresh token to get new tokens
4. **Logout**: Invalidate refresh token

## Best Practices

1. Store refresh tokens in httpOnly cookies
2. Use HTTPS in production
3. Rotate secret keys regularly
4. Implement rate limiting
5. Monitor for suspicious activity
6. Use short access token expiration times
