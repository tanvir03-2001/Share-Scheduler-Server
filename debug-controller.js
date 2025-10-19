const mongoose = require('mongoose');

async function debugController() {
    try {
        console.log('Debugging ContentController...');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post');
        console.log('✅ Database connected');
        
        // Import the controller and JWT service
        const { ContentController } = require('./dist/modules/content/content.controller');
        const { JWTService } = require('./dist/utils/jwt.service');
        
        // Test JWT token verification
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGYxNDg5OTczMmRiZDljMjc4ZWY3ZjEiLCJlbWFpbCI6ImFkbWluQHNoYXJlc2NoZWR1bGVyLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjA5MDY0OTksImV4cCI6MTc2MDk5Mjg5OSwiYXVkIjoiZmFjZWJvb2stYXV0by1wb3N0LXVzZXJzIiwiaXNzIjoiZmFjZWJvb2stYXV0by1wb3N0LWFwcCJ9.8KWFYbqTk4Bm9ZRMQpvFfJKOyeKQexU0vXU9F6fOgiY';
        
        try {
            const payload = JWTService.verifyAccessToken(token);
            console.log('✅ JWT token verified:', payload);
        } catch (error) {
            console.error('❌ JWT verification failed:', error);
        }
        
        // Create a mock request that simulates the HTTP request
        const mockReq = {
            jwtUser: { id: '68f14899732dbd9c278ef7f1' },
            query: { page: '1', limit: '50' },
            cookies: { access_token: token }
        };
        
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log('Response:', { status: code, data });
                    return mockRes;
                }
            })
        };
        
        console.log('Calling ContentController.getUserContent with mock request...');
        await ContentController.getUserContent(mockReq, mockRes);
        
        await mongoose.disconnect();
        console.log('✅ Debug completed');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        console.error('Error stack:', error.stack);
    }
}

debugController();
