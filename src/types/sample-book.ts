import type { StoryIntent } from '@/constants/intents';

export interface SampleBook {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  shortExcerpt?: string;
  locale: string;
  intent: StoryIntent;
  recipients: string[];
  tags: string[];
  style: string;
  graphicalStyle?: string;
  novelStyle?: string;
  targetAudience?: string;
  readerAgeBand?: string;
  buyerPersona?: string;
  recipientType?: string;
  storyIntent?: string;
  fictionalUserContext?: string;
  safetyNotes?: string[];
  placement?: string;
  status?: string;
  riskRating?: string;
  coverSrc: string;
  featureSrc?: string;
  chapterImageSrc?: string;
  sampleChapterSrc?: string;
  audioSampleSrc?: string;
  audioSampleTitle?: string;
  audioTeaserText?: string;
  source: 'legacy' | 'sample-pack';
}
