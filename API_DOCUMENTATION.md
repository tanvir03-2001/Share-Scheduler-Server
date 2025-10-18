# Content Upload & Scheduling API Documentation

## Overview
This API provides endpoints for creating, managing, and scheduling social media content with automatic posting to Facebook.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Content Management Endpoints

### 1. Create Content
**POST** `/content`

Creates new content with optional file uploads and scheduling.

**Request Body (multipart/form-data):**
```json
{
  "postType": "text|image|reel|story",
  "content": "Your post content here",
  "hashtags": "#hashtag1 #hashtag2",
  "platforms": ["facebook", "instagram"],
  "publishMode": "now|schedule",
  "scheduleDate": "2024-12-15", // Required if publishMode is 'schedule'
  "scheduleTimes": ["09:00", "12:00", "15:00"] // Required if publishMode is 'schedule'
}
```

**File Upload:**
- Field name: `mediaFiles`
- Max files: 10
- Max file size: 50MB
- Supported formats:
  - Images: JPEG, PNG, GIF, WebP
  - Videos: MP4, AVI, MOV, WMV, FLV, WebM

**Response:**
```json
{
  "success": true,
  "message": "Content created successfully",
  "data": {
    "contentId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "scheduledPosts": [
      {
        "postNumber": 1,
        "scheduledDate": "2024-12-15",
        "scheduledTime": "09:00"
      }
    ]
  }
}
```

### 2. Get User Content
**GET** `/content`

Retrieves user's content with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (draft, scheduled, published, failed)
- `postType` (optional): Filter by post type (text, image, reel, story)

**Response:**
```json
{
  "success": true,
  "message": "Content retrieved successfully",
  "data": {
    "contents": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "postType": "image",
        "content": "Your post content",
        "hashtags": "#hashtag1 #hashtag2",
        "mediaFiles": [
          {
            "filename": "unique-filename.jpg",
            "originalName": "image.jpg",
            "mimetype": "image/jpeg",
            "size": 1024000,
            "url": "/uploads/content/unique-filename.jpg",
            "type": "image"
          }
        ],
        "platforms": ["facebook"],
        "publishMode": "schedule",
        "status": "scheduled",
        "createdAt": "2024-12-15T10:00:00.000Z",
        "scheduledPosts": [
          {
            "postNumber": 1,
            "scheduledDate": "2024-12-15",
            "scheduledTime": "09:00",
            "status": "pending"
          }
        ]
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

### 3. Get Content by ID
**GET** `/content/:id`

Retrieves a specific content item.

### 4. Update Content
**PUT** `/content/:id`

Updates existing content.

**Request Body:**
```json
{
  "content": "Updated content",
  "hashtags": "#updated #hashtags",
  "platforms": ["facebook", "instagram"],
  "publishMode": "schedule",
  "scheduleDate": "2024-12-16",
  "scheduleTimes": ["10:00", "14:00"]
}
```

### 5. Delete Content
**DELETE** `/content/:id`

Deletes a content item.

### 6. Get Content Statistics
**GET** `/content/stats`

Returns content statistics for the user.

**Response:**
```json
{
  "success": true,
  "message": "Content statistics retrieved successfully",
  "data": {
    "total": 50,
    "published": 30,
    "scheduled": 15,
    "drafts": 3,
    "failed": 2
  }
}
```

## Scheduler Endpoints

### 1. Get Scheduler Status
**GET** `/content/scheduler/status`

Returns the current status of the scheduler service.

**Response:**
```json
{
  "success": true,
  "message": "Scheduler status retrieved successfully",
  "data": {
    "isRunning": true,
    "nextRun": "2024-12-15T10:01:00.000Z"
  }
}
```

### 2. Trigger Processing
**POST** `/content/scheduler/trigger`

Manually triggers processing of scheduled posts.

### 3. Get Upcoming Posts
**GET** `/content/scheduler/upcoming`

Retrieves posts that are scheduled for future publishing.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

### 4. Get Scheduled History
**GET** `/content/scheduler/history`

Retrieves history of scheduled posts.

### 5. Schedule Immediate
**POST** `/content/:id/schedule-immediate`

Schedules a content item for immediate processing.

## Scheduling Logic

### How Scheduling Works:
1. **Single Time**: If one time is provided, content is scheduled for that time on the start date
2. **Multiple Times**: If multiple times are provided, all posts are scheduled on the same start date:
   - Time 1 → Start Date at Time 1
   - Time 2 → Start Date at Time 2
   - Time 3 → Start Date at Time 3
   - And so on...

### Example:
- **Start Date**: 2024-12-15
- **Times**: ["09:00", "12:00", "15:00", "18:00", "21:00"]

**Result:**
- Post 1: 2024-12-15 at 09:00
- Post 2: 2024-12-15 at 12:00
- Post 3: 2024-12-15 at 15:00
- Post 4: 2024-12-15 at 18:00
- Post 5: 2024-12-15 at 21:00

## File Upload

### Supported File Types by Post Type:
- **Text**: No files required
- **Image**: Image files only (JPEG, PNG, GIF, WebP)
- **Reel**: Video files only (MP4, AVI, MOV, WMV, FLV, WebM)
- **Story**: Image or video files

### File Access:
Uploaded files are accessible via:
```
http://localhost:5000/uploads/content/{filename}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

The API includes rate limiting to prevent abuse. Default limits:
- 100 requests per 15 minutes per user
- 10 file uploads per minute per user

## Webhooks (Future Enhancement)

Planned webhook endpoints for:
- Post publishing status updates
- Facebook API rate limit notifications
- Content engagement metrics
