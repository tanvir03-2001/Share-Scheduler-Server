import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import * as FacebookController from './facebook.controller';

const router = Router();

// Facebook OAuth routes
router.get('/user/auth-url', AuthMiddleware.authenticate, FacebookController.generateUserAuthUrl);
router.get('/page/auth-url', AuthMiddleware.authenticate, FacebookController.generatePageAuthUrl);
router.get('/callback', FacebookController.handleCallback);

// Facebook connection status and management routes
router.get('/status', AuthMiddleware.authenticate, FacebookController.getFacebookConnectionStatus);
router.get('/pages', AuthMiddleware.authenticate, FacebookController.getConnectedPages);
router.post('/pages/refresh', AuthMiddleware.authenticate, FacebookController.refreshPages);
router.delete('/pages/disconnect', AuthMiddleware.authenticate, FacebookController.disconnectPages);
router.delete('/user/disconnect', AuthMiddleware.authenticate, FacebookController.disconnectUser);
router.get('/pages/:pageId/access-token', AuthMiddleware.authenticate, FacebookController.getPageAccessToken);
router.put('/pages/:pageId/set-active', AuthMiddleware.authenticate, FacebookController.setActivePage);
router.get('/app-info', AuthMiddleware.authenticate, FacebookController.getFacebookAppInfo);

// Instagram/Reels routes
router.get('/pages/:pageId/instagram-accounts', AuthMiddleware.authenticate, FacebookController.getInstagramAccounts);
router.post('/instagram/reel/upload', AuthMiddleware.authenticate, FacebookController.uploadInstagramReel);
router.post('/instagram/photo/upload', AuthMiddleware.authenticate, FacebookController.uploadInstagramPhoto);
router.get('/instagram/media/:mediaId/insights', AuthMiddleware.authenticate, FacebookController.getInstagramMediaInsights);
router.get('/instagram/account/:instagramAccountId/insights', AuthMiddleware.authenticate, FacebookController.getInstagramAccountInsights);

export default router;
