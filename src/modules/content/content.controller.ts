import { Request, Response } from 'express';
import { FileUploadService } from '../../services/file-upload.service';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import { ContentService } from './content.service';
import { CreateContentRequest, UpdateContentRequest } from './content.types';

// Helper function to match the expected sendResponse signature
const sendResponse = (res: Response, statusCode: number, success: boolean, message: string, data?: any) => {
    if (success) {
        ResponseHelper.success(res, message, data, statusCode);
    } else {
        ResponseHelper.error(res, message, undefined, statusCode);
    }
};

/**
 * Create new content
 */
export const createContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        let contentData: CreateContentRequest = req.body;

        // Parse JSON strings for FormData fields
        try {
            if (typeof contentData.platforms === 'string') {
                contentData.platforms = JSON.parse(contentData.platforms);
            }
            if (typeof contentData.scheduleTimes === 'string') {
                contentData.scheduleTimes = JSON.parse(contentData.scheduleTimes);
            }
        } catch (error) {
            Logger.error('Error parsing JSON fields:', error);
            sendResponse(res, 400, false, 'Invalid JSON format for platforms or scheduleTimes');
            return;
        }

        // Handle time conversion and validation if scheduling
        if (contentData.publishMode === 'schedule' && contentData.scheduleDate && contentData.scheduleTimes) {
            const userTimezone = req.body.userTimezone || 'UTC';

            // Get current UTC time
            const now = new Date();
            const currentUTC = now.toISOString();

            // Use minimal buffer (10 seconds) for server validation
            const bufferTime = new Date(now.getTime() + 10000); // 10 seconds buffer

            Logger.info('🌍 Server Universal Timezone Validation', {
                userTimezone,
                scheduleDate: contentData.scheduleDate,
                scheduleTimes: contentData.scheduleTimes,
                currentUTC,
                bufferTime: bufferTime.toISOString(),
                serverTimezone: 'UTC',
                validationMethod: 'Universal Timezone Match'
            });

            // Check each scheduled time against UTC
            for (const scheduleTime of contentData.scheduleTimes) {
                const scheduledDateTimeString = `${contentData.scheduleDate}T${scheduleTime}:00.000Z`;
                const scheduledDateTime = new Date(scheduledDateTimeString);

                // Calculate time difference in seconds
                const timeDifferenceSeconds = (scheduledDateTime.getTime() - now.getTime()) / 1000;
                const bufferDifferenceSeconds = (bufferTime.getTime() - scheduledDateTime.getTime()) / 1000;

                Logger.info(`🕐 Validating schedule time: ${scheduleTime}`, {
                    scheduledDateTime: scheduledDateTimeString,
                    currentUTC,
                    bufferTime: bufferTime.toISOString(),
                    timeDifferenceSeconds: Math.round(timeDifferenceSeconds),
                    bufferDifferenceSeconds: Math.round(bufferDifferenceSeconds),
                    isValid: scheduledDateTime > bufferTime
                });

                // Compare with current UTC time + buffer
                if (scheduledDateTime <= bufferTime) {
                    Logger.warn('❌ SCHEDULE REJECTED: Past time detected', {
                        scheduledDateTime: scheduledDateTimeString,
                        currentUTC,
                        bufferTime: bufferTime.toISOString(),
                        userTimezone,
                        timeDifferenceSeconds: Math.round(timeDifferenceSeconds),
                        bufferDifferenceSeconds: Math.round(bufferDifferenceSeconds),
                        reason: 'Scheduled time is too close to current time or in the past'
                    });

                    sendResponse(res, 400, false, 'Cannot schedule posts for past dates. Please select today or a future date.');
                    return;
                }

                Logger.info('✅ Schedule time validation passed', {
                    scheduleTime,
                    scheduledDateTime: scheduledDateTimeString,
                    currentUTC,
                    timeDifferenceSeconds: Math.round(timeDifferenceSeconds),
                    status: 'APPROVED'
                });
            }

            Logger.info('🎉 All scheduled time validations passed - Universal Timezone Match', {
                userTimezone,
                scheduleDate: contentData.scheduleDate,
                scheduleTimes: contentData.scheduleTimes,
                currentUTC,
                validationResult: 'SUCCESS'
            });
        }

        // Debug logging
        Logger.info('Creating content', {
            userId,
            contentData,
            filesCount: req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 0,
            files: req.files
        });

        // Process uploaded files if any
        let mediaFiles: any[] = [];
        if (req.files && Array.isArray(req.files)) {
            Logger.info('Processing uploaded files', { filesCount: req.files.length });
            mediaFiles = await FileUploadService.processUploadedFiles(req.files);
            Logger.info('Files processed successfully', { processedCount: mediaFiles.length });
        } else {
            Logger.info('No files uploaded');
        }

        // Add media files to content data
        const contentWithFiles = {
            ...contentData,
            mediaFiles
        };

        const content = await ContentService.createContent(userId, contentWithFiles);

        // Generate response data
        const responseData: any = {
            contentId: (content._id as any).toString()
        };

        // Add scheduled post info if applicable
        if (content.publishMode === 'schedule' && content.scheduledPost) {
            responseData.scheduledPost = {
                postNumber: content.scheduledPost.postNumber,
                scheduledDateTime: content.scheduledPost.scheduledDateTime
            };
        }

        sendResponse(res, 201, true, 'Content created successfully', responseData);
    } catch (error) {
        Logger.error('Error in createContent controller:', error);

        // Provide more specific error messages
        let errorMessage = 'Failed to create content';
        if (error instanceof Error) {
            if (error.message.includes('validation')) {
                errorMessage = 'Content validation failed. Please check your input.';
            } else if (error.message.includes('Facebook')) {
                errorMessage = 'Failed to publish to Facebook. Please check your Facebook connection.';
            } else if (error.message.includes('upload')) {
                errorMessage = 'File upload failed. Please try again.';
            }
        }

        sendResponse(res, 500, false, errorMessage);
    }
}

/**
 * Get user's content with pagination
 */
export const getUserContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as string;
        const postType = req.query.postType as string;

        Logger.info('getUserContent called', { userId, page, limit, status, postType });

        const { contents, total } = await ContentService.getUserContent(
            userId,
            page,
            limit,
            status,
            postType
        );

        Logger.info('Content retrieved', { contentsCount: contents.length, total });

        const responseData = {
            contents: contents.map(content => {
                // Extract scheduledDate and scheduledTime from scheduledDateTime
                let scheduledDate: string | undefined;
                let scheduledTime: string | undefined;

                if (content.scheduledPost?.scheduledDateTime) {
                    const scheduledDateTime = new Date(content.scheduledPost.scheduledDateTime);
                    scheduledDate = scheduledDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
                    scheduledTime = scheduledDateTime.toISOString().split('T')[1].slice(0, 5); // HH:MM
                }

                return {
                    id: (content._id as any).toString(),
                    postType: content.postType,
                    content: content.content,
                    hashtags: content.hashtags,
                    mediaFile: content.mediaFile,
                    platforms: content.platforms,
                    publishMode: content.publishMode,
                    status: content.status,
                    publishedAt: content.publishedAt?.toISOString(),
                    createdAt: content.createdAt.toISOString(),
                    updatedAt: content.updatedAt.toISOString(),
                    scheduledPost: content.scheduledPost ? {
                        postNumber: content.scheduledPost.postNumber,
                        scheduledDateTime: content.scheduledPost.scheduledDateTime,
                        scheduledDate: scheduledDate,
                        scheduledTime: scheduledTime,
                        status: content.scheduledPost.status,
                        publishedAt: content.scheduledPost.publishedAt?.toISOString(),
                        facebookPostId: content.scheduledPost.facebookPostId,
                        error: content.scheduledPost.error
                    } : undefined
                };
            }),
            total,
            page,
            limit
        };

        sendResponse(res, 200, true, 'Content retrieved successfully', responseData);
    } catch (error) {
        Logger.error('Error in getUserContent controller:', error);
        console.error('Detailed error:', error);
        sendResponse(res, 500, false, 'Failed to retrieve content');
    }
}

/**
 * Get content by ID
 */
export const getContentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { id } = req.params;
        const content = await ContentService.getContentById(id, userId);

        if (!content) {
            sendResponse(res, 404, false, 'Content not found');
            return;
        }

        // Extract scheduledDate and scheduledTime from scheduledDateTime
        let scheduledDate: string | undefined;
        let scheduledTime: string | undefined;

        if (content.scheduledPost?.scheduledDateTime) {
            const scheduledDateTime = new Date(content.scheduledPost.scheduledDateTime);
            scheduledDate = scheduledDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
            scheduledTime = scheduledDateTime.toISOString().split('T')[1].slice(0, 5); // HH:MM
        }

        const responseData = {
            id: (content._id as any).toString(),
            postType: content.postType,
            content: content.content,
            hashtags: content.hashtags,
            mediaFile: content.mediaFile,
            platforms: content.platforms,
            publishMode: content.publishMode,
            status: content.status,
            publishedAt: content.publishedAt?.toISOString(),
            createdAt: content.createdAt.toISOString(),
            updatedAt: content.updatedAt.toISOString(),
            scheduledPost: content.scheduledPost ? {
                postNumber: content.scheduledPost.postNumber,
                scheduledDateTime: content.scheduledPost.scheduledDateTime,
                scheduledDate: scheduledDate,
                scheduledTime: scheduledTime,
                status: content.scheduledPost.status,
                publishedAt: content.scheduledPost.publishedAt?.toISOString(),
                facebookPostId: content.scheduledPost.facebookPostId,
                error: content.scheduledPost.error
            } : undefined
        };

        sendResponse(res, 200, true, 'Content retrieved successfully', responseData);
    } catch (error) {
        Logger.error('Error in getContentById controller:', error);
        sendResponse(res, 500, false, 'Failed to retrieve content');
    }
}

/**
 * Update content
 */
export const updateContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { id } = req.params;
        const updateData: UpdateContentRequest = req.body;

        // Process uploaded files if any
        let mediaFiles: any[] = [];
        if (req.files && Array.isArray(req.files)) {
            mediaFiles = await FileUploadService.processUploadedFiles(req.files);
        }

        // Add media files to update data if provided
        const updateDataWithFiles = {
            ...updateData,
            ...(mediaFiles.length > 0 && { mediaFiles })
        };

        const updatedContent = await ContentService.updateContent(id, userId, updateDataWithFiles);

        if (!updatedContent) {
            sendResponse(res, 404, false, 'Content not found');
            return;
        }

        sendResponse(res, 200, true, 'Content updated successfully');
    } catch (error) {
        Logger.error('Error in updateContent controller:', error);
        sendResponse(res, 500, false, 'Failed to update content');
    }
}

/**
 * Delete content
 */
export const deleteContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { id } = req.params;
        const deleted = await ContentService.deleteContent(id, userId);

        if (!deleted) {
            sendResponse(res, 404, false, 'Content not found');
            return;
        }

        sendResponse(res, 200, true, 'Content deleted successfully');
    } catch (error) {
        Logger.error('Error in deleteContent controller:', error);
        sendResponse(res, 500, false, 'Failed to delete content');
    }
}

/**
 * Get content statistics
 */
export const getContentStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const stats = await ContentService.getContentStats(userId);
        sendResponse(res, 200, true, 'Content statistics retrieved successfully', stats);
    } catch (error) {
        Logger.error('Error in getContentStats controller:', error);
        sendResponse(res, 500, false, 'Failed to retrieve content statistics');
    }
}

/**
 * Cancel scheduled content
 */
export const cancelScheduledContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).jwtUser?.id;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { id } = req.params;

        // Update content status to draft and clear scheduled posts
        const updatedContent = await ContentService.updateContent(id, userId, {
            publishMode: 'now',
            scheduleDate: undefined,
            scheduleTimes: undefined
        });

        if (!updatedContent) {
            sendResponse(res, 404, false, 'Content not found');
            return;
        }

        sendResponse(res, 200, true, 'Scheduled content cancelled successfully');
    } catch (error) {
        Logger.error('Error in cancelScheduledContent controller:', error);
        sendResponse(res, 500, false, 'Failed to cancel scheduled content');
    }
};
