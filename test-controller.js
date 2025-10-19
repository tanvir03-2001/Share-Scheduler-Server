const mongoose = require('mongoose');

async function testController() {
    try {
        console.log('Testing ContentController...');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post');
        console.log('✅ Database connected');
        
        // Import the controller
        const { ContentController } = require('./dist/modules/content/content.controller');
        
        // Create a mock request and response
        const mockReq = {
            jwtUser: { id: '68e7ffaec6dcd3289a1cec31' },
            query: { page: '1', limit: '50' }
        };
        
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log('Response:', { status: code, data });
                    return mockRes;
                }
            })
        };
        
        console.log('Calling ContentController.getUserContent...');
        await ContentController.getUserContent(mockReq, mockRes);
        
        await mongoose.disconnect();
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testController();
