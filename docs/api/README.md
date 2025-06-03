# API reference

All endpoints are prefixed with `/api`. Responses use JSON.

## Authentication

Protected routes require a valid Clerk session token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/health` | Health check |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/stories` | List stories |
| POST | `/api/stories` | Create a story |
| GET | `/api/users` | List users |
| POST | `/api/webhooks` | Clerk webhook handler |

Other features are implemented in the code base; see the source for details.
