'use client';

import { useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FeaturedStoryPdfDownloadModalProps {
  isOpen: boolean;
  slug: string;
  storyTitle: string;
  onClose: () => void;
}

export function FeaturedStoryPdfDownloadModal({
  isOpen,
  slug,
  storyTitle,
  onClose,
}: FeaturedStoryPdfDownloadModalProps) {
  const t = useTranslations('PublicStoryPage.pdfDownloads');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const encodedSlug = encodeURIComponent(slug);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="featured-story-pdf-title"
        aria-describedby="featured-story-pdf-description"
        className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="featured-story-pdf-title" className="font-display text-2xl text-primary">
              {t('title')}
            </h2>
            <p
              id="featured-story-pdf-description"
              className="mt-2 text-sm leading-6 text-base-content/75"
            >
              {t('description', { title: storyTitle })}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="btn btn-ghost btn-sm btn-circle shrink-0"
            aria-label={t('close')}
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <a
            href={`/api/p/${encodedSlug}/pdf/cover`}
            className="flex items-center gap-3 rounded-xl border border-base-300 p-4 transition-colors hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Download className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{t('cover.label')}</span>
              <span className="mt-1 block text-sm leading-5 text-base-content/70">
                {t('cover.description')}
              </span>
            </span>
          </a>
          <a
            href={`/api/p/${encodedSlug}/pdf/interior`}
            className="flex items-center gap-3 rounded-xl border border-base-300 p-4 transition-colors hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Download className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{t('interior.label')}</span>
              <span className="mt-1 block text-sm leading-5 text-base-content/70">
                {t('interior.description')}
              </span>
            </span>
          </a>
        </div>

        <button type="button" className="btn btn-ghost mt-5 w-full" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
