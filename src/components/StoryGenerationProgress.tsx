'use client';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import type { Story } from '@/types/story';
import ThemedArtwork from './ThemedArtwork';
import styles from './StoryGenerationProgress.module.css';

interface StoryGenerationProgressProps {
  storyId: string;
  storyTitle?: string;
  onComplete?: () => void;
  premiumBook?: boolean;
}

type StoryProgress = Pick<Story, 'storyId' | 'title' | 'status' | 'storyGenerationStatus'> & {
  storyGenerationCompletedPercentage?: number | null;
};

const stages = [
  { label: 'writing', file: 'PaperAndPencil.webp', width: 256, height: 282 },
  { label: 'illustrating', file: 'Color_pallete.webp', width: 256, height: 241 },
  { label: 'preparing', file: 'openBook.webp', width: 256, height: 235 },
] as const;

function ProgressOrnament({ divider = false }: { divider?: boolean }) {
  return (
    <div className={divider ? styles.divider : styles.ornament} aria-hidden="true">
      <ThemedArtwork src="/Papercut_icons/sparkle_b.webp" width={128} height={136} alt="" />
    </div>
  );
}

export default function StoryGenerationProgress({
  storyId,
  storyTitle,
  onComplete,
  premiumBook = false,
}: StoryGenerationProgressProps) {
  const t = useTranslations('StoryGenerationProgress');
  const tBook = useTranslations('PremiumBook');
  const router = useRouter();
  const params = useParams() as { locale?: string } | null;
  const locale = params?.locale && typeof params.locale === 'string' ? params.locale : 'en-US';
  const progressLabelId = useId();
  const [progress, setProgress] = useState<StoryProgress>();

  useEffect(() => {
    const controller = new AbortController();
    let requestsStarted = 0;
    let lastAppliedRequest = 0;

    const fetchProgress = async () => {
      const requestNumber = ++requestsStarted;
      try {
        const response = await fetch(`/api/my-stories/${storyId}`, { signal: controller.signal });
        if (!response.ok) return;

        const { story }: { story: StoryProgress } = await response.json();
        if (controller.signal.aborted || requestNumber < lastAppliedRequest) return;
        lastAppliedRequest = requestNumber;

        setProgress({ ...story, storyId });
        const published = story.status === 'published';
        const stopped =
          story.storyGenerationStatus === 'failed' || story.storyGenerationStatus === 'cancelled';
        if (published || (premiumBook && stopped)) {
          clearInterval(intervalId);
          controller.abort();
        }
        if (published) onComplete?.();
      } catch (error) {
        if (!controller.signal.aborted) console.error('Error fetching story progress:', error);
      }
    };

    const intervalId = setInterval(fetchProgress, 15000);
    void fetchProgress();

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [storyId, onComplete, premiumBook]);

  const story = progress?.storyId === storyId ? progress : undefined;
  const reportedPercentage = story?.storyGenerationCompletedPercentage ?? 0;
  const percentage = Number.isFinite(reportedPercentage)
    ? Math.min(100, Math.max(0, reportedPercentage))
    : 0;
  const formattedPercentage = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(percentage / 100);
  const title = storyTitle?.trim() || story?.title?.trim();
  const isStopped =
    story?.storyGenerationStatus === 'failed' || story?.storyGenerationStatus === 'cancelled';

  // Show completion state when story is published
  if (story?.status === 'published') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#d9b86c]/50 bg-[#fff9ec] p-5 text-center shadow-lg sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -left-14 -top-14 h-36 w-36 rounded-full bg-[#e9cb82]/25"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-[#72aaa6]/15"
        />

        <div className="relative">
          <div className="mx-auto mb-5 w-fit rounded-[2rem] border border-primary/15 bg-white p-2 shadow-sm">
            <Image
              src="/Papercut_icons/fa-wand-magic-sparkles.webp"
              alt=""
              width={144}
              height={144}
              className="h-28 w-28 rounded-3xl object-contain sm:h-32 sm:w-32"
              priority
            />
          </div>

          <h1 className="mb-2 text-3xl font-bold text-primary">{t('completion.title')}</h1>
          <p className="mx-auto max-w-xl text-base-content/70 sm:text-lg">
            {t('completion.description')}
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => router.push(`/${locale}/stories/read/${storyId}`)}
              className="btn btn-primary btn-lg min-h-12 whitespace-nowrap border-none shadow-md sm:min-w-48"
            >
              {t('completion.buttons.readStory')}
            </button>
            <button
              onClick={() => router.push(`/${locale}/stories`)}
              className="btn btn-outline min-h-12 whitespace-nowrap border-primary/40 text-primary hover:border-primary hover:bg-primary hover:text-primary-content"
            >
              {t('completion.buttons.myStories')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <ProgressOrnament />
        <h1 aria-live="polite">{t(isStopped ? 'progress.stoppedTitle' : 'progress.title')}</h1>
        {title && <p className={styles.storyTitle}>{title}</p>}
      </header>

      <div className={styles.progress}>
        <div className={styles.progressHeader}>
          <span id={progressLabelId}>{t('progress.progressLabel')}</span>
          <span className={styles.percent} aria-hidden="true">
            {formattedPercentage}
          </span>
        </div>
        <progress
          className={styles.meter}
          aria-labelledby={progressLabelId}
          value={percentage}
          max={100}
        />
      </div>

      <ol className={styles.stages} role="list">
        {stages.map(({ file, height, label, width }) => (
          <li key={label} className={styles.stage}>
            <div className={styles.stageArt}>
              <ThemedArtwork
                src={`/Papercut_icons/${file}`}
                alt=""
                width={width}
                height={height}
                sizes="(max-width: 480px) 95px, (max-width: 1024px) 16vw, 210px"
              />
            </div>
            <span>{t(`progress.stages.${label}`)}</span>
          </li>
        ))}
      </ol>

      <ProgressOrnament divider />
      {premiumBook && isStopped && (
        <p role="alert" className={styles.leaveMessage}>
          {tBook('generationInterrupted')}
        </p>
      )}
      {!isStopped && (
        <p className={styles.leaveMessage}>
          {premiumBook ? tBook('generationProgress') : t('progress.leaveMessage')}
        </p>
      )}
      <Link href={`/${locale}/my-stories`} className={styles.myStories}>
        {t('progress.myStories')}
      </Link>
    </section>
  );
}
