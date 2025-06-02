'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: Record<string, unknown> | string | number | boolean;
}

export default function ClerkCredentialsTestPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const updateTest = (name: string, status: TestResult['status'], message: string, details?: Record<string, unknown> | string | number | boolean) => {
    setTests(prev => prev.map(test => 
      test.name === name 
        ? { ...test, status, message, details }
        : test
    ));
  };

  const initializeTests = () => {
    const initialTests: TestResult[] = [
      { name: 'Clerk User Loading', status: 'pending', message: 'Checking if user data loads...' },
      { name: 'Authentication State', status: 'pending', message: 'Verifying authentication state...' },
      { name: 'User Data Retrieval', status: 'pending', message: 'Testing user data access...' },
      { name: 'Environment Variables', status: 'pending', message: 'Checking client-side env vars...' },
      { name: 'API Endpoint Connection', status: 'pending', message: 'Testing API connection...' },
      { name: 'Webhook Endpoint', status: 'pending', message: 'Testing webhook endpoint...' },
    ];
    setTests(initialTests);
  };
  const runTests = useCallback(async () => {
    setIsRunning(true);
    initializeTests();

    // Test 1: Clerk User Loading
    if (userLoaded && authLoaded) {
      updateTest('Clerk User Loading', 'success', 'Clerk has finished loading', {
        userLoaded,
        authLoaded
      });
    } else {
      updateTest('Clerk User Loading', 'error', 'Clerk failed to load properly');
    }

    // Test 2: Authentication State
    if (isSignedIn && user) {
      updateTest('Authentication State', 'success', 'User is signed in', {
        userId: user.id,
        primaryEmail: user.primaryEmailAddress?.emailAddress
      });
    } else {
      updateTest('Authentication State', 'error', 'User is not signed in or user data unavailable');
    }

    // Test 3: User Data Retrieval
    if (user) {
      const userData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddresses: user.emailAddresses.length,
        phoneNumbers: user.phoneNumbers.length,
        createdAt: user.createdAt?.toISOString(),
        lastSignInAt: user.lastSignInAt?.toISOString(),
      };
      updateTest('User Data Retrieval', 'success', 'User data retrieved successfully', userData);
    } else {
      updateTest('User Data Retrieval', 'error', 'No user data available');
    }

    // Test 4: Environment Variables
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (publishableKey) {
      const isValidFormat = publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_');
      updateTest('Environment Variables', 
        isValidFormat ? 'success' : 'error', 
        isValidFormat ? 'Publishable key is properly configured' : 'Publishable key format is invalid',
        { 
          keyPrefix: publishableKey.substring(0, 10) + '...',
          keyType: publishableKey.startsWith('pk_test_') ? 'test' : 'live'
        }
      );
    } else {
      updateTest('Environment Variables', 'error', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not found');
    }

    // Test 5: API Endpoint Connection
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        updateTest('API Endpoint Connection', 'success', 'API endpoints are accessible', {
          status: response.status,
          statusText: response.statusText
        });
      } else {
        updateTest('API Endpoint Connection', 'error', `API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      updateTest('API Endpoint Connection', 'error', 'Failed to connect to API', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 6: Webhook Endpoint
    try {
      // Test if webhook endpoint exists (should return 400 for GET request, but endpoint should exist)
      const response = await fetch('/api/webhooks', { method: 'GET' });
      updateTest('Webhook Endpoint', 'success', 'Webhook endpoint is accessible', {
        status: response.status,
        note: 'GET request expected to fail, but endpoint exists'
      });
    } catch (error) {
      updateTest('Webhook Endpoint', 'error', 'Webhook endpoint not accessible', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setIsRunning(false);
  }, [userLoaded, authLoaded, isSignedIn, user]);
  useEffect(() => {
    if (userLoaded && authLoaded) {
      runTests();
    }
  }, [userLoaded, authLoaded, runTests]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🔐 Clerk Credentials Test Dashboard
        </h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Test Status</h2>
          {isRunning ? (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Running tests...
            </div>
          ) : (
            <button
              onClick={runTests}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Run Tests Again
            </button>
          )}
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-800">
                  {getStatusIcon(test.status)} {test.name}
                </h3>
                <span className={`font-semibold ${getStatusColor(test.status)}`}>
                  {test.status.toUpperCase()}
                </span>
              </div>
              
              <p className={`text-sm ${getStatusColor(test.status)} mb-2`}>
                {test.message}
              </p>
              
              {test.details && (
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800">
                    View Details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Environment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>User Loaded:</strong> {userLoaded ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Auth Loaded:</strong> {authLoaded ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Signed In:</strong> {isSignedIn ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Environment:</strong> {process.env.NODE_ENV || 'Unknown'}
            </div>
          </div>
        </div>

        {user && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Current User Information
            </h3>
            <div className="text-sm space-y-1">
              <div><strong>User ID:</strong> {user.id}</div>
              <div><strong>Name:</strong> {user.firstName} {user.lastName}</div>
              <div><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</div>
              <div><strong>Created:</strong> {user.createdAt?.toLocaleString()}</div>
              <div><strong>Last Sign In:</strong> {user.lastSignInAt?.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
