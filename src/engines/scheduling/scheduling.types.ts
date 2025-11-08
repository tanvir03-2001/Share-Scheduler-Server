/**
 * SCHEDULING ENGINE TYPES
 * 
 * This file contains all TypeScript interfaces and types
 * related to the scheduling engine functionality.
 */

export interface SchedulingEngineStatus {
    isRunning: boolean;
    nextRun?: Date;
    cronSchedule: string;
}

export interface SchedulingEngineHealth {
    engine: string;
    status: 'healthy' | 'unhealthy';
    isRunning: boolean;
    lastProcessed?: Date;
    cronSchedule: string;
    uptime: number;
}

export interface ScheduledPostInfo {
    postNumber: number;
    scheduledDate: string; // YYYY-MM-DD format
    scheduledTime: string; // HH:MM format
    status: 'pending' | 'published' | 'failed';
    publishedAt?: string;
    facebookPostId?: string;
    error?: string;
}

export interface UpcomingScheduledPost {
    id: string;
    postType: string;
    content: string;
    platforms: string[];
    scheduledPost: ScheduledPostInfo;
}

export interface ScheduledPostHistory {
    id: string;
    postType: string;
    content: string;
    platforms: string[];
    publishedAt?: string;
    scheduledPost: ScheduledPostInfo;
}

export interface SchedulingEngineResponse {
    success: boolean;
    message: string;
    data?: any;
    engine?: string;
}

export interface SchedulingEngineConfig {
    cronSchedule: string;
    maxRetries: number;
    retryDelay: number;
    batchSize: number;
    enableLogging: boolean;
}

export interface ProcessingResult {
    contentId: string;
    postNumber: number;
    success: boolean;
    facebookPostId?: string;
    error?: string;
    processedAt: Date;
}

export interface SchedulingEngineMetrics {
    totalProcessed: number;
    successfulPosts: number;
    failedPosts: number;
    lastProcessedAt?: Date;
    averageProcessingTime: number;
    uptime: number;
}
