import { TargetAudience, NovelStyle, GraphicalStyle, LiteraryPersona } from '@/types/story-enums';
import type { WritingPersonaSettings } from '@/types/writing-persona';
import type { BookType } from '@/lib/premium-children-book/contract';

export interface StoryData {
  storyId: string;
  title: string;
  place: string | null;
  targetAudience: TargetAudience | null;
  novelStyle: NovelStyle | null;
  graphicalStyle: GraphicalStyle | null;
  literaryPersona?: LiteraryPersona | null;
  customWritingPersona?: WritingPersonaSettings | null;
  plotDescription: string | null;
  additionalRequests: string | null;
  imageGenerationInstructions: string | null;
  chapterCount?: number | null;
  storyLanguage?: string | null;
  bookType?: BookType;
  bookFormatEditable?: boolean;
  premiumBookPilot?: boolean;
  status?: 'temporary' | 'draft' | 'writing' | 'published';
}

export interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  storyGenerationStatus?: 'queued' | 'running' | 'failed' | 'completed' | 'cancelled' | null;
  storyGenerationCompletedPercentage?: number;
  isPublic?: boolean;
  slug?: string;
  bookType?: BookType;
  premiumPrintAvailable?: boolean;
  premiumAudiobookAvailable?: boolean;
  coverUri?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SortField = 'title' | 'createdAt' | 'updatedAt' | 'status';
export type SortDirection = 'asc' | 'desc';
