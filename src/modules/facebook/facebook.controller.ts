import { Request, Response } from 'express';
import { JWTAuthenticatedRequest } from '../../middleware/auth.middleware';
import { FacebookService } from '../../services/facebook.service';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import { User } from '../user/User.model';

export class FacebookController {
    private facebookService: FacebookService;

    constructor() {
        this.facebookService = new FacebookService();
    }

    // Generate Facebook OAuth URL for page connection
    generateAuthUrl = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.jwtUser?.id;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            // Generate state parameter with user ID for security
            const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
            const authUrl = this.facebookService.generateAuthUrl(state);

            Logger.info('Facebook auth URL generated', { userId });

            ResponseHelper.success(res, 'Facebook auth URL generated successfully', { authUrl });
        } catch (error: any) {
            Logger.error('Generate Facebook auth URL error:', error);
            ResponseHelper.error(res, error.message || 'Failed to generate Facebook auth URL', error);
        }
    };

    // Handle Facebook OAuth callback
    handleCallback = async (req: Request, res: Response): Promise<void> => {
        try {
            const { code, state } = req.query;

            if (!code) {
                return ResponseHelper.error(res, 'Authorization code is required', null, 400);
            }

            if (!state) {
                return ResponseHelper.error(res, 'State parameter is required', null, 400);
            }

            // Decode and verify state parameter
            let stateData;
            try {
                stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
            } catch (error) {
                return ResponseHelper.error(res, 'Invalid state parameter', null, 400);
            }

            const userId = stateData.userId;
            if (!userId) {
                return ResponseHelper.error(res, 'Invalid state parameter', null, 400);
            }

            Logger.info('Facebook OAuth callback received', { userId });

            // Exchange code for access token
            const tokenData = await this.facebookService.exchangeCodeForToken(code as string);

            // Get long-lived token
            const longLivedToken = await this.facebookService.getLongLivedToken(tokenData.access_token);

            // Get user's Facebook pages
            const pages = await this.facebookService.getUserPages(longLivedToken.access_token);

            // Update user with Facebook data
            const user = await User.findById(userId);
            if (!user) {
                return ResponseHelper.error(res, 'User not found', null, 404);
            }

            // Store Facebook data in user document
            user.facebookAccessToken = longLivedToken.access_token;
            user.facebookTokenExpiresAt = new Date(Date.now() + (longLivedToken.expires_in * 1000));
            user.facebookPages = pages.map(page => ({
                id: page.id,
                name: page.name,
                category: page.category,
                accessToken: page.access_token,
                picture: page.picture?.data?.url,
                followersCount: page.followers_count,
                tasks: page.tasks,
                connectedAt: new Date()
            }));

            await user.save();

            Logger.info('Facebook pages connected successfully', {
                userId,
                pagesCount: pages.length,
                pageNames: pages.map(p => p.name)
            });

            // Redirect to frontend callback page
            const frontendCallbackUrl = `${process.env.CLIENT_URL}/dashboard/facebook-callback?success=true&pages=${pages.length}`;
            res.redirect(frontendCallbackUrl);
        } catch (error: any) {
            Logger.error('Facebook OAuth callback error:', error);
            // Redirect to frontend callback page with error
            const frontendCallbackUrl = `${process.env.CLIENT_URL}/dashboard/facebook-callback?error=true&message=${encodeURIComponent(error.message || 'Failed to connect Facebook pages')}`;
            res.redirect(frontendCallbackUrl);
        }
    };

    // Get user's connected Facebook pages
    getConnectedPages = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.jwtUser?.id;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            const user = await User.findById(userId);
            if (!user) {
                return ResponseHelper.error(res, 'User not found', null, 404);
            }

            const connectedPages = user.facebookPages || [];

            ResponseHelper.success(res, 'Connected Facebook pages retrieved successfully', {
                pages: connectedPages,
                totalPages: connectedPages.length
            });
        } catch (error: any) {
            Logger.error('Get connected Facebook pages error:', error);
            ResponseHelper.error(res, error.message || 'Failed to get connected Facebook pages', error);
        }
    };

    // Refresh Facebook pages data
    refreshPages = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.jwtUser?.id;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            const user = await User.findById(userId);
            if (!user || !user.facebookAccessToken) {
                return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
            }

            // Check if token is still valid
            const tokenValidation = await this.facebookService.verifyAccessToken(user.facebookAccessToken);
            if (!tokenValidation.valid) {
                return ResponseHelper.error(res, 'Facebook access token is invalid or expired', null, 401);
            }

            // Get updated pages data
            const pages = await this.facebookService.getUserPages(user.facebookAccessToken);

            // Update user's Facebook pages
            user.facebookPages = pages.map(page => ({
                id: page.id,
                name: page.name,
                category: page.category,
                accessToken: page.access_token,
                picture: page.picture?.data?.url,
                followersCount: page.followers_count,
                tasks: page.tasks,
                connectedAt: new Date()
            }));

            await user.save();

            Logger.info('Facebook pages refreshed successfully', {
                userId,
                pagesCount: pages.length
            });

            ResponseHelper.success(res, 'Facebook pages refreshed successfully', {
                pages: user.facebookPages,
                message: `Successfully refreshed ${pages.length} Facebook page(s)`
            });
        } catch (error: any) {
            Logger.error('Refresh Facebook pages error:', error);
            ResponseHelper.error(res, error.message || 'Failed to refresh Facebook pages', error);
        }
    };

    // Disconnect Facebook pages
    disconnectPages = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.jwtUser?.id;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            const user = await User.findById(userId);
            if (!user) {
                return ResponseHelper.error(res, 'User not found', null, 404);
            }

            // Clear Facebook data
            user.facebookAccessToken = undefined;
            user.facebookTokenExpiresAt = undefined;
            user.facebookPages = [];

            await user.save();

            Logger.info('Facebook pages disconnected successfully', { userId });

            ResponseHelper.success(res, 'Facebook pages disconnected successfully', {
                message: 'All Facebook pages have been disconnected'
            });
        } catch (error: any) {
            Logger.error('Disconnect Facebook pages error:', error);
            ResponseHelper.error(res, error.message || 'Failed to disconnect Facebook pages', error);
        }
    };

    // Get page access token for a specific page
    getPageAccessToken = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.jwtUser?.id;
            const { pageId } = req.params;

            if (!userId) {
                return ResponseHelper.unauthorized(res, 'User not authenticated');
            }

            if (!pageId) {
                return ResponseHelper.error(res, 'Page ID is required', null, 400);
            }

            const user = await User.findById(userId);
            if (!user || !user.facebookAccessToken) {
                return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
            }

            // Find the specific page
            const page = user.facebookPages?.find(p => p.id === pageId);
            if (!page) {
                return ResponseHelper.error(res, 'Page not found in connected pages', null, 404);
            }

            // Get fresh page access token
            const pageAccessToken = await this.facebookService.getPageAccessToken(
                user.facebookAccessToken,
                pageId
            );

            ResponseHelper.success(res, 'Page access token retrieved successfully', {
                pageId,
                accessToken: pageAccessToken,
                pageName: page.name
            });
        } catch (error: any) {
            Logger.error('Get page access token error:', error);
            ResponseHelper.error(res, error.message || 'Failed to get page access token', error);
        }
    };
}
