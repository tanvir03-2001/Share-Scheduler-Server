import { NextFunction, Request, Response } from 'express';
import { Logger } from '../utils/logger';

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests per window
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private requests: Map<string, RateLimitEntry> = new Map();
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;

        // Clean up expired entries every minute
        setInterval(() => {
            this.cleanup();
        }, 60000);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.requests.entries()) {
            if (entry.resetTime < now) {
                this.requests.delete(key);
            }
        }
    }

    private getKey(req: Request): string {
        // Use user ID if available, otherwise use IP address
        const userId = (req as any).jwtUser?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
    }

    isAllowed(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
        const key = this.getKey(req);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        let entry = this.requests.get(key);

        if (!entry || entry.resetTime < now) {
            // Create new entry or reset expired entry
            entry = {
                count: 0,
                resetTime: now + this.config.windowMs
            };
            this.requests.set(key, entry);
        }

        entry.count++;

        const allowed = entry.count <= this.config.maxRequests;
        const remaining = Math.max(0, this.config.maxRequests - entry.count);

        return {
            allowed,
            remaining,
            resetTime: entry.resetTime
        };
    }
}

// Create rate limiters for different endpoints
const facebookApiLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 requests per 15 minutes
    message: 'Too many Facebook API requests. Please try again later.'
});

const generalApiLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many requests. Please try again later.'
});

export const facebookRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const result = facebookApiLimiter.isAllowed(req);

    // Set rate limit headers
    res.set({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (!result.allowed) {
        Logger.warn('Facebook API rate limit exceeded', {
            userId: (req as any).jwtUser?.id,
            ip: req.ip,
            endpoint: req.path,
            method: req.method
        });

        return res.status(429).json({
            success: false,
            error: 'Facebook API rate limit exceeded. Please wait before making more requests.',
            message: 'Rate limit exceeded. Please try again in a few minutes.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
    }

    next();
};

export const generalRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const result = generalApiLimiter.isAllowed(req);

    // Set rate limit headers
    res.set({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (!result.allowed) {
        Logger.warn('General API rate limit exceeded', {
            userId: (req as any).jwtUser?.id,
            ip: req.ip,
            endpoint: req.path,
            method: req.method
        });

        return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded. Please wait before making more requests.',
            message: 'Too many requests. Please try again in a few minutes.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
    }

    next();
};

// Special rate limiter for Facebook connection attempts
export const facebookConnectionRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const connectionLimiter = new RateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5, // 5 connection attempts per hour
        message: 'Too many Facebook connection attempts. Please try again later.'
    });

    const result = connectionLimiter.isAllowed(req);

    if (!result.allowed) {
        Logger.warn('Facebook connection rate limit exceeded', {
            userId: (req as any).jwtUser?.id,
            ip: req.ip,
            endpoint: req.path
        });

        return res.status(429).json({
            success: false,
            error: 'Too many Facebook connection attempts. Please wait before trying again.',
            message: 'You have exceeded the maximum number of Facebook connection attempts. Please try again in an hour.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
    }

    next();
};

