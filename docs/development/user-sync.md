# User Synchronization with Clerk Authentication

This document explains how user synchronization works between Clerk authentication and the application database.

## Overview

The application automatically synchronizes user data between Clerk and the local database every time a user signs in or accesses protected resources. This ensures that:

1. **Existing users** have their `lastLoginAt` timestamp updated on every sign-in
2. **New users** are automatically created in the database with all available information from Clerk

## Implementation Details

### 1. Auth Helper (`src/lib/auth.ts`)

The `getCurrentAuthor()` function has been enhanced to:
- Check if a user exists in the database
- If the user doesn't exist, create them automatically using `authorService.syncUserOnSignIn()`
- If the user exists, update their `lastLoginAt` timestamp
- Return the synchronized user data

### 2. Database Service (`src/db/services.ts`)

The `authorService.syncUserOnSignIn()` function:
- Attempts to find an existing user by `clerkUserId`
- For existing users: Updates `lastLoginAt` timestamp
- For new users: Creates a complete user record with:
  - `clerkUserId` (from Clerk)
  - `email` (primary email from Clerk)
  - `displayName` (built from available name data)
  - `mobilePhone` (if available from Clerk)
  - `lastLoginAt` (current timestamp)
  - `createdAt` (automatically set by database)

### 3. Webhook Handler (`src/app/api/webhooks/route.ts`)

Enhanced to handle multiple Clerk events:
- `session.created`: Updates `lastLoginAt` for existing users on sign-in
- `user.created`: Creates new users via the sync function
- `user.updated`: Updates user information when changed in Clerk
- `user.deleted`: Removes users from the database

### 4. Display Name Logic

The `buildDisplayName()` function creates user-friendly display names using this priority:
1. `firstName` + `lastName` (if available)
2. `username` (if available)
3. Email prefix (part before @)
4. "Anonymous User" (fallback)

## User Data Fields

The following Clerk user fields are synchronized to the database:

| Clerk Field | Database Field | Notes |
|-------------|----------------|-------|
| `id` | `clerkUserId` | Primary identifier |
| Primary email | `email` | Required field |
| `firstName` + `lastName` | `displayName` | Built using display name logic |
| Primary phone | `mobilePhone` | Optional field |
| Sign-in time | `lastLoginAt` | Updated on every access |
| Current time | `createdAt` | Set automatically for new users |

## Testing

You can test the user synchronization by:

1. **Accessing the test page**: Navigate to `/user-sync-test` (requires authentication)
2. **Checking logs**: Look for console messages indicating user sync operations
3. **Database inspection**: Verify that user records are created/updated correctly

## Error Handling

The implementation includes comprehensive error handling:
- Failed user creation attempts are logged and return appropriate HTTP status codes
- Webhook signature verification prevents unauthorized access
- Database transaction failures are caught and reported

## Security Considerations

- All webhook endpoints verify Clerk signatures using `CLERK_WEBHOOK_SIGNING_SECRET`
- User data is validated before database insertion
- Personal information is handled according to privacy best practices

## Configuration Required

Ensure these environment variables are set:
- `CLERK_WEBHOOK_SIGNING_SECRET`: For webhook signature verification
- Database connection variables (as per your existing setup)

## Monitoring

Monitor the following for successful operation:
- Console logs showing user sync operations
- Database `lastLoginAt` timestamps being updated
- Webhook delivery success in Clerk dashboard
