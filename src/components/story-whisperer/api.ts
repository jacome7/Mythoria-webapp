import type { StoryIntent } from '@/constants/intents';
import type { WhispererOpening } from '@/lib/story-whisperer/opening';
import type { BiographerProjectDetail, BiographerTurn } from '@/types/biographer';

import {
  readinessRevisionChanged,
  type WhispererChoicesMode,
  type WhispererReadiness,
} from '@/lib/story-whisperer/types';

export type WhispererInterview = {
  projectId: string;
  revision: number;
  primaryIntent?: StoryIntent | null;
  opening?: WhispererOpening;
  turns: Array<
    BiographerTurn & {
      recoverableAudio?: boolean;
      choices?: string[];
      choicesMode?: WhispererChoicesMode;
    }
  >;
  assets: BiographerProjectDetail['assets'];
  readiness: WhispererReadiness;
  readinessNeedsRefresh?: boolean;
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

export async function assessReadiness(draftId: string, projectId: string, signal?: AbortSignal) {
  const response = await fetch(`${whispererPath(draftId)}/readiness`, {
    method: 'POST',
    headers: whispererProjectHeader(projectId),
    ...(signal && { signal }),
  });
  if (response.ok) return true;
  if (response.status === 409) {
    const failure = await response.json().catch(() => null);
    if (failure?.code === readinessRevisionChanged) return false;
  }
  throw new Error('Interview progress unavailable');
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
