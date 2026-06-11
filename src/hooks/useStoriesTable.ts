'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Story } from '@/types/story';

export function useStoriesTable(pageSize = Infinity) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStories = useCallback(async () => {
    try {
      const response = await fetch('/api/my-stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const sortedStories = useMemo(() => {
    const sorted = [...stories];
    sorted.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return sorted;
  }, [stories]);

  // When pageSize is Infinity the previous implementation produced an empty array because:
  // start = (currentPage-1) * Infinity => 0 * Infinity = NaN, end = NaN + Infinity = NaN, slice(NaN, NaN) => slice(0,0)
  // Handle Infinity explicitly so all stories show.
  const pageCount = pageSize === Infinity ? 1 : Math.ceil(sortedStories.length / pageSize);
  const paginatedStories = useMemo(() => {
    if (pageSize === Infinity) return sortedStories;
    const start = (currentPage - 1) * pageSize; // currentPage starts at 1
    return sortedStories.slice(start, start + pageSize);
  }, [sortedStories, currentPage, pageSize]);

  return {
    stories,
    setStories,
    loading,
    fetchStories,
    paginatedStories,
    pageCount,
    currentPage,
    setCurrentPage,
  };
}
