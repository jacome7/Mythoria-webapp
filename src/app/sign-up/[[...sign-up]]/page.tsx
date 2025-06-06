'use client'

import { useEffect } from 'react';

export default function SignUpPage() {
  useEffect(() => {
    // Redirect to Auth0 signup
    window.location.href = '/api/auth/login?screen_hint=signup';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading loading-spinner loading-lg"></div>
      <p className="ml-4">Redirecting to sign up...</p>
    </div>
  );
}
