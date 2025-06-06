"use client";
import React from "react";
import { useUser } from "@auth0/nextjs-auth0";

export default function HelloWorld() {
  const { user, isLoading } = useUser();  
  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </main>
    );
  }
  
  if (!user) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div>Please sign in to view this page.</div>
      </main>
    );
  }

  const userName = user.name || user.email || 'User';
  
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold">HI {userName}!</h1>
      </div>
    </main>
  );
}
