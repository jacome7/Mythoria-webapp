'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';
import { toAbsoluteImageUrl } from '@/utils/image-url';
import { getLogoForGraphicalStyle } from '@/utils/logo-mapping';

interface StoryPreview {
  title: string;
  synopsis: string;
  authorName: string;
  coverUri?: string;
  targetAudience?: string;
  graphicalStyle?: string;
}

interface ApiResponse {
  success: boolean;
  requiresAuth?: boolean;
  storyPreview?: StoryPreview;
  accessLevel?: string;
  redirectUrl?: string;
  error?: string;
}

export default function SharedStoryPage() {
  const params = useParams<{ token?: string }>();
  const router = useRouter();
  const locale = useLocale();
  const tSharedStoryPage = useTranslations('SharedStoryPage');
  const tStoryReader = useTranslations('StoryReader');
  const tAuth = useTranslations('Auth');
  const tActions = useTranslations('Actions');
  const token = (params?.token as string | undefined) ?? '';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyPreview, setStoryPreview] = useState<StoryPreview | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [accessLevel, setAccessLevel] = useState<string>('');

  const sharedStoryPath = useMemo(() => `/${locale}/s/${token}`, [locale, token]);

  useEffect(() => {
    if (!token) return;

    const accessSharedStory = async () => {
      try {
        const response = await fetch(`/api/share/${token}`);
        const result: ApiResponse = await response.json();

        if (result.success && result.redirectUrl) {
          // Normalize legacy redirect (if old format /stories/<id>) to /stories/read/<id>
          let target = result.redirectUrl;
          const legacyMatch = target.match(/^\/stories\/([^\/\?]+)(.*)$/);
          if (legacyMatch && !target.startsWith('/stories/read/')) {
            const id = legacyMatch[1];
            const suffix = legacyMatch[2] || '';
            target = `/stories/read/${id}${suffix}`;
          }
          router.push(`/${locale}${target}`);
        } else if (result.requiresAuth && result.storyPreview) {
          // Show preview for unauthenticated users
          setStoryPreview(result.storyPreview);
          setRequiresAuth(true);
          setAccessLevel(result.accessLevel || '');
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        console.error('Error accessing shared story:', err);
        setError(tSharedStoryPage('errors.failedToAccess'));
      } finally {
        setLoading(false);
      }
    };

    accessSharedStory();
  }, [token, router, locale, tSharedStoryPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <FiLoader className="animate-spin text-4xl text-primary mx-auto" />
          <h2 className="text-xl font-semibold">{tSharedStoryPage('loading.title')}</h2>
          <p className="text-gray-600">{tSharedStoryPage('loading.subtitle')}</p>
        </div>
      </div>
    );
  }

  if (requiresAuth && storyPreview) {
    // Build a safe redirect param so that after sign-in/up user returns to this shared story
    const signInUrl = `/${locale}/sign-in?redirect=${encodeURIComponent(sharedStoryPath)}`;
    const signUpUrl = `/${locale}/sign-up?redirect=${encodeURIComponent(sharedStoryPath)}`;
    const logoUrl = getLogoForGraphicalStyle(storyPreview.graphicalStyle);
    
    return (
      <div className="min-h-screen bg-base-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center space-y-8">
            {/* Story Preview Section */}
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-gray-900">{storyPreview.title}</h1>
              
              {/* Cover Image */}
              {storyPreview.coverUri && toAbsoluteImageUrl(storyPreview.coverUri) && (
                <div className="flex justify-center">
                  <div className="relative">
                    <Image 
                      src={toAbsoluteImageUrl(storyPreview.coverUri)!} 
                      alt={`${storyPreview.title} - Book Cover`}
                      className="rounded-lg shadow-lg max-w-sm w-full h-auto"
                      width={400}
                      height={600}
                      priority
                    />
                  </div>
                </div>
              )}
              
              {/* Author Name */}
              <p className="text-xl text-gray-700">
                {tStoryReader('byAuthor', { authorName: storyPreview.authorName })}
              </p>
              
              {/* Synopsis */}
              {storyPreview.synopsis && (
                <div className="bg-base-200 rounded-lg p-6 text-left max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold mb-3">{tStoryReader('synopsis')}</h3>
                  <p className="text-gray-700 leading-relaxed">{storyPreview.synopsis}</p>
                </div>
              )}
            </div>

            {/* Authentication Required Section */}
            <div className="bg-base-200 rounded-lg p-8 space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {accessLevel === 'edit'
                    ? tSharedStoryPage('auth.signInToEdit')
                    : tSharedStoryPage('auth.signInToRead')
                  }
                </h2>
                <p className="text-gray-600 text-lg">
                  {accessLevel === 'edit'
                    ? tSharedStoryPage('auth.createAccountToCollaborate')
                    : tSharedStoryPage('auth.createAccountToReadFull')
                  }
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={signInUrl}
                  className="btn btn-primary btn-lg px-8"
                >
                  {tAuth('signIn')}
                </a>
                <a
                  href={signUpUrl}
                  className="btn btn-outline btn-lg px-8"
                >
                  {tAuth('createAccount')}
                </a>
              </div>
            </div>

            {/* Mythoria Branding */}
            <div className="space-y-4">
              <p className="text-gray-600">
                {tStoryReader('craftedWith')}
              </p>
              <Image 
                src={logoUrl} 
                alt="Mythoria Logo" 
                className="mx-auto max-w-xs w-full h-auto"
                width={300}
                height={150}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <FiAlertCircle className="text-4xl text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">{tSharedStoryPage('errors.unableToAccess')}</h2>
          <p className="text-gray-600">{error}</p>
          
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-outline btn-sm"
            >
              {tActions('tryAgain')}
            </button>
            <div>
              <a
                href={`/${locale}`}
                className="btn btn-primary btn-sm"
              >
                {tActions('goToHomepage')}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // This shouldn't normally be reached as we redirect on success
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <FiLoader className="animate-spin text-4xl text-primary mx-auto" />
        <h2 className="text-xl font-semibold">{tSharedStoryPage('redirecting')}</h2>
      </div>
    </div>
  );
}
