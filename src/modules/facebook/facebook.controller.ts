import { Request, Response } from 'express';
import { JWTAuthenticatedRequest } from '../../middleware/auth.middleware';
import { FacebookService } from '../../services/facebook.service';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import { RetryUtil } from '../../utils/retry.util';
import { User } from '../user/User.model';
import { FacebookPage } from './FacebookPage.model';
import { FacebookUser } from './FacebookUser.model';

// Generate Facebook OAuth URL for user connection
export const generateUserAuthUrl = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { reconnect } = req.query;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        // Check if user already has Facebook connection
        const existingFacebookUser = await FacebookUser.findOne({ userId });
        if (existingFacebookUser && !reconnect) {
            return ResponseHelper.error(res, 'Facebook account already connected', null, 400);
        }

        // Generate state parameter with user ID and connection type for security
        const state = Buffer.from(JSON.stringify({ userId, type: 'user', reconnect: !!reconnect })).toString('base64');
        const authUrl = facebookService.generateUserAuthUrl(state);

        console.log(`🔗 Facebook auth URL generated for user ${userId}`);
        Logger.info('Facebook user auth URL generated', { userId, reconnect: !!reconnect });

        ResponseHelper.success(res, 'Facebook user auth URL generated successfully', { authUrl });
    } catch (error: any) {
        Logger.error('Generate Facebook user auth URL error:', error);
        ResponseHelper.error(res, error.message || 'Failed to generate Facebook user auth URL', error);
    }
};

// Generate Facebook OAuth URL for page connection
export const generatePageAuthUrl = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        // Check if user has Facebook connection first
        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'Please connect your Facebook account first', null, 400);
        }

        // Generate state parameter with user ID and connection type for security
        const state = Buffer.from(JSON.stringify({ userId, type: 'page' })).toString('base64');
        const authUrl = facebookService.generatePageAuthUrl(state);

        Logger.info('Facebook page auth URL generated', { userId });

        ResponseHelper.success(res, 'Facebook page auth URL generated successfully', { authUrl });
    } catch (error: any) {
        Logger.error('Generate Facebook page auth URL error:', error);
        ResponseHelper.error(res, error.message || 'Failed to generate Facebook page auth URL', error);
    }
};

// Handle Facebook OAuth callback
export const handleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, state } = req.query;
        const facebookService = new FacebookService();

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
        const connectionType = stateData.type;
        const isReconnect = stateData.reconnect || false;

        if (!userId || !connectionType) {
            return ResponseHelper.error(res, 'Invalid state parameter', null, 400);
        }

        Logger.info('Facebook OAuth callback received', { userId, connectionType, isReconnect });

        // Exchange code for access token
        const tokenData = await facebookService.exchangeCodeForToken(code as string);

        // Get long-lived token
        const longLivedToken = await facebookService.getLongLivedToken(tokenData.access_token);

        if (connectionType === 'user') {
            // Handle user connection (this now automatically fetches pages)
            // Ensure expires_in is valid, default to 60 days if not provided
            const expiresIn = longLivedToken.expires_in && longLivedToken.expires_in > 0
                ? longLivedToken.expires_in
                : 60 * 24 * 60 * 60; // 60 days in seconds
            await handleUserConnection(userId, longLivedToken.access_token, expiresIn, isReconnect);

            // Get the count of pages that were automatically fetched
            const connectedPages = await FacebookPage.find({ userId, isActive: true });
            const pagesCount = connectedPages.length;

            // Redirect to frontend callback page with pages count
            const frontendCallbackUrl = `${process.env.CLIENT_URL}/dashboard/facebook-callback?success=true&type=user&pages=${pagesCount}&reconnect=${isReconnect}`;
            res.redirect(frontendCallbackUrl);
        } else if (connectionType === 'page') {
            // Handle page connection
            const pages = await handlePageConnection(userId, longLivedToken.access_token);

            // Redirect to frontend callback page
            const frontendCallbackUrl = `${process.env.CLIENT_URL}/dashboard/facebook-callback?success=true&type=page&pages=${pages.length}`;
            res.redirect(frontendCallbackUrl);
        } else {
            throw new Error('Invalid connection type');
        }
    } catch (error: any) {
        Logger.error('Facebook OAuth callback error:', error);

        // Provide more specific error messages
        let errorMessage = 'Failed to connect Facebook';
        let isRetryable = false;

        if (RetryUtil.isFacebookRateLimitError(error)) {
            errorMessage = 'Facebook API rate limit reached. Please wait a few minutes and try again. This is a temporary limitation from Facebook.';
            isRetryable = true;
        } else if (RetryUtil.isFacebookTransientError(error)) {
            errorMessage = 'Facebook service is temporarily unavailable. Please try again in a few minutes.';
            isRetryable = true;
        } else if (error.message.includes('App ID')) {
            errorMessage = 'Facebook App ID is not configured properly. Please check your server environment variables.';
        } else if (error.message.includes('App Secret')) {
            errorMessage = 'Facebook App Secret is not configured properly. Please check your server environment variables.';
        } else if (error.message.includes('Redirect URI')) {
            errorMessage = 'Facebook Redirect URI is not configured properly. Please check your server environment variables.';
        } else if (error.message.includes('token exchange failed')) {
            errorMessage = 'Facebook token exchange failed. Please check your Facebook app configuration and try again.';
        } else if (error.message.includes('Invalid state parameter')) {
            errorMessage = 'Invalid request. Please try connecting again from the dashboard.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Redirect to frontend callback page with error
        const frontendCallbackUrl = `${process.env.CLIENT_URL}/dashboard/facebook-callback?error=true&message=${encodeURIComponent(errorMessage)}&retryable=${isRetryable}`;
        res.redirect(frontendCallbackUrl);
    }
};

// Validate and filter pages based on current access token
const validateAndFilterPages = async (userId: string, accessToken: string): Promise<any[]> => {
    try {
        const facebookService = new FacebookService();
        const tokenValidation = await facebookService.verifyAccessToken(accessToken);
        if (!tokenValidation.valid) {
            return [];
        }

        // Get pages that user currently has access to
        const currentPages = await facebookService.getUserPages(accessToken);
        const currentPageIds = currentPages.map(page => page.id);

        // Only return pages that exist in database AND user still has access to
        const connectedPages = await FacebookPage.find({
            userId,
            isActive: true,
            pageId: { $in: currentPageIds }
        });

        // Update pages with current data from Facebook
        const accessiblePages = connectedPages.map(dbPage => {
            const currentPage = currentPages.find(p => p.id === dbPage.pageId);
            return {
                pageId: dbPage.pageId,
                pageName: currentPage?.name || dbPage.pageName,
                category: currentPage?.category || dbPage.category,
                picture: currentPage?.picture?.data?.url || dbPage.picture,
                followersCount: currentPage?.followers_count || dbPage.followersCount,
                isDefaultActive: dbPage.isDefaultActive,
                connectedAt: dbPage.connectedAt
            };
        });

        // Update database with current page data
        for (const currentPage of currentPages) {
            await FacebookPage.findOneAndUpdate(
                { userId, pageId: currentPage.id },
                {
                    pageName: currentPage.name,
                    category: currentPage.category,
                    accessToken: currentPage.access_token,
                    picture: currentPage.picture?.data?.url,
                    followersCount: currentPage.followers_count,
                    tasks: currentPage.tasks,
                    lastUsedAt: new Date()
                },
                { upsert: false } // Don't create new pages, only update existing ones
            );
        }

        return accessiblePages;
    } catch (error) {
        Logger.warn('Failed to validate Facebook pages access', { userId, error: (error as Error).message });
        return [];
    }
};

// Handle Facebook user connection
const handleUserConnection = async (userId: string, accessToken: string, expiresIn: number, isReconnect: boolean = false): Promise<void> => {
    const facebookService = new FacebookService();

    // Get Facebook user information
    const facebookUserInfo = await facebookService.getFacebookUserInfo(accessToken);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Validate and calculate token expiration date
    let tokenExpiresAt: Date;
    if (expiresIn && expiresIn > 0) {
        tokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));
    } else {
        // Default to 60 days from now if expiresIn is invalid
        tokenExpiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000));
    }

    // Validate the date is not invalid
    if (isNaN(tokenExpiresAt.getTime())) {
        tokenExpiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days fallback
    }

    // Create or update Facebook user record
    const facebookUser = await FacebookUser.findOneAndUpdate(
        { userId },
        {
            facebookId: facebookUserInfo.id,
            facebookName: facebookUserInfo.name,
            facebookEmail: facebookUserInfo.email,
            accessToken,
            tokenExpiresAt,
            profilePicture: facebookUserInfo.picture?.data?.url,
            isActive: true,
            lastUsedAt: new Date()
        },
        { upsert: true, new: true }
    );

    Logger.info('Facebook user connected successfully', {
        userId,
        facebookId: facebookUserInfo.id,
        facebookName: facebookUserInfo.name,
        isReconnect
    });

    // Automatically fetch and save user's Facebook pages
    try {
        const pages = await facebookService.getUserPages(accessToken);

        // Store pages in database
        const savedPages = [];
        for (const page of pages) {
            const facebookPage = await FacebookPage.findOneAndUpdate(
                { userId, pageId: page.id },
                {
                    facebookUserId: facebookUser._id,
                    pageName: page.name,
                    category: page.category,
                    accessToken: page.access_token,
                    picture: page.picture?.data?.url,
                    followersCount: page.followers_count,
                    tasks: page.tasks,
                    isActive: true,
                    lastUsedAt: new Date()
                },
                { upsert: true, new: true }
            );
            savedPages.push(facebookPage);
        }

        Logger.info('Facebook pages automatically fetched and saved', {
            userId,
            pagesCount: pages.length,
            pageNames: pages.map(p => p.name)
        });
    } catch (pageError: any) {
        // Log the error but don't fail the user connection
        Logger.warn('Failed to automatically fetch Facebook pages after user connection', {
            userId,
            error: pageError.message
        });
    }
};

// Handle Facebook page connection
const handlePageConnection = async (userId: string, accessToken: string): Promise<any[]> => {
    const facebookService = new FacebookService();

    // Check if user has Facebook connection
    const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
    if (!facebookUser) {
        throw new Error('Facebook user connection not found');
    }

    // Get user's Facebook pages
    const pages = await facebookService.getUserPages(accessToken);

    // Store pages in database
    const savedPages = [];
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const isFirstPage = i === 0;

        const facebookPage = await FacebookPage.findOneAndUpdate(
            { userId, pageId: page.id },
            {
                facebookUserId: facebookUser._id,
                pageName: page.name,
                category: page.category,
                accessToken: page.access_token,
                picture: page.picture?.data?.url,
                followersCount: page.followers_count,
                tasks: page.tasks,
                isActive: true,
                isDefaultActive: isFirstPage, // Set first page as default active
                lastUsedAt: new Date()
            },
            { upsert: true, new: true }
        );
        savedPages.push(facebookPage);
    }

    Logger.info('Facebook pages connected successfully', {
        userId,
        pagesCount: pages.length,
        pageNames: pages.map(p => p.name)
    });

    return savedPages;
};

// Get user's Facebook connection status
export const getFacebookConnectionStatus = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });

        if (!facebookUser) {
            return ResponseHelper.success(res, 'Facebook connection status retrieved successfully', {
                isConnected: false,
                facebookUser: null,
                pages: [],
                totalPages: 0
            });
        }

        // Validate access token and get current accessible pages
        const accessiblePages = await validateAndFilterPages(userId, facebookUser.accessToken);

        ResponseHelper.success(res, 'Facebook connection status retrieved successfully', {
            isConnected: !!facebookUser,
            facebookUser: {
                facebookId: facebookUser.facebookId,
                facebookName: facebookUser.facebookName,
                facebookEmail: facebookUser.facebookEmail,
                profilePicture: facebookUser.profilePicture,
                connectedAt: facebookUser.connectedAt
            },
            pages: accessiblePages,
            totalPages: accessiblePages.length
        });
    } catch (error: any) {
        Logger.error('Get Facebook connection status error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get Facebook connection status', error);
    }
};

// Get user's connected Facebook pages
export const getConnectedPages = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });

        if (!facebookUser) {
            return ResponseHelper.success(res, 'Connected Facebook pages retrieved successfully', {
                pages: [],
                totalPages: 0
            });
        }

        // Validate access token and get current accessible pages
        const accessiblePages = await validateAndFilterPages(userId, facebookUser.accessToken);

        ResponseHelper.success(res, 'Connected Facebook pages retrieved successfully', {
            pages: accessiblePages,
            totalPages: accessiblePages.length
        });
    } catch (error: any) {
        Logger.error('Get connected Facebook pages error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get connected Facebook pages', error);
    }
};

// Refresh Facebook pages data
export const refreshPages = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
        }

        // Check if token is still valid
        const tokenValidation = await facebookService.verifyAccessToken(facebookUser.accessToken);
        if (!tokenValidation.valid) {
            return ResponseHelper.error(res, 'Facebook access token is invalid or expired', null, 401);
        }

        // Get updated pages data
        const pages = await facebookService.getUserPages(facebookUser.accessToken);

        // Update pages in database
        const updatedPages = [];
        for (const page of pages) {
            const facebookPage = await FacebookPage.findOneAndUpdate(
                { userId, pageId: page.id },
                {
                    pageName: page.name,
                    category: page.category,
                    accessToken: page.access_token,
                    picture: page.picture?.data?.url,
                    followersCount: page.followers_count,
                    tasks: page.tasks,
                    lastUsedAt: new Date()
                },
                { new: true }
            );
            if (facebookPage) {
                updatedPages.push(facebookPage);
            }
        }

        Logger.info('Facebook pages refreshed successfully', {
            userId,
            pagesCount: updatedPages.length
        });

        ResponseHelper.success(res, 'Facebook pages refreshed successfully', {
            pages: updatedPages.map(page => ({
                pageId: page.pageId,
                pageName: page.pageName,
                category: page.category,
                picture: page.picture,
                followersCount: page.followersCount,
                connectedAt: page.connectedAt
            })),
            message: `Successfully refreshed ${updatedPages.length} Facebook page(s)`
        });
    } catch (error: any) {
        Logger.error('Refresh Facebook pages error:', error);
        ResponseHelper.error(res, error.message || 'Failed to refresh Facebook pages', error);
    }
};

// Disconnect Facebook pages
export const disconnectPages = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        // Deactivate all Facebook pages
        await FacebookPage.updateMany(
            { userId },
            { isActive: false }
        );

        Logger.info('Facebook pages disconnected successfully', { userId });

        ResponseHelper.success(res, 'Facebook pages disconnected successfully', {
            message: 'All Facebook pages have been disconnected'
        });
    } catch (error: any) {
        Logger.error('Disconnect Facebook pages error:', error);
        ResponseHelper.error(res, error.message || 'Failed to disconnect Facebook pages', error);
    }
};

// Disconnect Facebook user account
export const disconnectUser = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        // Deactivate Facebook user and all pages
        await FacebookUser.updateOne(
            { userId },
            { isActive: false }
        );

        await FacebookPage.updateMany(
            { userId },
            { isActive: false }
        );

        Logger.info('Facebook user disconnected successfully', { userId });

        ResponseHelper.success(res, 'Facebook account disconnected successfully', {
            message: 'Facebook account and all pages have been disconnected'
        });
    } catch (error: any) {
        Logger.error('Disconnect Facebook user error:', error);
        ResponseHelper.error(res, error.message || 'Failed to disconnect Facebook account', error);
    }
};

// Get page access token for a specific page
export const getPageAccessToken = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { pageId } = req.params;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        if (!pageId) {
            return ResponseHelper.error(res, 'Page ID is required', null, 400);
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
        }

        // Find the specific page
        const page = await FacebookPage.findOne({ userId, pageId, isActive: true });
        if (!page) {
            return ResponseHelper.error(res, 'Page not found in connected pages', null, 404);
        }

        // Get fresh page access token
        const pageAccessToken = await facebookService.getPageAccessToken(
            facebookUser.accessToken,
            pageId
        );

        ResponseHelper.success(res, 'Page access token retrieved successfully', {
            pageId,
            accessToken: pageAccessToken,
            pageName: page.pageName
        });
    } catch (error: any) {
        Logger.error('Get page access token error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get page access token', error);
    }
};

// Get Facebook app configuration info
export const getFacebookAppInfo = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        // Get app configuration (without exposing sensitive data)
        const appInfo = {
            appId: process.env.FACEBOOK_APP_ID ? 'Configured' : 'Not configured',
            redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'Not configured',
            scopes: process.env.FACEBOOK_BUSINESS_SCOPES?.split(',') || [
                'public_profile',
                'email',
                'pages_manage_posts',
                'pages_read_engagement',
                'pages_show_list',
                'pages_manage_metadata',
                'pages_read_user_content'
            ],
            hasAppSecret: !!process.env.FACEBOOK_APP_SECRET,
            clientUrl: process.env.CLIENT_URL || 'Not configured'
        };

        Logger.info('Facebook app info retrieved', { userId });

        ResponseHelper.success(res, 'Facebook app info retrieved successfully', appInfo);
    } catch (error: any) {
        Logger.error('Get Facebook app info error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get Facebook app info', error);
    }
};

// Get Instagram accounts connected to Facebook pages
export const getInstagramAccounts = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { pageId } = req.params;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        if (!pageId) {
            return ResponseHelper.error(res, 'Page ID is required', null, 400);
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
        }

        const page = await FacebookPage.findOne({ userId, pageId, isActive: true });
        if (!page) {
            return ResponseHelper.error(res, 'Page not found in connected pages', null, 404);
        }

        // Get Instagram accounts connected to this page
        const instagramAccounts = await facebookService.getInstagramAccounts(
            page.accessToken,
            pageId
        );

        Logger.info('Instagram accounts retrieved successfully', {
            userId,
            pageId,
            accountsCount: instagramAccounts.length
        });

        ResponseHelper.success(res, 'Instagram accounts retrieved successfully', {
            pageId,
            pageName: page.pageName,
            instagramAccounts
        });
    } catch (error: any) {
        Logger.error('Get Instagram accounts error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get Instagram accounts', error);
    }
};

// Upload Instagram Reel
export const uploadInstagramReel = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { instagramAccountId, videoUrl, caption } = req.body;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        if (!instagramAccountId || !videoUrl) {
            return ResponseHelper.error(res, 'Instagram Account ID and Video URL are required', null, 400);
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
        }

        // For now, we'll use the user's access token
        // In a real implementation, you'd need to store Instagram access tokens
        const result = await facebookService.uploadInstagramVideo(
            facebookUser.accessToken,
            videoUrl,
            caption
        );

        Logger.info('Instagram Reel uploaded successfully', {
            userId,
            instagramAccountId,
            mediaId: result.id
        });

        ResponseHelper.success(res, 'Instagram Reel uploaded successfully', {
            mediaId: result.id,
            instagramAccountId,
            caption
        });
    } catch (error: any) {
        Logger.error('Upload Instagram Reel error:', error);
        ResponseHelper.error(res, error.message || 'Failed to upload Instagram Reel', error);
    }
};

// Upload Instagram Photo
export const uploadInstagramPhoto = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { instagramAccountId, imageUrl, caption } = req.body;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        if (!instagramAccountId || !imageUrl) {
            return ResponseHelper.error(res, 'Instagram Account ID and Image URL are required', null, 400);
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
        }

        // For now, we'll use the user's access token
        // In a real implementation, you'd need to store Instagram access tokens
        const result = await facebookService.uploadInstagramPhoto(
            facebookUser.accessToken,
            imageUrl,
            caption
        );

        Logger.info('Instagram Photo uploaded successfully', {
            userId,
            instagramAccountId,
            mediaId: result.id
        });

        ResponseHelper.success(res, 'Instagram Photo uploaded successfully', {
            mediaId: result.id,
            instagramAccountId,
            caption
        });
    } catch (error: any) {
        Logger.error('Upload Instagram Photo error:', error);
        ResponseHelper.error(res, error.message || 'Failed to upload Instagram Photo', error);
    }
};

// Get Instagram media insights
export const getInstagramMediaInsights = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { mediaId } = req.params;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        if (!mediaId) {
            return ResponseHelper.error(res, 'Media ID is required', null, 400);
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
        }

        const insights = await facebookService.getInstagramMediaInsights(
            facebookUser.accessToken,
            mediaId
        );

        Logger.info('Instagram media insights retrieved successfully', {
            userId,
            mediaId
        });

        ResponseHelper.success(res, 'Instagram media insights retrieved successfully', {
            mediaId,
            insights
        });
    } catch (error: any) {
        Logger.error('Get Instagram media insights error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get Instagram media insights', error);
    }
};

// Get Instagram account insights
export const getInstagramAccountInsights = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { instagramAccountId } = req.params;
        const facebookService = new FacebookService();

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        if (!instagramAccountId) {
            return ResponseHelper.error(res, 'Instagram Account ID is required', null, 400);
        }

        const facebookUser = await FacebookUser.findOne({ userId, isActive: true });
        if (!facebookUser) {
            return ResponseHelper.error(res, 'No Facebook connection found', null, 404);
        }

        const insights = await facebookService.getInstagramAccountInsights(
            facebookUser.accessToken,
            instagramAccountId
        );

        Logger.info('Instagram account insights retrieved successfully', {
            userId,
            instagramAccountId
        });

        ResponseHelper.success(res, 'Instagram account insights retrieved successfully', {
            instagramAccountId,
            insights
        });
    } catch (error: any) {
        Logger.error('Get Instagram account insights error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get Instagram account insights', error);
    }
};

// Set active Facebook page
export const setActivePage = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.jwtUser?.id;
        const { pageId } = req.params;

        if (!userId) {
            return ResponseHelper.unauthorized(res, 'User not authenticated');
        }

        if (!pageId) {
            return ResponseHelper.error(res, 'Page ID is required', undefined, 400);
        }

        // Check if the page exists and belongs to the user
        const page = await FacebookPage.findOne({
            userId,
            pageId,
            isActive: true
        });

        if (!page) {
            return ResponseHelper.error(res, 'Facebook page not found or not accessible', null, 404);
        }

        // Set all pages for this user to inactive first
        await FacebookPage.updateMany(
            { userId, isActive: true },
            { isDefaultActive: false }
        );

        // Set the selected page as active
        await FacebookPage.updateOne(
            { userId, pageId, isActive: true },
            {
                isDefaultActive: true,
                lastUsedAt: new Date()
            }
        );

        Logger.info('Active Facebook page updated successfully', {
            userId,
            pageId,
            pageName: page.pageName
        });

        ResponseHelper.success(res, 'Active page updated successfully', {
            pageId: page.pageId,
            pageName: page.pageName,
            message: `Page "${page.pageName}" is now active`
        });
    } catch (error: any) {
        Logger.error('Set active Facebook page error:', error);
        ResponseHelper.error(res, error.message || 'Failed to set active page', error);
    }
};
