import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { nextUrl, nextauth } = req
    const isLoggedIn = !!nextauth.token

    // Define protected routes
    const protectedRoutes = [
      "/dashboard",
      "/profile",
      "/settings",
      "/stories/create",
      "/stories/edit"
    ]

    // Define auth routes
    const authRoutes = [
      "/auth/signin",
      "/auth/signup",
      "/auth/error"
    ]

    const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
    const isProtectedRoute = protectedRoutes.some(route => 
      nextUrl.pathname.startsWith(route)
    )
    const isAuthRoute = authRoutes.includes(nextUrl.pathname)

    // Allow API auth routes
    if (isApiAuthRoute) {
      return NextResponse.next()
    }

    // Redirect logged-in users away from auth pages
    if (isAuthRoute) {
      if (isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl))
      }
      return NextResponse.next()
    }

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !isLoggedIn) {
      let callbackUrl = nextUrl.pathname
      if (nextUrl.search) {
        callbackUrl += nextUrl.search
      }

      const encodedCallbackUrl = encodeURIComponent(callbackUrl)
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodedCallbackUrl}`, nextUrl)
      )
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // This function is called for every request
        // Return true to allow access, false to deny
        return true // We handle authorization in the middleware function above
      },
    },
  }
)

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
