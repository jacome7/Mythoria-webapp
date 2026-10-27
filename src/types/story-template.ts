import type { StoryIntent } from '@/constants/intents';
import type { GraphicalStyle, NovelStyle, TargetAudience } from '@/types/story-enums';

export interface StoryGuideQuestion {
  id: string;
  text: string;
  choices: { id: string; label: string; value: string }[];
  suggestedChoiceId: string | null;
}

export interface StoryGuideAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface StoryPreferences {
  targetAudience?: TargetAudience;
  novelStyle?: NovelStyle;
  graphicalStyle?: GraphicalStyle;
  tone?: string;
}

export interface StoryTemplate {
  id: string;
  version: number;
  intents: StoryIntent[];
  sampleSlugs: string[];
  image: string;
  targetAudience: TargetAudience;
  novelStyle: NovelStyle;
  graphicalStyle: GraphicalStyle;
  modes: ('fiction' | 'memory')[];
  defaultMode: 'fiction' | 'memory';
  title: string;
  premise: string;
  description: string;
  tone: string;
  fallbackQuestions: StoryGuideQuestion[];
}
