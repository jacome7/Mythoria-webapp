# NextAuth.js Setup for Mythoria

This document describes the NextAuth.js authentication setup for the Mythoria webapp.

## Features

- ✅ Multiple OAuth providers (Google, GitHub, Discord)
- ✅ Custom sign-in/sign-out pages with DaisyUI styling
- ✅ Protected routes with middleware
- ✅ User menu component with avatar and dropdown
- ✅ TypeScript support with proper typing
- ✅ Dashboard and profile pages
- ✅ Authentication utilities and hooks

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
```

### OAuth Provider Setup

1. **Google OAuth**: Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **GitHub OAuth**: Visit [GitHub Developer Settings](https://github.com/settings/developers)
3. **Discord OAuth**: Visit [Discord Developer Portal](https://discord.com/developers/applications)

For each provider, create an OAuth application and add the redirect URI:
`http://localhost:3000/api/auth/callback/[provider]`

## File Structure

```
src/
├── app/
│   ├── api/auth/[...nextauth]/
│   │   ├── auth.config.ts    # NextAuth configuration
│   │   └── route.ts          # API route handler
│   ├── auth/
│   │   ├── signin/page.tsx   # Custom sign-in page
│   │   ├── signout/page.tsx  # Custom sign-out page
│   │   └── error/page.tsx    # Auth error page
│   ├── components/
│   │   ├── user-menu.tsx     # User dropdown menu
│   │   └── protected-route.tsx # Client-side protection
│   ├── dashboard/page.tsx    # Protected dashboard
│   ├── profile/page.tsx      # Protected profile page
│   └── providers.tsx         # Session provider wrapper
├── lib/
│   └── auth.ts              # Auth utilities
├── types/
│   └── next-auth.d.ts       # TypeScript declarations
├── auth.ts                  # Main auth configuration
└── middleware.ts            # Route protection middleware
```

## Usage

### Protecting Pages (Server-side)

```tsx
import { requireAuth } from "../../lib/auth"

export default async function ProtectedPage() {
  const session = await requireAuth() // Redirects if not authenticated
  
  return <div>Hello, {session.user.name}!</div>
}
```

### Protecting Pages (Client-side)

```tsx
import { ProtectedRoute } from "../components/protected-route"

export default function MyPage() {
  return (
    <ProtectedRoute>
      <div>This content is protected</div>
    </ProtectedRoute>
  )
}
```

### Using Session in Components

```tsx
"use client"

import { useSession } from "next-auth/react"

export function MyComponent() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <div>Loading...</div>
  if (!session) return <div>Not signed in</div>
  
  return <div>Hello, {session.user.name}!</div>
}
```

## Protected Routes

The following routes are automatically protected by middleware:
- `/dashboard`
- `/profile`
- `/settings`
- `/stories/create`
- `/stories/edit`

## Custom Pages

- **Sign In**: `/auth/signin` - Beautiful sign-in page with provider buttons
- **Sign Out**: `/auth/signout` - Handles sign-out process
- **Error**: `/auth/error` - Displays authentication errors
- **Dashboard**: `/dashboard` - User dashboard with overview
- **Profile**: `/profile` - User profile management

## Quick Start

1. **Install Dependencies**: Already installed with the setup
   ```bash
   npm install next-auth @auth/drizzle-adapter
   ```

2. **Environment Setup**: Update your `.env.local` file with OAuth credentials:
   ```bash
   # Required - Already configured
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=ca7e491f113a82316b91ddfcc8332c06fea4aed26cc0fc1b92017c439ab91bd5

   # Add your OAuth provider credentials
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

3. **Test the Setup**: 
   - Visit `http://localhost:3000` - Home page with sign-in button
   - Visit `http://localhost:3000/auth/signin` - Sign-in page
   - Visit `http://localhost:3000/dashboard` - Protected page (redirects to sign-in)

## Next Steps

1. Add your OAuth provider credentials to `.env.local`
2. Test the authentication flow
3. Customize the styling and branding
4. Add database integration with Drizzle adapter (optional)
5. Implement role-based access control (if needed)
