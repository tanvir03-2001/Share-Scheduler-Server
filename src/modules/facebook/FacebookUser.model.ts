import mongoose, { Document, Schema } from 'mongoose';

export interface IFacebookUser extends Document {
    userId: mongoose.Types.ObjectId; // Reference to main User
    facebookId: string;
    facebookName: string;
    facebookEmail?: string;
    accessToken: string;
    tokenExpiresAt?: Date;
    profilePicture?: string;
    isActive: boolean;
    connectedAt: Date;
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FacebookUserSchema = new Schema<IFacebookUser>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One Facebook account per user
    },
    facebookId: {
        type: String,
        required: true,
        unique: true
    },
    facebookName: {
        type: String,
        required: true,
        trim: true
    },
    facebookEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    accessToken: {
        type: String,
        required: true
    },
    tokenExpiresAt: {
        type: Date
    },
    profilePicture: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
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
// userId and facebookId indexes are already created by unique: true
FacebookUserSchema.index({ isActive: 1 });

// Pre-save middleware to update timestamps
FacebookUserSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const FacebookUser = mongoose.model<IFacebookUser>('FacebookUser', FacebookUserSchema);
