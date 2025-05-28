import { getCurrentAuthor } from '@/lib/auth';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';

export default async function DashboardPage() {
  const author = await getCurrentAuthor();

  return (
    <div className="container mx-auto px-4 py-8">
      <SignedOut>
        <div className="hero min-h-[60vh] bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <div className="mb-8">
                <Image
                  src="/Logo_black_transparent_256x222.png"
                  alt="Mythoria Logo"
                  width={128}
                  height={111}
                  className="mx-auto drop-shadow-lg"
                />
              </div>
              <h1 className="text-5xl font-bold text-gray-800 mb-6">
                Welcome to Mythoria
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Create magical stories that bring your imagination to life. 
                Sign up to start your storytelling adventure.
              </p>
              <div className="space-y-4">
                <Link href="/sign-up" className="btn btn-primary btn-lg w-full">
                  Start Your Story Journey
                </Link>
                <Link href="/sign-in" className="btn btn-outline btn-lg w-full">
                  Welcome Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Welcome back, {author?.displayName || 'Storyteller'}! 
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Ready to continue your magical storytelling journey?
              </p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>

          {/* Quick Stats */}
          <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-figure text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div className="stat-title">Stories Created</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Start your first story!</div>
            </div>
            
            <div className="stat">
              <div className="stat-figure text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div className="stat-title">Characters</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Create unique characters</div>
            </div>
            
            <div className="stat">
              <div className="stat-figure text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
              </div>
              <div className="stat-title">Published</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Share your stories</div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card bg-gradient-to-br from-orange-100 to-orange-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-orange-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Story
                </h2>
                <p className="text-orange-700">Start a brand new magical adventure from scratch with our guided story creator.</p>
                <div className="card-actions justify-end">
                  <Link href="/tell-your-story" className="btn btn-primary">
                    Start Creating
                  </Link>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-amber-100 to-amber-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-amber-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  My Stories
                </h2>
                <p className="text-amber-700">View, edit, and manage all your existing stories in one place.</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-outline btn-warning">
                    View Stories
                  </button>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-yellow-100 to-yellow-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-yellow-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Character Library
                </h2>
                <p className="text-yellow-700">Create and manage unique characters for your stories.</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-outline btn-warning">
                    Manage Characters
                  </button>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-100 to-green-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-green-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Get Inspired
                </h2>
                <p className="text-green-700">Explore story ideas and get inspiration for your next adventure.</p>
                <div className="card-actions justify-end">
                  <Link href="/get-inspired" className="btn btn-outline btn-success">
                    Get Ideas
                  </Link>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-blue-100 to-blue-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Pricing
                </h2>
                <p className="text-blue-700">View pricing plans and upgrade your storytelling experience.</p>
                <div className="card-actions justify-end">
                  <Link href="/pricing" className="btn btn-outline btn-info">
                    View Plans
                  </Link>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-100 to-purple-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-purple-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Account Settings
                </h2>
                <p className="text-purple-700">Manage your profile, preferences, and account settings.</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-outline btn-secondary">
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Recent Activity</h2>
              <div className="text-center py-8 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No activity yet. Start creating your first story!</p>
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
