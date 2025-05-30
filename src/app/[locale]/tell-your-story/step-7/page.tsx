import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function Step7Page() {

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
                <li className="step step-primary" data-content="7"></li>
              </ul>
            </div>

            {/* Final step content */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <h1 className="card-title text-3xl mb-6 justify-center">Happy Reading!</h1>
                
                {/* Success content */}
                <div className="py-12 space-y-6">
                  <div className="text-6xl">🎉</div>
                  <h2 className="text-2xl font-bold">Congratulations!</h2>
                  <p className="text-lg text-gray-600">
                    Your story has been created successfully. Get ready to embark on an amazing adventure!
                  </p>
                  
                  <div className="flex gap-4 justify-center mt-8">
                    <Link href="/my-stories" className="btn btn-primary">
                      View My Stories
                    </Link>
                    <Link href="/tell-your-story/step-1" className="btn btn-outline">
                      Create Another Story
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
