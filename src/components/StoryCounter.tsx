'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './StoryCounter.module.css';
import { homepageAsset } from '@/constants/homepageAssets';

const StoryCounter = () => {
  const tCommonStoryCounter = useTranslations('StoryCounter');
  const [storyCount, setStoryCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStoryCount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null); // Reset error state at the beginning of a fetch attempt
      const response = await fetch('/api/stories?action=count');

      if (!response.ok) {
        let errorBody = 'No error body from server.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorBody = errData.error;
          }
        } catch {
          try {
            errorBody = await response.text();
          } catch {
            errorBody = 'Could not read error response body.';
          }
        }
        throw new Error(`HTTP error! status: ${response.status}. Server message: ${errorBody}`);
      }

      const data = await response.json();

      if (typeof data.count === 'number') {
        setStoryCount(data.count * 2 + 100); // Example transformation: double the count and add 100
      } else if (typeof data.count === 'string') {
        const parsedCount = parseInt(data.count, 10);
        if (!isNaN(parsedCount)) {
          setStoryCount(parsedCount);
        } else {
          throw new Error(`Received non-integer string count: ${data.count}`);
        }
      } else {
        throw new Error(`Unexpected count type: ${typeof data.count} value: ${data.count}`);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unknown error occurred while fetching story count.';
      console.error('Failed to fetch story count:', err);
      setError(errorMessage);
      setStoryCount(null); // Clear count on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoryCount(); // Fetch immediately on mount
    const intervalId = setInterval(fetchStoryCount, 150000); // Refresh every 150 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [fetchStoryCount]);

  return (
    <div className={styles.counterCard}>
      <Image
        src={homepageAsset('sparkle_a.webp')}
        alt=""
        width={128}
        height={134}
        className={styles.starOne}
        aria-hidden="true"
      />
      <Image
        src={homepageAsset('sparkle_b.webp')}
        alt=""
        width={128}
        height={136}
        className={styles.starTwo}
        aria-hidden="true"
      />
      <div className={styles.counterContent}>
        <div className={styles.countGroup}>
          {isLoading && (
            <div className={styles.countValue}>
              <span className="loading loading-dots loading-md"></span>
            </div>
          )}
          {error && <div className={styles.errorValue}>{tCommonStoryCounter('error')}</div>}
          {!isLoading && !error && storyCount !== null && (
            <div className={styles.countValue}>{storyCount.toLocaleString()}</div>
          )}
          {!isLoading && !error && storyCount === null && (
            <div className={styles.countValue}>{tCommonStoryCounter('notAvailable')}</div>
          )}
          <div className={styles.countDescription}>{tCommonStoryCounter('description')}</div>
        </div>
        <Image
          src={homepageAsset('number_of_stories_icon.webp')}
          alt=""
          width={128}
          height={163}
          sizes="88px"
          className={styles.counterIcon}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default StoryCounter;
