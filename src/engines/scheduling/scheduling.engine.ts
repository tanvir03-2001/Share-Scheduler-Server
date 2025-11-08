/**
 * SCHEDULING ENGINE - FUNCTION-BASED APPROACH
 * 
 * This is the dedicated scheduling engine for content posts.
 * All scheduling-related functionality is centralized here using functions.
 * 
 * Features:
 * - Cron-based automatic scheduling
 * - Manual trigger processing
 * - Scheduled post management
 * - Status tracking and monitoring
 */

import * as cron from 'node-cron';
import { ContentService } from '../../modules/content/content.service';
import { FacebookPage } from '../../modules/facebook/FacebookPage.model';
import { FacebookPostingService } from '../../services/facebook-posting.service';
import { FacebookService } from '../../services/facebook.service';
import { Logger } from '../../utils/logger';

// Global state for the scheduling engine
let isRunning = false;
let cronJob: cron.ScheduledTask | null = null;
const CRON_SCHEDULE = '* * * * *'; // Every minute

/**
 * Convert local date and time to UTC
 */
export function convertLocalToUTC(localDate: string, localTime: string, timezone: string): {
    utcDate: string;
    utcTime: string;
    utcDateTime: Date;
} {
    try {
        // Create a date object in the specified timezone
        const localDateTimeString = `${localDate}T${localTime}:00`;
        const localDateObj = new Date(localDateTimeString);

        // Convert to UTC
        const utcDateObj = new Date(localDateObj.getTime() - (localDateObj.getTimezoneOffset() * 60000));

        const utcDate = utcDateObj.toISOString().split('T')[0];
        const utcTime = utcDateObj.toISOString().split('T')[1].slice(0, 5);

        return {
            utcDate,
            utcTime,
            utcDateTime: utcDateObj
        };
    } catch (error) {
        console.error('Error converting local time to UTC:', error);
        // Fallback to current UTC time
        const now = new Date();
        return {
            utcDate: now.toISOString().split('T')[0],
            utcTime: now.toISOString().split('T')[1].slice(0, 5),
            utcDateTime: now
        };
    }
}

/**
 * Convert UTC date and time to local timezone
 */
export function convertUTCToLocal(utcDate: string, utcTime: string, targetTimezone: string): {
    localDate: string;
    localTime: string;
    localDateTime: Date;
} {
    try {
        // Create UTC date object
        const utcDateTimeString = `${utcDate}T${utcTime}:00.000Z`;
        const utcDateObj = new Date(utcDateTimeString);

        // Convert to local timezone
        const localDateObj = new Date(utcDateObj.toLocaleString('en-US', { timeZone: targetTimezone }));

        const localDate = localDateObj.toISOString().split('T')[0];
        const localTime = localDateObj.toTimeString().slice(0, 5);

        return {
            localDate,
            localTime,
            localDateTime: localDateObj
        };
    } catch (error) {
        console.error('Error converting UTC to local time:', error);
        // Fallback to UTC time
        const now = new Date();
        return {
            localDate: now.toISOString().split('T')[0],
            localTime: now.toISOString().split('T')[1].slice(0, 5),
            localDateTime: now
        };
    }
}

/**
 * Get current date and time information in UTC
 */
function getCurrentDateTimeInfo() {
    const now = new Date();
    const utcTime = now.toISOString().split('T')[1].slice(0, 8); // HH:MM:SS format in UTC
    const utcDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format in UTC

    // Format current date for better display (in UTC)
    const currentDateFormatted = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });

    return {
        date: utcDate,
        time: utcTime,
        dateFormatted: currentDateFormatted,
        timezone: 'UTC',
        timezoneString: 'UTC+00:00',
        timestamp: now.getTime(),
        isoString: now.toISOString()
    };
}

/**
 * Show next scheduled posts information
 */
async function showNextScheduledPosts(): Promise<void> {
    try {
        // Get all pending scheduled posts
        const { Content } = await import('../../modules/content/Content.model');
        const dateTimeInfo = getCurrentDateTimeInfo();
        const now = new Date();
        const currentDate = dateTimeInfo.date;
        const currentTime = dateTimeInfo.time.slice(0, 5); // HH:MM format

        console.log(`📅 Current Date: ${dateTimeInfo.dateFormatted} (UTC)`);
        console.log(`🕐 Current Time: ${currentTime} UTC`);
        console.log(`🌍 Server Timezone: ${dateTimeInfo.timezone} (${dateTimeInfo.timezoneString})`);

        // Find all pending scheduled posts (missed and upcoming)
        const upcomingPosts = await Content.find({
            status: 'scheduled',
            'scheduledPost.status': 'pending'
        })
            .populate('userId', 'name email')
            .sort({ 'scheduledPost.scheduledDateTime': 1 })
            .limit(8); // Show more posts to include missed ones

        if (upcomingPosts.length === 0) {
            console.log(`📭 No scheduled posts found (missed or upcoming)`);
            return;
        }

        // Separate missed and upcoming posts
        const missedPosts = upcomingPosts.filter(content => {
            const scheduledDateTime = content.scheduledPost?.scheduledDateTime;
            return scheduledDateTime && scheduledDateTime.getTime() < now.getTime();
        });

        const futurePosts = upcomingPosts.filter(content => {
            const scheduledDateTime = content.scheduledPost?.scheduledDateTime;
            return scheduledDateTime && scheduledDateTime.getTime() >= now.getTime();
        });

        // Show missed posts first
        if (missedPosts.length > 0) {
            console.log(`🚨 MISSED POSTS (${missedPosts.length}):`);
            missedPosts.forEach((content, index) => {
                const scheduledDateTime = content.scheduledPost?.scheduledDateTime;
                const postType = content.postType || 'N/A';
                const platforms = content.platforms?.join(', ') || 'N/A';
                const userName = (content.userId as any)?.name || content.userId || 'Unknown';

                if (!scheduledDateTime) return;

                // Calculate how long ago it was missed
                const timeSince = now.getTime() - scheduledDateTime.getTime();
                const hoursSince = Math.floor(timeSince / (1000 * 60 * 60));
                const minutesSince = Math.floor((timeSince % (1000 * 60 * 60)) / (1000 * 60));

                let timeSinceText = '';
                if (hoursSince > 24) {
                    const daysSince = Math.floor(hoursSince / 24);
                    timeSinceText = `${daysSince} day(s) ago`;
                } else if (hoursSince > 0) {
                    timeSinceText = `${hoursSince}h ${minutesSince}m ago`;
                } else {
                    timeSinceText = `${minutesSince}m ago`;
                }

                const scheduledDate = scheduledDateTime.toISOString().split('T')[0];
                const scheduledTime = scheduledDateTime.toISOString().split('T')[1].slice(0, 5);

                console.log(`   ${index + 1}. Content ID: ${content._id}`);
                console.log(`      📝 Type: ${postType}`);
                console.log(`      📅 Was scheduled: ${scheduledDate} at ${scheduledTime} UTC`);
                console.log(`      ⏰ Missed: ${timeSinceText}`);
                console.log(`      🌐 Platforms: ${platforms}`);
                console.log(`      👤 User: ${userName}`);
            });
            console.log('');
        }

        // Show upcoming posts
        if (futurePosts.length > 0) {
            console.log(`📅 UPCOMING POSTS (${futurePosts.length}):`);
            futurePosts.forEach((content, index) => {
                const scheduledDateTime = content.scheduledPost?.scheduledDateTime;
                const postType = content.postType || 'N/A';
                const platforms = content.platforms?.join(', ') || 'N/A';
                const userName = (content.userId as any)?.name || content.userId || 'Unknown';

                if (!scheduledDateTime) return;

                // Calculate time until scheduled
                const timeUntil = scheduledDateTime.getTime() - now.getTime();
                const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
                const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

                let timeUntilText = '';
                if (hoursUntil > 24) {
                    const daysUntil = Math.floor(hoursUntil / 24);
                    timeUntilText = `in ${daysUntil} day(s)`;
                } else if (hoursUntil > 0) {
                    timeUntilText = `in ${hoursUntil}h ${minutesUntil}m`;
                } else if (minutesUntil > 0) {
                    timeUntilText = `in ${minutesUntil}m`;
                } else {
                    timeUntilText = 'very soon';
                }

                const scheduledDate = scheduledDateTime.toISOString().split('T')[0];
                const scheduledTime = scheduledDateTime.toISOString().split('T')[1].slice(0, 5);

                console.log(`   ${index + 1}. Content ID: ${content._id}`);
                console.log(`      📝 Type: ${postType}`);
                console.log(`      📅 Scheduled: ${scheduledDate} at ${scheduledTime} UTC`);
                console.log(`      ⏰ Time until: ${timeUntilText}`);
                console.log(`      🌐 Platforms: ${platforms}`);
                console.log(`      👤 User: ${userName}`);
            });
        }

        if (upcomingPosts.length >= 8) {
            console.log(`   ... and more scheduled posts`);
        }

    } catch (error) {
        console.log(`❌ Error fetching upcoming posts: ${error}`);
        Logger.error('Error fetching upcoming scheduled posts:', error);
    }
}

/**
 * Start the scheduling engine
 */
export function startSchedulingEngine(): void {
    if (isRunning) {
        Logger.warn('Scheduling engine is already running');
        return;
    }

    // Run every minute to check for scheduled posts
    cronJob = cron.schedule(CRON_SCHEDULE, async () => {
        await processScheduledPosts();
    });

    cronJob.start();
    isRunning = true;
    console.log('⏰ SCHEDULING ENGINE STARTED - Checking posts every minute');
    Logger.info('Scheduling engine started successfully');
}

/**
 * Stop the scheduling engine
 */
export function stopSchedulingEngine(): void {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
    }
    isRunning = false;
    console.log('⏹️ SCHEDULING ENGINE STOPPED');
    Logger.info('Scheduling engine stopped');
}

/**
 * Process scheduled posts that are ready to be published
 */
async function processScheduledPosts(): Promise<void> {
    try {
        const dateTimeInfo = getCurrentDateTimeInfo();

        console.log(`\n🔍 SCHEDULING ENGINE CHECK: ${dateTimeInfo.date} ${dateTimeInfo.time} UTC`);
        console.log(`📅 Current Date: ${dateTimeInfo.dateFormatted} (UTC)`);
        console.log(`🌍 Server Timezone: ${dateTimeInfo.timezone} (${dateTimeInfo.timezoneString})`);
        console.log(`⏰ Checking for scheduled posts to publish...`);

        const contentsToPublish = await ContentService.getScheduledPostsToPublish();

        if (contentsToPublish.length === 0) {
            console.log(`✅ No scheduled posts found for current time`);

            // Show next scheduled posts
            console.log(`🔍 Looking for upcoming scheduled posts...`);
            try {
                await showNextScheduledPosts();
            } catch (error) {
                console.log(`❌ Error showing next scheduled posts: ${error}`);
            }

            console.log(`📊 Check completed - No action needed\n`);
            return;
        }

        console.log(`📅 Found ${contentsToPublish.length} scheduled posts ready to publish:`);

        // Log details of each content found
        contentsToPublish.forEach((content, index) => {
            const scheduledDateTime = content.scheduledPost?.scheduledDateTime;
            const postType = content.postType || 'N/A';
            const platforms = content.platforms?.join(', ') || 'N/A';

            console.log(`   ${index + 1}. Content ID: ${content._id}`);
            console.log(`      📝 Type: ${postType}`);
            if (scheduledDateTime) {
                const scheduledDate = scheduledDateTime.toISOString().split('T')[0];
                const scheduledTime = scheduledDateTime.toISOString().split('T')[1].slice(0, 5);
                console.log(`      📅 Scheduled: ${scheduledDate} at ${scheduledTime} UTC`);
            }
            console.log(`      🌐 Platforms: ${platforms}`);
            console.log(`      👤 User: ${(content.userId as any)?.name || content.userId || 'Unknown'}`);
        });

        console.log(`\n🚀 Starting to process ${contentsToPublish.length} posts...`);

        let successCount = 0;
        let failCount = 0;

        for (const content of contentsToPublish) {
            try {
                await publishScheduledContent(content);
                successCount++;
            } catch (error) {
                failCount++;
                console.log(`❌ Failed to process content ${content._id}:`, error);
            }
        }

        // Final summary
        console.log(`\n📊 PROCESSING COMPLETE:`);
        console.log(`   ✅ Successfully processed: ${successCount}`);
        console.log(`   ❌ Failed to process: ${failCount}`);
        console.log(`   📈 Total processed: ${successCount + failCount}`);
        console.log(`⏰ Next check in 1 minute...\n`);

        Logger.info(`Scheduling engine processing completed`, {
            total: contentsToPublish.length,
            success: successCount,
            failed: failCount,
            timestamp: dateTimeInfo.isoString
        });

    } catch (error) {
        console.log(`❌ SCHEDULING ENGINE ERROR: ${error}`);
        Logger.error('Scheduling engine error processing scheduled posts:', error);
    }
}

/**
 * Publish a scheduled content
 */
async function publishScheduledContent(content: any): Promise<void> {
    try {
        const userId = content.userId._id || content.userId;
        const contentId = content._id;
        const scheduledDateTime = content.scheduledPost?.scheduledDateTime;

        console.log(`   🔄 Processing Content ID: ${contentId}`);
        if (scheduledDateTime) {
            const scheduledDate = scheduledDateTime.toISOString().split('T')[0];
            const scheduledTime = scheduledDateTime.toISOString().split('T')[1].slice(0, 5);
            console.log(`      📅 Scheduled: ${scheduledDate} at ${scheduledTime} UTC`);
        }

        // Get user's Facebook pages
        const pages = await FacebookPage.find({ userId });

        if (pages.length === 0) {
            console.log(`      ❌ No Facebook pages found for user: ${userId}`);
            Logger.warn('No Facebook pages found for user in scheduling engine', { userId });
            return;
        }

        console.log(`      📱 Found ${pages.length} Facebook page(s) for user`);

        // Find pending scheduled posts for current time
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const currentDate = now.toISOString().split('T')[0];

        if (content.scheduledPost &&
            content.scheduledPost.status === 'pending' &&
            content.scheduledPost.scheduledDateTime <= now) {

            console.log(`      ⏰ Time to publish! (Current: ${currentTime}, Scheduled: ${scheduledDateTime?.toISOString().split('T')[1].slice(0, 5)})`);
            await publishToFacebook(content, content.scheduledPost, pages);
        } else {
            console.log(`      ⏳ Not time yet (Current: ${currentTime}, Scheduled: ${scheduledDateTime?.toISOString().split('T')[1].slice(0, 5)})`);
        }

    } catch (error) {
        console.log(`      ❌ Error processing content ${content._id}:`, error);
        Logger.error('Scheduling engine error publishing scheduled content:', error);
    }
}

/**
 * Publish content to Facebook
 */
async function publishToFacebook(
    content: any,
    scheduledPost: any,
    pages: any[]
): Promise<void> {
    try {
        // Get user's active Facebook page
        const userId = content.userId._id || content.userId;
        const activePage = await FacebookService.getUserActivePage(userId);

        if (!activePage) {
            console.log(`         ❌ No active Facebook page found for user: ${userId}`);
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

        console.log(`         📱 Using Facebook page: ${activePage.pageName || activePage.pageId}`);
        console.log(`         📝 Content: ${content.content?.substring(0, 50)}${content.content?.length > 50 ? '...' : ''}`);
        console.log(`         🏷️ Hashtags: ${content.hashtags?.join(' ') || 'None'}`);
        console.log(`         📎 Media: ${content.mediaFile ? 'Yes' : 'No'}`);

        // Prepare content for Facebook
        const facebookContent = {
            content: content.content,
            hashtags: content.hashtags,
            mediaFile: content.mediaFile,
            pageId: activePage.pageId,
            accessToken: activePage.accessToken
        };

        console.log(`         🚀 Publishing to Facebook...`);

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

            console.log(`         ✅ SUCCESS! Published to Facebook`);
            console.log(`         🔗 Facebook Post ID: ${result.postId}`);
            console.log(`         📊 Status updated to: published`);

            Logger.info('Scheduling engine published post successfully', {
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

            console.log(`         ❌ FAILED to publish to Facebook`);
            console.log(`         🚨 Error: ${result.error}`);
            console.log(`         📊 Status updated to: failed`);

            Logger.error('Scheduling engine failed to publish post', {
                contentId: content._id,
                postNumber: scheduledPost.postNumber,
                error: result.error
            });
        }

    } catch (error) {
        console.log(`         💥 EXCEPTION during Facebook publishing:`, error);
        Logger.error('Scheduling engine error publishing to Facebook:', error);

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
 * Manually trigger scheduled posts processing (for testing/debugging)
 */
export async function triggerSchedulingProcessing(): Promise<void> {
    console.log('\n🔄 SCHEDULING ENGINE: Manual trigger requested');
    console.log('⚡ Forcing immediate check for scheduled posts...');
    Logger.info('Scheduling engine manually triggering scheduled posts processing');
    await processScheduledPosts();
    console.log('✅ Manual trigger completed\n');
}

/**
 * Get scheduling engine status
 */
export function getSchedulingEngineStatus(): { isRunning: boolean; nextRun?: Date; cronSchedule: string } {
    return {
        isRunning: isRunning,
        nextRun: cronJob ? new Date(Date.now() + 60000) : undefined,
        cronSchedule: CRON_SCHEDULE
    };
}

/**
 * Schedule a specific content for immediate processing
 */
export async function scheduleContentImmediate(contentId: string): Promise<boolean> {
    try {
        const content = await ContentService.getContentById(contentId, '');
        if (!content) {
            return false;
        }

        // Update the first pending scheduled post to current time
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);

        if (content.scheduledPost && content.scheduledPost.status === 'pending') {
            content.scheduledPost.scheduledDateTime = now;

            await content.save();
            console.log(`⚡ SCHEDULING ENGINE: Content scheduled for immediate processing - ID: ${contentId}`);
            Logger.info('Scheduling engine scheduled content for immediate processing', { contentId });
            return true;
        }

        return false;
    } catch (error) {
        Logger.error('Scheduling engine error scheduling immediate content:', error);
        return false;
    }
}

/**
 * Get scheduling engine health status
 */
export function getSchedulingEngineHealth(): {
    engine: string;
    status: 'healthy' | 'unhealthy';
    isRunning: boolean;
    lastProcessed?: Date;
    cronSchedule: string;
    uptime: number;
} {
    return {
        engine: 'SchedulingEngine',
        status: isRunning ? 'healthy' : 'unhealthy',
        isRunning: isRunning,
        cronSchedule: CRON_SCHEDULE,
        uptime: isRunning ? Date.now() : 0
    };
}

/**
 * Get current server date and time information
 */
export function getCurrentServerDateTime() {
    return getCurrentDateTimeInfo();
}
