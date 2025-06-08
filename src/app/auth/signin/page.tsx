"use client"

import React from "react"
import { signIn, getProviders } from "next-auth/react"
import { useEffect, useState } from "react"
import { FaGoogle, FaGithub, FaDiscord } from "react-icons/fa"

interface Provider {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

const providerIcons: Record<string, React.ReactElement> = {
  google: <FaGoogle className="w-5 h-5" />,
  github: <FaGithub className="w-5 h-5" />,
  discord: <FaDiscord className="w-5 h-5" />,
}

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    fetchProviders()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary">Welcome to Mythoria</h1>
            <p className="text-base-content/70 mt-2">Sign in to start your adventure</p>
          </div>
          
          <div className="space-y-3">
            {providers &&
              Object.values(providers).map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => signIn(provider.id, { callbackUrl: "/" })}
                  className="btn btn-outline w-full flex items-center gap-3"
                >
                  {providerIcons[provider.id] || <span className="w-5 h-5" />}
                  Sign in with {provider.name}
                </button>
              ))}
          </div>
          
          <div className="divider">OR</div>
          
          <div className="text-center">
            <p className="text-sm text-base-content/70">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
