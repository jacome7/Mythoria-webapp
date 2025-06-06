import { useUser } from '@auth0/nextjs-auth0/client';
import { ReactNode } from 'react';

interface AuthStateProps {
  children: ReactNode;
}

export function SignedIn({ children }: AuthStateProps) {
  const { user } = useUser();
  return user ? <>{children}</> : null;
}

export function SignedOut({ children }: AuthStateProps) {
  const { user } = useUser();
  return !user ? <>{children}</> : null;
}

export function RedirectToSignIn() {
  // Redirect to Auth0 login
  if (typeof window !== 'undefined') {
    window.location.href = '/api/auth/login';
  }
  return null;
}

export function ProtectedRoute({ children }: AuthStateProps) {
  const { user, isLoading } = useUser();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  if (!user) {
    return <RedirectToSignIn />;
  }
  
  return <>{children}</>;
}
