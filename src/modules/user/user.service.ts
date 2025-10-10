import { Logger } from '../../utils/logger';
import { IUser, User } from './User.model';

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class UserService {
    async getAllUsers(): Promise<UserResponse[]> {
        Logger.info('Retrieving all users');
        const users = await User.find({ isActive: true }).sort({ createdAt: -1 });
        return users.map(user => this.mapUserToResponse(user));
    }

    async getUserById(id: string): Promise<UserResponse | null> {
        Logger.info('Retrieving user by ID', { userId: id });
        const user = await User.findOne({ _id: id, isActive: true });
        return user ? this.mapUserToResponse(user) : null;
    }

    async updateUser(id: string, updateData: Partial<IUser>): Promise<UserResponse | null> {
        const user = await User.findOne({ _id: id, isActive: true });

        if (!user) {
            return null;
        }

        // Update user data
        Object.assign(user, updateData);
        await user.save();

        Logger.info('User updated successfully', { userId: id });
        return this.mapUserToResponse(user);
    }

    async deleteUser(id: string): Promise<boolean> {
        const user = await User.findOne({ _id: id, isActive: true });

        if (!user) {
            return false;
        }

        // Soft delete - mark as inactive
        user.isActive = false;
        await user.save();

        Logger.info('User deleted successfully', { userId: id });
        return true;
    }

    private mapUserToResponse(user: IUser): UserResponse {
        return {
            id: (user._id as any).toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}

