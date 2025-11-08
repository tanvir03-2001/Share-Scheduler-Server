/**
 * SCHEDULING ENGINE CONTROLLER
 * 
 * This controller handles all API endpoints related to the scheduling engine.
 * All scheduling-related API operations are centralized here.
 */

import { Request, Response } from 'express';
import { ContentService } from '../../modules/content/content.service';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import {
    convertLocalToUTC,
    convertUTCToLocal,
    getCurrentServerDateTime,
    getSchedulingEngineHealth,
    getSchedulingEngineStatus,
    scheduleContentImmediate,
    triggerSchedulingProcessing
} from './scheduling.engine';

// Helper function to match the expected sendResponse signature
const sendResponse = (res: Response, statusCode: number, success: boolean, message: string, data?: any) => {
    if (success) {
        ResponseHelper.success(res, message, data, statusCode);
    } else {
        ResponseHelper.error(res, message, undefined, statusCode);
    }
};

/**
 * Get scheduling engine status
 */
export const getSchedulingEngineStatusController = async (req: Request, res: Response): Promise<void> => {
    try {
        const status = getSchedulingEngineStatus();
        const healthStatus = getSchedulingEngineHealth();

        const responseData = {
            ...status,
            health: healthStatus
        };

        sendResponse(res, 200, true, 'Scheduling engine status retrieved successfully', responseData);
    } catch (error) {
        Logger.error('Error getting scheduling engine status:', error);
        sendResponse(res, 500, false, 'Failed to get scheduling engine status');
    }
};

/**
 * Manually trigger scheduled posts processing
 */
export const triggerSchedulingProcessingController = async (req: Request, res: Response): Promise<void> => {
    try {
        await triggerSchedulingProcessing();
        sendResponse(res, 200, true, 'Scheduling engine processing triggered successfully');
    } catch (error) {
        Logger.error('Error triggering scheduling processing:', error);
        sendResponse(res, 500, false, 'Failed to trigger scheduling processing');
    }
};

/**
 * Schedule content for immediate processing
 */
export const scheduleContentImmediateController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { contentId } = req.params;

        // Verify content belongs to user
        const content = await ContentService.getContentById(contentId, userId);
        if (!content) {
            sendResponse(res, 404, false, 'Content not found');
            return;
        }

        const success = await scheduleContentImmediate(contentId);

        if (success) {
            sendResponse(res, 200, true, 'Content scheduled for immediate processing by scheduling engine');
        } else {
            sendResponse(res, 400, false, 'No pending scheduled posts found for this content');
        }
    } catch (error) {
        Logger.error('Error scheduling immediate content:', error);
        sendResponse(res, 500, false, 'Failed to schedule content for immediate processing');
    }
};

/**
 * Get upcoming scheduled posts
 */
export const getUpcomingScheduledPosts = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const { contents } = await ContentService.getUserContent(
            userId,
            page,
            limit,
            'scheduled'
        );

        // Filter and format upcoming posts
        const upcomingPosts = contents
            .filter(content => content.scheduledPost && content.scheduledPost.status === 'pending')
            .map(content => ({
                id: (content._id as any).toString(),
                postType: content.postType,
                content: content.content,
                platforms: content.platforms,
                scheduledPost: content.scheduledPost ? {
                    postNumber: content.scheduledPost.postNumber,
                    scheduledDateTime: content.scheduledPost.scheduledDateTime,
                    status: content.scheduledPost.status
                } : undefined
            }));

        sendResponse(res, 200, true, 'Upcoming scheduled posts retrieved successfully', {
            posts: upcomingPosts,
            total: upcomingPosts.length,
            page,
            limit,
            engine: 'SchedulingEngine'
        });
    } catch (error) {
        Logger.error('Error getting upcoming scheduled posts:', error);
        sendResponse(res, 500, false, 'Failed to retrieve upcoming scheduled posts');
    }
};

/**
 * Get scheduled posts history
 */
export const getScheduledPostsHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const { contents } = await ContentService.getUserContent(
            userId,
            page,
            limit,
            'published'
        );

        // Format published posts with their scheduled history
        const history = contents
            .filter(content => content.scheduledPost)
            .map(content => ({
                id: (content._id as any).toString(),
                postType: content.postType,
                content: content.content,
                platforms: content.platforms,
                publishedAt: content.publishedAt?.toISOString(),
                scheduledPost: content.scheduledPost ? {
                    postNumber: content.scheduledPost.postNumber,
                    scheduledDateTime: content.scheduledPost.scheduledDateTime,
                    status: content.scheduledPost.status,
                    publishedAt: content.scheduledPost.publishedAt?.toISOString(),
                    facebookPostId: content.scheduledPost.facebookPostId,
                    error: content.scheduledPost.error
                } : undefined
            }));

        sendResponse(res, 200, true, 'Scheduled posts history retrieved successfully', {
            posts: history,
            total: history.length,
            page,
            limit,
            engine: 'SchedulingEngine'
        });
    } catch (error) {
        Logger.error('Error getting scheduled posts history:', error);
        sendResponse(res, 500, false, 'Failed to retrieve scheduled posts history');
    }
};

/**
 * Get scheduling engine health check
 */
export const getSchedulingEngineHealthController = async (req: Request, res: Response): Promise<void> => {
    try {
        const healthStatus = getSchedulingEngineHealth();

        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        sendResponse(res, statusCode, healthStatus.status === 'healthy',
            `Scheduling engine is ${healthStatus.status}`, healthStatus);
    } catch (error) {
        Logger.error('Error getting scheduling engine health:', error);
        sendResponse(res, 500, false, 'Failed to get scheduling engine health status');
    }
};

/**
 * Get current server date and time
 */
export const getCurrentServerDateTimeController = async (req: Request, res: Response): Promise<void> => {
    try {
        const dateTimeInfo = getCurrentServerDateTime();
        sendResponse(res, 200, true, 'Current server date and time retrieved successfully', dateTimeInfo);
    } catch (error) {
        Logger.error('Error getting current server date time:', error);
        sendResponse(res, 500, false, 'Failed to get current server date and time');
    }
};

/**
 * Convert local time to UTC
 */
export const convertLocalToUTCController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { localDate, localTime, timezone } = req.body;

        if (!localDate || !localTime || !timezone) {
            sendResponse(res, 400, false, 'Missing required fields: localDate, localTime, timezone');
            return;
        }

        const utcResult = convertLocalToUTC(localDate, localTime, timezone);
        sendResponse(res, 200, true, 'Local time converted to UTC successfully', utcResult);
    } catch (error) {
        Logger.error('Error converting local time to UTC:', error);
        sendResponse(res, 500, false, 'Failed to convert local time to UTC');
    }
};

/**
 * Convert UTC time to local timezone
 */
export const convertUTCToLocalController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { utcDate, utcTime, targetTimezone } = req.body;

        if (!utcDate || !utcTime || !targetTimezone) {
            sendResponse(res, 400, false, 'Missing required fields: utcDate, utcTime, targetTimezone');
            return;
        }

        const localResult = convertUTCToLocal(utcDate, utcTime, targetTimezone);
        sendResponse(res, 200, true, 'UTC time converted to local timezone successfully', localResult);
    } catch (error) {
        Logger.error('Error converting UTC to local time:', error);
        sendResponse(res, 500, false, 'Failed to convert UTC to local time');
    }
};
