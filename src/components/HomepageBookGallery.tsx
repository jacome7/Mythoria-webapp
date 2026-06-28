'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useIntentContext } from '@/hooks/useIntentContext';
import type { IntentContext } from '@/types/intent-context';
import styles from './HomepageBookGallery.module.css';

interface SampleBook {
  id: string;
  title: string;
  synopses: string;
  locale: string;
  intent: string;
  recipients: string[];
  tags: string;
  style: string;
  audioSampleSrc?: string;
  audioSampleTitle?: string;
}

const AUTO_SCROLL_INTERVAL_MS = 3600;
const TRACK_COPIES = 3;
const BOOK_TILTS = ['-3deg', '2deg', '-1.5deg', '3deg', '-2deg', '1deg'];

function sortBooksByContext(
  books: SampleBook[],
  currentLocale: string,
  intentContext?: IntentContext | null,
): SampleBook[] {
  if (!intentContext?.intent) {
    return [
      ...books.filter((book) => book.locale === currentLocale),
      ...books.filter((book) => book.locale !== currentLocale),
    ];
  }

  const { intent, recipient } = intentContext;

  return [...books].sort((a, b) => {
    const aIntentMatch = a.intent === intent;
    const bIntentMatch = b.intent === intent;
    if (aIntentMatch !== bIntentMatch) return aIntentMatch ? -1 : 1;

    const aLocaleMatch = a.locale === currentLocale;
    const bLocaleMatch = b.locale === currentLocale;
    if (aLocaleMatch !== bLocaleMatch) return aLocaleMatch ? -1 : 1;

    if (recipient) {
      const aRecipientMatch = a.recipients.includes(recipient);
      const bRecipientMatch = b.recipients.includes(recipient);
      if (aRecipientMatch !== bRecipientMatch) return aRecipientMatch ? -1 : 1;
    }

    return 0;
  });
}

function parseTags(tags: string): string[] {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function HomepageBookGallery() {
  const t = useTranslations('HomePage.gallery');
  const currentLocale = useLocale();
  const intentContext = useIntentContext();

  const [books, setBooks] = useState<SampleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<SampleBook | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadBooks = async () => {
      try {
        const response = await fetch('/SampleBooks/SampleBooks.json');
        if (!response.ok) throw new Error('Failed to load sample books');

        const sampleBooks = (await response.json()) as SampleBook[];
        if (!ignore) {
          setBooks(sortBooksByContext(sampleBooks, currentLocale, intentContext));
        }
      } catch (error) {
        console.error('Error loading sample books:', error);
      }
    };

    loadBooks();

    return () => {
      ignore = true;
    };
  }, [currentLocale, intentContext]);

  const repeatedBooks = useMemo(
    () => Array.from({ length: TRACK_COPIES }, () => books).flat(),
    [books],
  );

  const getSegmentWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track || books.length === 0) return 0;
    return track.scrollWidth / TRACK_COPIES;
  }, [books.length]);

  const normalizeScroll = useCallback(() => {
    const track = trackRef.current;
    const segmentWidth = getSegmentWidth();
    if (!track || segmentWidth === 0) return;

    if (track.scrollLeft >= segmentWidth * 2) {
      track.scrollLeft -= segmentWidth;
    } else if (track.scrollLeft <= 0) {
      track.scrollLeft += segmentWidth;
    }
  }, [getSegmentWidth]);

  const scrollByOneBook = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      const firstBook = track?.querySelector<HTMLButtonElement>('[data-gallery-book]');
      if (!track || !firstBook) return;

      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
      const distance = firstBook.offsetWidth + gap;

      normalizeScroll();
      track.scrollBy({ left: distance * direction, behavior: 'smooth' });
    },
    [normalizeScroll],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track || books.length === 0) return;

    requestAnimationFrame(() => {
      const segmentWidth = getSegmentWidth();
      if (segmentWidth > 0 && track.scrollLeft < 1) {
        track.scrollLeft = segmentWidth;
      }
    });
  }, [books.length, getSegmentWidth]);

  useEffect(() => {
    if (books.length === 0 || isPaused || prefersReducedMotion || selectedBook) return;

    const interval = window.setInterval(() => {
      scrollByOneBook(1);
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [books.length, isPaused, prefersReducedMotion, scrollByOneBook, selectedBook]);

  const closeModal = useCallback(() => {
    setSelectedBook(null);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    if (!selectedBook) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [closeModal, selectedBook]);

  const openModal = useCallback((book: SampleBook) => {
    setSelectedBook(book);
    setIsPaused(true);
  }, []);

  const handleImageError = useCallback((bookId: string, imageType: 'cover' | 'scene') => {
    setImageErrors((prev) => new Set(prev).add(`${bookId}-${imageType}`));
  }, []);

  if (books.length === 0) {
    return (
      <section className={styles.section} aria-labelledby="homepage-book-gallery-title">
        <div className={styles.inner}>
          <div className={styles.heading}>
            <h2 id="homepage-book-gallery-title">{t('title')}</h2>
          </div>
          <div className="flex h-56 items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.section} aria-labelledby="homepage-book-gallery-title">
        <div className={styles.inner}>
          <div className={styles.heading}>
            <h2 id="homepage-book-gallery-title">{t('title')}</h2>
          </div>
        </div>

        <div className={styles.shelfFrame}>
          <div
            ref={trackRef}
            className={styles.track}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={(event) => {
              const nextFocus = event.relatedTarget instanceof Node ? event.relatedTarget : null;
              if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
                setIsPaused(false);
              }
            }}
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onScroll={normalizeScroll}
          >
            {repeatedBooks.map((book, index) => {
              const coverImageError = imageErrors.has(`${book.id}-cover`);
              const tilt = BOOK_TILTS[index % BOOK_TILTS.length];

              return (
                <button
                  key={`${book.id}-${index}`}
                  type="button"
                  className={styles.bookButton}
                  style={{ '--book-tilt': tilt } as CSSProperties}
                  onClick={() => openModal(book)}
                  data-gallery-book
                  aria-label={`${t('viewDetails')} ${book.title}`}
                >
                  <span className={styles.bookCover}>
                    {!coverImageError ? (
                      <Image
                        src={`/SampleBooks/${book.id}.jpeg`}
                        alt={book.title}
                        fill
                        sizes="(max-width: 480px) 36vw, (max-width: 1024px) 24vw, 15vw"
                        className={styles.bookImage}
                        onError={() => handleImageError(book.id, 'cover')}
                      />
                    ) : (
                      <span className={styles.fallback}>{t('imageUnavailable')}</span>
                    )}
                  </span>
                  <span className={styles.bookTitle}>{book.title}</span>
                  <span className={styles.bookMeta}>{book.style}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.controls} aria-label={t('controlsLabel')}>
            <button
              type="button"
              className={`${styles.controlButton} ${styles.controlButtonPrevious}`}
              onClick={() => scrollByOneBook(-1)}
              aria-label={t('previous')}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${styles.controlButtonNext}`}
              onClick={() => scrollByOneBook(1)}
              aria-label={t('next')}
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {selectedBook &&
        createPortal(
          <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
            <div
              className={styles.modalCard}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sample-book-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 id="sample-book-modal-title" className={styles.modalTitle}>
                  {selectedBook.title}
                </h3>
                <button
                  type="button"
                  className={styles.modalCloseButton}
                  aria-label={t('closeModal')}
                  onClick={closeModal}
                >
                  <X size={24} aria-hidden="true" />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalImage}>
                  {!imageErrors.has(`${selectedBook.id}-scene`) ? (
                    <Image
                      src={`/SampleBooks/${selectedBook.id}_scene.jpeg`}
                      alt={`${t('sceneAlt')} ${selectedBook.title}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 672px"
                      className="object-cover"
                      onError={() => handleImageError(selectedBook.id, 'scene')}
                    />
                  ) : (
                    <span className={styles.fallback}>{t('sceneUnavailable')}</span>
                  )}
                </div>

                <div className={styles.modalSection}>
                  <h4>{t('tags')}:</h4>
                  <div className={styles.modalBadges}>
                    {parseTags(selectedBook.tags).map((tag, index) => (
                      <span key={`${tag}-${index}`} className="badge badge-primary badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h4>{t('style')}:</h4>
                  <span className="badge badge-secondary">{selectedBook.style}</span>
                </div>

                {selectedBook.audioSampleSrc && (
                  <div className={styles.modalSection}>
                    <h4>{selectedBook.audioSampleTitle ?? 'Audio sample'}:</h4>
                    <audio controls className="w-full">
                      <source src={selectedBook.audioSampleSrc} type="audio/mpeg" />
                    </audio>
                  </div>
                )}

                <div className={styles.modalSection}>
                  <h4>{t('synopsis')}:</h4>
                  <p>{selectedBook.synopses}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
