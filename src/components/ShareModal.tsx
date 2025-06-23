'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FiX,
  FiShare2,
  FiCopy,
  FiMail,
  FiUsers,
  FiGlobe,
  FiLock,
  FiCheck,
  FiInfo
} from 'react-icons/fi';
import { FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { trackStoryManagement } from '../lib/analytics';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
  isPublic?: boolean;
  slug?: string;
  onShareSuccess?: (shareData: ShareData) => void;
}

interface ShareData {
  success: boolean;
  linkType: 'private' | 'public';
  url: string;
  token?: string;
  accessLevel?: 'view' | 'edit';
  expiresAt?: string;
  message: string;
}

export default function ShareModal({ isOpen, onClose, storyId, storyTitle, isPublic = false, slug, onShareSuccess }: ShareModalProps) {
  const t = useTranslations('common.Components.ShareModal');
  const [allowEdit, setAllowEdit] = useState(false);
  const [makePublic, setMakePublic] = useState(isPublic);
  const [loading, setLoading] = useState(false); const [shareData, setShareData] = useState<ShareData | null>(null);
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  // If the story is already public, show the public link
  const isCurrentlyPublic = isPublic && slug;

  const handleCreateShareLink = async () => {
    setLoading(true);
    try {
      console.log('Creating share link for story:', storyId);
      console.log('Request body:', { allowEdit, makePublic, expiresInDays: 30 });

      const response = await fetch(`/api/stories/${storyId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowEdit,
          makePublic,
          expiresInDays: 30,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      if (data.success) {
        setShareData(data);
        onShareSuccess?.(data);

        // Track story sharing
        trackStoryManagement.shared({
          story_id: storyId,
          story_title: storyTitle,
          share_type: makePublic ? 'public' : 'private',
          allow_edit: allowEdit,
          expires_in_days: 30
        });
      } else {
        console.error('Error creating share link:', data.error);
        alert(`Error creating share link: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert(`Failed to create share link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (path: string) => {
    return `${window.location.origin}${path}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleNativeShare = async (url: string) => {
    const sharePayload = {
      title: storyTitle,
      text: `Check out "${storyTitle}" on Mythoria 📚`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copy to clipboard
      copyToClipboard(url);
    }
  };

  const handleWhatsApp = (url: string) => {
    const message = encodeURIComponent(`Check out "${storyTitle}" on Mythoria 📚 ${url}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleFacebook = (url: string) => {
    const encodedUrl = encodeURIComponent(url);
    const message = encodeURIComponent(`Check out "${storyTitle}" on Mythoria 📚`);
    window.open(`https://www.facebook.com/dialog/share?app_id=YOUR_APP_ID&href=${encodedUrl}&quote=${message}`, '_blank');
  };

  const handleEmail = (url: string) => {
    const subject = encodeURIComponent(`Check out "${storyTitle}"`);
    const body = encodeURIComponent(`I wanted to share this story with you:\n\n"${storyTitle}"\n\n${url}\n\nEnjoy reading! 📚`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };
  const reset = () => {
    setShareData(null);
    setAllowEdit(false);
    setMakePublic(isPublic);
    setCopied(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">          <div className="flex items-center gap-3">
            <FiShare2 className="text-primary text-xl" />
            <h2 className="text-xl font-semibold">{t('title')}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>        <div className="p-6 space-y-6">
          {isCurrentlyPublic && !shareData ? (
            <>
              {/* Public Story Display */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-medium text-green-900 mb-2">{t('publicStoryTitle') || 'Public Story'}</h3>
                <p className="text-sm text-green-700 mb-3">{t('publicStoryDesc') || 'This story is currently public and can be viewed by anyone.'}</p>
                
                {/* Public URL */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-green-800">
                    {t('publicUrl') || 'Public URL'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getFullUrl(`/p/${slug}`)}
                      readOnly
                      className="flex-1 input input-bordered text-sm bg-white"
                    />
                    <button
                      onClick={() => copyToClipboard(getFullUrl(`/p/${slug}`))}
                      className="btn btn-outline btn-sm"
                    >
                      {copied ? (
                        <>
                          <FiCheck className="text-green-600" />
                          {t('copied')}
                        </>
                      ) : (
                        <>
                          <FiCopy />
                          {t('copy')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggle to Make Private */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FiLock className="text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{t('makePrivate') || 'Make story private'}</h4>
                      <p className="text-sm text-gray-600">{t('makePrivateDesc') || 'Remove public access and make the story private'}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={makePublic}
                    onChange={(e) => setMakePublic(e.target.checked)}
                  />
                </div>
              </div>

              {/* Share Options for Public Story */}
              <div className="space-y-3">
                <h4 className="font-medium text-center">{t('shareVia')}</h4>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleWhatsApp(getFullUrl(`/p/${slug}`))}
                    className="btn btn-outline btn-sm flex items-center gap-2"
                  >
                    <FaWhatsapp className="text-green-600" />
                    {t('whatsapp')}
                  </button>

                  <button
                    onClick={() => handleFacebook(getFullUrl(`/p/${slug}`))}
                    className="btn btn-outline btn-sm flex items-center gap-2"
                  >
                    <FaFacebook className="text-blue-600" />
                    {t('facebook')}
                  </button>

                  <button
                    onClick={() => handleEmail(getFullUrl(`/p/${slug}`))}
                    className="btn btn-outline btn-sm flex items-center gap-2"
                  >
                    <FiMail />
                    {t('email')}
                  </button>

                  <button
                    onClick={() => handleNativeShare(getFullUrl(`/p/${slug}`))}
                    className="btn btn-outline btn-sm flex items-center gap-2"
                  >
                    <FiShare2 />
                    {t('more')}
                  </button>
                </div>
              </div>

              {/* Update Button */}
              {!makePublic && (
                <button
                  onClick={handleCreateShareLink}
                  disabled={loading}
                  className="w-full btn btn-primary"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <FiLock />
                      {t('makePrivate') || 'Make Private'}
                    </>
                  )}
                </button>
              )}
            </>
          ) : !shareData ? (
            <>
              {/* Story Info */}              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-1">{storyTitle}</h3>
                <p className="text-sm text-gray-600">{t('chooseOptions')}</p>
              </div>

              {/* Share Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiUsers className="text-blue-600" />
                    </div>                    <div>
                      <h4 className="font-medium">{t('allowEdit')}</h4>
                      <p className="text-sm text-gray-600">{t('allowEditDesc')}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={allowEdit}
                    onChange={(e) => setAllowEdit(e.target.checked)}
                    disabled={makePublic}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiGlobe className="text-green-600" />
                    </div>                    <div>
                      <h4 className="font-medium">{t('makePublic')}</h4>
                      <p className="text-sm text-gray-600">{t('makePublicDesc')}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={makePublic}
                    onChange={(e) => {
                      setMakePublic(e.target.checked);
                      if (e.target.checked) {
                        setAllowEdit(false);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FiInfo className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">                    <p className="font-medium text-blue-900 mb-2">{t('optionsExplained')}</p>
                    <ul className="space-y-1 text-blue-700">
                      <li><strong>{t('privateView')}</strong></li>
                      <li><strong>{t('privateEdit')}</strong></li>
                      <li><strong>{t('publicOption')}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Generate Link Button */}
              <button
                onClick={handleCreateShareLink}
                disabled={loading}
                className="w-full btn btn-primary"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>                ) : (
                  <>
                    <FiShare2 />
                    {t('generateLink')}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <FiCheck className="text-green-600 text-2xl mx-auto mb-2" />
                  <p className="text-green-800 font-medium">{shareData.message}</p>
                </div>

                {/* Share URL */}                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shareUrl')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getFullUrl(shareData.url)}
                      readOnly
                      className="flex-1 input input-bordered text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(getFullUrl(shareData.url))}
                      className="btn btn-outline btn-sm"
                    >                      {copied ? (
                        <>
                          <FiCheck className="text-green-600" />
                          {t('copied')}
                        </>
                      ) : (
                        <>
                          <FiCopy />
                          {t('copy')}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Share Options */}                <div className="space-y-3">
                  <h4 className="font-medium text-center">{t('shareVia')}</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleWhatsApp(getFullUrl(shareData.url))}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >                      <FaWhatsapp className="text-green-600" />
                      {t('whatsapp')}
                    </button>

                    <button
                      onClick={() => handleFacebook(getFullUrl(shareData.url))}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <FaFacebook className="text-blue-600" />
                      {t('facebook')}
                    </button>

                    <button
                      onClick={() => handleEmail(getFullUrl(shareData.url))}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <FiMail />
                      {t('email')}
                    </button>

                    <button
                      onClick={() => handleNativeShare(getFullUrl(shareData.url))}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <FiShare2 />
                      {t('more')}
                    </button>
                  </div>
                </div>

                {/* Link Info */}
                {shareData.linkType === 'private' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">                    <div className="flex items-center gap-2 text-yellow-800 text-sm">
                      <FiLock />
                      <span>{t('privateExpires')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 btn btn-outline"
                >
                  {t('createAnother')}
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 btn btn-primary"
                >
                  {t('done')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
