"use client";
import React from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export default function ClerkDebug() {
  const { isSignedIn, sessionId, userId } = useAuth();
  const { user } = useUser();
  
  return (
    <main className="p-6 space-y-6 font-mono text-sm max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">🔍 Clerk Debug Dashboard</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">📋 Client-Side Authentication State</h2>
        <pre className="whitespace-pre-wrap text-xs bg-white p-3 rounded border overflow-auto">
          {JSON.stringify({ 
            isSignedIn, 
            sessionId, 
            userId,
            userLoaded: !!user,
            userEmail: user?.emailAddresses?.[0]?.emailAddress,
            userFirstName: user?.firstName,
            userLastName: user?.lastName 
          }, null, 2)}
        </pre>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">🍪 Cookie Information</h2>
        <CookieInfo />
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">🔐 Server-Side Authentication</h2>
        <FetchServerAuth />
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">🌐 API Tests</h2>
        <ApiTests />
      </div>

      <div className="bg-purple-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">⚙️ Environment Configuration</h2>
        <FetchEnvironment />
      </div>
    </main>
  );
}

function CookieInfo() {
  const [cookies, setCookies] = React.useState<string>("");
  
  React.useEffect(() => {
    setCookies(document.cookie);
  }, []);

  const clerkCookie = cookies.split(';').find(cookie => cookie.trim().startsWith('__session'));
  
  return (
    <div className="space-y-2">
      <div>
        <strong>Clerk Session Cookie:</strong>
        <pre className="text-xs bg-white p-2 rounded border mt-1">
          {clerkCookie || "❌ No __session cookie found"}
        </pre>
      </div>
      <div>
        <strong>All Cookies:</strong>
        <pre className="text-xs bg-white p-2 rounded border mt-1 max-h-32 overflow-auto">
          {cookies || "No cookies found"}
        </pre>
      </div>
    </div>
  );
}

function FetchServerAuth() {
  const [data, setData] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    fetch("/api/debug/auth")
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          return { error: `HTTP ${r.status}: ${text}` };
        }
      })
      .then((data: Record<string, unknown>) => {
        setData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading server auth...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  
  return (
    <pre className="whitespace-pre-wrap text-xs bg-white p-3 rounded border overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function ApiTests() {
  const [results, setResults] = React.useState<Record<string, unknown>>({});
  
  const testEndpoints = [
    { name: "Health Check", url: "/api/health", requiresAuth: false },
    { name: "Auth Me", url: "/api/auth/me", requiresAuth: true },
    { name: "My Credits", url: "/api/my-credits", requiresAuth: true },
    { name: "My Stories", url: "/api/my-stories", requiresAuth: true },
    { name: "Stories Count", url: "/api/stories?action=count", requiresAuth: false },
  ];
  
  const testEndpoint = async (endpoint: typeof testEndpoints[0]) => {
    try {
      const response = await fetch(endpoint.url);
      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      
      setResults((prev: Record<string, unknown>) => ({
        ...prev,
        [endpoint.name]: {
          status: response.status,
          statusText: response.statusText,
          data,
          headers: Object.fromEntries(response.headers.entries()),
        }
      }));
    } catch (error) {
      setResults((prev: Record<string, unknown>) => ({
        ...prev,
        [endpoint.name]: {
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {testEndpoints.map((endpoint) => (
          <button
            key={endpoint.name}
            onClick={() => testEndpoint(endpoint)}
            className={`px-3 py-1 rounded text-sm ${
              endpoint.requiresAuth 
                ? 'bg-orange-200 hover:bg-orange-300' 
                : 'bg-blue-200 hover:bg-blue-300'
            }`}
          >
            Test {endpoint.name}
          </button>
        ))}
      </div>
        {Object.entries(results).map(([name, result]: [string, unknown]) => (
        <div key={name} className="bg-white p-3 rounded border">
          <h3 className="font-semibold mb-2">{name}</h3>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function FetchEnvironment() {
  const [data, setData] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    fetch("/api/debug/env")
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          return { error: `HTTP ${r.status}: ${text}` };
        }
      })
      .then((data: Record<string, unknown>) => {
        setData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading environment configuration...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
    return (
    <div className="space-y-3">
      {data?.issues && Array.isArray(data.issues) && data.issues.length > 0 ? (
        <div className="bg-red-50 border border-red-200 p-3 rounded">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Configuration Issues:</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {(data.issues as string[]).map((issue: string, index: number) => (
              <li key={index}>• {issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      
      <pre className="whitespace-pre-wrap text-xs bg-white p-3 rounded border overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
