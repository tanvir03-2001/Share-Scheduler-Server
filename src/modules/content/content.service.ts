import mongoose from 'mongoose';
import { FacebookPostingService } from '../../services/facebook-posting.service';
import { FacebookService } from '../../services/facebook.service';
import { Logger } from '../../utils/logger';
import { FacebookPage } from '../facebook/FacebookPage.model';
import { Content, IContent, IScheduledPost } from './Content.model';
import { CreateContentRequest, UpdateContentRequest } from './content.types';

export class ContentService {
    /**
     * Create new content
     */
    static async createContent(userId: string, contentData: CreateContentRequest & { mediaFiles?: any[] }): Promise<IContent> {
        try {
            const { postType, content, hashtags, platforms, publishMode, scheduleDate, scheduleTimes, mediaFiles } = contentData;

            // Generate scheduled post if publishMode is 'schedule'
            let scheduledPost: IScheduledPost | undefined;

            if (publishMode === 'schedule' && scheduleDate && scheduleTimes && scheduleTimes.length > 0) {
                const validTimes = scheduleTimes.filter(time => time.trim() !== '');
                if (validTimes.length > 0) {
                    // Combine date and time into a single DateTime
                    const scheduledDateTime = new Date(`${scheduleDate}T${validTimes[0]}:00.000Z`);
                    scheduledPost = {
                        postNumber: 1,
                        scheduledDateTime: scheduledDateTime,
                        status: 'pending' as const
                    };
                }
            }

            // Get the first media file since we now store only one per content
            const mediaFile = mediaFiles && mediaFiles.length > 0 ? mediaFiles[0] : undefined;

            const userIdObjectId = new mongoose.Types.ObjectId(userId);
            const newContent = new Content({
                userId: userIdObjectId,
                postType,
                content,
                hashtags,
                platforms,
                publishMode,
                mediaFile,
                scheduledPost,
                status: publishMode === 'now' ? 'published' : 'scheduled'
            });

            const savedContent = await newContent.save();
            console.log(`📄 Content created - ID: ${savedContent._id} | User: ${userId} | Mode: ${publishMode}`);
            Logger.info('Content created successfully', {
                contentId: savedContent._id,
                userId,
                hasMediaFile: !!mediaFile,
                hasCloudinaryFile: mediaFile?.cloudinaryPublicId || false
            });

            // If publishMode is 'now', immediately publish to Facebook
            if (publishMode === 'now' && platforms.includes('facebook')) {
                try {
                    await this.publishContentImmediately(savedContent, userId);
                } catch (error) {
                    Logger.error('Error publishing content immediately:', error);
                    // Don't throw error here, just log it - content is still saved
                }
            }

            return savedContent;
        } catch (error) {
            Logger.error('Error creating content:', error);
            throw error;
        }
    }

    /**
     * Publish content immediately to Facebook
     */
    private static async publishContentImmediately(content: IContent, userId: string): Promise<void> {
        try {
            // Get user's active Facebook page
            const activePage = await FacebookService.getUserActivePage(userId);

            if (!activePage) {
                Logger.warn('No active Facebook page found for immediate publishing', { userId, contentId: content._id });
                return;
            }

            // Prepare content for Facebook posting
            const facebookContent = {
                content: content.content,
                hashtags: content.hashtags,
                mediaFile: content.mediaFile,
                pageId: activePage.pageId,
                accessToken: activePage.accessToken
            };

            // Post to Facebook
            const result = await FacebookPostingService.postToFacebook(facebookContent);

            if (result.success && result.postId) {
                // Update content status and add Facebook post ID
                await Content.findByIdAndUpdate(content._id, {
                    status: 'published',
                    publishedAt: new Date(),
                    'scheduledPost.facebookPostId': result.postId,
                    'scheduledPost.status': 'published',
                    'scheduledPost.publishedAt': new Date()
                });

                // Update page last used timestamp
                await FacebookPage.findByIdAndUpdate(activePage._id, {
                    lastUsedAt: new Date()
                });

                Logger.info('Content published immediately to Facebook', {
                    contentId: content._id,
                    pageId: activePage.pageId,
                    facebookPostId: result.postId
                });
            } else {
                // Update content status to failed
                await Content.findByIdAndUpdate(content._id, {
                    status: 'failed',
                    'scheduledPost.status': 'failed',
                    'scheduledPost.error': result.error || 'Unknown error occurred'
                });

                Logger.error('Failed to publish content immediately to Facebook', {
                    contentId: content._id,
                    pageId: activePage.pageId,
                    error: result.error
                });
            }
        } catch (error) {
            Logger.error('Error in immediate publishing:', error);
            throw error;
        }
    }

    /**
     * Get user's content with pagination
     */
    static async getUserContent(
        userId: string,
        page: number = 1,
        limit: number = 10,
        status?: string,
        postType?: string
    ): Promise<{ contents: IContent[], total: number }> {
        try {
            Logger.info('ContentService.getUserContent called', { userId, page, limit, status, postType });

            // Convert userId string to ObjectId
            const userIdObjectId = new mongoose.Types.ObjectId(userId);
            const query: any = { userId: userIdObjectId };

            if (status) {
                query.status = status;
            }

            if (postType) {
                query.postType = postType;
            }

            Logger.info('Database query', { query });

            const skip = (page - 1) * limit;

            Logger.info('About to execute database queries', { skip, limit });

            const [contents, total] = await Promise.all([
                Content.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean() as unknown as IContent[],
                Content.countDocuments(query)
            ]);

            Logger.info('Database queries completed', { contentsCount: contents.length, total });

            return { contents, total };
        } catch (error) {
            Logger.error('Error fetching user content:', error);
            throw error;
        }
    }

    /**
     * Get content by ID
     */
    static async getContentById(contentId: string, userId: string): Promise<IContent | null> {
        try {
            const userIdObjectId = new mongoose.Types.ObjectId(userId);
            const content = await Content.findOne({ _id: contentId, userId: userIdObjectId }).lean() as unknown as IContent | null;
            return content;
        } catch (error) {
            Logger.error('Error fetching content by ID:', error);
            throw error;
        }
    }

    /**
     * Update content
     */
    static async updateContent(
        contentId: string,
        userId: string,
        updateData: UpdateContentRequest & { mediaFiles?: any[] }
    ): Promise<IContent | null> {
        try {
            const { content, hashtags, platforms, publishMode, scheduleDate, scheduleTimes, mediaFiles } = updateData;

            // Check if content exists and belongs to user
            const userIdObjectId = new mongoose.Types.ObjectId(userId);
            const existingContent = await Content.findOne({ _id: contentId, userId: userIdObjectId });
            if (!existingContent) {
                return null;
            }

            // Generate new scheduled posts if publishMode is 'schedule'
            let scheduledPosts: IScheduledPost[] = [];

            if (publishMode === 'schedule' && scheduleDate && scheduleTimes) {
                const validTimes = scheduleTimes.filter(time => time.trim() !== '');
                const startDate = new Date(scheduleDate);

                scheduledPosts = validTimes.map((time, index) => ({
                    postNumber: index + 1,
                    scheduledDateTime: new Date(`${scheduleDate}T${time}:00.000Z`),
                    status: 'pending' as const
                }));
            }

            const updateFields: any = {};

            if (content !== undefined) updateFields.content = content;
            if (hashtags !== undefined) updateFields.hashtags = hashtags;
            if (platforms !== undefined) updateFields.platforms = platforms;
            if (publishMode !== undefined) updateFields.publishMode = publishMode;
            if (mediaFiles !== undefined) updateFields.mediaFile = mediaFiles[0] || undefined;
            if (scheduledPosts.length > 0) updateFields.scheduledPost = scheduledPosts[0] || undefined;

            const updatedContent = await Content.findByIdAndUpdate(
                contentId,
                updateFields,
                { new: true, runValidators: true }
            );

            Logger.info('Content updated successfully', {
                contentId,
                userId,
                mediaFilesCount: mediaFiles?.length || 0,
                hasCloudinaryFiles: mediaFiles?.some(file => file.cloudinaryPublicId) || false
            });
            return updatedContent;
        } catch (error) {
            Logger.error('Error updating content:', error);
            throw error;
        }
    }

    /**
     * Delete content
     */
    static async deleteContent(contentId: string, userId: string): Promise<boolean> {
        try {
            const userIdObjectId = new mongoose.Types.ObjectId(userId);
            const result = await Content.findOneAndDelete({ _id: contentId, userId: userIdObjectId });

            if (result) {
                Logger.info('Content deleted successfully', { contentId, userId });
                return true;
            }

            return false;
        } catch (error) {
            Logger.error('Error deleting content:', error);
            throw error;
        }
    }

    /**
     * Get scheduled posts that are ready to be published
     * This method is used by the Scheduling Engine
     */
    static async getScheduledPostsToPublish(): Promise<IContent[]> {
        try {
            const now = new Date();

            const contents = await Content.find({
                status: 'scheduled',
                'scheduledPost.status': 'pending',
                'scheduledPost.scheduledDateTime': {
                    $lte: now // Find posts scheduled for current time or earlier
                }
            }).populate('userId', 'name email');

            return contents;
        } catch (error) {
            Logger.error('Error fetching scheduled posts to publish:', error);
            throw error;
        }
    }

    /**
     * Update scheduled post status
     * This method is used by the Scheduling Engine
     */
    static async updateScheduledPostStatus(
        contentId: string,
        postNumber: number,
        status: 'published' | 'failed',
        facebookPostId?: string,
        error?: string
    ): Promise<boolean> {
        try {
            const updateFields: any = {
                'scheduledPost.status': status,
                'scheduledPost.publishedAt': new Date()
            };

            if (facebookPostId) {
                updateFields['scheduledPost.facebookPostId'] = facebookPostId;
            }

            if (error) {
                updateFields['scheduledPost.error'] = error;
            }

            const result = await Content.updateOne(
                {
                    _id: contentId,
                    'scheduledPost.postNumber': postNumber
                },
                { $set: updateFields }
            );

            // Check if all scheduled posts are completed
            if (result.modifiedCount > 0) {
                const content = await Content.findById(contentId);
                if (content) {
                    const allPostsCompleted = content.scheduledPost &&
                        (content.scheduledPost.status === 'published' || content.scheduledPost.status === 'failed');

                    if (allPostsCompleted) {
                        await Content.findByIdAndUpdate(contentId, {
                            status: 'published',
                            publishedAt: new Date()
                        });
                    }
                }
            }

            return result.modifiedCount > 0;
        } catch (error) {
            Logger.error('Error updating scheduled post status:', error);
            throw error;
        }
    }

    /**
     * Get content statistics for user
     */
    static async getContentStats(userId: string): Promise<{
        total: number;
        published: number;
        scheduled: number;
        drafts: number;
        failed: number;
    }> {
        try {
            const stats = await Content.aggregate([
                { $match: { userId: new (require('mongoose')).Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result = {
                total: 0,
                published: 0,
                scheduled: 0,
                drafts: 0,
                failed: 0
            };

            stats.forEach(stat => {
                result.total += stat.count;
                result[stat._id as keyof typeof result] = stat.count;
            });

            return result;
        } catch (error) {
            Logger.error('Error fetching content stats:', error);
            throw error;
        }
    }
}
