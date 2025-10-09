import { Request, Response } from 'express';
import { Logger } from '../../utils/logger';
import { ResponseHelper } from '../../utils/response';
import { UserService } from './user.service';

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    // Get all users (admin only)
    getAllUsers = async (req: Request, res: Response): Promise<void> => {
        try {
            const users = await this.userService.getAllUsers();
            ResponseHelper.success(res, 'Users retrieved successfully', users);
        } catch (error: any) {
            Logger.error('Get all users error:', error);
            ResponseHelper.error(res, error.message || 'Failed to get users', error);
        }
    };

    // Get user by ID
    getUserById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = await this.userService.getUserById(id);

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
    updateUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const updatedUser = await this.userService.updateUser(id, updateData);

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
    deleteUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            const deleted = await this.userService.deleteUser(id);

            if (!deleted) {
                return ResponseHelper.notFound(res, 'User not found');
            }

            ResponseHelper.success(res, 'User deleted successfully');
        } catch (error: any) {
            Logger.error('Delete user error:', error);
            ResponseHelper.error(res, error.message || 'Failed to delete user', error);
        }
    };
}

