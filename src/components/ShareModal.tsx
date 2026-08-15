'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Globe, Info, Lock, Mail, Share2, Users, X } from 'lucide-react';
import { FaFacebook, FaWhatsapp } from 'react-icons/fa';
import { useLocale, useTranslations } from 'next-intl';
import { trackEvent } from '@/lib/analytics';
import {
  buildStoryShareUrl,
  storyShareEventParams,
  type StoryShareContext,
  type StoryShareMethod,
  type StoryShareScope,
} from '@/lib/analytics/story-share';

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
  storyRef: string;
  token?: string;
  accessLevel?: 'view' | 'edit';
  expiresAt?: string;
  message: string;
}

function scopeForShare(
  shareData: ShareData | null,
  isPublic: boolean,
): StoryShareScope | undefined {
  if (shareData?.linkType === 'public' || (!shareData && isPublic)) return 'public';
  if (shareData?.linkType === 'private') {
    return shareData.accessLevel === 'edit' ? 'private_edit' : 'private_view';
  }
  return undefined;
}

export default function ShareModal({
  isOpen,
  onClose,
  storyId,
  storyTitle,
  isPublic = false,
  slug,
  onShareSuccess,
}: ShareModalProps) {
  const locale = useLocale();
  const tCommonShareModal = useTranslations('ShareModal');
  const [allowEdit, setAllowEdit] = useState(false);
  const [makePublic, setMakePublic] = useState(isPublic);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [storyRef, setStoryRef] = useState<string>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStoryRef(undefined);
  }, [storyId]);

  useEffect(() => {
    if (!isOpen || !storyId || storyRef) return;

    let active = true;
    void fetch(`/api/stories/${storyId}/share`)
      .then(async (response) => (response.ok ? response.json() : undefined))
      .then((result: { storyRef?: string } | undefined) => {
        if (active && result?.storyRef) setStoryRef(result.storyRef);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isOpen, storyId, storyRef]);

  if (!isOpen) return null;

  const isCurrentlyPublic = isPublic && slug;
  const currentStoryRef = shareData?.storyRef || storyRef;
  const scope = scopeForShare(shareData, Boolean(isCurrentlyPublic));
  const basePath = shareData?.url || (isCurrentlyPublic ? `/p/${slug}` : '');

  const getFullUrl = (path: string) => `${window.location.origin}/${locale}${path}`;
  const contextFor = (method: StoryShareMethod): StoryShareContext | undefined =>
    currentStoryRef && scope ? { itemId: currentStoryRef, method, scope } : undefined;
  const taggedUrl = (method: StoryShareMethod): string | undefined => {
    const context = contextFor(method);
    return context && basePath ? buildStoryShareUrl(getFullUrl(basePath), context) : undefined;
  };
  const recordShare = (context: StoryShareContext) => {
    trackEvent('share', {
      method: context.method,
      content_type: 'story',
      item_id: context.itemId,
      ...storyShareEventParams(context),
    });
  };

  const handleCreateShareLink = async () => {
    if (!storyId || storyId === 'undefined') {
      alert(tCommonShareModal('alerts.invalidStoryId'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/stories/${storyId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowEdit, makePublic, expiresInDays: 30 }),
      });
      const data = (await response.json().catch(() => undefined)) as ShareData | undefined;
      if (!response.ok || !data?.success) throw new Error('Share link creation failed');

      setShareData(data);
      setStoryRef(data.storyRef);
      onShareSuccess?.(data);
    } catch {
      alert(tCommonShareModal('errors.shareLinkCreationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (url: string | undefined) => {
    const context = contextFor('copy_link');
    if (!url || !context) return;
    try {
      await navigator.clipboard.writeText(url);
      recordShare(context);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // A rejected clipboard operation is not a successful share handoff.
    }
  };

  const handleNativeShare = async () => {
    const url = taggedUrl('native_share');
    const context = contextFor('native_share');
    if (!url || !context) return;

    if (!navigator.share) {
      await copyToClipboard(taggedUrl('copy_link'));
      return;
    }

    try {
      await navigator.share({
        title: storyTitle,
        text: tCommonShareModal('shareMessages.checkOut', { storyTitle }),
        url,
      });
      recordShare(context);
    } catch {
      // Browsers expose cancellation and failure through the same rejection path.
    }
  };

  const launchShare = (method: Exclude<StoryShareMethod, 'copy_link' | 'native_share'>) => {
    const url = taggedUrl(method);
    const context = contextFor(method);
    if (!url || !context) return;

    const message = tCommonShareModal('shareMessages.checkOut', { storyTitle });
    const destination =
      method === 'whatsapp'
        ? `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`
        : method === 'facebook'
          ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
          : `mailto:?subject=${encodeURIComponent(
              tCommonShareModal('shareMessages.emailSubject', { storyTitle }),
            )}&body=${encodeURIComponent(tCommonShareModal('shareMessages.emailBody', { storyTitle, url }))}`;
    const target = method === 'email' ? '_self' : '_blank';
    if (window.open(destination, target, 'noopener,noreferrer')) recordShare(context);
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

  const shareOptions = (copyUrl: string | undefined) => (
    <div className="space-y-3">
      <h4 className="font-medium text-center">{tCommonShareModal('shareVia')}</h4>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => launchShare('whatsapp')}
          disabled={!taggedUrl('whatsapp')}
          className="btn btn-outline btn-sm flex items-center gap-2"
        >
          <FaWhatsapp className="text-green-600" />
          {tCommonShareModal('whatsapp')}
        </button>
        <button
          onClick={() => launchShare('facebook')}
          disabled={!taggedUrl('facebook')}
          className="btn btn-outline btn-sm flex items-center gap-2"
        >
          <FaFacebook className="text-blue-600" />
          {tCommonShareModal('facebook')}
        </button>
        <button
          onClick={() => launchShare('email')}
          disabled={!taggedUrl('email')}
          className="btn btn-outline btn-sm flex items-center gap-2"
        >
          <Mail />
          {tCommonShareModal('email')}
        </button>
        <button
          onClick={() => void handleNativeShare()}
          disabled={!taggedUrl('native_share')}
          className="btn btn-outline btn-sm flex items-center gap-2"
        >
          <Share2 />
          {tCommonShareModal('more')}
        </button>
      </div>
      {copyUrl && (
        <div className="flex gap-2">
          <input
            type="text"
            value={copyUrl}
            readOnly
            className="flex-1 input input-bordered text-sm"
          />
          <button onClick={() => void copyToClipboard(copyUrl)} className="btn btn-outline btn-sm">
            {copied ? <Check className="text-green-600" /> : <Copy />}
            {copied ? tCommonShareModal('copied') : tCommonShareModal('copy')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Share2 className="text-primary text-xl" />
            <h2 className="text-xl font-semibold">{tCommonShareModal('title')}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="text-xl" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {isCurrentlyPublic && !shareData ? (
            <>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-4">
                <div>
                  <h3 className="font-medium text-green-900 mb-2">
                    {tCommonShareModal('publicStoryTitle')}
                  </h3>
                  <p className="text-sm text-green-700">{tCommonShareModal('publicStoryDesc')}</p>
                </div>
                {shareOptions(taggedUrl('copy_link'))}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Lock className="text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{tCommonShareModal('makePrivate')}</h4>
                    <p className="text-sm text-gray-600">{tCommonShareModal('makePrivateDesc')}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={makePublic}
                  onChange={(event) => setMakePublic(event.target.checked)}
                />
              </div>
              {!makePublic && (
                <button
                  onClick={() => void handleCreateShareLink()}
                  disabled={loading}
                  className="w-full btn btn-primary"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      <Lock />
                      {tCommonShareModal('makePrivate')}
                    </>
                  )}
                </button>
              )}
            </>
          ) : !shareData ? (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-1">{storyTitle}</h3>
                <p className="text-sm text-gray-600">{tCommonShareModal('chooseOptions')}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{tCommonShareModal('allowEdit')}</h4>
                      <p className="text-sm text-gray-600">{tCommonShareModal('allowEditDesc')}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={allowEdit}
                    onChange={(event) => setAllowEdit(event.target.checked)}
                    disabled={makePublic}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Globe className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{tCommonShareModal('makePublic')}</h4>
                      <p className="text-sm text-gray-600">{tCommonShareModal('makePublicDesc')}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={makePublic}
                    onChange={(event) => {
                      setMakePublic(event.target.checked);
                      if (event.target.checked) setAllowEdit(false);
                    }}
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-2">
                    {tCommonShareModal('optionsExplained')}
                  </p>
                  <ul className="space-y-1 text-blue-700">
                    <li>
                      <strong>{tCommonShareModal('privateView')}</strong>
                    </li>
                    <li>
                      <strong>{tCommonShareModal('privateEdit')}</strong>
                    </li>
                    <li>
                      <strong>{tCommonShareModal('publicOption')}</strong>
                    </li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => void handleCreateShareLink()}
                disabled={loading}
                className="w-full btn btn-primary"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <>
                    <Share2 />
                    {tCommonShareModal('generateLink')}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="text-green-600 text-2xl mx-auto mb-2" />
                  <p className="text-green-800 font-medium">{shareData.message}</p>
                </div>
                {basePath && shareOptions(taggedUrl('copy_link'))}
                {shareData.linkType === 'private' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-yellow-800 text-sm">
                    <Lock />
                    <span>{tCommonShareModal('privateExpires')}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 btn btn-outline">
                  {tCommonShareModal('createAnother')}
                </button>
                <button onClick={handleClose} className="flex-1 btn btn-primary">
                  {tCommonShareModal('done')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
