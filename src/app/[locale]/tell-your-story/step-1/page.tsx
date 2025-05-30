import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import StepNavigation from '@/components/StepNavigation';

export default function Step1Page() {

  return (
    <div className="container mx-auto px-4 py-8">
      <SignedOut>
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Ready to Tell Your Story?</h1>
          <p className="text-lg text-gray-600">
            Sign up to start creating your magical adventures with Mythoria.
          </p>
          <div className="space-x-4">
            <Link href="/sign-up" className="btn btn-primary">
              Get Started
            </Link>
            <Link href="/sign-in" className="btn btn-outline">
              Sign In
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-4xl mx-auto">          {/* Progress indicator */}
          <div className="mb-8">
            <ul className="steps steps-horizontal w-full">
              <li className="step step-primary" data-content="1"></li>
              <li className="step" data-content="2"></li>
              <li className="step" data-content="3"></li>
              <li className="step" data-content="4"></li>
              <li className="step" data-content="5"></li>
              <li className="step" data-content="6"></li>
              <li className="step" data-content="7"></li>
            </ul>
          </div>

          {/* Step content */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h1 className="card-title text-3xl mb-6">Chapter 1 - The Author</h1>
              
              {/* Step 1 content will go here */}
              <div className="text-center py-12">
                <p className="text-lg text-gray-600">Step 1 content coming soon...</p>
              </div>

              <StepNavigation 
                currentStep={1}
                totalSteps={7}
                nextHref="/tell-your-story/step-2"
                prevHref={null}
              />
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
