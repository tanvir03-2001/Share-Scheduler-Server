import { NextFunction, Request, Response } from 'express';
import { JWTService } from '../utils/jwt.service';
import { ResponseHelper } from '../utils/response';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export class AuthMiddleware {
    static authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return ResponseHelper.unauthorized(res, 'Authorization header is required');
            }

            // Extract token from Authorization header
            const token = JWTService.extractTokenFromHeader(authHeader);

            // Verify access token
            const payload = JWTService.verifyAccessToken(token);

            // Set user data in request
            req.user = {
                id: payload.userId,
                email: payload.email,
                role: payload.role
            };

            next();
        } catch (error: any) {
            return ResponseHelper.unauthorized(res, error.message || 'Invalid token');
        }
    }

    static authorize(roles: string[]) {
        return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
            if (!req.user) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            if (!roles.includes(req.user.role)) {
                return ResponseHelper.forbidden(res, 'Insufficient permissions');
            }

            next();
        };
    }
}

