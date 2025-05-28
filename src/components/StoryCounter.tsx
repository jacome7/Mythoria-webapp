'use client';

import { useEffect, useState } from 'react';
import { FaBookReader } from 'react-icons/fa';

const StoryCounter = () => {
  const [storyCount, setStoryCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStoryCount = async () => {
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
          }        } catch {
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
        setStoryCount(data.count*2+100); // Example transformation: double the count and add 100
      } else if (typeof data.count === 'string') {
        const parsedCount = parseInt(data.count, 10);
        if (!isNaN(parsedCount)) {
          setStoryCount(parsedCount);
        } else {
          throw new Error(`Received non-integer string count: ${data.count}`);
        }
      } else {
        throw new Error(`Unexpected count type: ${typeof data.count} value: ${data.count}`);
      }    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching story count.";
      console.error("Failed to fetch story count:", err); 
      setError(errorMessage);
      setStoryCount(null); // Clear count on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryCount(); // Fetch immediately on mount
    const intervalId = setInterval(fetchStoryCount, 150000); // Refresh every 150 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  return (
    <div className="stats shadow bg-primary text-primary-content">
      <div className="stat">
        <div className="stat-figure">
          <FaBookReader className="text-3xl" />
        </div>
        <div className="stat-title">Stories Generated</div>
        {isLoading && <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>}
        {error && <div className="stat-value text-error text-sm">Error loading</div>}
        {!isLoading && !error && storyCount !== null && (
          <div className="stat-value">{storyCount.toLocaleString()}</div>
        )}
        {!isLoading && !error && storyCount === null && (
            <div className="stat-value">N/A</div>
        )}
        <div className="stat-desc">Join our growing community of storytellers!</div>
      </div>
    </div>
  );
};

export default StoryCounter;
