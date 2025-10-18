import mongoose, { Document, Schema } from 'mongoose';

export interface IContent extends Document {
    userId: mongoose.Types.ObjectId;
    postType: 'text' | 'image' | 'reel' | 'story';
    content: string;
    hashtags?: string;
    mediaFile?: IMediaFile; // Changed from mediaFiles array to single mediaFile object
    platforms: string[];
    publishMode: 'now' | 'schedule';
    scheduledPost?: IScheduledPost; // Changed from scheduledPosts array to single scheduledPost object
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMediaFile {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
    type: 'image' | 'video';
    cloudinaryPublicId?: string;
}

export interface IScheduledPost {
    postNumber: number;
    scheduledDate: Date;
    scheduledTime: string;
    status: 'pending' | 'published' | 'failed';
    publishedAt?: Date;
    facebookPostId?: string;
    error?: string;
}

const MediaFileSchema = new Schema<IMediaFile>({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    cloudinaryPublicId: {
        type: String
    }
}, { _id: false });

const ScheduledPostSchema = new Schema<IScheduledPost>({
    postNumber: {
        type: Number,
        required: true
    },
    scheduledDate: {
        type: Date,
        required: true
    },
    scheduledTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'published', 'failed'],
        default: 'pending'
    },
    publishedAt: {
        type: Date
    },
    facebookPostId: {
        type: String
    },
    error: {
        type: String
    }
}, { _id: false });

const ContentSchema = new Schema<IContent>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    postType: {
        type: String,
        enum: ['text', 'image', 'reel', 'story'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    hashtags: {
        type: String,
        trim: true
    },
    mediaFile: {
        type: MediaFileSchema
    },
    platforms: {
        type: [String],
        required: true,
        validate: {
            validator: function (platforms: string[]) {
                return platforms.length > 0;
            },
            message: 'At least one platform must be selected'
        }
    },
    publishMode: {
        type: String,
        enum: ['now', 'schedule'],
        required: true
    },
    scheduledPost: {
        type: ScheduledPostSchema
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'published', 'failed'],
        default: 'draft'
    },
    publishedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            if (ret._id !== undefined) delete ret._id;
            if (ret.__v !== undefined) delete ret.__v;
            return ret;
        }
    }
});

// Indexes for better performance
ContentSchema.index({ userId: 1, createdAt: -1 });
ContentSchema.index({ status: 1 });
ContentSchema.index({ 'scheduledPost.scheduledDate': 1, 'scheduledPost.status': 1 });
ContentSchema.index({ postType: 1 });

// Pre-save middleware
ContentSchema.pre('save', function (next) {
    this.updatedAt = new Date();

    // Update status based on publish mode and scheduled post
    if (this.publishMode === 'now') {
        this.status = 'published';
        this.publishedAt = new Date();
    } else if (this.publishMode === 'schedule' && this.scheduledPost) {
        this.status = 'scheduled';
    }

    next();
});

export const Content = mongoose.model<IContent>('Content', ContentSchema);
