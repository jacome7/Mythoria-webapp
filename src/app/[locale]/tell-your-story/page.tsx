'use client';

import { useUser } from '@auth0/nextjs-auth0';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function TellYourStoryPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/tell-your-story/step-1');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Ready to Tell Your Story?</h1>
        <p className="text-lg text-gray-600">
          Sign up to start creating your magical adventures with Mythoria.
        </p>
        <div className="space-x-4">
          <Link href="/api/auth/login" className="btn btn-primary">
            Get Started
          </Link>
          <Link href="/api/auth/login" className="btn btn-outline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
