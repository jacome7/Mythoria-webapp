'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { chapterService } from '@/db/services';

interface Chapter {
  number: number;
  title: string;
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
    const loadChapters = async () => {
      try {
        const table = await chapterService.getChapterTableOfContents(storyId);
        const list = table.map((c: { chapterNumber: number; title: string }) => ({
          number: c.chapterNumber,
          title: c.title || `Chapter ${c.chapterNumber}`,
        }));
        setChapters(list);
      } catch {
        setChapters([]);
      }
    };
    if (storyId) {
      void loadChapters();
    }
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
