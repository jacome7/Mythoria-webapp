'use client';

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  MoreVertical,
  Printer,
  Share2,
  Trash2,
  Volume2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { createPortal } from 'react-dom';
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

type GenerationStatusInfo = {
  text: string;
  className: string;
  status: NonNullable<Story['storyGenerationStatus']>;
  percentage: number;
};

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
  const locale = useLocale();
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const actionButtonClass = 'btn btn-ghost btn-sm min-h-9 w-9 px-0';
  const primaryHref =
    story.status === 'published'
      ? `/${locale}/stories/${story.storyId}`
      : story.status === 'draft'
        ? `/${locale}/tell-your-story/step-3?edit=${story.storyId}`
        : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        openMenu &&
        !target.closest(`[data-story-menu="${story.storyId}"]`) &&
        !target.closest(`[data-story-menu-panel="${story.storyId}"]`)
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

  const getStatusIconInfo = (
    status: Story['status'],
  ): {
    src: string;
    imageClassName?: string;
  } => {
    switch (status) {
      case 'draft':
        return {
          src: '/Papercut_icons/PaperAndPencil.webp',
          imageClassName: 'scale-110',
        };
      case 'writing':
        return {
          src: '/Papercut_icons/PaperAndPencil.webp',
          imageClassName: 'scale-110',
        };
      case 'published':
        return {
          src: '/Papercut_icons/fa-check-papercut.webp',
        };
    }
  };

  const getGenerationStatusInfo = (s: Story): GenerationStatusInfo | null => {
    if (!s.storyGenerationStatus) return null;
    const statusMap = {
      queued: {
        text: tMyStoriesPage('table.status.queued'),
        className: 'border-info/40 bg-info/10 text-info',
      },
      running: {
        text: tMyStoriesPage('table.status.running'),
        className: 'border-warning/50 bg-warning/10 text-warning',
      },
      completed: {
        text: tMyStoriesPage('table.status.completed'),
        className: 'border-success/50 bg-success/10 text-success',
      },
      failed: {
        text: tMyStoriesPage('table.status.failed'),
        className: 'border-error/50 bg-error/10 text-error',
      },
      cancelled: {
        text: tMyStoriesPage('table.status.cancelled'),
        className: 'border-neutral/40 bg-neutral/10 text-neutral',
      },
    } satisfies Record<
      NonNullable<Story['storyGenerationStatus']>,
      Omit<GenerationStatusInfo, 'percentage' | 'status'>
    >;
    const info = statusMap[s.storyGenerationStatus];
    return {
      ...info,
      status: s.storyGenerationStatus,
      percentage: s.storyGenerationCompletedPercentage || 0,
    };
  };

  const shouldIgnoreRowActivation = (target: EventTarget | null) => {
    return (
      target instanceof Element &&
      Boolean(target.closest('a, button, input, select, textarea, [role="button"]'))
    );
  };

  const handleRowClick = (event: ReactMouseEvent<HTMLTableRowElement>) => {
    if (!primaryHref || shouldIgnoreRowActivation(event.target)) return;
    router.push(primaryHref);
  };

  const handleRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (!primaryHref || shouldIgnoreRowActivation(event.target)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    router.push(primaryHref);
  };

  return (
    <tr
      className={
        primaryHref
          ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
          : undefined
      }
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      tabIndex={primaryHref ? 0 : undefined}
    >
      <td className="px-1 py-1 text-sm md:px-3 md:py-2">
        {formatDate(story.createdAt, isMobile ? mobileDateOptions : desktopDateOptions)}
      </td>
      <td className="break-words px-2 py-1 font-medium leading-snug md:px-4 md:py-2">
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
      <td className="px-1 py-1 text-center md:px-2 md:py-2">
        <div className="flex flex-col items-center gap-1">
          {(() => {
            const label = tMyStoriesPage(`status.${story.status}`);
            const statusInfo = getStatusIconInfo(story.status);

            return (
              <span
                aria-label={label}
                className="inline-flex h-8 w-8 items-center justify-center"
                title={label}
              >
                <Image
                  src={statusInfo.src}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  className={`h-6 w-6 object-contain ${statusInfo.imageClassName ?? ''}`}
                  sizes="24px"
                />
                <span className="sr-only">{label}</span>
              </span>
            );
          })()}
          {(() => {
            const genStatus = getGenerationStatusInfo(story);
            if (genStatus && story.status === 'writing') {
              return (
                <div className="flex flex-col items-center gap-1">
                  <span
                    aria-label={genStatus.text}
                    className={`inline-flex h-1.5 w-1.5 rounded-full ${genStatus.className}`}
                    title={genStatus.text}
                  >
                    <span className="sr-only">{genStatus.text}</span>
                  </span>
                  {genStatus.percentage > 0 && genStatus.status === 'running' && (
                    <div className="w-10">
                      <progress
                        className="progress progress-primary w-full h-2"
                        value={genStatus.percentage}
                        max="100"
                      ></progress>
                      <span className="text-[0.625rem] leading-none text-gray-500">
                        {genStatus.percentage}%
                      </span>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      </td>
      <td className="px-2 py-1 md:px-4 md:py-2" data-row-action-ignore="true">
        <div className="hidden md:flex justify-end gap-1.5">
          <button
            className={`${actionButtonClass} ${story.status !== 'published' ? 'btn-disabled' : ''}`}
            onClick={() => story.status === 'published' && onDuplicate(story)}
            title={tMyStoriesPage('actions.duplicate')}
            disabled={story.status !== 'published'}
          >
            <Copy className="w-4 h-4" />
          </button>
          {story.status === 'published' ? (
            <Link
              href={`/${locale}/stories/listen/${story.storyId}`}
              className={actionButtonClass}
              title={tMyStoriesPage('actions.listen')}
            >
              <Volume2 className="w-4 h-4" />
            </Link>
          ) : story.status === 'writing' ? (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title={tMyStoriesPage('actions.listenNotAvailable')}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          ) : null}
          {story.status === 'published' ? (
            <button
              className={actionButtonClass}
              onClick={() => onShare(story)}
              title={tMyStoriesPage('actions.share')}
            >
              <Share2 className="w-4 h-4" />
            </button>
          ) : story.status === 'writing' ? (
            <button
              className={`${actionButtonClass} btn-disabled`}
              disabled
              title={tCommonShare('tooltips.cannotShareWriting')}
            >
              <Share2 className="w-4 h-4" />
            </button>
          ) : null}
          {story.status === 'published' && (
            <>
              <button
                className={actionButtonClass}
                onClick={() => onPrint(story)}
                title={tMyStoriesPage('actions.print')}
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                className={actionButtonClass}
                onClick={() => onDownload(story)}
                title={tMyStoriesPage('actions.downloadPdf')}
              >
                <Download className="w-4 h-4" />
              </button>
            </>
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
          {openMenu &&
            menuPosition &&
            createPortal(
              <div
                data-story-menu-panel={story.storyId}
                className="fixed z-[10000] bg-base-100 border border-base-300 rounded-lg shadow-xl min-w-48"
                style={{
                  top: menuPosition.top ? `${menuPosition.top}px` : 'auto',
                  bottom: menuPosition.bottom ? `${menuPosition.bottom}px` : 'auto',
                  right: `${menuPosition.right}px`,
                  backgroundColor: 'var(--color-base-100)',
                  isolation: 'isolate',
                }}
              >
                <div className="p-2 space-y-1">
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
                    story.status === 'writing' && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/50 rounded-md">
                        <Volume2 className="w-4 h-4" />
                        {tMyStoriesPage('actions.listen')}
                      </div>
                    )
                  )}
                  {story.status === 'published' && (
                    <>
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
                    </>
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
              </div>,
              document.body,
            )}
        </div>
      </td>
    </tr>
  );
}
