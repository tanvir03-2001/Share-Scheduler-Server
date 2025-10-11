import jwt from 'jsonwebtoken';
import { TokenPayload } from '../modules/auth/auth.types';

export class JWTService {
    private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-access-token-secret-key';
    private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key';
    private static readonly ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // 1 day
    private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days

    /**
     * Generate access token
     */
    static generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
        const tokenPayload: TokenPayload = {
            ...payload,
            type: 'access'
        };

        return jwt.sign(tokenPayload, this.ACCESS_TOKEN_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
            issuer: 'facebook-auto-post-app',
            audience: 'facebook-auto-post-users'
        } as jwt.SignOptions);
    }

    /**
     * Generate refresh token
     */
    static generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
        const tokenPayload: TokenPayload = {
            ...payload,
            type: 'refresh'
        };

        return jwt.sign(tokenPayload, this.REFRESH_TOKEN_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
            issuer: 'facebook-auto-post-app',
            audience: 'facebook-auto-post-users'
        } as jwt.SignOptions);
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): TokenPayload {
        try {
            const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
                issuer: 'facebook-auto-post-app',
                audience: 'facebook-auto-post-users'
            }) as TokenPayload;

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }

    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token: string): TokenPayload {
        try {
            const decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
                issuer: 'facebook-auto-post-app',
                audience: 'facebook-auto-post-users'
            }) as TokenPayload;

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    /**
     * Generate both access and refresh tokens
     */
    static generateTokenPair(payload: Omit<TokenPayload, 'type'>): {
        accessToken: string;
        refreshToken: string;
    } {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload)
        };
    }

    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader: string): string {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Invalid authorization header format');
        }

        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    /**
     * Get token expiration time
     */
    static getTokenExpiration(token: string, isRefreshToken: boolean = false): Date {
        const secret = isRefreshToken ? this.REFRESH_TOKEN_SECRET : this.ACCESS_TOKEN_SECRET;
        const decoded = jwt.decode(token) as any;

        if (!decoded || !decoded.exp) {
            throw new Error('Invalid token');
        }

        return new Date(decoded.exp * 1000);
    }
}
