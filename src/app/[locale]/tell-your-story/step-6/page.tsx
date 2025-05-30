import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import StepNavigation from '@/components/StepNavigation';

export default function Step6Page() {

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      
      <SignedIn>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">            {/* Progress indicator */}
            <div className="mb-8">
              <ul className="steps steps-horizontal w-full">
                <li className="step step-primary" data-content="1"></li>
                <li className="step step-primary" data-content="2"></li>
                <li className="step step-primary" data-content="3"></li>
                <li className="step step-primary" data-content="4"></li>
                <li className="step step-primary" data-content="5"></li>
                <li className="step step-primary" data-content="6"></li>
                <li className="step" data-content="7"></li>
              </ul>
            </div>

            {/* Step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-3xl mb-6">Chapter 6 - The Payment</h1>
                
                {/* Step 6 content will go here */}
                <div className="text-center py-12">
                  <p className="text-lg text-gray-600">Step 6 content coming soon...</p>
                </div>

                <StepNavigation 
                  currentStep={6}
                  totalSteps={7}
                  nextHref="/tell-your-story/step-7"
                  prevHref="/tell-your-story/step-5"
                />
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
