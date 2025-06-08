"use client"

import React from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="skeleton w-8 h-8 rounded-full"></div>
    )
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="btn btn-primary btn-sm"
      >
        Sign In
      </button>
    )
  }

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
        <div className="w-8 rounded-full">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-xs">
                {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
              </span>
            </div>
          )}
        </div>
      </div>
      <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
        <li className="menu-title">
          <span className="text-sm font-medium">
            {session.user.name || session.user.email}
          </span>
        </li>
        <li>
          <Link href="/profile">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </Link>
        </li>
        <li>
          <Link href="/dashboard">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dashboard
          </Link>
        </li>
        <div className="divider my-1"></div>
        <li>
          <button
            onClick={() => signOut()}
            className="text-error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  )
}
