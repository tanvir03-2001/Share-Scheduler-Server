import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { FacebookController } from './facebook.controller';

const router = Router();
const facebookController = new FacebookController();

// Facebook OAuth routes
router.get('/user/auth-url', AuthMiddleware.authenticate, facebookController.generateUserAuthUrl);
router.get('/page/auth-url', AuthMiddleware.authenticate, facebookController.generatePageAuthUrl);
router.get('/callback', facebookController.handleCallback);

// Facebook connection status and management routes
router.get('/status', AuthMiddleware.authenticate, facebookController.getFacebookConnectionStatus);
router.get('/pages', AuthMiddleware.authenticate, facebookController.getConnectedPages);
router.post('/pages/refresh', AuthMiddleware.authenticate, facebookController.refreshPages);
router.delete('/pages/disconnect', AuthMiddleware.authenticate, facebookController.disconnectPages);
router.delete('/user/disconnect', AuthMiddleware.authenticate, facebookController.disconnectUser);
router.get('/pages/:pageId/access-token', AuthMiddleware.authenticate, facebookController.getPageAccessToken);
router.put('/pages/:pageId/set-active', AuthMiddleware.authenticate, facebookController.setActivePage);
router.get('/app-info', AuthMiddleware.authenticate, facebookController.getFacebookAppInfo);

// Instagram/Reels routes
router.get('/pages/:pageId/instagram-accounts', AuthMiddleware.authenticate, facebookController.getInstagramAccounts);
router.post('/instagram/reel/upload', AuthMiddleware.authenticate, facebookController.uploadInstagramReel);
router.post('/instagram/photo/upload', AuthMiddleware.authenticate, facebookController.uploadInstagramPhoto);
router.get('/instagram/media/:mediaId/insights', AuthMiddleware.authenticate, facebookController.getInstagramMediaInsights);
router.get('/instagram/account/:instagramAccountId/insights', AuthMiddleware.authenticate, facebookController.getInstagramAccountInsights);

export default router;
