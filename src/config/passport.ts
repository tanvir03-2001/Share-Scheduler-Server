import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { AuthService } from '../modules/auth/auth.service';
import { FacebookUser } from '../modules/facebook/FacebookUser.model';
import { User } from '../modules/user/User.model';
import { Logger } from '../utils/logger';

const authService = new AuthService();

// Configure Facebook Business OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || '',
    clientSecret: process.env.FACEBOOK_APP_SECRET || '',
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    scope: process.env.FACEBOOK_BUSINESS_SCOPES?.split(',') || [
        'public_profile',
        'email'
    ]
}, async (accessToken, refreshToken, profile, done) => {
    try {
        Logger.info('Facebook authentication attempt', { facebookId: profile.id });

        // Check if Facebook user already exists
        let facebookUser = await FacebookUser.findOne({ facebookId: profile.id });

        if (facebookUser) {
            // Update access token if Facebook user exists
            facebookUser.accessToken = accessToken;
            facebookUser.lastUsedAt = new Date();
            await facebookUser.save();

            // Get the main user
            const user = await User.findById(facebookUser.userId);
            return done(null, user);
        }

        // Check if user exists with the same email
        if (profile.emails && profile.emails.length > 0) {
            const existingUser = await User.findOne({ email: profile.emails[0].value });
            if (existingUser) {
                // Create Facebook user record for existing user
                const newFacebookUser = new FacebookUser({
                    userId: existingUser._id,
                    facebookId: profile.id,
                    facebookName: `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
                    facebookEmail: profile.emails[0].value,
                    accessToken: accessToken,
                    profilePicture: profile.photos?.[0]?.value || '',
                    isActive: true
                });
                await newFacebookUser.save();

                // Update main user
                existingUser.isEmailVerified = true; // Facebook email is verified
                existingUser.profilePicture = profile.photos?.[0]?.value || '';
                existingUser.loginMethod = 'facebook';
                await existingUser.save();

                return done(null, existingUser);
            }
        }

        // Create new user
        const newUser = new User({
            email: profile.emails?.[0]?.value || '',
            name: `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
            isEmailVerified: true, // Facebook email is verified
            profilePicture: profile.photos?.[0]?.value || '',
            loginMethod: 'facebook'
        });

        await newUser.save();

        // Create Facebook user record
        const newFacebookUser = new FacebookUser({
            userId: newUser._id,
            facebookId: profile.id,
            facebookName: newUser.name,
            facebookEmail: newUser.email,
            accessToken: accessToken,
            profilePicture: newUser.profilePicture,
            isActive: true
        });
        await newFacebookUser.save();

        return done(null, newUser);

    } catch (error) {
        console.error('Facebook authentication error:', error);
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
