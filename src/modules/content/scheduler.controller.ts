import { Request, Response } from 'express';
import { SchedulerService } from '../../services/scheduler.service';
import { Logger } from '../../utils/logger';
import { sendResponse } from '../../utils/response';
import { ContentService } from './content.service';

export class SchedulerController {
    /**
     * Get scheduler status
     */
    static async getSchedulerStatus(req: Request, res: Response): Promise<void> {
        try {
            const status = SchedulerService.getStatus();
            sendResponse(res, 200, true, 'Scheduler status retrieved successfully', status);
        } catch (error) {
            Logger.error('Error getting scheduler status:', error);
            sendResponse(res, 500, false, 'Failed to get scheduler status');
        }
    }

    /**
     * Manually trigger scheduled posts processing
     */
    static async triggerProcessing(req: Request, res: Response): Promise<void> {
        try {
            await SchedulerService.triggerProcessing();
            sendResponse(res, 200, true, 'Scheduled posts processing triggered successfully');
        } catch (error) {
            Logger.error('Error triggering processing:', error);
            sendResponse(res, 500, false, 'Failed to trigger processing');
        }
    }

    /**
     * Schedule content for immediate processing
     */
    static async scheduleImmediate(req: Request, res: Response): Promise<void> {
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

            const success = await SchedulerService.scheduleImmediate(contentId);

            if (success) {
                sendResponse(res, 200, true, 'Content scheduled for immediate processing');
            } else {
                sendResponse(res, 400, false, 'No pending scheduled posts found for this content');
            }
        } catch (error) {
            Logger.error('Error scheduling immediate content:', error);
            sendResponse(res, 500, false, 'Failed to schedule content for immediate processing');
        }
    }

    /**
     * Get upcoming scheduled posts
     */
    static async getUpcomingPosts(req: Request, res: Response): Promise<void> {
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
                .filter(content => content.scheduledPosts.some(post => post.status === 'pending'))
                .map(content => ({
                    id: content._id.toString(),
                    postType: content.postType,
                    content: content.content,
                    platforms: content.platforms,
                    scheduledPosts: content.scheduledPosts
                        .filter(post => post.status === 'pending')
                        .map(post => ({
                            postNumber: post.postNumber,
                            scheduledDate: post.scheduledDate.toISOString().split('T')[0],
                            scheduledTime: post.scheduledTime,
                            status: post.status
                        }))
                }));

            sendResponse(res, 200, true, 'Upcoming posts retrieved successfully', {
                posts: upcomingPosts,
                total: upcomingPosts.length,
                page,
                limit
            });
        } catch (error) {
            Logger.error('Error getting upcoming posts:', error);
            sendResponse(res, 500, false, 'Failed to retrieve upcoming posts');
        }
    }

    /**
     * Get scheduled posts history
     */
    static async getScheduledHistory(req: Request, res: Response): Promise<void> {
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
                .filter(content => content.scheduledPosts.length > 0)
                .map(content => ({
                    id: content._id.toString(),
                    postType: content.postType,
                    content: content.content,
                    platforms: content.platforms,
                    publishedAt: content.publishedAt?.toISOString(),
                    scheduledPosts: content.scheduledPosts.map(post => ({
                        postNumber: post.postNumber,
                        scheduledDate: post.scheduledDate.toISOString().split('T')[0],
                        scheduledTime: post.scheduledTime,
                        status: post.status,
                        publishedAt: post.publishedAt?.toISOString(),
                        facebookPostId: post.facebookPostId,
                        error: post.error
                    }))
                }));

            sendResponse(res, 200, true, 'Scheduled history retrieved successfully', {
                posts: history,
                total: history.length,
                page,
                limit
            });
        } catch (error) {
            Logger.error('Error getting scheduled history:', error);
            sendResponse(res, 500, false, 'Failed to retrieve scheduled history');
        }
    }
}
