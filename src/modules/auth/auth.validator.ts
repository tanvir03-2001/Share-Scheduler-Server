import { NextFunction, Request, Response } from 'express';
import { ResponseHelper } from '../../utils/response';

export class AuthValidator {
    static validateRegistration(req: Request, res: Response, next: NextFunction): void {
        const { email, password, name } = req.body;
        const errors: string[] = [];

        // Email validation
        if (!email) {
            errors.push('Email is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email format');
        }

        // Password validation
        if (!password) {
            errors.push('Password is required');
        } else if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        }

        // Name validation
        if (!name) {
            errors.push('Name is required');
        } else if (name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (errors.length > 0) {
            return ResponseHelper.error(res, 'Validation failed', { errors }, 400);
        }

        next();
    }

    static validateLogin(req: Request, res: Response, next: NextFunction): void {
        const { email, password } = req.body;
        const errors: string[] = [];

        if (!email) {
            errors.push('Email is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email format');
        }

        if (!password) {
            errors.push('Password is required');
        }

        if (errors.length > 0) {
            return ResponseHelper.error(res, 'Validation failed', { errors }, 400);
        }

        next();
    }

    static validateForgotPassword(req: Request, res: Response, next: NextFunction): void {
        const { email } = req.body;

        if (!email) {
            return ResponseHelper.error(res, 'Email is required', undefined, 400);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return ResponseHelper.error(res, 'Invalid email format', undefined, 400);
        }

        next();
    }

    static validateResetPassword(req: Request, res: Response, next: NextFunction): void {
        const { token, newPassword } = req.body;
        const errors: string[] = [];

        if (!token) {
            errors.push('Reset token is required');
        }

        if (!newPassword) {
            errors.push('New password is required');
        } else if (newPassword.length < 8) {
            errors.push('Password must be at least 8 characters long');
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        }

        if (errors.length > 0) {
            return ResponseHelper.error(res, 'Validation failed', { errors }, 400);
        }

        next();
    }

    static validateUpdateProfile(req: Request, res: Response, next: NextFunction): void {
        const { name, email } = req.body;
        const errors: string[] = [];

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length < 2) {
                errors.push('Name must be at least 2 characters long');
            }
        }

        if (email !== undefined) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push('Invalid email format');
            }
        }

        if (errors.length > 0) {
            return ResponseHelper.error(res, 'Validation failed', { errors }, 400);
        }

        next();
    }
}

