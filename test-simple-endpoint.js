const fetch = require('node-fetch');

async function testSimpleEndpoint() {
    try {
        console.log('Testing simple endpoint...');
        
        // Test a simple endpoint first
        const response = await fetch('http://localhost:5000/api/content?page=1&limit=50', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGYxNDg5OTczMmRiZDljMjc4ZWY3ZjEiLCJlbWFpbCI6ImFkbWluQHNoYXJlc2NoZWR1bGVyLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjA5MDY0OTksImV4cCI6MTc2MDk5Mjg5OSwiYXVkIjoiZmFjZWJvb2stYXV0by1wb3N0LXVzZXJzIiwiaXNzIjoiZmFjZWJvb2stYXV0by1wb3N0LWFwcCJ9.8KWFYbqTk4Bm9ZRMQpvFfJKOyeKQexU0vXU9F6fOgiY'
            }
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', data);
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testSimpleEndpoint();
