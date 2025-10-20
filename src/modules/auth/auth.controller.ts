import { Request, Response } from 'express';
import { JWTAuthenticatedRequest } from '../../middleware/auth.middleware';
import { JWTService } from '../../utils/jwt.service';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import { AuthService } from './auth.service';

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, acceptPrivacyPolicy } = req.body;
        const authService = new AuthService();

        Logger.info('User registration attempt', { email });

        const result = await authService.register({ email, password, name, acceptPrivacyPolicy });

        ResponseHelper.success(res, 'User registered successfully', result, 201);
    } catch (error: any) {
        Logger.error('Registration error:', error);
        ResponseHelper.error(res, error.message || 'Registration failed', error, 400);
    }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const authService = new AuthService();

        Logger.info('User login attempt', { email });

        const result = await authService.login(email, password);

        // Set HTTP-only cookies for tokens
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle domain
        };

        res.cookie('access_token', result.accessToken, cookieOptions);

        res.cookie('refresh_token', result.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Return user data without tokens
        const { accessToken, refreshToken, ...userData } = result;
        ResponseHelper.success(res, 'Login successful', userData);
    } catch (error: any) {
        Logger.error('Login error:', error);
        ResponseHelper.error(res, error.message || 'Login failed', error, 401);
    }
};

// Logout user
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies.refresh_token;
        const authService = new AuthService();

        if (refreshToken) {
            await authService.logout(refreshToken);
        }

        // Clear cookies with consistent options
        const clearCookieOptions = {
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : undefined
        };

        res.clearCookie('access_token', clearCookieOptions);
        res.clearCookie('refresh_token', clearCookieOptions);

        ResponseHelper.success(res, 'Logout successful');
    } catch (error: any) {
        Logger.error('Logout error:', error);
        // Clear cookies even if logout fails
        const clearCookieOptions = {
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : undefined
        };

        res.clearCookie('access_token', clearCookieOptions);
        res.clearCookie('refresh_token', clearCookieOptions);
        ResponseHelper.error(res, 'Logout failed', error);
    }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = req.cookies.refresh_token;
        const authService = new AuthService();

        if (!refreshToken) {
            return ResponseHelper.error(res, 'Refresh token is required', null, 400);
        }

        Logger.info('Token refresh attempt');

        const result = await authService.refreshAccessToken(refreshToken);

        // Set new cookies with consistent options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle domain
        };

        res.cookie('access_token', result.accessToken, cookieOptions);

        res.cookie('refresh_token', result.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        ResponseHelper.success(res, 'Token refreshed successfully');
    } catch (error: any) {
        Logger.error('Token refresh error:', error);
        // Clear cookies on refresh failure
        const clearCookieOptions = {
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : undefined
        };

        res.clearCookie('access_token', clearCookieOptions);
        res.clearCookie('refresh_token', clearCookieOptions);
        ResponseHelper.error(res, error.message || 'Token refresh failed', error, 401);
    }
};

// Logout from all devices
export const logoutAllDevices = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const authService = new AuthService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        await authService.logoutAllDevices(userId);

        ResponseHelper.success(res, 'Logged out from all devices successfully');
    } catch (error: any) {
        Logger.error('Logout all devices error:', error);
        ResponseHelper.error(res, 'Logout failed', error);
    }
};

// Get user profile
export const getProfile = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const authService = new AuthService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        const user = await authService.getUserProfile(userId);

        ResponseHelper.success(res, 'Profile retrieved successfully', user);
    } catch (error: any) {
        Logger.error('Get profile error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get profile', error);
    }
};

// Update user profile
export const updateProfile = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const updateData = req.body;
        const authService = new AuthService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        const updatedUser = await authService.updateUserProfile(userId, updateData);

        ResponseHelper.success(res, 'Profile updated successfully', updatedUser);
    } catch (error: any) {
        Logger.error('Update profile error:', error);
        ResponseHelper.error(res, error.message || 'Failed to update profile', error);
    }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const authService = new AuthService();

        Logger.info('Forgot password request', { email });

        await authService.forgotPassword(email);

        ResponseHelper.success(res, 'Password reset email sent');
    } catch (error: any) {
        Logger.error('Forgot password error:', error);
        ResponseHelper.error(res, error.message || 'Failed to process forgot password request', error);
    }
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, newPassword } = req.body;
        const authService = new AuthService();

        Logger.info('Password reset attempt');

        await authService.resetPassword(token, newPassword);

        ResponseHelper.success(res, 'Password reset successfully');
    } catch (error: any) {
        Logger.error('Reset password error:', error);
        ResponseHelper.error(res, error.message || 'Failed to reset password', error);
    }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;
        const authService = new AuthService();

        Logger.info('Email verification attempt');

        const result = await authService.verifyEmail(token);

        ResponseHelper.success(res, result.message, result.user);
    } catch (error: any) {
        Logger.error('Email verification error:', error);
        ResponseHelper.error(res, error.message || 'Failed to verify email', error, 400);
    }
};

// Resend verification email
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const authService = new AuthService();

        Logger.info('Resend verification email request', { email });

        await authService.resendVerificationEmail(email);

        ResponseHelper.success(res, 'Verification email sent successfully');
    } catch (error: any) {
        Logger.error('Resend verification email error:', error);
        ResponseHelper.error(res, error.message || 'Failed to resend verification email', error, 400);
    }
};

// Facebook OAuth callback
export const facebookCallback = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user) {
            return ResponseHelper.error(res, 'Facebook authentication failed', null, 401);
        }

        Logger.info('Facebook authentication successful', { userId: user._id, email: user.email });

        // Generate JWT tokens
        const tokens = JWTService.generateTokenPair({
            userId: (user._id as any).toString(),
            email: user.email,
            role: user.role
        });

        // Store refresh token in database
        const { RefreshToken } = await import('./RefreshToken.model');
        const refreshTokenDoc = new RefreshToken({
            token: tokens.refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        await refreshTokenDoc.save();

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set HTTP-only cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? undefined : undefined
        };

        res.cookie('access_token', tokens.accessToken, cookieOptions);
        res.cookie('refresh_token', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Redirect to frontend with success
        const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard?auth=success`);

    } catch (error: any) {
        Logger.error('Facebook callback error:', error);
        const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/login?error=facebook_auth_failed`);
    }
};

