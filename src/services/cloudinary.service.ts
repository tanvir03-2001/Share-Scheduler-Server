import { v2 as cloudinary } from 'cloudinary';
import { Logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    format: string;
    resource_type: string;
    bytes: number;
    width?: number;
    height?: number;
    duration?: number;
}

export class CloudinaryService {
    /**
     * Upload file to Cloudinary
     */
    static async uploadFile(
        filePath: string,
        options: {
            folder?: string;
            resource_type?: 'auto' | 'image' | 'video' | 'raw';
            public_id?: string;
            transformation?: any;
        } = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            const uploadOptions = {
                folder: options.folder || 'facebook-auto-post',
                resource_type: options.resource_type || 'auto',
                public_id: options.public_id,
                transformation: options.transformation,
                use_filename: true,
                unique_filename: true,
            };

            const result = await cloudinary.uploader.upload(filePath, uploadOptions);

            // Console log the full response
            console.log('Cloudinary Upload Response:', JSON.stringify(result, null, 2));

            Logger.info('File uploaded to Cloudinary successfully', {
                public_id: result.public_id,
                url: result.secure_url,
                resource_type: result.resource_type
            });

            return {
                public_id: result.public_id,
                secure_url: result.secure_url,
                format: result.format,
                resource_type: result.resource_type,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
                duration: result.duration
            };
        } catch (error) {
            Logger.error('Error uploading file to Cloudinary:', error);
            throw new Error('Failed to upload file to Cloudinary');
        }
    }

    /**
     * Upload file from buffer
     */
    static async uploadFromBuffer(
        buffer: Buffer,
        options: {
            folder?: string;
            resource_type?: 'auto' | 'image' | 'video' | 'raw';
            public_id?: string;
            transformation?: any;
        } = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            const uploadOptions = {
                folder: options.folder || 'facebook-auto-post',
                resource_type: options.resource_type || 'auto',
                public_id: options.public_id,
                transformation: options.transformation,
                use_filename: true,
                unique_filename: true,
            };

            const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else if (result) {
                            // Console log the full response
                            console.log('Cloudinary Upload Response (from buffer):', JSON.stringify(result, null, 2));

                            resolve({
                                public_id: result.public_id,
                                secure_url: result.secure_url,
                                format: result.format,
                                resource_type: result.resource_type,
                                bytes: result.bytes,
                                width: result.width,
                                height: result.height,
                                duration: result.duration
                            });
                        } else {
                            reject(new Error('Upload failed'));
                        }
                    }
                ).end(buffer);
            });

            Logger.info('File uploaded to Cloudinary from buffer successfully', {
                public_id: result.public_id,
                url: result.secure_url,
                resource_type: result.resource_type
            });

            return result;
        } catch (error) {
            Logger.error('Error uploading file from buffer to Cloudinary:', error);
            throw new Error('Failed to upload file to Cloudinary');
        }
    }

    /**
     * Delete file from Cloudinary
     */
    static async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType
            });

            if (result.result === 'ok') {
                Logger.info('File deleted from Cloudinary successfully', { public_id: publicId });
                return true;
            } else {
                Logger.warn('File deletion from Cloudinary failed', { public_id: publicId, result: result.result });
                return false;
            }
        } catch (error) {
            Logger.error('Error deleting file from Cloudinary:', error);
            return false;
        }
    }

    /**
     * Get file info from Cloudinary
     */
    static async getFileInfo(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<any> {
        try {
            const result = await cloudinary.api.resource(publicId, {
                resource_type: resourceType
            });

            return result;
        } catch (error) {
            Logger.error('Error getting file info from Cloudinary:', error);
            throw new Error('Failed to get file info from Cloudinary');
        }
    }

    /**
     * Generate thumbnail URL from Cloudinary video URL
     */
    static getCloudinaryThumbnail(videoUrl: string, second: number = 0): string {
        try {
            // Replace .mp4 with .jpg
            let base = videoUrl.replace('.mp4', '.jpg');

            // If specific time frame is requested
            if (second > 0) {
                base = base.replace('/upload/', `/upload/so_${second}/`);
            }

            Logger.info('Generated thumbnail URL', { videoUrl, second, thumbnailUrl: base });
            return base;
        } catch (error) {
            Logger.error('Error generating thumbnail URL:', error);
            throw new Error('Failed to generate thumbnail URL');
        }
    }

    /**
     * Generate optimized URL for Facebook posting
     */
    static generateOptimizedUrl(
        publicId: string,
        resourceType: 'image' | 'video',
        options: {
            width?: number;
            height?: number;
            quality?: string;
            format?: string;
        } = {}
    ): string {
        try {
            const transformation: any = {};

            if (resourceType === 'image') {
                transformation.quality = options.quality || 'auto';
                transformation.format = options.format || 'auto';

                if (options.width) transformation.width = options.width;
                if (options.height) transformation.height = options.height;
            } else if (resourceType === 'video') {
                transformation.quality = options.quality || 'auto';
                transformation.format = options.format || 'mp4';

                if (options.width) transformation.width = options.width;
                if (options.height) transformation.height = options.height;
            }

            const url = cloudinary.url(publicId, {
                resource_type: resourceType,
                transformation: transformation,
                secure: true
            });

            return url;
        } catch (error) {
            Logger.error('Error generating optimized URL:', error);
            throw new Error('Failed to generate optimized URL');
        }
    }
}
