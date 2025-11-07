'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { IntentContext } from '@/types/intent-context';

// Type definition matching the JSON structure
interface SampleBook {
  id: string;
  title: string;
  synopses: string;
  locale: string;
  intent: string;
  recipients: string[];
  tags: string;
  style: string;
}

const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds

/**
 * Sort books by priority:
 * 1. Intent match (if intent context provided)
 * 2. Locale match
 * 3. Recipient match (if recipient context provided)
 * 4. Original order
 */
function sortBooksByContext(
  books: SampleBook[],
  currentLocale: string,
  intentContext?: IntentContext,
): SampleBook[] {
  // If no intent context, use simple locale-based sorting (existing behavior)
  if (!intentContext?.intent) {
    return [
      ...books.filter((book) => book.locale === currentLocale),
      ...books.filter((book) => book.locale !== currentLocale),
    ];
  }

  // Sort with intent context
  const { intent, recipient } = intentContext;

  return [...books].sort((a, b) => {
    // Priority 1: Intent match
    const aIntentMatch = a.intent === intent;
    const bIntentMatch = b.intent === intent;
    if (aIntentMatch !== bIntentMatch) {
      return aIntentMatch ? -1 : 1;
    }

    // Priority 2: Locale match (within same intent priority)
    const aLocaleMatch = a.locale === currentLocale;
    const bLocaleMatch = b.locale === currentLocale;
    if (aLocaleMatch !== bLocaleMatch) {
      return aLocaleMatch ? -1 : 1;
    }

    // Priority 3: Recipient match (if recipient context provided)
    if (recipient) {
      const aRecipientMatch = a.recipients.includes(recipient);
      const bRecipientMatch = b.recipients.includes(recipient);
      if (aRecipientMatch !== bRecipientMatch) {
        return aRecipientMatch ? -1 : 1;
      }
    }

    // Maintain original order for equal priority
    return 0;
  });
}

interface InfiniteGalleryProps {
  intentContext?: IntentContext;
}

export default function InfiniteGallery({ intentContext }: InfiniteGalleryProps) {
  const tHomePage = useTranslations('HomePage');
  const currentLocale = useLocale();

  const [allBooks, setAllBooks] = useState<SampleBook[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedBook, setSelectedBook] = useState<SampleBook | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDialogElement>(null);

  // Load and sort books data
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const response = await fetch('/SampleBooks/SampleBooks.json');
        if (!response.ok) {
          throw new Error('Failed to load sample books');
        }
        const books: SampleBook[] = await response.json();

        // Sort books based on intent context
        const sortedBooks = sortBooksByContext(books, currentLocale, intentContext);

        setAllBooks(sortedBooks);
      } catch (error) {
        console.error('Error loading sample books:', error);
      }
    };

    loadBooks();
  }, [currentLocale, intentContext]);

  // Navigate to next slide
  const goToNext = useCallback(() => {
    if (allBooks.length === 0 || isTransitioning) return;

    setIsTransitioning(true);

    // Wait for fade-out, then change index, then fade-in
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % allBooks.length);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50); // Small delay before fade-in
    }, 500); // Fade-out duration
  }, [allBooks.length, isTransitioning]);

  // Auto-scroll functionality
  useEffect(() => {
    if (allBooks.length === 0) return;

    const startAutoScroll = () => {
      autoScrollTimerRef.current = setInterval(() => {
        goToNext();
      }, AUTO_SCROLL_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [allBooks.length, currentIndex, goToNext]);

  // Reset auto-scroll timer on manual navigation
  const resetAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
    autoScrollTimerRef.current = setInterval(() => {
      goToNext();
    }, AUTO_SCROLL_INTERVAL);
  }, [goToNext]);

  // Navigate to previous slide
  const goToPrevious = useCallback(() => {
    if (allBooks.length === 0 || isTransitioning) return;

    setIsTransitioning(true);
    resetAutoScroll();

    // Wait for fade-out, then change index, then fade-in
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + allBooks.length) % allBooks.length);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50); // Small delay before fade-in
    }, 500); // Fade-out duration
  }, [allBooks.length, isTransitioning, resetAutoScroll]);

  // Manual next with auto-scroll reset
  const handleNext = useCallback(() => {
    goToNext();
    resetAutoScroll();
  }, [goToNext, resetAutoScroll]);

  // Modal handlers
  const openModal = useCallback((book: SampleBook) => {
    setSelectedBook(book);
    modalRef.current?.showModal();
    // Pause auto-scroll when modal is open
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
  }, []);

  const closeModal = useCallback(() => {
    modalRef.current?.close();
    setSelectedBook(null);
    // Resume auto-scroll when modal closes
    resetAutoScroll();
  }, [resetAutoScroll]);

  // Image error handler
  const handleImageError = useCallback((bookId: string, imageType: 'cover' | 'scene') => {
    console.warn(`Missing ${imageType} image for book: ${bookId}`);
    setImageErrors((prev) => new Set(prev).add(`${bookId}-${imageType}`));
  }, []);

  // Parse tags into array
  const parseTags = (tags: string): string[] => {
    return tags.split(',').map((tag) => tag.trim());
  };

  const currentBook = allBooks[currentIndex];

  if (allBooks.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const coverImageError = currentBook && imageErrors.has(`${currentBook.id}-cover`);

  return (
    <div className="w-full max-w-sm md:max-w-xs lg:max-w-sm mx-auto">
      {/* Carousel Container */}
      <div className="relative w-full drop-shadow-2xl">
        {/* Book Card with Fade Effect */}
        <div
          className={`transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
        >
          {currentBook && (
            <div
              className="group card bg-base-100 shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => openModal(currentBook)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openModal(currentBook);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View details for ${currentBook.title}`}
            >
              <figure className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden">
                {!coverImageError ? (
                  <Image
                    src={`/SampleBooks/${currentBook.id}.jpeg`}
                    alt={currentBook.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover object-top"
                    onError={() => handleImageError(currentBook.id, 'cover')}
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-base-300 flex items-center justify-center">
                    <span className="text-base-content/50 text-sm">Image not available</span>
                  </div>
                )}

                {/* Hover Synopsis Overlay - Desktop Only */}
                <div className="hidden md:block absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-4 translate-y-full md:group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  <p className="text-sm text-white line-clamp-4">{currentBook.synopses}</p>
                </div>
              </figure>

              {/* Synopsis Text Below Image - Mobile Only */}
              <div className="card-body p-4 h-24 md:hidden">
                <p className="text-sm text-base-content/70 line-clamp-3">{currentBook.synopses}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-circle btn-lg btn-ghost bg-base-100/30 hover:bg-base-100/50 z-10"
          aria-label="Previous book"
          disabled={isTransitioning}
        >
          <FaChevronLeft className="text-2xl" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-circle btn-lg btn-ghost bg-base-100/30 hover:bg-base-100/50 z-10"
          aria-label="Next book"
          disabled={isTransitioning}
        >
          <FaChevronRight className="text-2xl" />
        </button>
      </div>

      {/* Modal */}
      <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box max-w-3xl">
          {selectedBook && (
            <>
              {/* Close button */}
              <form method="dialog">
                <button
                  className="btn btn-md btn-circle btn-ghost absolute right-2 top-2"
                  aria-label={tHomePage('gallery.closeModal')}
                  onClick={closeModal}
                >
                  <span className="text-2xl">✕</span>
                </button>
              </form>

              {/* Modal Content */}
              <h3 className="font-bold text-2xl mb-4">{selectedBook.title}</h3>

              {/* Scene Image */}
              <div className="relative aspect-[3/4] w-full mb-4 rounded-lg overflow-hidden bg-base-300">
                {!imageErrors.has(`${selectedBook.id}-scene`) ? (
                  <Image
                    src={`/SampleBooks/${selectedBook.id}_scene.jpeg`}
                    alt={`Scene from ${selectedBook.title}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 672px"
                    className="object-cover"
                    onError={() => handleImageError(selectedBook.id, 'scene')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-base-content/50">Scene image not available</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-base-content/70 mb-2">
                  {tHomePage('gallery.tags')}:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {parseTags(selectedBook.tags).map((tag, idx) => (
                    <span key={idx} className="badge badge-primary badge-outline">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-base-content/70 mb-1">
                  {tHomePage('gallery.style')}:
                </h4>
                <span className="badge badge-secondary">{selectedBook.style}</span>
              </div>

              {/* Synopsis */}
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-base-content/70 mb-2">
                  {tHomePage('gallery.synopsis')}:
                </h4>
                <p className="text-base leading-relaxed">{selectedBook.synopses}</p>
              </div>

              {/* Close button at bottom */}
              <div className="modal-action">
                <form method="dialog">
                  <button className="btn btn-primary" onClick={closeModal}>
                    {tHomePage('gallery.closeModal')}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Modal backdrop - clicking closes the modal */}
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Close modal" onClick={closeModal}>
            close
          </button>
        </form>
      </dialog>
    </div>
  );
}
