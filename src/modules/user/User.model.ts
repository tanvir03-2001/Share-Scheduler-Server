import mongoose, { Document, Schema } from 'mongoose';

export interface FacebookPage {
    id: string;
    name: string;
    category: string;
    accessToken: string;
    picture?: string;
    followersCount?: number;
    tasks?: string[];
    connectedAt: Date;
}

export interface IUser extends Document {
    email: string;
    name: string;
    password: string;
    role: 'user' | 'admin';
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    isActive: boolean;
    lastLogin?: Date;
    privacyPolicyAccepted: boolean;
    privacyPolicyAcceptedAt?: Date;
    // Facebook integration fields
    facebookAccessToken?: string;
    facebookTokenExpiresAt?: Date;
    facebookPages?: FacebookPage[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        sparse: true // Allows multiple null values
    },
    emailVerificationExpires: {
        type: Date
    },
    passwordResetToken: {
        type: String,
        sparse: true
    },
    passwordResetExpires: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    privacyPolicyAccepted: {
        type: Boolean,
        default: false,
        required: true
    },
    privacyPolicyAcceptedAt: {
        type: Date
    },
    // Facebook integration fields
    facebookAccessToken: {
        type: String,
        sparse: true
    },
    facebookTokenExpiresAt: {
        type: Date
    },
    facebookPages: [{
        id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        category: {
            type: String,
            required: true
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
        connectedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
        transform: function (doc, ret) {
            // Remove password from JSON output
            delete (ret as any).password;
            delete (ret as any).emailVerificationToken;
            delete (ret as any).passwordResetToken;
            return ret;
        }
    }
});

// Indexes for better performance (removed duplicate indexes)
// email index is already created by unique: true
UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
UserSchema.index({ isActive: 1 });

// Pre-save middleware to update timestamps
UserSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const User = mongoose.model<IUser>('User', UserSchema);
