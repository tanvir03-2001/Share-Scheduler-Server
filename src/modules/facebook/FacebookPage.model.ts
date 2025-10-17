import mongoose, { Document, Schema } from 'mongoose';

export interface IFacebookPage extends Document {
    userId: mongoose.Types.ObjectId; // Reference to main User
    facebookUserId: mongoose.Types.ObjectId; // Reference to FacebookUser
    pageId: string;
    pageName: string;
    category: string;
    accessToken: string;
    picture?: string;
    followersCount?: number;
    tasks?: string[];
    isActive: boolean;
    isDefaultActive: boolean; // Track which page is currently active/selected
    connectedAt: Date;
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FacebookPageSchema = new Schema<IFacebookPage>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    facebookUserId: {
        type: Schema.Types.ObjectId,
        ref: 'FacebookUser',
        required: true
    },
    pageId: {
        type: String,
        required: true
    },
    pageName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    accessToken: {
        type: String,
        required: true
    },
    picture: {
        type: String
    },
    followersCount: {
        type: Number
    },
    tasks: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isDefaultActive: {
        type: Boolean,
        default: false
    },
    connectedAt: {
        type: Date,
        default: Date.now
    },
    lastUsedAt: {
        type: Date
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
        transform: function (doc, ret) {
            // Remove sensitive data from JSON output
            delete (ret as any).accessToken;
            return ret;
        }
    }
});

// Indexes for better performance
FacebookPageSchema.index({ userId: 1 });
FacebookPageSchema.index({ facebookUserId: 1 });
FacebookPageSchema.index({ pageId: 1 });
FacebookPageSchema.index({ isActive: 1 });
FacebookPageSchema.index({ isDefaultActive: 1 });

// Compound index to ensure unique page per user
FacebookPageSchema.index({ userId: 1, pageId: 1 }, { unique: true });

// Pre-save middleware to update timestamps
FacebookPageSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const FacebookPage = mongoose.model<IFacebookPage>('FacebookPage', FacebookPageSchema);
