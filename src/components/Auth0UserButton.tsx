'use client';

import { useUser } from '@auth0/nextjs-auth0';

interface Auth0UserButtonProps {
  className?: string;
}

export function Auth0UserButton({ className = "" }: Auth0UserButtonProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className={`loading loading-spinner ${className}`}></div>
    );
  }

  if (user) {
    return (
      <div className={`dropdown dropdown-end ${className}`}>
        <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
          <div className="w-10 rounded-full">
            <img src={user.picture || '/api/placeholder/40/40'} alt="Profile" />
          </div>
        </label>
        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
          <li><span className="font-semibold">{user.name || user.email}</span></li>
          <li><a href="/profile">Profile</a></li>
          <li><a href="/api/auth/logout">Logout</a></li>
        </ul>
      </div>
    );
  }

  return (
    <a href="/api/auth/login" className={`btn btn-primary ${className}`}>
      Sign In
    </a>
  );
}

export function useAuth0User() {
  const { user, error, isLoading } = useUser();
  
  return {
    user,
    isLoaded: !isLoading,
    isSignedIn: !!user,
    error
  };
}
