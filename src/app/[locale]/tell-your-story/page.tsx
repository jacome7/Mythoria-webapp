import { redirect } from 'next/navigation';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function TellYourStoryPage() {
  const locale = useLocale();
  return (
    <div className="container mx-auto px-4 py-8">
      <SignedOut>
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Ready to Tell Your Story?</h1>
          <p className="text-lg text-gray-600">
            Sign up to start creating your magical adventures with Mythoria.
          </p>
          <div className="space-x-4">
            <Link href={`/${locale}/sign-up`} className="btn btn-primary">
              Get Started
            </Link>
            <Link href={`/${locale}/sign-in`} className="btn btn-outline">
              Sign In
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {redirect('/tell-your-story/step-1')}
      </SignedIn>
    </div>
  );
}
