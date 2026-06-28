'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, ExternalLink, FileText, Headphones, X } from 'lucide-react';
import type { LandingPageBook, LandingPageTemplateIcon } from '@/content/landing-pages';

interface LandingPageBookShowcaseProps {
  books: LandingPageBook[];
  audioIcon?: LandingPageTemplateIcon;
  sampleChapterIcon?: LandingPageTemplateIcon;
}

export default function LandingPageBookShowcase({
  books,
  audioIcon,
  sampleChapterIcon,
}: LandingPageBookShowcaseProps) {
  const [selectedBook, setSelectedBook] = useState<LandingPageBook | null>(null);
  const bookGridClass =
    books.length <= 3 ? 'grid gap-6 md:grid-cols-3' : 'grid gap-6 md:grid-cols-2 xl:grid-cols-5';
  const bookImageClass =
    books.length <= 3
      ? 'relative aspect-[16/11] overflow-hidden'
      : 'relative aspect-[4/3] overflow-hidden';

  useEffect(() => {
    if (!selectedBook) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBook(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedBook]);

  return (
    <>
      <div className={bookGridClass}>
        {books.map((book) => (
          <article
            key={book.id}
            className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={bookImageClass}>
              <Image
                src={book.imageSrc}
                alt={book.imageAlt}
                fill
                loading="eager"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 20vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-2">
                {[book.contextLabel, book.styleLabel, book.ageLabel]
                  .filter(Boolean)
                  .map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {label}
                    </span>
                  ))}
              </div>
              <h3 className="font-display text-xl font-bold leading-tight text-[#33251c]">
                {book.title}
              </h3>
              <p className="text-sm leading-relaxed text-base-content/70">{book.synopsis}</p>
              <blockquote className="border-l-4 border-accent/60 pl-3 text-sm italic text-base-content/65">
                {book.excerpt}
              </blockquote>

              {book.audio && (
                <div className="rounded-xl border border-primary/10 bg-[#fff8ea] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                    <Headphones className="h-4 w-4" aria-hidden="true" />
                    <span>{book.audio.label}</span>
                  </div>
                  <audio controls preload="metadata" className="w-full">
                    <source src={book.audio.src} type="audio/wav" />
                  </audio>
                </div>
              )}

              {book.chapters?.length ? (
                <div className="rounded-xl border border-primary/10 bg-white/80 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                    {sampleChapterIcon ? (
                      <Image
                        src={sampleChapterIcon.src}
                        alt={sampleChapterIcon.alt}
                        width={32}
                        height={32}
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>Capítulos</span>
                  </div>
                  <ol className="space-y-2 text-sm leading-relaxed text-base-content/70">
                    {book.chapters.map((chapter, chapterIndex) => (
                      <li key={`${book.id}-${chapter.title}`} className="flex gap-2">
                        <span className="font-bold text-primary">
                          {String(chapterIndex + 1).padStart(2, '0')}
                        </span>
                        <span>
                          <span className="font-bold text-[#33251c]">{chapter.title}</span>
                          <span className="block">{chapter.summary}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {(book.chapterCountLabel || book.durationLabel) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {book.chapterCountLabel && (
                    <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold text-secondary">
                      {book.chapterCountLabel}
                    </span>
                  )}
                  {book.durationLabel && (
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-base-content/75">
                      {book.durationLabel}
                    </span>
                  )}
                </div>
              )}

              {book.audioSampleSrc && (
                <div className="rounded-xl border border-primary/10 bg-[#fff8ea] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                    {audioIcon ? (
                      <Image
                        src={audioIcon.src}
                        alt={audioIcon.alt}
                        width={32}
                        height={32}
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <Headphones className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{book.audioSampleTitle ?? 'Ouvir excerto áudio'}</span>
                  </div>
                  <audio controls preload="metadata" className="w-full">
                    <source src={book.audioSampleSrc} type="audio/mpeg" />
                  </audio>
                </div>
              )}

              {book.sampleChapter ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm h-auto min-h-11 w-full gap-2 whitespace-normal py-2 text-center leading-tight"
                  onClick={() => setSelectedBook(book)}
                >
                  {sampleChapterIcon ? (
                    <Image
                      src={sampleChapterIcon.src}
                      alt={sampleChapterIcon.alt}
                      width={32}
                      height={32}
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>Ler capítulo e ver imagem</span>
                </button>
              ) : book.sampleChapterHref ? (
                <Link
                  className="btn btn-primary btn-sm h-auto min-h-11 w-full gap-2 whitespace-normal py-2 text-center leading-tight"
                  href={book.sampleChapterHref}
                >
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Ler capítulo de amostra</span>
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {selectedBook && (
        <BookSampleModal book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </>
  );
}

function BookSampleModal({ book, onClose }: { book: LandingPageBook; onClose: () => void }) {
  const sample = book.sampleChapter;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#17120e]/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`book-sample-${book.id}`}
        className="mx-auto my-6 max-w-5xl overflow-hidden rounded-2xl bg-[#fff8ea] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-primary/10 bg-white p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Capítulo de amostra
            </p>
            <h3
              id={`book-sample-${book.id}`}
              className="font-display mt-1 text-2xl font-bold leading-tight text-[#33251c] md:text-3xl"
            >
              {book.title}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-circle btn-ghost shrink-0"
            onClick={onClose}
            aria-label="Fechar capítulo de amostra"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
          <aside className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white bg-white shadow-sm">
              {sample ? (
                <Image
                  src={sample.imageSrc}
                  alt={sample.imageAlt}
                  fill
                  loading="eager"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-base-content/60">
                  <BookOpen className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[book.contextLabel, book.styleLabel, book.ageLabel].filter(Boolean).map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {label}
                </span>
              ))}
            </div>
            {book.audioSampleSrc && (
              <div className="rounded-xl border border-primary/10 bg-white p-4">
                <p className="mb-3 text-sm font-bold text-primary">
                  {book.audioSampleTitle ?? 'Ouvir excerto áudio'}
                </p>
                <audio controls preload="metadata" className="w-full">
                  <source src={book.audioSampleSrc} type="audio/mpeg" />
                </audio>
              </div>
            )}
          </aside>

          <div className="max-h-[70vh] overflow-y-auto rounded-xl bg-white p-5 shadow-sm">
            <h4 className="font-display text-xl font-bold leading-tight text-[#33251c]">
              {sample?.title ?? 'Capítulo de amostra'}
            </h4>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-base-content/75">
              {sample?.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
