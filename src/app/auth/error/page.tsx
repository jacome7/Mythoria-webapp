"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

const errors: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification token is invalid or has expired.",
  Default: "Unable to sign in.",
}

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const errorMessage = error ? errors[error] ?? errors.Default : errors.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-error mb-2">Authentication Error</h1>
          <p className="text-base-content/70 mb-6">{errorMessage}</p>
          
          <div className="card-actions justify-center">
            <Link href="/auth/signin" className="btn btn-primary">
              Try Again
            </Link>
            <Link href="/" className="btn btn-ghost">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
