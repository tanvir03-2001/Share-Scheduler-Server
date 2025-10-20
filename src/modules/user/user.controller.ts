import { Request, Response } from 'express';
import { JWTAuthenticatedRequest } from '../../middleware/auth.middleware';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import { UserService } from './user.service';

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const userService = new UserService();
        const users = await userService.getAllUsers();
        ResponseHelper.success(res, 'Users retrieved successfully', users);
    } catch (error: any) {
        Logger.error('Get all users error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get users', error);
    }
};

// Get user by ID
export const getUserById = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userService = new UserService();
        const user = await userService.getUserById(id);

        if (!user) {
            return ResponseHelper.notFound(res, 'User not found');
        }

        ResponseHelper.success(res, 'User retrieved successfully', user);
    } catch (error: any) {
        Logger.error('Get user by ID error:', error);
        ResponseHelper.error(res, error.message || 'Failed to get user', error);
    }
};

// Update user
export const updateUser = async (req: JWTAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userService = new UserService();

        const updatedUser = await userService.updateUser(id, updateData);

        if (!updatedUser) {
            return ResponseHelper.notFound(res, 'User not found');
        }

        ResponseHelper.success(res, 'User updated successfully', updatedUser);
    } catch (error: any) {
        Logger.error('Update user error:', error);
        ResponseHelper.error(res, error.message || 'Failed to update user', error);
    }
};

// Delete user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userService = new UserService();

        const deleted = await userService.deleteUser(id);

        if (!deleted) {
            return ResponseHelper.notFound(res, 'User not found');
        }

        ResponseHelper.success(res, 'User deleted successfully');
    } catch (error: any) {
        Logger.error('Delete user error:', error);
        ResponseHelper.error(res, error.message || 'Failed to delete user', error);
    }
};

