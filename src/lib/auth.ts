import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/auth/signin")
  }
  return session
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}

export async function isAuthenticated() {
  const session = await getServerSession(authOptions)
  return !!session
}
