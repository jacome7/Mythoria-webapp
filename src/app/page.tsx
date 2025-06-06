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
        <div className="hero min-h-screen bg-gradient-to-r from-primary to-secondary">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold text-primary-content">Welcome to Mythoria</h1>
              <p className="py-6 text-primary-content/90">
                Your adventure awaits in the mystical world of Mythoria. Create, manage, and explore your mythical adventures like never before.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <SignedIn>
                  <Link href="/dashboard" className="btn btn-accent btn-lg">
                    Go to Dashboard
                  </Link>
                </SignedIn>
                
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="btn btn-primary btn-lg">
                      Sign In
                    </button>
                  </SignInButton>
                  <Link href="/sign-up" className="btn btn-outline btn-lg">
                    Create Account
                  </Link>
                </SignedOut>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}