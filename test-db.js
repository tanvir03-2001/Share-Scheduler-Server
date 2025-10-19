const mongoose = require('mongoose');

async function testDatabase() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post');
        console.log('Connected to database');
        
        // Check if Content collection exists and has data
        const Content = mongoose.model('Content', new mongoose.Schema({}, { strict: false }));
        const count = await Content.countDocuments();
        console.log('Total content documents:', count);
        
        // Check if User collection exists and has data
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const userCount = await User.countDocuments();
        console.log('Total user documents:', userCount);
        
        // Find the admin user
        const adminUser = await User.findOne({ email: 'admin@sharescheduler.com' });
        if (adminUser) {
            console.log('Admin user found:', adminUser._id);
            
            // Check content for this user
            const userContent = await Content.find({ userId: adminUser._id });
            console.log('Content for admin user:', userContent.length);
        } else {
            console.log('Admin user not found');
        }
        
        await mongoose.disconnect();
        console.log('Disconnected from database');
        
    } catch (error) {
        console.error('Database test failed:', error);
    }
}

testDatabase();
