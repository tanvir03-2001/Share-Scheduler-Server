import { NextFunction, Request, Response } from 'express';
import { CreateContentRequest, UpdateContentRequest } from './content.types';

export const validateCreateContent = (req: Request, res: Response, next: NextFunction) => {
    let { postType, content, platforms, publishMode, scheduleDate, scheduleTimes } = req.body as CreateContentRequest;

    // Log incoming data for debugging
    console.log('📥 Validating content creation request:', {
        postType,
        hasContent: !!content,
        contentLength: content?.length || 0,
        platforms: typeof platforms === 'string' ? platforms : platforms,
        publishMode,
        scheduleDate,
        scheduleTimes: typeof scheduleTimes === 'string' ? scheduleTimes : scheduleTimes,
        hasFiles: req.files && Array.isArray(req.files) && req.files.length > 0,
        fileCount: req.files && Array.isArray(req.files) ? req.files.length : 0
    });

    // Parse JSON strings for FormData fields
    try {
        if (typeof platforms === 'string') {
            platforms = JSON.parse(platforms);
        }
        if (typeof scheduleTimes === 'string') {
            scheduleTimes = JSON.parse(scheduleTimes);
        }
    } catch (error) {
        console.error('❌ JSON parsing error:', error);
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format for platforms or scheduleTimes'
        });
    }

    // Validate required fields
    if (!postType) {
        return res.status(400).json({
            success: false,
            message: 'Post type is required'
        });
    }

    if (!['text', 'image', 'reel', 'story'].includes(postType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid post type. Must be one of: text, image, reel, story'
        });
    }

    // Content is required for text posts, but optional for media posts if media files are present
    const hasMediaFiles = req.files && Array.isArray(req.files) && req.files.length > 0;
    const isMediaPost = ['image', 'reel', 'story'].includes(postType);

    // Handle content validation - content can be undefined, null, or empty string
    const contentIsEmpty = !content || (typeof content === 'string' && content.trim().length === 0);
    
    if (contentIsEmpty) {
        if (postType === 'text') {
            return res.status(400).json({
                success: false,
                message: 'Content is required for text posts'
            });
        } else if (isMediaPost && !hasMediaFiles) {
            return res.status(400).json({
                success: false,
                message: 'Either content or media files are required'
            });
        }
    }
    
    // Normalize content - set to empty string if undefined/null for media posts
    if (!content && isMediaPost && hasMediaFiles) {
        content = '';
        req.body.content = ''; // Update req.body so controller can use it
    }

    // Update req.body with parsed values
    req.body.platforms = platforms;
    req.body.scheduleTimes = scheduleTimes;
    req.body.content = content || '';

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'At least one platform must be selected'
        });
    }

    const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
    const invalidPlatforms = platforms.filter(platform => !validPlatforms.includes(platform));
    if (invalidPlatforms.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Invalid platforms: ${invalidPlatforms.join(', ')}`
        });
    }

    if (!publishMode || !['now', 'schedule'].includes(publishMode)) {
        return res.status(400).json({
            success: false,
            message: 'Publish mode must be either "now" or "schedule"'
        });
    }

    // Validate schedule fields if publishMode is 'schedule'
    if (publishMode === 'schedule') {
        if (!scheduleDate) {
            return res.status(400).json({
                success: false,
                message: 'Schedule date is required for scheduled posts'
            });
        }

        if (!scheduleTimes || !Array.isArray(scheduleTimes) || scheduleTimes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one schedule time is required for scheduled posts'
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(scheduleDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const invalidTimes = scheduleTimes.filter(time => !timeRegex.test(time));
        if (invalidTimes.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid time format: ${invalidTimes.join(', ')}. Use HH:MM format`
            });
        }

        // Check if scheduled date is not in the past (using UTC)
        // scheduleDate is already in UTC format (YYYY-MM-DD)
        // Compare with current UTC date
        const scheduledDateUTC = new Date(`${scheduleDate}T00:00:00.000Z`);
        const nowUTC = new Date();
        const todayUTC = new Date(Date.UTC(
            nowUTC.getUTCFullYear(),
            nowUTC.getUTCMonth(),
            nowUTC.getUTCDate(),
            0, 0, 0, 0
        ));

        if (scheduledDateUTC < todayUTC) {
            return res.status(400).json({
                success: false,
                message: 'Cannot schedule posts for past dates. Please select today or a future date.'
            });
        }
    }

    // Validate content length (only if content is provided)
    if (content && typeof content === 'string' && content.length > 2000) {
        return res.status(400).json({
            success: false,
            message: 'Content cannot exceed 2000 characters'
        });
    }

    // Validate hashtags if provided
    if (req.body.hashtags && req.body.hashtags.length > 500) {
        return res.status(400).json({
            success: false,
            message: 'Hashtags cannot exceed 500 characters'
        });
    }

    next();
    return;
};

export const validateUpdateContent = (req: Request, res: Response, next: NextFunction) => {
    const { content, hashtags, platforms, publishMode, scheduleDate, scheduleTimes } = req.body as UpdateContentRequest;

    // Validate content length if provided
    if (content !== undefined) {
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Content cannot be empty'
            });
        }

        if (content.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Content cannot exceed 2000 characters'
            });
        }
    }

    // Validate platforms if provided
    if (platforms !== undefined) {
        if (!Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one platform must be selected'
            });
        }

        const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
        const invalidPlatforms = platforms.filter(platform => !validPlatforms.includes(platform));
        if (invalidPlatforms.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid platforms: ${invalidPlatforms.join(', ')}`
            });
        }
    }

    // Validate publish mode if provided
    if (publishMode !== undefined && !['now', 'schedule'].includes(publishMode)) {
        return res.status(400).json({
            success: false,
            message: 'Publish mode must be either "now" or "schedule"'
        });
    }

    // Validate schedule fields if publishMode is 'schedule'
    if (publishMode === 'schedule') {
        if (!scheduleDate) {
            return res.status(400).json({
                success: false,
                message: 'Schedule date is required for scheduled posts'
            });
        }

        if (!scheduleTimes || !Array.isArray(scheduleTimes) || scheduleTimes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one schedule time is required for scheduled posts'
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(scheduleDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const invalidTimes = scheduleTimes.filter(time => !timeRegex.test(time));
        if (invalidTimes.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid time format: ${invalidTimes.join(', ')}. Use HH:MM format`
            });
        }
    }

    // Validate hashtags if provided
    if (hashtags !== undefined && hashtags.length > 500) {
        return res.status(400).json({
            success: false,
            message: 'Hashtags cannot exceed 500 characters'
        });
    }

    next();
    return;
};

export const validateContentId = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'Content ID is required'
        });
    }

    // Validate MongoDB ObjectId format
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid content ID format'
        });
    }

    next();
    return;
};
