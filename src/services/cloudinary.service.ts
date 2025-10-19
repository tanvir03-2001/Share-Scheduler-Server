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
    thumbnailUrl?: string;
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

            Logger.info('File uploaded to cloud');

            // Generate thumbnail URL
            const thumbnailUrl = this.generateThumbnailUrl(result.secure_url);
            return {
                public_id: result.public_id,
                secure_url: result.secure_url,
                format: result.format,
                resource_type: result.resource_type,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
                duration: result.duration,
                thumbnailUrl
            };
        } catch (error) {
            Logger.error('Cloud upload failed');
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
                            // Generate thumbnail URL
                            const thumbnailUrl = this.generateThumbnailUrl(result.secure_url);

                            resolve({
                                public_id: result.public_id,
                                secure_url: result.secure_url,
                                format: result.format,
                                resource_type: result.resource_type,
                                bytes: result.bytes,
                                width: result.width,
                                height: result.height,
                                duration: result.duration,
                                thumbnailUrl
                            });
                        } else {
                            reject(new Error('Upload failed'));
                        }
                    }
                ).end(buffer);
            });

            Logger.info('Buffer uploaded to cloud');

            return result;
        } catch (error) {
            Logger.error('Buffer upload failed');
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
                Logger.info('File deleted from cloud');
                return true;
            } else {
                Logger.warn('Cloud deletion failed');
                return false;
            }
        } catch (error) {
            Logger.error('Cloud deletion error');
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
            Logger.error('Failed to get file info');
            throw new Error('Failed to get file info from Cloudinary');
        }
    }

    /**
     * Generate thumbnail URL from Cloudinary URL
     */
    static generateThumbnailUrl(input: string, opts: any = {}): string {
        try {
            const defaultOpts = { width: 200, height: 200, crop: 'fill', gravity: 'auto' };
            const { width, height, crop, gravity, start_offset } = { ...defaultOpts, ...opts };

            // Extract public_id from URL
            const extractPublicId = (input: string) => {
                if (!/^https?:\/\//i.test(input) && !input.includes('/')) return input;
                try {
                    const url = new URL(input);
                    const parts = url.pathname.split('/').filter(Boolean);
                    const uploadIdx = parts.findIndex(p => p === 'upload');
                    let afterUpload = parts.slice(uploadIdx + 1);
                    if (afterUpload.length && /^v\d+$/.test(afterUpload[0])) afterUpload.shift();
                    const joined = afterUpload.join('/');
                    return joined.replace(/\.[a-z0-9]+(\?.*)?$/i, '');
                } catch (e) {
                    return input;
                }
            };

            const publicId = extractPublicId(input);

            // Auto-detect resource type
            let resourceType = 'image';
            const lower = input.toLowerCase();
            if (/\.(mp4|mov|webm|mkv|avi|flv|wmv)$/.test(lower)) {
                resourceType = 'video';
            }

            if (resourceType === 'video') {
                const transformation: any[] = [];
                if (start_offset !== undefined && start_offset !== null) transformation.push({ start_offset });
                transformation.push({ width, height, crop, gravity });

                const thumbnailUrl = cloudinary.url(publicId, {
                    resource_type: 'video',
                    format: 'jpg',
                    transformation,
                });

                Logger.info('Video thumbnail generated');
                return thumbnailUrl;
            }

            // For images
            const thumbnailUrl = cloudinary.url(publicId, {
                width,
                height,
                crop,
                gravity,
                format: 'jpg',
            });

            Logger.info('Image thumbnail generated');
            return thumbnailUrl;
        } catch (error) {
            Logger.error('Thumbnail generation failed');
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
            Logger.error('URL optimization failed');
            throw new Error('Failed to generate optimized URL');
        }
    }
}
