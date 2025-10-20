import { NextFunction, Request, Response } from 'express';
import { Logger } from '../utils/logger';
import { ResponseHelper } from '../utils/response';

export const handle = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    Logger.error('Error occurred:', error);

    // Default error response
    let statusCode = 500;
    let message = 'Internal Server Error';

    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
    } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Forbidden';
    } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Not Found';
    }

    ResponseHelper.error(res, message, error, statusCode);
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    (error as any).name = 'NotFoundError';
    next(error);
};

// Also export as ErrorHandler object for backward compatibility
export const ErrorHandler = {
    handle,
    notFound
};

