import type { BiographerProjectDetail, BiographerTurn } from '@/types/biographer';

import type { WhispererChoicesMode, WhispererReadiness } from '@/lib/story-whisperer/types';

export type WhispererInterview = {
  projectId: string;
  revision: number;
  turns: Array<
    BiographerTurn & {
      recoverableAudio?: boolean;
      choices?: string[];
      choicesMode?: WhispererChoicesMode;
    }
  >;
  assets: BiographerProjectDetail['assets'];
  readiness: WhispererReadiness;
  savedInputs?: Partial<WhispererContext>;
};

export type WhispererContext = {
  brief: string;
  imageObjectPaths: string[];
  audioObjectPath?: string;
  characterIds: string[];
};

export type WhispererDraft = {
  draftId: string;
  projectId: string;
  revision: number;
};

export const whispererPath = (draftId: string) => `/api/story-whisperer/${draftId}`;

export function whispererProjectHeader(projectId: string) {
  return { 'x-story-whisperer-project': projectId };
}

export function jsonRequest(method: string, value: unknown, projectId?: string): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(projectId ? whispererProjectHeader(projectId) : {}),
    },
    body: JSON.stringify(value),
  };
}

export class WhispererDraftDeletedError extends Error {}

export async function readInterview(draftId: string, init?: RequestInit) {
  const response = await fetch(whispererPath(draftId), { cache: 'no-store', ...init });
  if (response.status === 410) throw new WhispererDraftDeletedError();
  if (!response.ok) throw new Error('Interview unavailable');
  const { interview } = (await response.json()) as { interview: WhispererInterview | null };
  return interview;
}
