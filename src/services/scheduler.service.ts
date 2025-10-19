import * as cron from 'node-cron';
import { ContentService } from '../modules/content/content.service';
import { FacebookPage } from '../modules/facebook/FacebookPage.model';
import { Logger } from '../utils/logger';
import { FacebookPostingService } from './facebook-posting.service';
import { FacebookService } from './facebook.service';

export class SchedulerService {
    private static isRunning = false;
    private static cronJob: cron.ScheduledTask | null = null;

    /**
     * Start the scheduler
     */
    static start(): void {
        if (this.isRunning) {
            Logger.warn('Scheduler is already running');
            return;
        }

        // Run every minute to check for scheduled posts
        this.cronJob = cron.schedule('* * * * *', async () => {
            await this.processScheduledPosts();
        });

        this.cronJob.start();
        this.isRunning = true;
        console.log('⏰ Scheduler started - checking posts every minute');
        Logger.info('Scheduler started successfully');
    }

    /**
     * Stop the scheduler
     */
    static stop(): void {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.isRunning = false;
        Logger.info('Scheduler stopped');
    }

    /**
     * Process scheduled posts that are ready to be published
     */
    private static async processScheduledPosts(): Promise<void> {
        try {
            const contentsToPublish = await ContentService.getScheduledPostsToPublish();

            if (contentsToPublish.length === 0) {
                return;
            }

            console.log(`📅 Processing ${contentsToPublish.length} scheduled posts`);
            Logger.info(`Processing ${contentsToPublish.length} scheduled posts`);

            for (const content of contentsToPublish) {
                await this.publishScheduledContent(content);
            }

        } catch (error) {
            Logger.error('Error processing scheduled posts:', error);
        }
    }

    /**
     * Publish a scheduled content
     */
    private static async publishScheduledContent(content: any): Promise<void> {
        try {
            const userId = content.userId._id || content.userId;

            // Get user's Facebook pages
            const pages = await FacebookPage.find({ userId });

            if (pages.length === 0) {
                Logger.warn('No Facebook pages found for user', { userId });
                return;
            }

            // Find pending scheduled posts for current time
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            const currentDate = now.toISOString().split('T')[0];

            if (content.scheduledPost &&
                content.scheduledPost.status === 'pending' &&
                content.scheduledPost.scheduledDate.toISOString().split('T')[0] === currentDate &&
                content.scheduledPost.scheduledTime <= currentTime) {
                await this.publishToFacebook(content, content.scheduledPost, pages);
            }

        } catch (error) {
            Logger.error('Error publishing scheduled content:', error);
        }
    }

    /**
     * Publish content to Facebook
     */
    private static async publishToFacebook(
        content: any,
        scheduledPost: any,
        pages: any[]
    ): Promise<void> {
        try {
            // Get user's active Facebook page
            const userId = content.userId._id || content.userId;
            const activePage = await FacebookService.getUserActivePage(userId);

            if (!activePage) {
                Logger.warn('No active Facebook page found for scheduled publishing', { contentId: content._id, userId });
                await ContentService.updateScheduledPostStatus(
                    content._id.toString(),
                    scheduledPost.postNumber,
                    'failed',
                    undefined,
                    'No active Facebook page found'
                );
                return;
            }

            // Prepare content for Facebook
            const facebookContent = {
                content: content.content,
                hashtags: content.hashtags,
                mediaFile: content.mediaFile,
                pageId: activePage.pageId,
                accessToken: activePage.accessToken
            };

            // Post to Facebook
            const result = await FacebookPostingService.postToFacebook(facebookContent);

            if (result.success) {
                await ContentService.updateScheduledPostStatus(
                    content._id.toString(),
                    scheduledPost.postNumber,
                    'published',
                    result.postId
                );

                // Update page last used timestamp
                await FacebookPage.findByIdAndUpdate(activePage._id, {
                    lastUsedAt: new Date()
                });

                Logger.info('Scheduled post published successfully', {
                    contentId: content._id,
                    postNumber: scheduledPost.postNumber,
                    facebookPostId: result.postId,
                    pageId: activePage.pageId
                });
            } else {
                await ContentService.updateScheduledPostStatus(
                    content._id.toString(),
                    scheduledPost.postNumber,
                    'failed',
                    undefined,
                    result.error
                );

                Logger.error('Failed to publish scheduled post', {
                    contentId: content._id,
                    postNumber: scheduledPost.postNumber,
                    error: result.error
                });
            }

        } catch (error) {
            Logger.error('Error publishing to Facebook:', error);

            await ContentService.updateScheduledPostStatus(
                content._id.toString(),
                scheduledPost.postNumber,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Manually trigger scheduled posts processing (for testing)
     */
    static async triggerProcessing(): Promise<void> {
        Logger.info('Manually triggering scheduled posts processing');
        await this.processScheduledPosts();
    }

    /**
     * Get scheduler status
     */
    static getStatus(): { isRunning: boolean; nextRun?: Date } {
        return {
            isRunning: this.isRunning,
            nextRun: this.cronJob ? new Date(Date.now() + 60000) : undefined
        };
    }

    /**
     * Schedule a specific content for immediate processing
     */
    static async scheduleImmediate(contentId: string): Promise<boolean> {
        try {
            const content = await ContentService.getContentById(contentId, '');
            if (!content) {
                return false;
            }

            // Update the first pending scheduled post to current time
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);

            if (content.scheduledPost && content.scheduledPost.status === 'pending') {
                content.scheduledPost.scheduledDate = now;
                content.scheduledPost.scheduledTime = currentTime;

                await content.save();
                Logger.info('Content scheduled for immediate processing', { contentId });
                return true;
            }

            return false;
        } catch (error) {
            Logger.error('Error scheduling immediate content:', error);
            return false;
        }
    }
}
