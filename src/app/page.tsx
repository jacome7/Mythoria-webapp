import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Header } from "./components/header";
import { Footer } from "./components/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Welcome to Mythoria
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
              
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    SignIn
                  </button>
                </SignInButton>
                <Link
                  href="/sign-up"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
                >
                  Create Account
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}