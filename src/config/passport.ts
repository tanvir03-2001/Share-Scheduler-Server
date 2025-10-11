import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { AuthService } from '../modules/auth/auth.service';
import { User } from '../modules/user/User.model';

const authService = new AuthService();

// Configure Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || '',
    clientSecret: process.env.FACEBOOK_APP_SECRET || '',
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    scope: ['email', 'public_profile']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Facebook profile:', profile);

        // Check if user already exists with this Facebook ID
        let user = await User.findOne({ facebookId: profile.id });

        if (user) {
            // Update access token if user exists
            user.facebookAccessToken = accessToken;
            await user.save();
            return done(null, user);
        }

        // Check if user exists with the same email
        if (profile.emails && profile.emails.length > 0) {
            const existingUser = await User.findOne({ email: profile.emails[0].value });
            if (existingUser) {
                // Link Facebook account to existing user
                existingUser.facebookId = profile.id;
                existingUser.facebookAccessToken = accessToken;
                existingUser.isEmailVerified = true; // Facebook email is verified
                await existingUser.save();
                return done(null, existingUser);
            }
        }

        // Create new user
        const newUser = new User({
            facebookId: profile.id,
            facebookAccessToken: accessToken,
            email: profile.emails?.[0]?.value || '',
            name: `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
            isEmailVerified: true, // Facebook email is verified
            profilePicture: profile.photos?.[0]?.value || '',
            loginMethod: 'facebook'
        });

        await newUser.save();
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
