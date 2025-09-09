'use client';

import { useState, useEffect, useMemo } from 'react';
import { Story, SortField, SortDirection } from '@/types/story';

export function useStoriesTable(pageSize = Infinity) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStories = async () => {
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
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedStories = useMemo(() => {
    const sorted = [...stories];
    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [stories, sortField, sortDirection]);

  const pageCount = Math.ceil(sortedStories.length / pageSize);
  const paginatedStories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStories.slice(start, start + pageSize);
  }, [sortedStories, currentPage, pageSize]);

  return {
    stories,
    setStories,
    loading,
    fetchStories,
    sortField,
    sortDirection,
    handleSort,
    paginatedStories,
    pageCount,
    currentPage,
    setCurrentPage,
  };
}
