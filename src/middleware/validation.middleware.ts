import { NextFunction, Request, Response } from 'express';
import { ResponseHelper } from '../utils/response';

export class ValidationMiddleware {
    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePassword(password: string): boolean {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    static validateRequired(fields: string[]) {
        return (req: Request, res: Response, next: NextFunction): void => {
            const missingFields: string[] = [];

            fields.forEach(field => {
                if (!req.body[field] || req.body[field].toString().trim() === '') {
                    missingFields.push(field);
                }
            });

            if (missingFields.length > 0) {
                return ResponseHelper.error(
                    res,
                    `Missing required fields: ${missingFields.join(', ')}`,
                    undefined,
                    400
                );
            }

            next();
        };
    }

    static validateEmailFormat(req: Request, res: Response, next: NextFunction): void {
        const { email } = req.body;

        if (email && !ValidationMiddleware.validateEmail(email)) {
            return ResponseHelper.error(res, 'Invalid email format', undefined, 400);
        }

        next();
    }

    static validatePasswordStrength(req: Request, res: Response, next: NextFunction): void {
        const { password } = req.body;

        if (password && !ValidationMiddleware.validatePassword(password)) {
            return ResponseHelper.error(
                res,
                'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
                undefined,
                400
            );
        }

        next();
    }
}

