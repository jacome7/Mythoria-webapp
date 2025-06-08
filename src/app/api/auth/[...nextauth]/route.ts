import { handlers } from "@/lib/auth";

// Export the NextAuth.js handlers for GET and POST requests
// This handles all NextAuth.js API routes like:
// - /api/auth/signin
// - /api/auth/signout  
// - /api/auth/callback/google
// - /api/auth/session
// - /api/auth/csrf
export const { GET, POST } = handlers;
