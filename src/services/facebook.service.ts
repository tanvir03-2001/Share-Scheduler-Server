import fetch from 'node-fetch';

export interface FacebookPageData {
    id: string;
    name: string;
    category: string;
    access_token: string;
    picture?: {
        data: {
            url: string;
        };
    };
    followers_count?: number;
    tasks?: string[];
}

export interface FacebookUserPagesResponse {
    data: FacebookPageData[];
    paging?: {
        next?: string;
    };
}

export class FacebookService {
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly redirectUri: string;

    constructor() {
        this.appId = process.env.FACEBOOK_APP_ID || '';
        this.appSecret = process.env.FACEBOOK_APP_SECRET || '';
        this.redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/api/facebook/callback';

        // Don't throw error in constructor, check when methods are called
    }

    private validateConfiguration(): void {
        if (!this.appId) {
            throw new Error('Facebook App ID is not configured. Please set FACEBOOK_APP_ID in your environment variables.');
        }
        if (!this.appSecret) {
            throw new Error('Facebook App Secret is not configured. Please set FACEBOOK_APP_SECRET in your environment variables.');
        }
        if (!this.redirectUri) {
            throw new Error('Facebook Redirect URI is not configured. Please set FACEBOOK_REDIRECT_URI in your environment variables.');
        }
    }

    /**
     * Generate Facebook Business OAuth URL for user connection
     */
    generateUserAuthUrl(state?: string): string {
        this.validateConfiguration();
        const scopes = process.env.FACEBOOK_BUSINESS_SCOPES?.split(',') || [
            'public_profile',
            'email',
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_show_list',
            'pages_manage_metadata',
            'pages_read_user_content',
            'instagram_basic',
            'instagram_content_publish',
            'instagram_manage_insights'
        ].join(',');

        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: this.redirectUri,
            scope: scopes,
            response_type: 'code',
            ...(state && { state })
        });

        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }

    /**
     * Generate Facebook Business OAuth URL for page permissions (requires user to be connected first)
     */
    generatePageAuthUrl(state?: string): string {
        this.validateConfiguration();
        const scopes = process.env.FACEBOOK_BUSINESS_SCOPES?.split(',') || [
            'public_profile',
            'email',
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_show_list',
            'pages_manage_metadata',
            'pages_read_user_content'

        ].join(',');

        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: this.redirectUri,
            scope: scopes,
            response_type: 'code',
            ...(state && { state })
        });

        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
        this.validateConfiguration();
        const params = new URLSearchParams({
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: this.redirectUri,
            code
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Facebook token exchange failed: ${error}`);
        }

        const tokenData = await response.json() as { access_token: string; token_type: string; expires_in: number };

        // Validate the response data
        if (!tokenData.access_token) {
            throw new Error('Facebook token exchange failed: No access token received');
        }

        // Ensure expires_in is a valid number, default to 1 hour if not provided
        if (!tokenData.expires_in || isNaN(tokenData.expires_in) || tokenData.expires_in <= 0) {
            tokenData.expires_in = 3600; // 1 hour in seconds
        }

        return tokenData;
    }

    /**
     * Get long-lived access token
     */
    async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
        this.validateConfiguration();
        const params = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Facebook long-lived token exchange failed: ${error}`);
        }

        const tokenData = await response.json() as { access_token: string; token_type: string; expires_in: number };

        // Validate the response data
        if (!tokenData.access_token) {
            throw new Error('Facebook long-lived token exchange failed: No access token received');
        }

        // Ensure expires_in is a valid number, default to 60 days if not provided
        if (!tokenData.expires_in || isNaN(tokenData.expires_in) || tokenData.expires_in <= 0) {
            tokenData.expires_in = 60 * 24 * 60 * 60; // 60 days in seconds
        }

        return tokenData;
    }

    /**
     * Get Facebook user information
     */
    async getFacebookUserInfo(userAccessToken: string): Promise<{ id: string; name: string; email?: string; picture?: { data: { url: string } } }> {
        const params = new URLSearchParams({
            access_token: userAccessToken,
            fields: 'id,name,email,picture'
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/me?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch Facebook user info: ${error}`);
        }

        return await response.json() as { id: string; name: string; email?: string; picture?: { data: { url: string } } };
    }

    /**
     * Get user's Facebook pages
     */
    async getUserPages(userAccessToken: string): Promise<FacebookPageData[]> {
        const params = new URLSearchParams({
            access_token: userAccessToken,
            fields: 'id,name,category,access_token,picture,followers_count,tasks'
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/me/accounts?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch Facebook pages: ${error}`);
        }

        const data = await response.json() as FacebookUserPagesResponse;
        return data.data;
    }

    /**
     * Get page access token for a specific page
     */
    async getPageAccessToken(userAccessToken: string, pageId: string): Promise<string> {
        const params = new URLSearchParams({
            access_token: userAccessToken,
            fields: 'access_token'
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get page access token: ${error}`);
        }

        const data = await response.json() as { access_token: string };
        return data.access_token;
    }

    /**
     * Verify if access token is valid
     */
    async verifyAccessToken(accessToken: string): Promise<{ valid: boolean; user_id?: string; app_id?: string }> {
        this.validateConfiguration();
        const params = new URLSearchParams({
            input_token: accessToken,
            access_token: `${this.appId}|${this.appSecret}`
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/debug_token?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return { valid: false };
        }

        const data = await response.json() as { data: { is_valid: boolean; user_id?: string; app_id?: string } };
        return {
            valid: data.data.is_valid,
            user_id: data.data.user_id,
            app_id: data.data.app_id
        };
    }

    /**
     * Post content to Facebook page
     */
    async postToPage(pageAccessToken: string, pageId: string, message: string, link?: string): Promise<{ id: string }> {
        const postData: any = {
            message,
            access_token: pageAccessToken
        };

        if (link) {
            postData.link = link;
        }

        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to post to Facebook page: ${error}`);
        }

        return await response.json() as { id: string };
    }

    /**
     * Get page insights
     */
    async getPageInsights(pageAccessToken: string, pageId: string, metric: string = 'page_impressions'): Promise<any> {
        const params = new URLSearchParams({
            access_token: pageAccessToken,
            metric,
            period: 'day',
            since: (Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)).toString(), // Last 7 days
            until: Math.floor(Date.now() / 1000).toString()
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/insights?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get page insights: ${error}`);
        }

        return await response.json();
    }

    /**
     * Get Instagram accounts connected to a Facebook page
     */
    async getInstagramAccounts(pageAccessToken: string, pageId: string): Promise<any[]> {
        const params = new URLSearchParams({
            access_token: pageAccessToken,
            fields: 'id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count'
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/instagram_accounts?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get Instagram accounts: ${error}`);
        }

        const data = await response.json() as { data: any[] };
        return data.data;
    }

    /**
     * Upload video to Instagram (for Reels)
     */
    async uploadInstagramVideo(instagramAccessToken: string, videoUrl: string, caption?: string): Promise<{ id: string }> {
        // Step 1: Create media container
        const containerData: any = {
            media_type: 'REELS',
            video_url: videoUrl,
            access_token: instagramAccessToken
        };

        if (caption) {
            containerData.caption = caption;
        }

        const containerResponse = await fetch(`https://graph.facebook.com/v18.0/me/media`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(containerData)
        });

        if (!containerResponse.ok) {
            const error = await containerResponse.text();
            throw new Error(`Failed to create Instagram media container: ${error}`);
        }

        const container = await containerResponse.json() as { id: string };

        // Step 2: Publish the media
        const publishData = {
            creation_id: container.id,
            access_token: instagramAccessToken
        };

        const publishResponse = await fetch(`https://graph.facebook.com/v18.0/me/media_publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(publishData)
        });

        if (!publishResponse.ok) {
            const error = await publishResponse.text();
            throw new Error(`Failed to publish Instagram media: ${error}`);
        }

        return await publishResponse.json() as { id: string };
    }

    /**
     * Upload photo to Instagram
     */
    async uploadInstagramPhoto(instagramAccessToken: string, imageUrl: string, caption?: string): Promise<{ id: string }> {
        // Step 1: Create media container
        const containerData: any = {
            image_url: imageUrl,
            access_token: instagramAccessToken
        };

        if (caption) {
            containerData.caption = caption;
        }

        const containerResponse = await fetch(`https://graph.facebook.com/v18.0/me/media`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(containerData)
        });

        if (!containerResponse.ok) {
            const error = await containerResponse.text();
            throw new Error(`Failed to create Instagram media container: ${error}`);
        }

        const container = await containerResponse.json() as { id: string };

        // Step 2: Publish the media
        const publishData = {
            creation_id: container.id,
            access_token: instagramAccessToken
        };

        const publishResponse = await fetch(`https://graph.facebook.com/v18.0/me/media_publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(publishData)
        });

        if (!publishResponse.ok) {
            const error = await publishResponse.text();
            throw new Error(`Failed to publish Instagram media: ${error}`);
        }

        return await publishResponse.json() as { id: string };
    }

    /**
     * Get Instagram media insights
     */
    async getInstagramMediaInsights(instagramAccessToken: string, mediaId: string): Promise<any> {
        const params = new URLSearchParams({
            access_token: instagramAccessToken,
            metric: 'impressions,reach,likes,comments,shares,saves,plays,profile_visits,website_clicks'
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}/insights?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get Instagram media insights: ${error}`);
        }

        return await response.json();
    }

    /**
     * Get Instagram account insights
     */
    async getInstagramAccountInsights(instagramAccessToken: string, instagramAccountId: string): Promise<any> {
        const params = new URLSearchParams({
            access_token: instagramAccessToken,
            metric: 'impressions,reach,profile_views,website_clicks',
            period: 'day',
            since: (Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)).toString(), // Last 7 days
            until: Math.floor(Date.now() / 1000).toString()
        });

        const response = await fetch(`https://graph.facebook.com/v18.0/${instagramAccountId}/insights?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get Instagram account insights: ${error}`);
        }

        return await response.json();
    }
}
