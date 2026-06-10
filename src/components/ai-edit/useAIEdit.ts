'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Chapter {
  number: number;
  title: string;
}

interface ChaptersResponse {
  chapters?: Array<{
    chapterNumber: number;
    title?: string | null;
  }>;
}

interface UseAIEditProps {
  storyId: string;
}

export function useAIEdit({ storyId }: UseAIEditProps) {
  const t = useTranslations('AIEditModal');
  const [activeTab, setActiveTab] = useState<'text' | 'images'>('text');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [userRequest, setUserRequest] = useState('');

  useEffect(() => {
    if (!storyId) {
      setChapters([]);
      return;
    }

    const controller = new AbortController();

    const loadChapters = async () => {
      try {
        const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/chapters`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load chapters: ${response.status}`);
        }

        const data = (await response.json()) as ChaptersResponse;
        const list = (data.chapters ?? []).map((c) => ({
          number: c.chapterNumber,
          title: c.title || `Chapter ${c.chapterNumber}`,
        }));

        setChapters(list);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setChapters([]);
      }
    };

    void loadChapters();

    return () => controller.abort();
  }, [storyId]);

  return {
    t,
    activeTab,
    setActiveTab,
    chapters,
    selectedChapter,
    setSelectedChapter,
    userRequest,
    setUserRequest,
  };
}
