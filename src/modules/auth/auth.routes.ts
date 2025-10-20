import { Router } from 'express';
import passport from 'passport';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import * as AuthController from './auth.controller';

const router = Router();

// Public routes
router.post('/register',
    ValidationMiddleware.validateRequired(['email', 'password', 'name']),
    ValidationMiddleware.validateEmailFormat,
    ValidationMiddleware.validatePasswordStrength,
    AuthController.register
);

router.post('/login',
    ValidationMiddleware.validateRequired(['email', 'password']),
    ValidationMiddleware.validateEmailFormat,
    AuthController.login
);

router.post('/forgot-password',
    ValidationMiddleware.validateRequired(['email']),
    ValidationMiddleware.validateEmailFormat,
    AuthController.forgotPassword
);

router.post('/reset-password',
    ValidationMiddleware.validateRequired(['token', 'newPassword']),
    ValidationMiddleware.validatePasswordStrength,
    AuthController.resetPassword
);

router.post('/verify-email',
    ValidationMiddleware.validateRequired(['token']),
    AuthController.verifyEmail
);

router.post('/resend-verification',
    ValidationMiddleware.validateRequired(['email']),
    ValidationMiddleware.validateEmailFormat,
    AuthController.resendVerificationEmail
);

// Token refresh route (public)
router.post('/refresh-token',
    AuthController.refreshToken
);

// Facebook Business OAuth routes
router.get('/facebook',
    passport.authenticate('facebook', {
        scope: process.env.FACEBOOK_BUSINESS_SCOPES?.split(',') || [
            'public_profile',
            'email'
        ]
    })
);

router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_auth_failed' }),
    AuthController.facebookCallback
);

// Protected routes
router.post('/logout',
    AuthController.logout
);

router.post('/logout-all-devices',
    AuthMiddleware.authenticate,
    AuthController.logoutAllDevices
);

router.get('/profile',
    AuthMiddleware.authenticate,
    AuthController.getProfile
);

router.put('/profile',
    AuthMiddleware.authenticate,
    AuthController.updateProfile
);

export default router;

