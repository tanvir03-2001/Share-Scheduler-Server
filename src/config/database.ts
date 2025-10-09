import mongoose from 'mongoose';
import { Logger } from '../utils/logger';

class Database {
    private static instance: Database;
    private isConnected = false;

    private constructor() { }

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async connect(): Promise<void> {
        if (this.isConnected) {
            Logger.info('Database already connected');
            return;
        }

        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post';

            await mongoose.connect(mongoUri, {
                // Remove deprecated options for newer versions
            });

            this.isConnected = true;
            Logger.info('Connected to MongoDB successfully', { uri: mongoUri });

            // Handle connection events
            mongoose.connection.on('error', (error) => {
                Logger.error('MongoDB connection error:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                Logger.warn('MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                Logger.info('MongoDB reconnected');
                this.isConnected = true;
            });

        } catch (error) {
            Logger.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.disconnect();
            this.isConnected = false;
            Logger.info('Disconnected from MongoDB');
        } catch (error) {
            Logger.error('Error disconnecting from MongoDB:', error);
            throw error;
        }
    }

    public getConnectionStatus(): boolean {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
}

export const database = Database.getInstance();
