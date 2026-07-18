'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { SampleBook } from '@/types/sample-book';

function withoutFrontmatter(markdown: string): string {
  return markdown.replace(/^---[\s\S]*?---\s*/, '').trim();
}

export default function SampleBookDetailPage({ slug }: { slug: string }) {
  const locale = useLocale();
  const t = useTranslations('HomePage.gallery');
  const [book, setBook] = useState<SampleBook | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadBook = async () => {
      try {
        const response = await fetch('/api/sample-books', { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to load sample books');

        const catalog = (await response.json()) as SampleBook[];
        const matchingBook = catalog.find((entry) => entry.slug === slug);
        if (!matchingBook) {
          setError(true);
          return;
        }

        setBook(matchingBook);

        if (matchingBook.sampleChapterSrc) {
          const chapterResponse = await fetch(matchingBook.sampleChapterSrc, {
            signal: controller.signal,
          });
          if (chapterResponse.ok) setChapter(withoutFrontmatter(await chapterResponse.text()));
        }
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') setError(true);
      }
    };

    void loadBook();
    return () => controller.abort();
  }, [slug]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl text-primary">{t('notFoundTitle')}</h1>
        <Link href={`/${locale}`} className="btn btn-primary mt-6">
          {t('backToHomepage')}
        </Link>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </main>
    );
  }

  const facts = [
    [t('intent'), book.intent],
    [t('audience'), book.readerAgeBand ?? book.targetAudience],
    [t('recipient'), book.recipientType],
    [t('literaryStyle'), book.novelStyle],
    [t('visualStyle'), book.graphicalStyle],
    [t('language'), book.locale],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <main className="bg-base-200 py-8 sm:py-12">
      <article className="mx-auto max-w-5xl px-4">
        <Link href={`/${locale}`} className="btn btn-ghost mb-5">
          ← {t('backToHomepage')}
        </Link>

        <div className="overflow-hidden rounded-3xl bg-base-100 shadow-xl">
          <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-base-200 shadow-lg">
              <Image
                src={book.coverSrc}
                alt={book.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                {t('fictionalSample')}
              </p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-primary">
                {book.title}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-base-content/80">{book.synopsis}</p>

              {book.shortExcerpt && (
                <blockquote className="mt-6 border-l-4 border-secondary pl-4 text-lg italic text-base-content/80">
                  “{book.shortExcerpt}”
                </blockquote>
              )}

              <dl className="mt-7 grid gap-3 sm:grid-cols-2">
                {facts.map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-base-200 p-3">
                    <dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">
                      {label}
                    </dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              {book.tags.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-semibold">{t('tags')}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {book.tags.map((tag) => (
                      <span key={tag} className="badge badge-primary badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {book.audioSampleSrc && (
                <section className="mt-7 rounded-2xl bg-primary/10 p-4">
                  <h2 className="font-display text-xl text-primary">{t('audioTeaser')}</h2>
                  <p className="mt-1 text-sm text-base-content/70">{t('audioAvailable')}</p>
                  <audio controls preload="metadata" className="mt-3 w-full">
                    <source src={book.audioSampleSrc} type="audio/mpeg" />
                  </audio>
                </section>
              )}
            </div>
          </div>

          {(book.featureSrc || book.chapterImageSrc) && (
            <section className="grid gap-5 border-t border-base-300 p-5 sm:p-8 md:grid-cols-2">
              {[book.featureSrc, book.chapterImageSrc]
                .filter((src): src is string => Boolean(src))
                .map((src, index) => (
                  <div
                    key={src}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-base-200"
                  >
                    <Image
                      src={src}
                      alt={index === 0 ? `${t('sceneAlt')} ${book.title}` : book.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ))}
            </section>
          )}

          {book.storyIntent && (
            <section className="border-t border-base-300 p-5 sm:p-8">
              <h2 className="font-display text-2xl text-primary">{t('storyIntent')}</h2>
              <p className="mt-3 leading-relaxed">{book.storyIntent}</p>
            </section>
          )}

          {chapter && (
            <section className="border-t border-base-300 p-5 sm:p-8">
              <h2 className="font-display text-2xl text-primary">{t('sampleChapter')}</h2>
              <div className="mt-4 whitespace-pre-wrap leading-8 text-base-content/85">
                {chapter}
              </div>
            </section>
          )}

          {(book.fictionalUserContext || (book.safetyNotes?.length ?? 0) > 0) && (
            <section className="border-t border-base-300 bg-base-200/60 p-5 sm:p-8">
              {book.fictionalUserContext && (
                <>
                  <h2 className="font-display text-2xl text-primary">{t('fictionalContext')}</h2>
                  <p className="mt-3 leading-relaxed">{book.fictionalUserContext}</p>
                </>
              )}
              {book.safetyNotes && book.safetyNotes.length > 0 && (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-base-content/75">
                  {book.safetyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
