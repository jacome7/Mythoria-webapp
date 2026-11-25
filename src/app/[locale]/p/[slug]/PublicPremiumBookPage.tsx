'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import PremiumBookReader from '@/components/PremiumBookReader';
import PublicStoryRating from '@/components/PublicStoryRating';
import QualifiedShareOpen from '@/components/QualifiedShareOpen';
import type { PremiumAudioMetadata } from '@/lib/premium-children-book/audiobook';
import type { PremiumBookReaderData } from '@/lib/premium-children-book/reader';

export default function PublicPremiumBookPage({ slug }: { slug: string }) {
  const tLoading = useTranslations('Loading');
  const tErrors = useTranslations('Errors');
  const tActions = useTranslations('Actions');
  const [book, setBook] = useState<{
    premiumBook: PremiumBookReaderData;
    story: { storyId: string; premiumAudio?: PremiumAudioMetadata };
    canPrint: boolean;
  } | null>();

  useEffect(() => {
    const request = new AbortController();
    void fetch(`/api/p/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: request.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.premiumBook ? data : null;
      })
      .then(setBook)
      .catch(() => {
        if (!request.signal.aborted) setBook(null);
      });
    return () => request.abort();
  }, [slug]);

  if (book === undefined) {
    return (
      <p role="status" className="p-6 text-center">
        {tLoading('default')}
      </p>
    );
  }
  if (!book) {
    return (
      <p role="alert" className="p-6 text-center">
        {tErrors('storyNotFoundGeneric')}
      </p>
    );
  }
  return (
    <main>
      {(book.canPrint || book.story.premiumAudio) && (
        <div className="mx-auto flex max-w-6xl justify-end gap-2 px-4 pt-4">
          {book.story.premiumAudio && (
            <Link href={`/p/${slug}/listen`} className="btn btn-outline">
              {tActions('listen')}
            </Link>
          )}
          {book.canPrint && (
            <Link href={`/stories/print/${book.story.storyId}`} className="btn btn-outline">
              {tActions('print')}
            </Link>
          )}
        </div>
      )}
      <PremiumBookReader book={book.premiumBook} />
      <QualifiedShareOpen publicSlug={slug} />
      <div className="mx-auto max-w-4xl px-4">
        <PublicStoryRating storyId={book.story.storyId} />
      </div>
    </main>
  );
}
