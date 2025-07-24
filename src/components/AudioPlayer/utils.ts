// Utility functions for handling different audiobook data formats

import { AudioChapter } from './types';

export interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  imageUri: string | null;
  imageThumbnailUri: string | null;
  htmlContent: string;
  audioUri: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function hasAudiobook(audiobookUri: unknown): boolean {
  if (!audiobookUri) return false;
  
  if (Array.isArray(audiobookUri)) {
    return audiobookUri.length > 0;
  }
  
  if (typeof audiobookUri === 'object' && audiobookUri !== null) {
    const audiobookData = audiobookUri as Record<string, unknown>;
    
    // Check for chapter_ keys first (Format 1)
    let chapterKeys = Object.keys(audiobookData).filter(key => key.startsWith('chapter_'));
    
    // If no chapter_ keys, check for numeric keys (Format 2)
    if (chapterKeys.length === 0) {
      chapterKeys = Object.keys(audiobookData).filter(key => /^\d+$/.test(key));
    }
    
    return chapterKeys.some(key => audiobookData[key] && typeof audiobookData[key] === 'string');
  }
  
  return false;
}

export function getAudioChapters(
  audiobookUri: unknown,
  chapters: Chapter[],
  fallbackTitleFn: (chapterNumber: number) => string
): AudioChapter[] {
  if (!audiobookUri || !chapters) return [];
  
  // Handle array format (structured audiobook data) - but enhance with database chapter info
  if (Array.isArray(audiobookUri)) {
    // Create a map of database chapters for easy lookup
    const dbChaptersMap = new Map();
    chapters.forEach(chapter => {
      dbChaptersMap.set(chapter.chapterNumber, chapter);
    });
    
    // Enhance the array format with database chapter information
    return audiobookUri.map((audioChapter, index) => {
      const chapterNumber = index + 1;
      const dbChapter = dbChaptersMap.get(chapterNumber);
      
      return {
        ...audioChapter,
        chapterTitle: dbChapter?.title || audioChapter.chapterTitle || fallbackTitleFn(chapterNumber),
        imageUri: dbChapter?.imageUri || audioChapter.imageUri || undefined
      };
    });
  }
  
  // Handle object format (chapter keys mapping to URLs)
  if (typeof audiobookUri === 'object' && audiobookUri !== null) {
    const audiobookData = audiobookUri as Record<string, unknown>;
    const audioChapters: AudioChapter[] = [];
    
    // First, try to find chapter_ keys (Format 1)
    let chapterKeys = Object.keys(audiobookData)
      .filter(key => key.startsWith('chapter_'))
      .sort((a, b) => {
        const aNum = parseInt(a.replace('chapter_', ''));
        const bNum = parseInt(b.replace('chapter_', ''));
        return aNum - bNum;
      });

    // If no chapter_ keys found, try numeric keys (Format 2)
    if (chapterKeys.length === 0) {
      chapterKeys = Object.keys(audiobookData)
        .filter(key => /^\d+$/.test(key)) // Only numeric keys
        .sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
    }

    // Create a map of database chapters for easy lookup
    const dbChaptersMap = new Map();
    chapters.forEach(chapter => {
      dbChaptersMap.set(chapter.chapterNumber, chapter);
    });

    for (const chapterKey of chapterKeys) {
      let chapterNumber: number;
      
      if (chapterKey.startsWith('chapter_')) {
        // Format 1: chapter_1, chapter_2, etc.
        chapterNumber = parseInt(chapterKey.replace('chapter_', ''));
      } else {
        // Format 2: 1, 2, 3, etc.
        chapterNumber = parseInt(chapterKey);
      }
      
      const audioUri = audiobookData[chapterKey];
      const dbChapter = dbChaptersMap.get(chapterNumber);
      
      if (audioUri && typeof audioUri === 'string') {
        const audioChapter = {
          chapterTitle: dbChapter?.title || fallbackTitleFn(chapterNumber),
          audioUri: audioUri,
          duration: 0, // We don't have duration for object format
          imageUri: dbChapter?.imageUri || undefined
        };
        audioChapters.push(audioChapter);
      }
    }
    
    return audioChapters;
  }
  
  return [];
}
