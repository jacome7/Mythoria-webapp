'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminHeader from '../../../../components/AdminHeader';
import AdminFooter from '../../../../components/AdminFooter';

interface StoryDetail {
  storyId: string;
  title: string;
  authorName: string;
  status: string;
  isPublic: boolean;
  isFeatured: boolean;
  featureImageUri: string | null;
  synopsis: string | null;
  novelStyle: string | null;
  graphicalStyle: string | null;
  htmlUri: string | null;
  pdfUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function StoryDetailPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const params = useParams();
  const storyId = params.storyId as string;
  
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featureImageUri, setFeatureImageUri] = useState('');
  const [showFeatureImageInput, setShowFeatureImageInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) {
      // Check if user is signed in
      if (!isSignedIn) {
        router.push('/');
        return;
      }

      // Check if user has the required metadata
      const publicMetadata = user?.publicMetadata as { [key: string]: string } | undefined;
      if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
        router.push('/');
        return;
      }

      // Fetch story data if authorized
      fetchStory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user, router, storyId]);

  const fetchStory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/stories/${storyId}`);
      if (response.ok) {
        const data = await response.json();
        setStory(data.story);
        setIsFeatured(data.story.isFeatured);
        setFeatureImageUri(data.story.featureImageUri || '');
        setShowFeatureImageInput(data.story.isFeatured);
      } else {
        setError('Failed to fetch story details');
      }
    } catch (error) {
      console.error('Error fetching story:', error);
      setError('Error fetching story details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = () => {
    const newFeaturedState = !isFeatured;
    setIsFeatured(newFeaturedState);
    setShowFeatureImageInput(newFeaturedState);
    
    // If unfeaturing, clear the image URI
    if (!newFeaturedState) {
      setFeatureImageUri('');
    }
  };

  const handleSave = async () => {
    // Validate that featured stories have a feature image
    if (isFeatured && (!featureImageUri || featureImageUri.trim() === '')) {
      setError('Featured stories must have a feature image URI');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFeatured,
          featureImageUri: isFeatured ? featureImageUri : null,
        }),
      });

      if (response.ok) {
        // Refresh the story data
        await fetchStory();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update story');
      }
    } catch (error) {
      console.error('Error updating story:', error);
      setError('Error updating story');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-warning">Draft</span>;
      case 'writing':
        return <span className="badge badge-info">Writing</span>;
      case 'published':
        return <span className="badge badge-success">Published</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // Don't render content if not authorized
  if (!isSignedIn || !user?.publicMetadata || (user.publicMetadata as { [key: string]: string })['autorizaçãoDeAcesso'] !== 'Comejá') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        </main>
        <AdminFooter />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600">Story not found</h2>
            <button
              onClick={() => router.push('/portaldegestao/stories')}
              className="btn btn-primary mt-4"
            >
              Back to Stories
            </button>
          </div>
        </main>
        <AdminFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Story Details</h1>
            <button
              onClick={() => router.push('/portaldegestao/stories')}
              className="btn btn-outline"
            >
              Back to Stories
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Story Information */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Title</label>
                  <p className="text-lg font-medium">{story.title}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-600">Author</label>
                  <p className="text-lg">{story.authorName}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <div className="mt-1">{formatStatus(story.status)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-600">Public</label>
                  <div className="mt-1">
                    {story.isPublic ? (
                      <span className="badge badge-success">Public</span>
                    ) : (
                      <span className="badge badge-neutral">Private</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Novel Style</label>
                  <p className="text-lg">{story.novelStyle || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-600">Graphical Style</label>
                  <p className="text-lg">{story.graphicalStyle || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-600">Created At</label>
                  <p className="text-lg">{formatDate(story.createdAt)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-600">Updated At</label>
                  <p className="text-lg">{formatDate(story.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Synopsis */}
            {story.synopsis && (
              <div className="mt-6">
                <label className="text-sm font-semibold text-gray-600">Synopsis</label>
                <p className="text-lg mt-2 whitespace-pre-wrap">{story.synopsis}</p>
              </div>
            )}

            {/* File Links */}
            <div className="mt-6">
              <label className="text-sm font-semibold text-gray-600">Available Files</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {story.htmlUri && (
                  <a
                    href={story.htmlUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    View HTML
                  </a>
                )}
                {story.pdfUri && (
                  <a
                    href={story.pdfUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    Download PDF
                  </a>
                )}
                {!story.htmlUri && !story.pdfUri && (
                  <p className="text-gray-500">No files available</p>
                )}
              </div>
            </div>
          </div>

          {/* Featured Management - Only for Public Stories */}
          {story.isPublic && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Featured Story Management</h2>
              
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-lg">Featured Story</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={isFeatured}
                      onChange={handleToggleFeatured}
                    />
                  </label>
                </div>

                {showFeatureImageInput && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Feature Image URI</span>
                      <span className="label-text-alt text-red-500">Required for featured stories</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="input input-bordered w-full"
                      value={featureImageUri}
                      onChange={(e) => setFeatureImageUri(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setIsFeatured(story.isFeatured);
                      setFeatureImageUri(story.featureImageUri || '');
                      setShowFeatureImageInput(story.isFeatured);
                      setError(null);
                    }}
                    className="btn btn-outline"
                    disabled={isSaving}
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving && <span className="loading loading-spinner"></span>}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {!story.isPublic && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="ml-2 text-yellow-800">
                  This story is private and cannot be featured. Only public stories can be featured.
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
      <AdminFooter />
    </div>
  );
}
