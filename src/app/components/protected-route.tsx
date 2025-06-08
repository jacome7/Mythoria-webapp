"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/auth/signin")
      return
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      )
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}

// Server-side version for app directory
export async function ProtectedPage({ children }: { children: ReactNode }) {
  const { requireAuth } = await import("../../lib/auth")
  
  try {
    await requireAuth()
    return <>{children}</>
  } catch {
    return null // This will redirect via requireAuth
  }
}
