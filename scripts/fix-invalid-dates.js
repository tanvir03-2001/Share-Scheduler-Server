const mongoose = require('mongoose');
require('dotenv').config();

// Import the FacebookUser model
const { FacebookUser } = require('../dist/modules/facebook/FacebookUser.model');

async function fixInvalidDates() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-service');
        console.log('Connected to MongoDB');

        // Find all FacebookUser records with invalid tokenExpiresAt dates
        const usersWithInvalidDates = await FacebookUser.find({
            $or: [
                { tokenExpiresAt: { $type: 'string' } }, // String dates
                { tokenExpiresAt: null },
                { tokenExpiresAt: { $exists: false } }
            ]
        });

        console.log(`Found ${usersWithInvalidDates.length} users with invalid tokenExpiresAt dates`);

        // Fix each record
        for (const user of usersWithInvalidDates) {
            // Set tokenExpiresAt to 60 days from now
            const newExpirationDate = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000));
            
            await FacebookUser.updateOne(
                { _id: user._id },
                { 
                    tokenExpiresAt: newExpirationDate,
                    updatedAt: new Date()
                }
            );
            
            console.log(`Fixed user ${user.facebookName} (${user.facebookId})`);
        }

        console.log('All invalid dates have been fixed');
        
    } catch (error) {
        console.error('Error fixing invalid dates:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the fix
fixInvalidDates();
