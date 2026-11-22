import type { StoryIntent } from '@/constants/intents';

export const essentials = ['characters', 'setting', 'plot'] as const;

export type WhispererEssential = (typeof essentials)[number];

export const whispererRubricVersion = 3;

export const readinessStates = ['missing', 'developing', 'ready'] as const;

export const readinessRevisionChanged = 'READINESS_REVISION_CHANGED';

export type WhispererReadiness = {
  rubricVersion?: number;
  firstReadyTurnId?: string;
  ready: boolean;
  missing: WhispererEssential[];
  areas: Record<WhispererEssential, (typeof readinessStates)[number]>;
  hint: string;
};

export type WhispererChoicesMode = 'button' | 'single' | 'multiple';

export type WhispererQuestionOptions = {
  choices: string[];
  choicesMode?: WhispererChoicesMode;
};

export type WhispererSavedQuestion = WhispererQuestionOptions & {
  id: string;
  previous?: Record<string, WhispererQuestionOptions>;
};

export type WhispererContext = {
  primaryIntent?: StoryIntent;
  opening?: { question: string; choices: string[] };
  brief?: string;
  characterNames?: string[];
  characterIds?: string[];
  imageObjectPaths?: string[];
  audioObjectPath?: string;
};
