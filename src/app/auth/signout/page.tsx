"use client"

import { signOut } from "next-auth/react"
import { useEffect } from "react"

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: "/" })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <div className="loading loading-spinner loading-lg text-primary mx-auto"></div>
          <h2 className="card-title justify-center">Signing out...</h2>
          <p>You are being signed out of Mythoria</p>
        </div>
      </div>
    </div>
  )
}
