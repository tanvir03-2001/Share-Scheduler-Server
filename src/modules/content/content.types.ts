export interface CreateContentRequest {
    postType: 'text' | 'image' | 'reel' | 'story';
    content: string;
    hashtags?: string;
    platforms: string[];
    publishMode: 'now' | 'schedule';
    scheduleDate?: string;
    scheduleTimes?: string[];
    selectedPageId?: string; // Facebook page ID
}

export interface CreateContentResponse {
    success: boolean;
    message: string;
    data?: {
        contentId: string;
        scheduledPost?: {
            postNumber: number;
            scheduledDate: string;
            scheduledTime: string;
        };
    };
}

export interface GetContentResponse {
    success: boolean;
    data?: {
        contents: Array<{
            id: string;
            postType: string;
            content: string;
            hashtags?: string;
            mediaFile?: {
                filename: string;
                originalName: string;
                mimetype: string;
                size: number;
                url: string;
                type: string;
                cloudinaryPublicId?: string;
                thumbnailUrl?: string;
            };
            platforms: string[];
            publishMode: string;
            status: string;
            publishedAt?: string;
            createdAt: string;
            updatedAt: string;
            scheduledPost?: {
                postNumber: number;
                scheduledDate: string;
                scheduledTime: string;
                status: string;
                publishedAt?: string;
                facebookPostId?: string;
                error?: string;
            };
        }>;
        total: number;
        page: number;
        limit: number;
    };
}

export interface UpdateContentRequest {
    content?: string;
    hashtags?: string;
    platforms?: string[];
    publishMode?: 'now' | 'schedule';
    scheduleDate?: string;
    scheduleTimes?: string[];
    mediaFile?: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        url: string;
        type: 'image' | 'video';
        cloudinaryPublicId?: string;
        thumbnailUrl?: string;
    };
}

export interface DeleteContentResponse {
    success: boolean;
    message: string;
}

export interface SchedulePostRequest {
    contentId: string;
    action: 'publish' | 'cancel';
}

export interface SchedulePostResponse {
    success: boolean;
    message: string;
}
