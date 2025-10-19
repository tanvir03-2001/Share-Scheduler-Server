import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { CloudinaryService } from './cloudinary.service';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(uploadsDir, 'content');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm']
    };

    const postType = req.body.postType;

    if (postType === 'text') {
        // Text posts don't need media files
        cb(null, false);
        return;
    }

    if (postType === 'image') {
        if (allowedMimes.image.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for image posts'));
        }
        return;
    }

    if (postType === 'reel') {
        if (allowedMimes.video.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed for reel posts'));
        }
        return;
    }

    if (postType === 'story') {
        if (allowedMimes.image.includes(file.mimetype) || allowedMimes.video.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image or video files are allowed for story posts'));
        }
        return;
    }

    cb(new Error('Invalid post type'));
};

// Configure multer
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10 // Maximum 10 files
    }
});

// File upload service
export class FileUploadService {
    /**
     * Process uploaded files and upload to Cloudinary
     */
    static async processUploadedFiles(files: Express.Multer.File[]): Promise<Array<{
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        url: string;
        type: 'image' | 'video';
        cloudinaryPublicId?: string;
        thumbnailUrl?: string;
    }>> {
        const processedFiles = [];

        Logger.info('Starting file processing', { filesCount: files.length });

        for (const file of files) {
            try {
                Logger.info('Processing file', {
                    filename: file.filename,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: file.path
                });

                // Upload to Cloudinary
                const cloudinaryResult = await CloudinaryService.uploadFile(file.path, {
                    folder: 'facebook-auto-post/content',
                    resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image'
                });

                Logger.info('Cloudinary upload successful', {
                    publicId: cloudinaryResult.public_id,
                    secureUrl: cloudinaryResult.secure_url
                });

                // Clean up local file after successful upload
                await this.deleteLocalFile(file.path);

                // Generate thumbnail URL for videos
                let thumbnailUrl: string | undefined;
                if (file.mimetype.startsWith('video/')) {
                    thumbnailUrl = CloudinaryService.getCloudinaryThumbnail(cloudinaryResult.secure_url, 5);
                    Logger.info('Generated thumbnail URL for video', {
                        videoUrl: cloudinaryResult.secure_url,
                        thumbnailUrl
                    });
                }

                processedFiles.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: cloudinaryResult.secure_url,
                    type: (file.mimetype.startsWith('video/') ? 'video' : 'image') as 'image' | 'video',
                    cloudinaryPublicId: cloudinaryResult.public_id,
                    thumbnailUrl
                });

                Logger.info('File processed and uploaded to Cloudinary', {
                    originalName: file.originalname,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    publicId: cloudinaryResult.public_id
                });
            } catch (error) {
                Logger.error('Error processing file:', error);
                // Fallback to local storage if Cloudinary fails
                processedFiles.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: `/uploads/content/${file.filename}`,
                    type: (file.mimetype.startsWith('video/') ? 'video' : 'image') as 'image' | 'video',
                    thumbnailUrl: undefined
                });
            }
        }

        Logger.info('File processing completed', { processedCount: processedFiles.length });
        return processedFiles;
    }

    /**
     * Delete local file
     */
    static async deleteLocalFile(filePath: string): Promise<boolean> {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                Logger.info('Local file deleted successfully', { filePath });
                return true;
            }
            return false;
        } catch (error) {
            Logger.error('Error deleting local file:', error);
            return false;
        }
    }

    /**
     * Delete uploaded file (handles both local and Cloudinary files)
     */
    static async deleteFile(filename: string, cloudinaryPublicId?: string): Promise<boolean> {
        try {
            // If it's a Cloudinary file, delete from Cloudinary
            if (cloudinaryPublicId) {
                const resourceType = filename.includes('video') ? 'video' : 'image';
                const cloudinaryResult = await CloudinaryService.deleteFile(cloudinaryPublicId, resourceType);

                if (cloudinaryResult) {
                    Logger.info('File deleted from Cloudinary successfully', {
                        filename,
                        cloudinaryPublicId
                    });
                    return true;
                }
            }

            // Fallback to local file deletion
            const filePath = path.join(uploadsDir, 'content', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                Logger.info('Local file deleted successfully', { filename });
                return true;
            }

            return false;
        } catch (error) {
            Logger.error('Error deleting file:', error);
            return false;
        }
    }

    /**
     * Get file info
     */
    static getFileInfo(filename: string): {
        exists: boolean;
        path: string;
        size?: number;
    } {
        const filePath = path.join(uploadsDir, 'content', filename);
        const exists = fs.existsSync(filePath);

        if (exists) {
            const stats = fs.statSync(filePath);
            return {
                exists: true,
                path: filePath,
                size: stats.size
            };
        }

        return {
            exists: false,
            path: filePath
        };
    }

    /**
     * Clean up old files (for maintenance)
     */
    static async cleanupOldFiles(daysOld: number = 30): Promise<number> {
        try {
            const contentDir = path.join(uploadsDir, 'content');
            const files = fs.readdirSync(contentDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(contentDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }

            Logger.info('File cleanup completed', { deletedCount, daysOld });
            return deletedCount;
        } catch (error) {
            Logger.error('Error during file cleanup:', error);
            return 0;
        }
    }
}

// Serve static files
export const serveStaticFiles = (app: any) => {
    app.use('/uploads', (req: any, res: any, next: any) => {
        // Add CORS headers for uploaded files
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });

    app.use('/uploads', require('express').static(uploadsDir));
};
