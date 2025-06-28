# Mythoria Web App - API Reference

## Overview

The Mythoria Web App provides a comprehensive REST API for story management, user operations, and AI-powered content generation. All API endpoints follow RESTful conventions and return JSON responses.

## Authentication

### Authentication Methods
- **User Authentication**: JWT tokens via Clerk authentication
- **API Keys**: Service-to-service authentication for internal services
- **Session Cookies**: Browser-based authentication for web interface

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-API-Version: v1
```

## Base URL
```
Production: https://app.mythoria.com/api
Staging: https://staging.mythoria.com/api
Development: http://localhost:3000/api
```

## API Endpoints

### User Management

#### Get User Profile
```http
GET /api/user/profile
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "plan": "premium",
  "credits": 100,
  "preferences": {
    "language": "en",
    "theme": "light",
    "notifications": true
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-06-27T00:00:00Z"
}
```

#### Update User Profile
```http
PUT /api/user/profile
```

**Request Body:**
```json
{
  "name": "John Doe",
  "preferences": {
    "language": "en",
    "theme": "dark",
    "notifications": false
  }
}
```

#### Get User Preferences
```http
GET /api/user/preferences
```

#### Update User Preferences
```http
PUT /api/user/preferences
```

### Story Management

#### List Stories
```http
GET /api/stories?page=1&limit=10&status=all&sort=created_at
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (all, draft, published, archived)
- `sort` (optional): Sort field (created_at, updated_at, title)
- `order` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "stories": [
    {
      "id": "story_123",
      "title": "The Magic Adventure",
      "status": "draft",
      "outline": "A young hero discovers magical powers...",
      "characters": ["hero", "mentor", "villain"],
      "setting": "fantasy_castle",
      "word_count": 2500,
      "created_at": "2025-06-01T00:00:00Z",
      "updated_at": "2025-06-27T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### Create Story
```http
POST /api/stories
```

**Request Body:**
```json
{
  "title": "My New Story",
  "outline": "A brief description of the story",
  "characters": ["protagonist", "sidekick"],
  "setting": "modern_city",
  "genre": "adventure",
  "target_audience": "children"
}
```

#### Get Story Details
```http
GET /api/stories/{story_id}
```

**Response:**
```json
{
  "id": "story_123",
  "title": "The Magic Adventure",
  "status": "draft",
  "outline": "A young hero discovers magical powers...",
  "characters": [
    {
      "name": "Alex",
      "role": "protagonist",
      "description": "A brave young person with hidden powers"
    }
  ],
  "chapters": [
    {
      "id": "chapter_1",
      "title": "The Beginning",
      "content": "Once upon a time...",
      "word_count": 500,
      "order": 1
    }
  ],
  "setting": "fantasy_castle",
  "genre": "adventure",
  "word_count": 2500,
  "created_at": "2025-06-01T00:00:00Z",
  "updated_at": "2025-06-27T00:00:00Z"
}
```

#### Update Story
```http
PUT /api/stories/{story_id}
```

#### Delete Story
```http
DELETE /api/stories/{story_id}
```

### Story Elements Management

#### Get Story Elements
```http
GET /api/stories/{story_id}/elements
```

#### Create Story Element
```http
POST /api/stories/{story_id}/elements
```

**Request Body:**
```json
{
  "type": "chapter",
  "title": "Chapter 1: The Beginning",
  "content": "Once upon a time in a magical land...",
  "order": 1,
  "metadata": {
    "word_count": 500,
    "reading_time": "2 minutes"
  }
}
```

#### Update Story Element
```http
PUT /api/stories/{story_id}/elements/{element_id}
```

#### Delete Story Element
```http
DELETE /api/stories/{story_id}/elements/{element_id}
```

### AI Generation

#### Generate Story Outline
```http
POST /api/ai/generate-outline
```

**Request Body:**
```json
{
  "prompt": "A story about a young wizard learning magic",
  "genre": "fantasy",
  "target_audience": "children",
  "length": "short",
  "characters": ["young wizard", "wise mentor"],
  "setting": "magic school"
}
```

**Response:**
```json
{
  "outline": {
    "title": "The Young Wizard's Journey",
    "summary": "A coming-of-age story about magical discovery",
    "chapters": [
      {
        "title": "Arrival at Magic School",
        "summary": "The protagonist discovers their magical abilities"
      }
    ],
    "characters": [
      {
        "name": "Luna",
        "role": "protagonist",
        "description": "A curious young person with untapped magical potential"
      }
    ],
    "themes": ["friendship", "courage", "self-discovery"]
  },
  "generation_id": "gen_123",
  "credits_used": 5
}
```

#### Generate Chapter
```http
POST /api/ai/generate-chapter
```

**Request Body:**
```json
{
  "story_id": "story_123",
  "chapter_outline": "The protagonist meets their mentor",
  "previous_chapters": ["chapter_1_content"],
  "character_descriptions": {},
  "tone": "adventurous",
  "length": "medium"
}
```

#### Enhance Text
```http
POST /api/ai/enhance-text
```

**Request Body:**
```json
{
  "text": "The wizard walked into the room.",
  "enhancement_type": "descriptive",
  "tone": "mysterious",
  "target_audience": "children"
}
```

#### Generate Image
```http
POST /api/ai/generate-image
```

**Request Body:**
```json
{
  "prompt": "A young wizard casting their first spell",
  "style": "fantasy_illustration",
  "aspect_ratio": "16:9",
  "quality": "high"
}
```

### Export Operations

#### Generate PDF Export
```http
POST /api/export/pdf
```

**Request Body:**
```json
{
  "story_id": "story_123",
  "format": "book",
  "include_images": true,
  "font_size": "medium",
  "page_size": "A4"
}
```

**Response:**
```json
{
  "export_id": "export_123",
  "status": "processing",
  "estimated_completion": "2025-06-27T10:00:00Z"
}
```

#### Check Export Status
```http
GET /api/export/{export_id}/status
```

**Response:**
```json
{
  "export_id": "export_123",
  "status": "completed",
  "download_url": "https://example.com/download/story.pdf",
  "expires_at": "2025-06-28T00:00:00Z"
}
```

#### Generate Audiobook
```http
POST /api/export/audiobook
```

**Request Body:**
```json
{
  "story_id": "story_123",
  "voice": "natural_female",
  "speed": "normal",
  "format": "mp3",
  "chapters": ["chapter_1", "chapter_2"]
}
```

### Analytics

#### Get Story Analytics
```http
GET /api/stories/{story_id}/analytics
```

#### Get User Analytics
```http
GET /api/user/analytics?period=30d
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request data is invalid",
    "details": {
      "field": "title",
      "message": "Title is required"
    }
  },
  "request_id": "req_123"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Authentication required or failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INSUFFICIENT_CREDITS` - Not enough credits for operation
- `GENERATION_ERROR` - AI generation failed
- `EXPORT_ERROR` - Export processing failed

## Rate Limiting

### Limits by Plan
- **Free Plan**: 100 requests per hour
- **Premium Plan**: 1000 requests per hour  
- **Enterprise Plan**: 5000 requests per hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Webhooks

### Webhook Events
- `story.created` - New story created
- `story.updated` - Story updated
- `story.completed` - Story marked as completed
- `export.completed` - Export processing completed
- `user.upgraded` - User plan upgraded

### Webhook Payload Example
```json
{
  "event": "story.completed",
  "data": {
    "story_id": "story_123",
    "user_id": "user_456",
    "title": "The Magic Adventure",
    "completed_at": "2025-06-27T10:00:00Z"
  },
  "timestamp": "2025-06-27T10:00:00Z"
}
```

## SDK Libraries

### JavaScript/TypeScript
```bash
npm install @mythoria/api-client
```

```javascript
import { MythoriaClient } from '@mythoria/api-client';

const client = new MythoriaClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://app.mythoria.com/api'
});

const stories = await client.stories.list();
```

### Python
```bash
pip install mythoria-python
```

```python
from mythoria import MythoriaClient

client = MythoriaClient(api_key='your-api-key')
stories = client.stories.list()
```

---

**Last Updated**: June 27, 2025  
**API Version**: v1  
**Component Version**: 0.1.1
