import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { upload } from '../../services/file-upload.service';
import * as ContentController from './content.controller';
import { validateContentId, validateCreateContent, validateUpdateContent } from './content.validator';
import * as SchedulerController from './scheduler.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

// Content routes
router.post('/', upload.array('mediaFiles', 10), validateCreateContent, ContentController.createContent);
router.get('/', ContentController.getUserContent);
router.get('/stats', ContentController.getContentStats);
router.get('/:id', validateContentId, ContentController.getContentById);
router.put('/:id', validateContentId, validateUpdateContent, ContentController.updateContent);
router.delete('/:id', validateContentId, ContentController.deleteContent);
router.patch('/:id/cancel', validateContentId, ContentController.cancelScheduledContent);

// Scheduler routes
router.get('/scheduler/status', SchedulerController.getSchedulerStatus);
router.post('/scheduler/trigger', SchedulerController.triggerProcessing);
router.get('/scheduler/upcoming', SchedulerController.getUpcomingPosts);
router.get('/scheduler/history', SchedulerController.getScheduledHistory);
router.post('/:id/schedule-immediate', validateContentId, SchedulerController.scheduleImmediate);

export default router;
