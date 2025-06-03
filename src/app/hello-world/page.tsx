"use client";
import React from "react";
import { useUser } from "@clerk/nextjs";

export default function HelloWorld() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) {
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

  const userName = user.firstName || user.emailAddresses?.[0]?.emailAddress || 'User';
  
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold">HI {userName}!</h1>
      </div>
    </main>
  );
}
