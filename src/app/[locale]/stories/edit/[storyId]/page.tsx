'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { FiBook, FiVolume2, FiEdit3, FiShare2, FiArrowLeft } from 'react-icons/fi';
import BookEditor from '../../../../../components/BookEditor';
import ShareModal from '../../../../../components/ShareModal';
import ToastContainer from '../../../../../components/ToastContainer';
import { useToast } from '../../../../../hooks/useToast';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  htmlUri?: string;
  audiobookUri?: Array<{
    chapterTitle: string;
    audioUri: string;
    duration: number;
    imageUri?: string;
  }>;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditStoryPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const storyId = params.storyId as string;
  const [story, setStory] = useState<Story | null>(null);
  const [storyContent, setStoryContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Toast notifications
  const toast = useToast();

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          // Only allow access to published stories
          if (data.story.status !== 'published') {
            setError('This story is not available for editing yet.');
            return;
          }
          setStory(data.story);

          // Use the HTML content from the API response
          if (data.htmlContent) {
            setStoryContent(data.htmlContent);
          } else if (data.story.htmlUri) {
            // Fallback message if content couldn't be fetched
            setStoryContent('<p>Story content is being prepared. Please check back later.</p>');
          } else {
            setStoryContent('<p>Story content is not yet available. The story may still be generating.</p>');
          }
        } else if (response.status === 404) {
          setError('Story not found.');
        } else if (response.status === 403) {
          setError('You do not have permission to edit this story.');
        } else {
          setError('Failed to load the story. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        setError('Failed to load the story. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchStory();
    }
  }, [storyId]);

  // Handle saving edited content
  const handleSaveEdit = async (html: string) => {
    try {
      const response = await fetch(`/api/books/${storyId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          source: 'manual'
        }),
      });

      if (response.ok) {
        await response.json(); // Parse response but don't need to store result
        // Update the story content with the new HTML
        setStoryContent(html);
        // Show success message
        toast.success('Story saved successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save story');
      }
    } catch (error) {
      console.error('Error saving story:', error);
      toast.error('Failed to save story. Please try again.');
      throw error;
    }
  };

  const handleCancelEdit = () => {
    router.push(`/${locale}/stories/read/${storyId}`);
  };

  const navigateToRead = () => {
    router.push(`/${locale}/stories/read/${storyId}`);
  };

  const navigateToListen = () => {
    router.push(`/${locale}/stories/listen/${storyId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <SignedOut>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">Access Restricted</h1>
            <p className="text-lg text-gray-600">
              You need to be signed in to edit stories.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push(`/${locale}/sign-in`)}
                className="btn btn-primary"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push(`/${locale}/sign-up`)}
                className="btn btn-outline"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {error ? (
          <div className="container mx-auto px-4 py-8">
            <div className="text-center space-y-6">
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={() => router.push(`/${locale}/my-stories`)}
                className="btn btn-primary"
              >
                Back to My Stories
              </button>
            </div>
          </div>
        ) : story ? (
          <div className="space-y-6">            {/* Story Header */}
            <div className="container mx-auto px-4 py-6">
              <div className="text-center space-y-4">
                {/* Navigation Buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={navigateToRead}
                    className="btn btn-outline btn-primary"
                  >
                    <FiBook className="w-4 h-4 mr-2" />
                    Read
                  </button>
                  <button
                    onClick={navigateToListen}
                    className="btn btn-outline btn-primary"
                    disabled={!story?.audiobookUri || story.audiobookUri.length === 0}
                  >
                    <FiVolume2 className="w-4 h-4 mr-2" />
                    Listen
                  </button>
                  <button className="btn btn-primary">
                    <FiEdit3 className="w-4 h-4 mr-2" />
                    Editing
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="btn btn-outline btn-primary"
                  >
                    <FiShare2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                </div>
              </div>
            </div>            {/* Edit Mode */}
            <BookEditor
              initialContent={storyContent || ''}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              storyId={storyId}
              storyMetadata={{
                targetAudience: story?.targetAudience,
                graphicalStyle: story?.graphicalStyle,
                title: story?.title
              }}
            />

            {/* Back to Stories Button */}
            <div className="container mx-auto px-4 pb-8">
              <div className="text-center">
                <button
                  onClick={() => router.push(`/${locale}/my-stories`)}
                  className="btn btn-outline"
                >
                  <FiArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Stories
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SignedIn>

      {/* Share Modal */}
      {story && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          storyId={story.storyId}
          storyTitle={story.title}
          onShareSuccess={(shareData) => {
            console.log('Share successful:', shareData);
          }}
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}
