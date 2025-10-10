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
        this.redirectUri = process.env.FACEBOOK_REDIRECT_URI || '';

        if (!this.appId || !this.appSecret) {
            throw new Error('Facebook App ID and Secret must be configured');
        }
    }

    /**
     * Generate Facebook OAuth URL for page permissions
     */
    generateAuthUrl(state?: string): string {
        const scopes = [
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_show_list',
            'pages_manage_metadata',
            'pages_read_user_content',
            'pages_manage_ads',
            'pages_manage_instant_articles',
            'pages_messaging',
            'pages_messaging_subscriptions',
            'pages_manage_events',
            'pages_read_insights'
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

        return await response.json() as { access_token: string; token_type: string; expires_in: number };
    }

    /**
     * Get long-lived access token
     */
    async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
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

        return await response.json() as { access_token: string; token_type: string; expires_in: number };
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
            since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // Last 7 days
            until: Math.floor(Date.now() / 1000)
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
}
