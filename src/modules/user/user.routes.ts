import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import * as UserController from './user.controller';

const router = Router();

// All user routes require authentication
router.use(AuthMiddleware.authenticate);

// Get all users (admin only)
router.get('/',
    AuthMiddleware.authorize(['admin']),
    UserController.getAllUsers
);

// Get user by ID
router.get('/:id',
    UserController.getUserById
);

// Update user
router.put('/:id',
    UserController.updateUser
);

// Delete user (admin only)
router.delete('/:id',
    AuthMiddleware.authorize(['admin']),
    UserController.deleteUser
);

export default router;

