import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { FacebookController } from './facebook.controller';

const router = Router();
const facebookController = new FacebookController();

// Facebook OAuth routes
router.get('/auth-url', AuthMiddleware.authenticate, facebookController.generateAuthUrl);
router.get('/callback', facebookController.handleCallback);

// Facebook pages management routes (all require authentication)
router.get('/pages', AuthMiddleware.authenticate, facebookController.getConnectedPages);
router.post('/pages/refresh', AuthMiddleware.authenticate, facebookController.refreshPages);
router.delete('/pages/disconnect', AuthMiddleware.authenticate, facebookController.disconnectPages);
router.get('/pages/:pageId/access-token', AuthMiddleware.authenticate, facebookController.getPageAccessToken);

export default router;
