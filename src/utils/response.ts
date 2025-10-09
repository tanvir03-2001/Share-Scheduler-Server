import { Response } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: any;
    timestamp: string;
}

export class ResponseHelper {
    static success<T>(res: Response, message: string, data?: T, statusCode: number = 200): void {
        const response: ApiResponse<T> = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        res.status(statusCode).json(response);
    }

    static error(res: Response, message: string, error?: any, statusCode: number = 500): void {
        const response: ApiResponse = {
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error : undefined,
            timestamp: new Date().toISOString()
        };
        res.status(statusCode).json(response);
    }

    static notFound(res: Response, message: string = 'Resource not found'): void {
        this.error(res, message, undefined, 404);
    }

    static unauthorized(res: Response, message: string = 'Unauthorized'): void {
        this.error(res, message, undefined, 401);
    }

    static forbidden(res: Response, message: string = 'Forbidden'): void {
        this.error(res, message, undefined, 403);
    }
}

