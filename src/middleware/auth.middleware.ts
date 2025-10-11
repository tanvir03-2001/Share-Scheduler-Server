import { NextFunction, Request, Response } from 'express';
import { JWTService } from '../utils/jwt.service';
import { ResponseHelper } from '../utils/response';

export interface JWTAuthenticatedRequest extends Request {
    jwtUser?: {
        id: string;
        email: string;
        role: string;
    };
}

export class AuthMiddleware {
    static authenticate(req: JWTAuthenticatedRequest, res: Response, next: NextFunction): void {
        try {
            // Try to get token from cookies first, then fallback to Authorization header
            let token = req.cookies.access_token;

            if (!token) {
                const authHeader = req.headers.authorization;
                if (authHeader) {
                    token = JWTService.extractTokenFromHeader(authHeader);
                }
            }

            if (!token) {
                return ResponseHelper.unauthorized(res, 'Access token is required');
            }

            // Verify access token
            const payload = JWTService.verifyAccessToken(token);

            // Set user data in request
            req.jwtUser = {
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
        return (req: JWTAuthenticatedRequest, res: Response, next: NextFunction): void => {
            if (!req.jwtUser) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            if (!roles.includes(req.jwtUser.role)) {
                return ResponseHelper.forbidden(res, 'Insufficient permissions');
            }

            next();
        };
    }
}

