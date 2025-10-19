const fetch = require('node-fetch');

async function testAuth() {
    try {
        console.log('Testing authentication flow...');
        
        // Step 1: Login
        console.log('1. Logging in...');
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@sharescheduler.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);
        
        // Get cookies from response
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('Cookies received:', cookies);
        
        if (loginData.success) {
            // Step 2: Test content endpoint with cookies
            console.log('2. Testing content endpoint...');
            const contentResponse = await fetch('http://localhost:5000/api/content?page=1&limit=50', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies || ''
                }
            });
            
            const contentData = await contentResponse.json();
            console.log('Content response:', contentData);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAuth();
