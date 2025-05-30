'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

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

export default function UserSyncTestPage() {
  const { user, isLoaded } = useUser();
  const [authorData, setAuthorData] = useState<AuthorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    console.log('UserSyncTestPage useEffect:', { isLoaded, user: !!user });
    setDebugInfo(`isLoaded: ${isLoaded}, user: ${!!user}, userId: ${user?.id || 'none'}`);
    
    if (isLoaded) {
      if (user) {
        fetchAuthorData();
      } else {
        setLoading(false);
      }
    }
  }, [isLoaded, user]);

  const fetchAuthorData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching author data...');
      
      const response = await fetch('/api/auth/me');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to fetch author data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Author data received:', data);
      setAuthorData(data);
    } catch (err) {
      console.error('Error fetching author data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <p>Loading Clerk user state...</p>
          <p className="text-sm text-gray-500 mt-2">Debug: {debugInfo}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please sign in to test user synchronization.</p>
          <p className="text-sm text-gray-500 mt-2">Debug: {debugInfo}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <p>Loading user data from database...</p>
          <p className="text-sm text-gray-500 mt-2">Debug: {debugInfo}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <p className="text-sm text-gray-500 mt-2">Debug: {debugInfo}</p>
          <button 
            onClick={fetchAuthorData}
            className="mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">User Sync Test</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Current Author Information</h2>
        
        {authorData && (
          <div className="space-y-3">
            <div>
              <strong>Author ID:</strong> {authorData.authorId}
            </div>
            <div>
              <strong>Clerk User ID:</strong> {authorData.clerkUserId}
            </div>
            <div>
              <strong>Display Name:</strong> {authorData.displayName}
            </div>
            <div>
              <strong>Email:</strong> {authorData.email}
            </div>
            <div>
              <strong>Mobile Phone:</strong> {authorData.mobilePhone || 'Not provided'}
            </div>
            <div>
              <strong>Last Login:</strong> {authorData.lastLoginAt ? new Date(authorData.lastLoginAt).toLocaleString() : 'Never'}
            </div>
            <div>
              <strong>Created At:</strong> {new Date(authorData.createdAt).toLocaleString()}
            </div>
            <div>
              <strong>Preferred Locale:</strong> {authorData.preferredLocale}
            </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="text-lg font-medium text-green-800 mb-2">✅ User Sync Working!</h3>
          <p className="text-green-700">
            This page confirms that the user synchronization between Clerk and your database is working correctly. 
            Every time you access this page (or any protected resource), your lastLoginAt timestamp will be updated.
          </p>
        </div>
        
        <div className="mt-4 space-x-3">
          <button 
            onClick={fetchAuthorData}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Refresh to Update Login Time
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <strong>Debug Info:</strong> {debugInfo}
        </div>
      </div>
    </div>
  );
}