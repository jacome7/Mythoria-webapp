'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import StepNavigation from '../../../../components/StepNavigation';
import { useState, useEffect } from 'react';

interface AuthorData {
  authorId: string;
  clerkUserId: string;
  displayName: string;
  email: string;
  mobilePhone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  preferredLocale: string;
}

export default function Step1Page() {
  const [, setAuthorData] = useState<AuthorData | null>(null);  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form data
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');

  useEffect(() => {
    fetchAuthorData();
  }, []);

  const fetchAuthorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/me');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data: AuthorData = await response.json();
      setAuthorData(data);
      
      // Pre-populate form fields
      setDisplayName(data.displayName || '');
      setEmail(data.email || '');
      setMobilePhone(data.mobilePhone || '');
      
    } catch (error) {
      console.error('Error fetching author data:', error);
      setError('Failed to load user information. Please try again.');
    } finally {    setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SignedOut>
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="text-6xl">📚</div>          <h1 className="text-4xl font-bold">Oops! Looks like you&apos;re trying to sneak into the author&apos;s lounge!</h1>
          <p className="text-lg text-gray-600">
            While we appreciate your enthusiasm for storytelling, you&apos;ll need to sign in first. 
            Don&apos;t worry, it&apos;s easier than convincing a dragon to share its treasure! 🐉
          </p>
          <div className="space-x-4">
            <Link href="/sign-in" className="btn btn-primary btn-lg">
              🔐 Sign In to Start Your Adventure
            </Link>
            <Link href="/sign-up" className="btn btn-outline btn-lg">
              ✨ Create Your Author Account
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Once you&apos;re signed in, you&apos;ll be ready to create magical stories that would make even Merlin jealous! 🧙‍♂️
          </p>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-8">
            <ul className="steps steps-horizontal w-full">
              <li className="step step-primary" data-content="1"></li>
              <li className="step" data-content="2"></li>
              <li className="step" data-content="3"></li>
              <li className="step" data-content="4"></li>
              <li className="step" data-content="5"></li>
              <li className="step" data-content="6"></li>
              <li className="step" data-content="7"></li>
            </ul>
          </div>

          {/* Step content */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h1 className="card-title text-3xl mb-6">Chapter 1 - The Author</h1>
              
              {loading ? (
                <div className="text-center py-12">
                  <span className="loading loading-spinner loading-lg"></span>
                  <p className="text-lg text-gray-600 mt-4">Loading your author profile...</p>
                </div>              ) : (
                <div className="space-y-6">
                  <div className="prose max-w-none mb-6">
                    <p className="text-gray-600">
                      Welcome, storyteller! Before we dive into your magical adventure,                      let&apos;s make sure we have your correct information. This helps us 
                      personalize your experience and keep you updated on your story&apos;s progress.
                    </p>
                  </div>

                  {error && (
                    <div className="alert alert-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="alert alert-success">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Full Name *</span>
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your full name"
                        className="input input-bordered w-full"
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">This is how you&apos;ll be credited as the author</span>
                      </label>
                    </div>

                    {/* Email Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Email Address *</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="input input-bordered w-full"
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">We&apos;ll use this for important updates about your story</span>
                      </label>
                    </div>
                    
                    {/* Mobile Phone Field */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Mobile Phone</span>
                      </label>
                      <input
                        type="tel"
                        value={mobilePhone}
                        onChange={(e) => setMobilePhone(e.target.value)}
                        placeholder="Enter your mobile phone number"
                        className="input input-bordered w-full"
                      />
                      <label className="label">
                        <span className="label-text-alt">For urgent notifications or delivery updates (optional)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <StepNavigation 
                currentStep={1}
                totalSteps={7}
                nextHref="/tell-your-story/step-2"
                prevHref={null}
              />
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
