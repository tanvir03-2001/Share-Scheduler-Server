import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { facebookConnectionRateLimit, facebookRateLimit } from '../../middleware/rate-limit.middleware';
import { FacebookController } from './facebook.controller';

const router = Router();
const facebookController = new FacebookController();

// Facebook OAuth routes (with connection rate limiting)
router.get('/user/auth-url', AuthMiddleware.authenticate, facebookConnectionRateLimit, facebookController.generateUserAuthUrl);
router.get('/page/auth-url', AuthMiddleware.authenticate, facebookConnectionRateLimit, facebookController.generatePageAuthUrl);
router.get('/callback', facebookController.handleCallback);

// Facebook connection status and management routes (all require authentication and rate limiting)
router.get('/status', AuthMiddleware.authenticate, facebookRateLimit, facebookController.getFacebookConnectionStatus);
router.get('/pages', AuthMiddleware.authenticate, facebookRateLimit, facebookController.getConnectedPages);
router.post('/pages/refresh', AuthMiddleware.authenticate, facebookRateLimit, facebookController.refreshPages);
router.delete('/pages/disconnect', AuthMiddleware.authenticate, facebookRateLimit, facebookController.disconnectPages);
router.delete('/user/disconnect', AuthMiddleware.authenticate, facebookRateLimit, facebookController.disconnectUser);
router.get('/pages/:pageId/access-token', AuthMiddleware.authenticate, facebookRateLimit, facebookController.getPageAccessToken);
router.get('/app-info', AuthMiddleware.authenticate, facebookRateLimit, facebookController.getFacebookAppInfo);

// Instagram/Reels routes (with rate limiting)
router.get('/pages/:pageId/instagram-accounts', AuthMiddleware.authenticate, facebookRateLimit, facebookController.getInstagramAccounts);
router.post('/instagram/reel/upload', AuthMiddleware.authenticate, facebookRateLimit, facebookController.uploadInstagramReel);
router.post('/instagram/photo/upload', AuthMiddleware.authenticate, facebookRateLimit, facebookController.uploadInstagramPhoto);
router.get('/instagram/media/:mediaId/insights', AuthMiddleware.authenticate, facebookRateLimit, facebookController.getInstagramMediaInsights);
router.get('/instagram/account/:instagramAccountId/insights', AuthMiddleware.authenticate, facebookRateLimit, facebookController.getInstagramAccountInsights);

export default router;
