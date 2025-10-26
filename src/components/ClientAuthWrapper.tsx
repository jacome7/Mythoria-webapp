'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface ClientAuthWrapperProps {
  children: React.ReactNode;
  signedOutFallback?: React.ReactNode;
}

export default function ClientAuthWrapper({ children, signedOutFallback }: ClientAuthWrapperProps) {
  const [mounted, setMounted] = useState(false);

  // This effect is necessary to prevent hydration mismatches with Clerk's auth state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for hydration safety with Clerk auth
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering auth-dependent content on server
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedOut>{signedOutFallback}</SignedOut>
      <SignedIn>{children}</SignedIn>
    </>
  );
}
