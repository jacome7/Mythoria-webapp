'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import ShareModal from './ShareModal';
import ToastContainer from './ToastContainer';
import StoryRow from './my-stories/StoryRow';
import { SelfPrintModal } from './self-print/SelfPrintModal';
import { useStoriesTable } from '@/hooks/useStoriesTable';
import { Story } from '@/types/story';
import { useToast } from '@/hooks/useToast';

export default function MyStoriesTable() {
  const tMyStoriesPage = useTranslations('MyStoriesPage');
  const tCommonActions = useTranslations('Actions');
  const locale = useLocale();

  const { paginatedStories, loading, fetchStories, setStories } = useStoriesTable();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [storyToShare, setStoryToShare] = useState<Story | null>(null);
  const [selfPrintStory, setSelfPrintStory] = useState<Story | null>(null);
  const [isSelfPrintOpen, setIsSelfPrintOpen] = useState(false);
  const { toasts, removeToast, successWithAction, error } = useToast();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDeleteClick = (story: Story) => {
    setStoryToDelete(story);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!storyToDelete) return;
    try {
      const response = await fetch(`/api/my-stories/${storyToDelete.storyId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setStories((prev) => prev.filter((s) => s.storyId !== storyToDelete.storyId));
        setDeleteModalOpen(false);
        setStoryToDelete(null);
      }
    } catch (err) {
      console.error('Error deleting story:', err);
    }
  };

  const handleShare = (story: Story) => {
    setStoryToShare(story);
    setShareModalOpen(true);
  };

  const handlePrint = (story: Story) => {
    window.location.href = `/${locale}/stories/print/${story.storyId}`;
  };

  const handleDownload = (story: Story) => {
    if (story.status !== 'published') return;
    setSelfPrintStory(story);
    setIsSelfPrintOpen(true);
  };

  const handleDuplicate = async (story: Story) => {
    try {
      const resp = await fetch(`/api/my-stories/${story.storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate' }),
      });
      if (!resp.ok) {
        throw new Error(`Duplicate failed: ${resp.status}`);
      }
      const data = await resp.json();
      const newStory = data.story as Story;
      await fetchStories();
      const link = `/${locale}/stories/read/${newStory.storyId}`;
      successWithAction(tMyStoriesPage('duplicate.success'), tCommonActions('open'), link);
    } catch (e) {
      console.error('Error duplicating story:', e);
      error(tMyStoriesPage('duplicate.error'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {paginatedStories.length === 0 ? (
        <div className="text-center py-16 bg-base-200 rounded-lg">
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-2xl font-semibold text-base-content">
              {tMyStoriesPage('noStories.title')}
            </h2>
            <p className="text-base-content/70">{tMyStoriesPage('noStories.subtitle')}</p>
            <Link href="/tell-your-story/step-1" className="btn btn-primary btn-lg">
              {tMyStoriesPage('noStories.action')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-visible rounded-lg border border-base-300 bg-base-100 shadow-sm">
          <table className="table table-zebra table-fixed w-full">
            <colgroup>
              <col className="w-[3.25rem] md:w-[4.75rem]" />
              <col />
              <col className="w-14 md:w-16" />
              <col className="w-14 md:w-[21rem]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-1 py-2 text-sm font-semibold text-primary md:px-3">
                  {tMyStoriesPage('table.date')}
                </th>
                <th className="px-2 py-2 text-sm font-semibold text-primary md:px-4">
                  {tMyStoriesPage('table.title')}
                </th>
                <th className="px-1 py-2 text-center text-sm font-semibold text-primary md:px-2">
                  {tMyStoriesPage('table.status.header')}
                </th>
                <th className="px-1 py-2 text-right md:px-4">
                  <span className="sr-only md:not-sr-only">{tMyStoriesPage('table.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedStories.map((story) => (
                <StoryRow
                  key={story.storyId}
                  story={story}
                  isMobile={isMobile}
                  onDelete={handleDeleteClick}
                  onShare={handleShare}
                  onPrint={handlePrint}
                  onDuplicate={handleDuplicate}
                  onDownload={handleDownload}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{tMyStoriesPage('deleteConfirm.title')}</h3>
            <p className="py-4">{tMyStoriesPage('deleteConfirm.message')}</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDeleteModalOpen(false)}>
                {tMyStoriesPage('deleteConfirm.cancel')}
              </button>
              <button className="btn btn-error" onClick={handleDeleteConfirm}>
                {tMyStoriesPage('deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {storyToShare && storyToShare.storyId && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setStoryToShare(null);
          }}
          storyId={storyToShare.storyId}
          storyTitle={storyToShare.title}
          isPublic={storyToShare.isPublic}
          slug={storyToShare.slug}
          onShareSuccess={() => {
            const refresh = async () => {
              try {
                const response = await fetch('/api/my-stories');
                if (response.ok) {
                  const data = await response.json();
                  setStories(data.stories);
                  if (storyToShare) {
                    const updated = data.stories.find(
                      (s: Story) => s.storyId === storyToShare.storyId,
                    );
                    if (updated) {
                      setStoryToShare(updated);
                    }
                  }
                }
              } catch (err) {
                console.error('Error refreshing stories:', err);
              }
            };
            refresh();
          }}
        />
      )}

      {selfPrintStory && (
        <SelfPrintModal
          isOpen={isSelfPrintOpen}
          storyId={selfPrintStory.storyId}
          storyTitle={selfPrintStory.title}
          onClose={() => {
            setIsSelfPrintOpen(false);
            setSelfPrintStory(null);
          }}
        />
      )}
    </div>
  );
}
