export const essentials = ['characters', 'setting', 'plot'] as const;

export type WhispererEssential = (typeof essentials)[number];

export const readinessStates = ['missing', 'developing', 'ready'] as const;

export type WhispererReadiness = {
  ready: boolean;
  missing: WhispererEssential[];
  areas: Record<WhispererEssential, (typeof readinessStates)[number]>;
  hint: string;
};

export type WhispererChoicesMode = 'button' | 'single' | 'multiple';

export type WhispererContext = {
  brief?: string;
  characterNames?: string[];
  characterIds?: string[];
  imageObjectPaths?: string[];
  audioObjectPath?: string;
};
