/**
 * SCHEDULING ENGINE ROUTES
 * 
 * This file defines all API routes for the scheduling engine.
 * All scheduling-related endpoints are centralized here.
 */

import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import {
    convertLocalToUTCController,
    convertUTCToLocalController,
    getCurrentServerDateTimeController,
    getScheduledPostsHistory,
    getSchedulingEngineHealthController,
    getSchedulingEngineStatusController,
    getUpcomingScheduledPosts,
    scheduleContentImmediateController,
    triggerSchedulingProcessingController
} from './scheduling.controller';

const router = Router();

// All scheduling engine routes are prefixed with /api/scheduling-engine

/**
 * @route GET /api/scheduling-engine/status
 * @desc Get scheduling engine status and health
 * @access Public (for monitoring)
 */
router.get('/status', getSchedulingEngineStatusController);

/**
 * @route GET /api/scheduling-engine/health
 * @desc Get scheduling engine health check
 * @access Public (for health monitoring)
 */
router.get('/health', getSchedulingEngineHealthController);

/**
 * @route GET /api/scheduling-engine/current-time
 * @desc Get current server date and time with timezone
 * @access Public (for frontend synchronization)
 */
router.get('/current-time', getCurrentServerDateTimeController);

/**
 * @route POST /api/scheduling-engine/convert-to-utc
 * @desc Convert local time to UTC
 * @access Public (for frontend time conversion)
 */
router.post('/convert-to-utc', convertLocalToUTCController);

/**
 * @route POST /api/scheduling-engine/convert-to-local
 * @desc Convert UTC time to local timezone
 * @access Public (for frontend time conversion)
 */
router.post('/convert-to-local', convertUTCToLocalController);

/**
 * @route POST /api/scheduling-engine/trigger
 * @desc Manually trigger scheduled posts processing
 * @access Private (admin/testing)
 */
router.post('/trigger', triggerSchedulingProcessingController);

/**
 * @route POST /api/scheduling-engine/schedule-immediate/:contentId
 * @desc Schedule a specific content for immediate processing
 * @access Private
 */
router.post('/schedule-immediate/:contentId', AuthMiddleware.authenticate, scheduleContentImmediateController);

/**
 * @route GET /api/scheduling-engine/upcoming
 * @desc Get upcoming scheduled posts for authenticated user
 * @access Private
 */
router.get('/upcoming', AuthMiddleware.authenticate, getUpcomingScheduledPosts);

/**
 * @route GET /api/scheduling-engine/history
 * @desc Get scheduled posts history for authenticated user
 * @access Private
 */
router.get('/history', AuthMiddleware.authenticate, getScheduledPostsHistory);

export default router;
