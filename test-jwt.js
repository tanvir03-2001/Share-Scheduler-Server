const mongoose = require('mongoose');

async function testJWT() {
    try {
        console.log('Testing JWT...');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post');
        console.log('✅ Database connected');
        
        // Import JWT service
        const { JWTService } = require('./dist/utils/jwt.service');
        
        // Generate a fresh token
        const freshToken = JWTService.generateAccessToken({
            userId: '68f14899732dbd9c278ef7f1',
            email: 'admin@sharescheduler.com',
            role: 'admin'
        });
        
        console.log('Fresh token generated:', freshToken);
        
        // Verify the fresh token
        try {
            const payload = JWTService.verifyAccessToken(freshToken);
            console.log('✅ Fresh token verified:', payload);
        } catch (error) {
            console.error('❌ Fresh token verification failed:', error);
        }
        
        // Test the old token
        const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGYxNDg5OTczMmRiZDljMjc4ZWY3ZjEiLCJlbWFpbCI6ImFkbWluQHNoYXJlc2NoZWR1bGVyLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjA5MDY0OTksImV4cCI6MTc2MDk5Mjg5OSwiYXVkIjoiZmFjZWJvb2stYXV0by1wb3N0LXVzZXJzIiwiaXNzIjoiZmFjZWJvb2stYXV0by1wb3N0LWFwcCJ9.8KWFYbqTk4Bm9ZRMQpvFfJKOyeKQexU0vXU9F6fOgiY';
        
        try {
            const payload = JWTService.verifyAccessToken(oldToken);
            console.log('✅ Old token verified:', payload);
        } catch (error) {
            console.error('❌ Old token verification failed:', error);
        }
        
        await mongoose.disconnect();
        console.log('✅ JWT test completed');
        
    } catch (error) {
        console.error('❌ JWT test failed:', error);
    }
}

testJWT();
