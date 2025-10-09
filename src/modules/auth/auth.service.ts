import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RefreshToken } from '../../models/RefreshToken.model';
import { IUser, User } from '../../models/User.model';
import { emailService } from '../../utils/email.service';
import { JWTService } from '../../utils/jwt.service';
import { Logger } from '../../utils/logger';
import { RefreshTokenResponse, VerifyEmailResponse } from './auth.types';

// User interface for backward compatibility
export interface UserResponse {
    id: string;
    email: string;
    name: string;
    role: string;
    isEmailVerified: boolean;
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
}

export interface LoginResponse {
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    constructor() {
        // Initialize test user if needed
        this.initializeTestUser();
    }

    private async initializeTestUser() {
        try {
            const existingAdmin = await User.findOne({ email: 'admin@sharescheduler.com' });
            if (!existingAdmin) {
                const testUser = new User({
                    email: 'admin@sharescheduler.com',
                    name: 'Admin User',
                    password: await this.hashPassword('admin123'),
                    role: 'admin',
                    isEmailVerified: true,
                    isActive: true
                });
                await testUser.save();
                Logger.info('Test user initialized', { email: testUser.email });
            }
        } catch (error) {
            Logger.error('Failed to initialize test user:', error);
        }
    }

    async register(data: RegisterData): Promise<UserResponse> {
        const { email, password, name } = data;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create new user
        const newUser = new User({
            email,
            name,
            password: await this.hashPassword(password),
            role: 'user',
            isEmailVerified: false,
            emailVerificationToken,
            emailVerificationExpires,
            isActive: true
        });

        await newUser.save();

        // Send verification email
        try {
            const emailSent = await emailService.sendVerificationEmail(email, emailVerificationToken, name);
            if (emailSent) {
                Logger.info('Verification email sent successfully', { userId: newUser._id, email });
            } else {
                Logger.error('Failed to send verification email - email service returned false', { userId: newUser._id, email });
            }
        } catch (error) {
            Logger.error('Failed to send verification email:', error);
            // Don't throw error here, user is still created
        }

        Logger.info('User registered successfully', { userId: newUser._id, email });

        return this.mapUserToResponse(newUser);
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        const user = await User.findOne({ email, isActive: true });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Verify password using bcrypt
        if (!await this.verifyPassword(password, user.password)) {
            throw new Error('Invalid email or password');
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT tokens
        const tokens = JWTService.generateTokenPair({
            userId: (user._id as any).toString(),
            email: user.email,
            role: user.role
        });

        // Store refresh token in database
        const refreshTokenDoc = new RefreshToken({
            token: tokens.refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        await refreshTokenDoc.save();

        Logger.info('User logged in successfully', { userId: user._id, email });

        return {
            user: this.mapUserToResponse(user),
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    async getUserProfile(userId: string): Promise<UserResponse> {
        const user = await User.findById(userId);

        if (!user || !user.isActive) {
            throw new Error('User not found');
        }

        return this.mapUserToResponse(user);
    }

    async updateUserProfile(userId: string, updateData: Partial<IUser>): Promise<UserResponse> {
        const user = await User.findById(userId);

        if (!user || !user.isActive) {
            throw new Error('User not found');
        }

        // Update user data
        Object.assign(user, updateData);
        await user.save();

        return this.mapUserToResponse(user);
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await User.findOne({ email, isActive: true });

        if (!user) {
            // Don't reveal if email exists or not
            Logger.info('Forgot password request for non-existent email', { email });
            return;
        }

        // Generate password reset token
        const passwordResetToken = crypto.randomBytes(32).toString('hex');
        const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpires = passwordResetExpires;
        await user.save();

        // In real app, send reset email
        Logger.info('Password reset token generated', { userId: user._id, email });
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            throw new Error('Invalid or expired reset token');
        }

        user.password = await this.hashPassword(newPassword);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        Logger.info('Password reset completed', { userId: user._id });
    }

    async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
        // Verify refresh token
        const payload = JWTService.verifyRefreshToken(refreshToken);

        // Check if refresh token exists in database and is not revoked
        const refreshTokenDoc = await RefreshToken.findOne({
            token: refreshToken,
            isRevoked: false,
            expiresAt: { $gt: new Date() }
        });

        if (!refreshTokenDoc) {
            throw new Error('Invalid refresh token');
        }

        // Get user to ensure they still exist
        const user = await User.findById(payload.userId);
        if (!user || !user.isActive) {
            throw new Error('User not found');
        }

        // Generate new token pair
        const tokens = JWTService.generateTokenPair({
            userId: (user._id as any).toString(),
            email: user.email,
            role: user.role
        });

        // Revoke old refresh token
        refreshTokenDoc.isRevoked = true;
        await refreshTokenDoc.save();

        // Store new refresh token
        const newRefreshTokenDoc = new RefreshToken({
            token: tokens.refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        await newRefreshTokenDoc.save();

        Logger.info('Access token refreshed successfully', { userId: user._id });

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    async logout(refreshToken: string): Promise<void> {
        // Revoke refresh token in database
        await RefreshToken.findOneAndUpdate(
            { token: refreshToken },
            { isRevoked: true }
        );
        Logger.info('User logged out successfully');
    }

    async logoutAllDevices(userId: string): Promise<void> {
        // Revoke all refresh tokens for this user
        await RefreshToken.updateMany(
            { userId, isRevoked: false },
            { isRevoked: true }
        );
        Logger.info('All devices logged out for user', { userId });
    }

    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    async verifyEmail(token: string): Promise<VerifyEmailResponse> {
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            throw new Error('Invalid or expired verification token');
        }

        if (user.isEmailVerified) {
            throw new Error('Email is already verified');
        }

        // Update user to mark email as verified
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        Logger.info('Email verified successfully', { userId: user._id, email: user.email });

        return {
            message: 'Email verified successfully',
            user: this.mapUserToResponse(user)
        };
    }

    async resendVerificationEmail(email: string): Promise<void> {
        const user = await User.findOne({ email, isActive: true });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.isEmailVerified) {
            throw new Error('Email is already verified');
        }

        // Generate new verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update user with new token
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationExpires = emailVerificationExpires;
        await user.save();

        // Send verification email
        try {
            const emailSent = await emailService.sendVerificationEmail(email, emailVerificationToken, user.name);
            if (emailSent) {
                Logger.info('Verification email resent successfully', { userId: user._id, email });
            } else {
                Logger.error('Failed to resend verification email - email service returned false', { userId: user._id, email });
                throw new Error('Failed to send verification email');
            }
        } catch (error) {
            Logger.error('Failed to resend verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }

    private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }

    private mapUserToResponse(user: IUser): UserResponse {
        return {
            id: (user._id as any).toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}

