import fetch from 'node-fetch';
import { FacebookPage } from '../modules/facebook/FacebookPage.model';
import { FacebookUser } from '../modules/facebook/FacebookUser.model';
import { Logger } from '../utils/logger';

export interface PostToFacebookRequest {
    content: string;
    hashtags?: string;
    mediaFile?: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        url: string;
        type: 'image' | 'video';
    };
    pageId: string;
    accessToken: string;
}

export interface FacebookPostResponse {
    success: boolean;
    postId?: string;
    error?: string;
}

export class FacebookPostingService {
    private static readonly FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

    /**
     * Post content to Facebook page
     */
    static async postToFacebook(request: PostToFacebookRequest): Promise<FacebookPostResponse> {
        try {
            const { content, hashtags, mediaFile, pageId, accessToken } = request;

            // Combine content and hashtags
            const fullContent = hashtags ? `${content}\n\n${hashtags}` : content;

            // If no media file, create a simple text post
            if (!mediaFile) {
                return await this.createTextPost(pageId, fullContent, accessToken);
            }

            // Create media post with single media file
            return await this.createMediaPost(pageId, fullContent, mediaFile, accessToken);

        } catch (error) {
            Logger.error('Error posting to Facebook:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Create a simple text post
     */
    private static async createTextPost(
        pageId: string,
        content: string,
        accessToken: string
    ): Promise<FacebookPostResponse> {
        try {
            const url = `${this.FACEBOOK_API_BASE}/${pageId}/feed`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    access_token: accessToken
                })
            });

            const result = await response.json() as any;

            if (result.error) {
                Logger.error('Facebook API error:', result.error);
                return {
                    success: false,
                    error: result.error.message || 'Facebook API error'
                };
            }

            Logger.info('Text post created successfully', { postId: result.id, pageId });
            return {
                success: true,
                postId: result.id
            };

        } catch (error) {
            Logger.error('Error creating text post:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Create a media post (single image or video)
     */
    private static async createMediaPost(
        pageId: string,
        content: string,
        mediaFile: any,
        accessToken: string
    ): Promise<FacebookPostResponse> {
        try {
            const isVideo = mediaFile.type === 'video';
            const endpoint = isVideo ? 'videos' : 'photos';
            const url = `${this.FACEBOOK_API_BASE}/${pageId}/${endpoint}`;

            // For now, we'll create a text post with media URL reference
            // In production, you'd need to upload the actual file to Facebook
            const postData: any = {
                message: content,
                access_token: accessToken
            };

            if (isVideo) {
                postData.description = content;
                postData.file_url = mediaFile.url; // This would be the actual video URL
            } else {
                postData.url = mediaFile.url; // This would be the actual image URL
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });

            const result = await response.json() as any;

            if (result.error) {
                Logger.error('Facebook API error:', result.error);
                return {
                    success: false,
                    error: result.error.message || 'Facebook API error'
                };
            }

            Logger.info('Media post created successfully', { postId: result.id, pageId, type: mediaFile.type });
            return {
                success: true,
                postId: result.id
            };

        } catch (error) {
            Logger.error('Error creating media post:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Create an album post (multiple media files)
     */
    private static async createAlbumPost(
        pageId: string,
        content: string,
        mediaFiles: any[],
        accessToken: string
    ): Promise<FacebookPostResponse> {
        try {
            // Create album first
            const albumUrl = `${this.FACEBOOK_API_BASE}/${pageId}/albums`;

            const albumResponse = await fetch(albumUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `Post ${new Date().toISOString()}`,
                    message: content,
                    access_token: accessToken
                })
            });

            const albumResult = await albumResponse.json() as any;

            if (albumResult.error) {
                Logger.error('Facebook API error creating album:', albumResult.error);
                return {
                    success: false,
                    error: albumResult.error.message || 'Facebook API error'
                };
            }

            const albumId = albumResult.id;

            // Add photos to album
            for (const mediaFile of mediaFiles) {
                if (mediaFile.type === 'image') {
                    const photoUrl = `${this.FACEBOOK_API_BASE}/${albumId}/photos`;

                    await fetch(photoUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            url: mediaFile.url,
                            access_token: accessToken
                        })
                    });
                }
            }

            Logger.info('Album post created successfully', { albumId, pageId, photoCount: mediaFiles.length });
            return {
                success: true,
                postId: albumId
            };

        } catch (error) {
            Logger.error('Error creating album post:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get user's Facebook pages
     */
    static async getUserPages(userId: string): Promise<FacebookPage[]> {
        try {
            const facebookUser = await FacebookUser.findOne({ userId });
            if (!facebookUser || !facebookUser.accessToken) {
                return [];
            }

            const pages = await FacebookPage.find({ userId });
            return pages;

        } catch (error) {
            Logger.error('Error fetching user pages:', error);
            return [];
        }
    }

    /**
     * Validate Facebook access token
     */
    static async validateAccessToken(accessToken: string): Promise<boolean> {
        try {
            const url = `${this.FACEBOOK_API_BASE}/me?access_token=${accessToken}`;

            const response = await fetch(url);
            const result = await response.json() as any;

            return !result.error;

        } catch (error) {
            Logger.error('Error validating access token:', error);
            return false;
        }
    }

    /**
     * Get page insights (basic stats)
     */
    static async getPageInsights(pageId: string, accessToken: string): Promise<any> {
        try {
            const url = `${this.FACEBOOK_API_BASE}/${pageId}/insights?metric=page_fans,page_impressions&access_token=${accessToken}`;

            const response = await fetch(url);
            const result = await response.json() as any;

            if (result.error) {
                Logger.error('Facebook API error getting insights:', result.error);
                return null;
            }

            return result.data;

        } catch (error) {
            Logger.error('Error getting page insights:', error);
            return null;
        }
    }
}
