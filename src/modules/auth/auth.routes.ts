import { Router } from 'express';
import passport from 'passport';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthController } from './auth.controller';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register',
    ValidationMiddleware.validateRequired(['email', 'password', 'name']),
    ValidationMiddleware.validateEmailFormat,
    ValidationMiddleware.validatePasswordStrength,
    authController.register
);

router.post('/login',
    ValidationMiddleware.validateRequired(['email', 'password']),
    ValidationMiddleware.validateEmailFormat,
    authController.login
);

router.post('/forgot-password',
    ValidationMiddleware.validateRequired(['email']),
    ValidationMiddleware.validateEmailFormat,
    authController.forgotPassword
);

router.post('/reset-password',
    ValidationMiddleware.validateRequired(['token', 'newPassword']),
    ValidationMiddleware.validatePasswordStrength,
    authController.resetPassword
);

router.post('/verify-email',
    ValidationMiddleware.validateRequired(['token']),
    authController.verifyEmail
);

router.post('/resend-verification',
    ValidationMiddleware.validateRequired(['email']),
    ValidationMiddleware.validateEmailFormat,
    authController.resendVerificationEmail
);

// Token refresh route (public)
router.post('/refresh-token',
    authController.refreshToken
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
    authController.facebookCallback
);

// Protected routes
router.post('/logout',
    authController.logout
);

router.post('/logout-all-devices',
    AuthMiddleware.authenticate,
    authController.logoutAllDevices
);

router.get('/profile',
    AuthMiddleware.authenticate,
    authController.getProfile
);

router.put('/profile',
    AuthMiddleware.authenticate,
    authController.updateProfile
);

export default router;

