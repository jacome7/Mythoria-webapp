'use client'

import { useEffect } from 'react';

export default function SignInPage() {
  useEffect(() => {
    // Redirect to Auth0 login
    window.location.href = '/api/auth/login';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading loading-spinner loading-lg"></div>
      <p className="ml-4">Redirecting to sign in...</p>
    </div>
  );
}
