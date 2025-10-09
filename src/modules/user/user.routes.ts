import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

// All user routes require authentication
router.use(AuthMiddleware.authenticate);

// Get all users (admin only)
router.get('/',
    AuthMiddleware.authorize(['admin']),
    userController.getAllUsers
);

// Get user by ID
router.get('/:id',
    userController.getUserById
);

// Update user
router.put('/:id',
    userController.updateUser
);

// Delete user (admin only)
router.delete('/:id',
    AuthMiddleware.authorize(['admin']),
    userController.deleteUser
);

export default router;

