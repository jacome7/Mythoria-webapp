# API Documentation

## Overview

RESTful API for managing stories, users, and application health. All endpoints return JSON and use standard HTTP status codes.

## Base URLs
- **Production**: `https://mythoria.pt/api`
- **Development**: `http://localhost:3000/api`

## Authentication

Protected endpoints require Clerk session token:
```http
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

## Response Format

All responses follow this structure:
```json
{
  "success": boolean,
  "data": object | array | null,
  "error": {
    "message": string,
    "code": string
  } | null,
  "timestamp": string
}
```

## Status Codes
- `200` - Success
- `201` - Created  
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

## Endpoints

### Health & Configuration
```
GET /api/health                # Health check
GET /api/config/check          # Configuration validation
```

### Authentication
```
GET /api/auth/me               # Current user info
POST /api/webhooks             # Clerk user sync webhook
```

### Stories
```
GET /api/stories               # List all stories
POST /api/stories              # Create new story
GET /api/stories/{id}          # Get story by ID
PUT /api/stories/{id}          # Update story
DELETE /api/stories/{id}       # Delete story
```

### Users
```
GET /api/users                 # List users
GET /api/users/{id}            # Get user by ID
PUT /api/users/{id}            # Update user
```

## Error Handling

Errors include descriptive messages and appropriate status codes:
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Story not found",
    "code": "STORY_NOT_FOUND"
  },
  "timestamp": "2025-05-29T10:00:00.000Z"
}
```

## Rate Limiting

- **Development**: No limits
- **Production**: 100 requests per minute per IP

---

*For detailed endpoint specifications, see the OpenAPI documentation at `/api/docs`*
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Endpoints

### Health Check

#### GET /api/health
Check application health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-05-28T18:00:00.000Z",
    "services": {
      "database": "connected",
      "authentication": "operational"
    }
  }
}
```

### Stories

#### GET /api/stories
Retrieve all stories with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search term for story titles
- `author` (optional): Filter by author ID

**Example Request:**
```http
GET /api/stories?page=1&limit=10&search=adventure
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "story_123",
        "title": "Adventure Story",
        "description": "An exciting adventure...",
        "author": {
          "id": "user_456",
          "name": "John Doe"
        },
        "createdAt": "2025-05-28T18:00:00.000Z",
        "updatedAt": "2025-05-28T18:00:00.000Z",
        "published": true,
        "tags": ["adventure", "fantasy"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### POST /api/stories
Create a new story.

**Authentication Required**: Yes

**Request Body:**
```json
{
  "title": "My New Story",
  "description": "Story description",
  "content": "Story content...",
  "tags": ["adventure", "mystery"],
  "published": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "story_789",
    "title": "My New Story",
    "description": "Story description",
    "author": {
      "id": "user_456",
      "name": "John Doe"
    },
    "createdAt": "2025-05-28T18:00:00.000Z",
    "published": false
  }
}
```

#### GET /api/stories/[id]
Retrieve a specific story by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "story_123",
    "title": "Adventure Story",
    "description": "An exciting adventure...",
    "content": "Full story content...",
    "author": {
      "id": "user_456",
      "name": "John Doe",
      "avatar": "https://..."
    },
    "createdAt": "2025-05-28T18:00:00.000Z",
    "updatedAt": "2025-05-28T18:00:00.000Z",
    "published": true,
    "tags": ["adventure", "fantasy"],
    "stats": {
      "views": 150,
      "likes": 25,
      "shares": 5
    }
  }
}
```

#### PUT /api/stories/[id]
Update a specific story.

**Authentication Required**: Yes (story owner only)

**Request Body:**
```json
{
  "title": "Updated Story Title",
  "description": "Updated description",
  "content": "Updated content...",
  "tags": ["adventure", "updated"],
  "published": true
}
```

#### DELETE /api/stories/[id]
Delete a specific story.

**Authentication Required**: Yes (story owner only)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Story deleted successfully"
  }
}
```

### Users

#### GET /api/users
Get user information (current authenticated user).

**Authentication Required**: Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "createdAt": "2025-05-20T10:00:00.000Z",
    "stats": {
      "storiesCount": 5,
      "totalViews": 500,
      "totalLikes": 75
    },
    "preferences": {
      "theme": "light",
      "notifications": true
    }
  }
}
```

#### PUT /api/users
Update user profile.

**Authentication Required**: Yes

**Request Body:**
```json
{
  "name": "Updated Name",
  "preferences": {
    "theme": "dark",
    "notifications": false
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Detailed error message",
    "code": "ERROR_CODE",
    "details": {...} // Optional additional details
  },
  "timestamp": "2025-05-28T18:00:00.000Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error

## Rate Limiting

- **Anonymous users**: 100 requests per hour
- **Authenticated users**: 1000 requests per hour
- **Premium users**: 5000 requests per hour

Rate limit headers included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Testing

### Test with cURL

**Health Check:**
```bash
curl -X GET https://mythoria.pt/api/health
```

**Get Stories:**
```bash
curl -X GET "https://mythoria.pt/api/stories?page=1&limit=5"
```

**Create Story (with auth):**
```bash
curl -X POST https://mythoria.pt/api/stories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Story",
    "description": "A test story",
    "content": "This is a test story content.",
    "published": false
  }'
```

## SDK Examples

### JavaScript/TypeScript
```typescript
// Health check
const healthResponse = await fetch('/api/health');
const health = await healthResponse.json();

// Get stories with pagination
const storiesResponse = await fetch('/api/stories?page=1&limit=10');
const stories = await storiesResponse.json();

// Create story (authenticated)
const createResponse = await fetch('/api/stories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    title: 'My Story',
    description: 'Story description',
    content: 'Story content...',
    published: false
  })
});
```

## Webhooks

### Story Events
Subscribe to story events for real-time updates:

**Endpoint**: `POST /api/webhooks/stories`

**Events:**
- `story.created`
- `story.updated`
- `story.published`
- `story.deleted`

**Payload Example:**
```json
{
  "event": "story.created",
  "timestamp": "2025-05-28T18:00:00.000Z",
  "data": {
    "story": {...},
    "author": {...}
  }
}
```

## Changelog

### v1.0.0 (2025-05-28)
- Initial API release
- Health check endpoint
- Stories CRUD operations
- User profile management
- Clerk authentication integration

## Support

For API support or questions:
- Check the [troubleshooting guide](../development/setup.md#troubleshooting)
- Review [deployment documentation](../deployment/deployment-guide.md)
- Contact: rodrigovieirajacome@gmail.com
