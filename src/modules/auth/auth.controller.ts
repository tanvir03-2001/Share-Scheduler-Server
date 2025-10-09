import { Request, Response } from 'express';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import { AuthService } from './auth.service';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    // Register a new user
    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password, name } = req.body;

            Logger.info('User registration attempt', { email });

            const result = await this.authService.register({ email, password, name });

            ResponseHelper.success(res, 'User registered successfully', result, 201);
        } catch (error: any) {
            Logger.error('Registration error:', error);
            ResponseHelper.error(res, error.message || 'Registration failed', error, 400);
        }
    };

    // Login user
    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;

            Logger.info('User login attempt', { email });

            const result = await this.authService.login(email, password);

            ResponseHelper.success(res, 'Login successful', result);
        } catch (error: any) {
            Logger.error('Login error:', error);
            ResponseHelper.error(res, error.message || 'Login failed', error, 401);
        }
    };

    // Logout user
    logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return ResponseHelper.error(res, 'Refresh token is required', null, 400);
            }

            await this.authService.logout(refreshToken);

            ResponseHelper.success(res, 'Logout successful');
        } catch (error: any) {
            Logger.error('Logout error:', error);
            ResponseHelper.error(res, 'Logout failed', error);
        }
    };

    // Refresh access token
    refreshToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return ResponseHelper.error(res, 'Refresh token is required', null, 400);
            }

            Logger.info('Token refresh attempt');

            const result = await this.authService.refreshAccessToken(refreshToken);

            ResponseHelper.success(res, 'Token refreshed successfully', result);
        } catch (error: any) {
            Logger.error('Token refresh error:', error);
            ResponseHelper.error(res, error.message || 'Token refresh failed', error, 401);
        }
    };

    // Logout from all devices
    logoutAllDevices = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            await this.authService.logoutAllDevices(userId);

            ResponseHelper.success(res, 'Logged out from all devices successfully');
        } catch (error: any) {
            Logger.error('Logout all devices error:', error);
            ResponseHelper.error(res, 'Logout failed', error);
        }
    };

    // Get user profile
    getProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            const user = await this.authService.getUserProfile(userId);

            ResponseHelper.success(res, 'Profile retrieved successfully', user);
        } catch (error: any) {
            Logger.error('Get profile error:', error);
            ResponseHelper.error(res, error.message || 'Failed to get profile', error);
        }
    };

    // Update user profile
    updateProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            const updateData = req.body;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            const updatedUser = await this.authService.updateUserProfile(userId, updateData);

            ResponseHelper.success(res, 'Profile updated successfully', updatedUser);
        } catch (error: any) {
            Logger.error('Update profile error:', error);
            ResponseHelper.error(res, error.message || 'Failed to update profile', error);
        }
    };

    // Forgot password
    forgotPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email } = req.body;

            Logger.info('Forgot password request', { email });

            await this.authService.forgotPassword(email);

            ResponseHelper.success(res, 'Password reset email sent');
        } catch (error: any) {
            Logger.error('Forgot password error:', error);
            ResponseHelper.error(res, error.message || 'Failed to process forgot password request', error);
        }
    };

    // Reset password
    resetPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { token, newPassword } = req.body;

            Logger.info('Password reset attempt');

            await this.authService.resetPassword(token, newPassword);

            ResponseHelper.success(res, 'Password reset successfully');
        } catch (error: any) {
            Logger.error('Reset password error:', error);
            ResponseHelper.error(res, error.message || 'Failed to reset password', error);
        }
    };

    // Verify email
    verifyEmail = async (req: Request, res: Response): Promise<void> => {
        try {
            const { token } = req.body;

            Logger.info('Email verification attempt');

            const result = await this.authService.verifyEmail(token);

            ResponseHelper.success(res, result.message, result.user);
        } catch (error: any) {
            Logger.error('Email verification error:', error);
            ResponseHelper.error(res, error.message || 'Failed to verify email', error, 400);
        }
    };

    // Resend verification email
    resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email } = req.body;

            Logger.info('Resend verification email request', { email });

            await this.authService.resendVerificationEmail(email);

            ResponseHelper.success(res, 'Verification email sent successfully');
        } catch (error: any) {
            Logger.error('Resend verification email error:', error);
            ResponseHelper.error(res, error.message || 'Failed to resend verification email', error, 400);
        }
    };
}

