const mongoose = require('mongoose');

async function testContentService() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post');
        console.log('Connected to database');
        
        // Import the Content model and service
        const { Content } = require('./dist/modules/content/Content.model');
        const { ContentService } = require('./dist/modules/content/content.service');
        
        console.log('Testing ContentService.getUserContent...');
        
        const userId = '68e7ffaec6dcd3289a1cec31'; // Admin user ID from previous test
        
        try {
            const result = await ContentService.getUserContent(userId, 1, 50);
            console.log('ContentService result:', result);
        } catch (error) {
            console.error('ContentService error:', error);
        }
        
        await mongoose.disconnect();
        console.log('Disconnected from database');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testContentService();
