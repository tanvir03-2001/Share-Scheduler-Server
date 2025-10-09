import { Request, Response, Router } from 'express';

const router = Router();

// Home route
router.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Server is running! 🚀',
        status: 'success',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000
    });
});

// Health check route
router.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

export default router;

