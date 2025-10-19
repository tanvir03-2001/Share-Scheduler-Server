import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from './config/passport';

// Import database
import { database } from './config/database';

// Import services
import { serveStaticFiles } from './services/file-upload.service';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import contentRoutes from './modules/content/content.routes';
import facebookRoutes from './modules/facebook/facebook.routes';
import userRoutes from './modules/user/user.routes';
import homeRoutes from './routes/home.routes';

// Load environment variables
dotenv.config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'https://client-two-iota-21.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Add any other frontend URLs you need
        /^https:\/\/.*\.vercel\.app$/, // Allow all Vercel deployments
        /^https:\/\/.*\.netlify\.app$/ // Allow all Netlify deployments
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
}));
app.use(cookieParser());
// Simple logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for Passport.js
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Serve static files (uploads)
serveStaticFiles(app);

// Routes
app.use('/', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/facebook', facebookRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`❌ Server Error: ${err.message}`);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await database.connect();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
            console.log(`🌐 http://localhost:${PORT} | 🗄️ DB: Connected | ⏰ Scheduler: Started`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
