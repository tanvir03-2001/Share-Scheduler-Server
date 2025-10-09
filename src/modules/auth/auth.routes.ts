import { Router } from 'express';
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
    ValidationMiddleware.validateRequired(['refreshToken']),
    authController.refreshToken
);

// Protected routes
router.post('/logout',
    ValidationMiddleware.validateRequired(['refreshToken']),
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

