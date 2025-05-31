import { getCurrentAuthor } from '@/lib/auth';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import MyStoriesTable from '@/components/MyStoriesTable';

export default async function MyStoriesPage() {
  const author = await getCurrentAuthor();

  return (
    <div className="container mx-auto px-4 py-8">
      <SignedOut>
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Welcome</h1>
          <p className="text-lg text-gray-600">
            You need to be signed in to view your stories.
          </p>
          <div className="space-x-4">
            <Link href="/sign-in" className="btn btn-primary">
              Sign In
            </Link>
            <Link href="/sign-up" className="btn btn-outline">
              Create Account
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <MyStoriesTable authorName={author?.displayName || 'Storyteller'} />
      </SignedIn>
    </div>
  );
}
