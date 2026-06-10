'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Copy,
  Download,
  Edit3,
  MoreVertical,
  Printer,
  Share2,
  Trash2,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Story } from '@/types/story';
import { formatDate, FormatOptions } from '@/utils/date';

interface StoryRowProps {
  story: Story;
  isMobile: boolean;
  onDelete: (story: Story) => void;
  onShare: (story: Story) => void;
  onPrint: (story: Story) => void;
  onDuplicate: (story: Story) => void;
  onDownload: (story: Story) => void;
}

export default function StoryRow({
  story,
  isMobile,
  onDelete,
  onShare,
  onPrint,
  onDuplicate,
  onDownload,
}: StoryRowProps) {
  const tMyStoriesPage = useTranslations('MyStoriesPage');
  const tCommonShare = useTranslations('Share');
  const tCommonActions = useTranslations('Actions');
  const locale = useLocale();

  const [openMenu, setOpenMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const actionButtonClass = 'btn btn-ghost btn-sm min-h-9 w-9 px-0';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        openMenu &&
        !target.closest(`[data-story-menu="${story.storyId}"]`) &&
        !target.closest('.fixed')
      ) {
        setOpenMenu(false);
        setMenuPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu, story.storyId]);

  const desktopDateOptions: FormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    locale,
  };
  const mobileDateOptions: FormatOptions = {
    day: '2-digit',
    month: '2-digit',
    locale,
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'badge badge-secondary';
      case 'writing':
        return 'badge badge-warning';
      case 'published':
        return 'badge badge-success';
      default:
        return 'badge badge-ghost';
    }
  };

  const getGenerationStatusInfo = (s: Story) => {
    if (!s.storyGenerationStatus) return null;
    const statusMap = {
      queued: {
        text: tMyStoriesPage('table.status.queued'),
        class: 'badge-info',
        icon: '⏳',
      },
      running: {
        text: tMyStoriesPage('table.status.running'),
        class: 'badge-warning',
        icon: '🔄',
      },
      completed: {
        text: tMyStoriesPage('table.status.completed'),
        class: 'badge-success',
        icon: '✅',
      },
      failed: {
        text: tMyStoriesPage('table.status.failed'),
        class: 'badge-error',
        icon: '❌',
      },
      cancelled: {
        text: tMyStoriesPage('table.status.cancelled'),
        class: 'badge-neutral',
        icon: '⏹️',
      },
    } as const;
    const info = statusMap[s.storyGenerationStatus];
    return { ...info, percentage: s.storyGenerationCompletedPercentage || 0 };
  };

  return (
    <tr>
      <td className="px-2 py-1 md:px-4 md:py-2">
        {formatDate(story.createdAt, isMobile ? mobileDateOptions : desktopDateOptions)}
      </td>
      <td className="font-medium px-2 py-1 md:px-4 md:py-2">
        {story.status === 'published' ? (
          <Link
            href={`/${locale}/stories/${story.storyId}`}
            className="text-primary hover:text-primary-focus hover:underline cursor-pointer"
          >
            {story.title}
          </Link>
        ) : (
          <span>{story.title}</span>
        )}
      </td>
      <td className="px-2 py-1 md:px-4 md:py-2 whitespace-nowrap">
        <div className="space-y-1">
          <span
            className={`${getStatusBadgeClass(story.status)} badge-sm text-xs whitespace-nowrap`}
          >
            {tMyStoriesPage(`status.${story.status}`)}
          </span>
          {(() => {
            const genStatus = getGenerationStatusInfo(story);
            if (genStatus && story.status === 'writing') {
              return (
                <div className="flex flex-col space-y-1">
                  <span className={`badge badge-xs ${genStatus.class} whitespace-nowrap`}>
                    {genStatus.icon} {genStatus.text}
                  </span>
                  {genStatus.percentage > 0 && genStatus.text === 'Generating' && (
                    <div className="w-full">
                      <progress
                        className="progress progress-primary w-full h-2"
                        value={genStatus.percentage}
                        max="100"
                      ></progress>
                      <span className="text-xs text-gray-500">{genStatus.percentage}%</span>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      </td>
      <td className="px-2 py-1 md:px-4 md:py-2">
        <div className="hidden md:flex justify-end gap-1.5">
          <button
            className={`${actionButtonClass} ${story.status !== 'published' ? 'btn-disabled' : ''}`}
            onClick={() => story.status === 'published' && onDuplicate(story)}
            title={tMyStoriesPage('actions.duplicate')}
            disabled={story.status !== 'published'}
          >
            <Copy className="w-4 h-4" />
          </button>
          {story.status === 'published' && (
            <Link
              href={`/${locale}/stories/${story.storyId}`}
              className={`${actionButtonClass} text-primary hover:bg-primary hover:text-primary-content`}
              title="Read Story"
            >
              <BookOpen className="w-4 h-4" />
            </Link>
          )}
          {story.status === 'published' ? (
            <Link
              href={`/${locale}/stories/listen/${story.storyId}`}
              className={actionButtonClass}
              title={tMyStoriesPage('actions.listen')}
            >
              <Volume2 className="w-4 h-4" />
            </Link>
          ) : (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title={tMyStoriesPage('actions.listenNotAvailable')}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
          {story.status === 'writing' ? (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title={tCommonShare('tooltips.cannotShareWriting')}
            >
              <Share2 className="w-4 h-4" />
            </button>
          ) : story.status === 'draft' ? (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title={tCommonShare('tooltips.cannotShareDraft')}
            >
              <Share2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              className={actionButtonClass}
              onClick={() => onShare(story)}
              title={tMyStoriesPage('actions.share')}
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {story.status === 'published' ? (
            <button
              className={actionButtonClass}
              onClick={() => onPrint(story)}
              title={tMyStoriesPage('actions.print')}
            >
              <Printer className="w-4 h-4" />
            </button>
          ) : (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title={tMyStoriesPage('actions.printNotAvailable')}
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          {story.status === 'published' ? (
            <button
              className={actionButtonClass}
              onClick={() => onDownload(story)}
              title={tMyStoriesPage('actions.downloadPdf')}
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title={tMyStoriesPage('actions.downloadNotAvailable')}
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {story.status === 'writing' ? (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title="Cannot edit story while it's being written"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          ) : story.status === 'draft' ? (
            <Link
              href={`/${locale}/tell-your-story/step-3?edit=${story.storyId}`}
              className={actionButtonClass}
              title={tMyStoriesPage('actions.edit')}
            >
              <Edit3 className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href={`/${locale}/stories/edit/${story.storyId}`}
              className={actionButtonClass}
              title={tMyStoriesPage('actions.edit')}
            >
              <Edit3 className="w-4 h-4" />
            </Link>
          )}
          <button
            className={`${actionButtonClass} text-error hover:bg-error hover:text-error-content`}
            onClick={() => onDelete(story)}
            title={tMyStoriesPage('actions.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="md:hidden relative flex justify-end">
          <button
            className="btn btn-ghost btn-sm min-h-9 w-10 px-0 mx-1"
            data-story-menu={story.storyId}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              // If less than 350px space below, open upwards
              if (spaceBelow < 350) {
                setMenuPosition({
                  bottom: window.innerHeight - rect.top + 4,
                  right: window.innerWidth - rect.right,
                });
              } else {
                setMenuPosition({
                  top: rect.bottom + 4,
                  right: window.innerWidth - rect.right,
                });
              }
              setOpenMenu((prev) => !prev);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {openMenu && menuPosition && (
            <div
              className="fixed z-[9999] bg-base-100 border border-base-300 rounded-lg shadow-xl min-w-48"
              style={{
                top: menuPosition.top ? `${menuPosition.top}px` : 'auto',
                bottom: menuPosition.bottom ? `${menuPosition.bottom}px` : 'auto',
                right: `${menuPosition.right}px`,
              }}
            >
              <div className="p-2 space-y-1">
                {story.status === 'published' && (
                  <Link
                    href={`/${locale}/stories/${story.storyId}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md"
                    onClick={() => setOpenMenu(false)}
                  >
                    <BookOpen className="w-4 h-4" />
                    {tCommonActions('read')}
                  </Link>
                )}
                {story.status === 'published' ? (
                  <Link
                    href={`/${locale}/stories/listen/${story.storyId}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md"
                    onClick={() => setOpenMenu(false)}
                  >
                    <Volume2 className="w-4 h-4" />
                    {tMyStoriesPage('actions.listen')}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                    <Volume2 className="w-4 h-4" />
                    {tMyStoriesPage('actions.listen')}
                  </div>
                )}
                {story.status === 'published' ? (
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md w-full text-left"
                    onClick={() => {
                      onShare(story);
                      setOpenMenu(false);
                      setMenuPosition(null);
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    {tMyStoriesPage('actions.share')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                    <Share2 className="w-4 h-4" />
                    {tMyStoriesPage('actions.share')}
                  </div>
                )}
                {story.status === 'published' ? (
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md w-full text-left"
                    onClick={() => {
                      onPrint(story);
                      setOpenMenu(false);
                      setMenuPosition(null);
                    }}
                  >
                    <Printer className="w-4 h-4" />
                    {tMyStoriesPage('actions.print')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                    <Printer className="w-4 h-4" />
                    {tMyStoriesPage('actions.print')}
                  </div>
                )}
                {story.status === 'published' ? (
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md w-full text-left"
                    onClick={() => {
                      onDownload(story);
                      setOpenMenu(false);
                      setMenuPosition(null);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {tMyStoriesPage('actions.downloadPdf')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                    <Download className="w-4 h-4" />
                    {tMyStoriesPage('actions.downloadPdf')}
                  </div>
                )}
                {story.status === 'writing' ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                    <Edit3 className="w-4 h-4" />
                    {tMyStoriesPage('actions.edit')}
                  </div>
                ) : story.status === 'draft' ? (
                  <Link
                    href={`/${locale}/tell-your-story/step-3?edit=${story.storyId}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md"
                    onClick={() => {
                      setOpenMenu(false);
                      setMenuPosition(null);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                    {tMyStoriesPage('actions.edit')}
                  </Link>
                ) : (
                  <Link
                    href={`/${locale}/stories/edit/${story.storyId}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded-md"
                    onClick={() => {
                      setOpenMenu(false);
                      setMenuPosition(null);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                    {tMyStoriesPage('actions.edit')}
                  </Link>
                )}
                <div className="border-t border-base-300 my-1"></div>
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md w-full text-left ${story.status !== 'published' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-200'}`}
                  onClick={() => {
                    if (story.status === 'published') {
                      onDuplicate(story);
                    }
                    setOpenMenu(false);
                    setMenuPosition(null);
                  }}
                  disabled={story.status !== 'published'}
                >
                  <Copy className="w-4 h-4" />
                  {tMyStoriesPage('actions.duplicate')}
                </button>
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-error hover:text-error-content rounded-md w-full text-left text-error"
                  onClick={() => {
                    onDelete(story);
                    setOpenMenu(false);
                    setMenuPosition(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {tMyStoriesPage('actions.delete')}
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
