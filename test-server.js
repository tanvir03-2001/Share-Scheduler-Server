const express = require('express');
const mongoose = require('mongoose');

async function testServer() {
    try {
        console.log('Testing server components...');
        
        // Test database connection
        console.log('1. Testing database connection...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-auto-post');
        console.log('✅ Database connected');
        
        // Test Content model
        console.log('2. Testing Content model...');
        const { Content } = require('./dist/modules/content/Content.model');
        const contentCount = await Content.countDocuments();
        console.log('✅ Content model works, count:', contentCount);
        
        // Test ContentService
        console.log('3. Testing ContentService...');
        const { ContentService } = require('./dist/modules/content/content.service');
        const userId = '68e7ffaec6dcd3289a1cec31';
        const result = await ContentService.getUserContent(userId, 1, 50);
        console.log('✅ ContentService works, result:', result);
        
        // Test scheduler service
        console.log('4. Testing SchedulerService...');
        const { SchedulerService } = require('./dist/services/scheduler.service');
        console.log('✅ SchedulerService imported');
        
        await mongoose.disconnect();
        console.log('✅ All tests passed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testServer();
