import { Header } from "./components/header";
import { Footer } from "./components/footer";
import Link from "next/link";

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
                <div className="space-y-4">
                  <p className="text-primary-content/80">
                    Sign in to start your adventure!
                  </p>
                  <div className="space-x-4">
                    <Link href="/auth/signin" className="btn btn-accent">
                      Sign In
                    </Link>
                    <Link href="/about" className="btn btn-outline btn-accent">
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
