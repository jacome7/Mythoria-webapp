import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function Step7Page() {

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      
      <SignedIn>        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress indicator */}
            {(() => {
              const currentStep = 7;
              const totalSteps = 7;
              return (
                <>
                  {/* Mobile Progress Indicator */}
                  <div className="block md:hidden mb-8">
                    <div className="text-center text-sm text-gray-600 mb-2">
                      Step {currentStep} of {totalSteps}
                    </div>
                    <progress 
                      className="progress progress-primary w-full" 
                      value={currentStep} 
                      max={totalSteps}
                    ></progress>
                  </div>

                  {/* Desktop Progress Indicator */}
                  <div className="hidden md:block mb-8">
                    <ul className="steps steps-horizontal w-full">
                      <li className="step step-primary" data-content="1"></li>
                      <li className="step step-primary" data-content="2"></li>
                      <li className="step step-primary" data-content="3"></li>
                      <li className="step step-primary" data-content="4"></li>
                      <li className="step step-primary" data-content="5"></li>
                      <li className="step step-primary" data-content="6"></li>
                      <li className="step step-primary" data-content="7"></li>
                    </ul>
                  </div>
                </>
              );
            })()}            {/* Final step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <h1 className="card-title text-3xl mb-6 justify-center">Story Generation Started!</h1>
                
                {/* Success content */}
                <div className="py-12 space-y-6">
                  <div className="text-6xl">🚀</div>                  <h2 className="text-2xl font-bold">Your Story is Being Created!</h2>
                  <p className="text-lg text-gray-600">
                    We&apos;ve started generating your personalized story. This process typically takes 5-15 minutes.
                  </p>
                  
                  <div className="alert alert-info">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">📱 Track Your Progress</span>
                      <span className="text-sm mt-2">
                        Visit &quot;My Stories&quot; to see real-time updates on your story generation progress.
                        We&apos;ll show you each step as it completes: outline creation, chapter writing, and illustration generation.
                      </span>
                    </div>
                  </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <Link href="/my-stories" className="btn btn-primary">
                      📖 View My Stories & Track Progress
                    </Link>
                    <Link href="/tell-your-story/step-1" className="btn btn-outline">
                      ✨ Create Another Story
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
