import { jsonRequest, whispererPath, type WhispererDraft } from '@/components/story-whisperer/api';
import {
  type confirmedCharacterReferences,
  type StoryTemplateJourney,
} from '@/lib/story-templates/journey';
import { saveStep2Submission, type Step2Submission } from '@/lib/story-templates/submission';
import type { CreationObservation } from '@/lib/growth/creation';
import { getStoredConsent } from '@/lib/consent';

export interface OutlineInputs {
  brief: string;
  characterIds: string[];
  imageObjectPaths: string[];
  audioObjectPath: string | undefined;
}

export async function syncStoryCharacters(
  storyId: string,
  characterIds: string[],
  preview: boolean,
  structureError: () => Error,
) {
  if (preview) {
    const response = await fetch(`/api/stories/${storyId}/characters`);
    if (!response.ok) throw structureError();
    const result = await response.json();
    for (const character of result.characters ?? []) {
      if (character.characterId && !characterIds.includes(character.characterId)) {
        const removed = await fetch(`/api/stories/${storyId}/characters/${character.characterId}`, {
          method: 'DELETE',
        });
        if (!removed.ok) throw structureError();
      }
    }
  }
  for (const characterId of characterIds) {
    const linked = await fetch(`/api/stories/${storyId}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId }),
    });
    if (!linked.ok) throw structureError();
  }
}

interface StructureRequestOptions {
  submission: Step2Submission;
  inputs: OutlineInputs;
  templatesEnabled: boolean;
  whisperer?: WhispererDraft;
  locale: string;
  journey: StoryTemplateJourney | null;
  questionReferences: ReturnType<typeof confirmedCharacterReferences>;
  creationObservation?: CreationObservation | null;
}

export async function prepareStructureRequest({
  submission,
  inputs,
  templatesEnabled,
  whisperer,
  locale,
  journey,
  questionReferences,
  creationObservation,
}: StructureRequestOptions) {
  const { brief, characterIds, audioObjectPath } = inputs;
  let { imageObjectPaths } = inputs;
  const storyId = submission.storyId;
  let structureRequestId = crypto.randomUUID();
  let whispererDescription: string | undefined;
  if (whisperer) {
    const handoff = await fetch(
      `${whispererPath(storyId)}/handoff`,
      jsonRequest(
        'POST',
        {
          revision: whisperer.revision,
          ...(submission.whispererRetryOf ? { retryOf: submission.whispererRetryOf } : {}),
          brief,
          imageObjectPaths,
          audioObjectPath,
          characterIds: characterIds.length ? characterIds : undefined,
          storyPreferences: journey?.preferences,
          factuality: journey?.mode === 'memory' ? 'memory' : undefined,
          ...(questionReferences.length ? { characterReferences: questionReferences } : {}),
        },
        whisperer.projectId,
      ),
    );
    if (!handoff.ok) throw new Error('Interview handoff failed');
    const result = (await handoff.json()) as {
      draftId: string;
      structureRequestId: string;
      userDescription: string;
      imageObjectPaths: string[];
    };
    if (result.draftId !== storyId) throw new Error('Interview draft mismatch');
    structureRequestId = result.structureRequestId;
    whispererDescription = result.userDescription;
    imageObjectPaths = [...result.imageObjectPaths];
  }
  const consent = getStoredConsent();
  const prepared = {
    ...submission,
    outlineFailure: undefined,
    structureRequestId,
    structurePayload: JSON.stringify({
      storyId,
      userDescription:
        whispererDescription ||
        brief ||
        (imageObjectPaths.length
          ? 'Analyze the images to create a story'
          : 'Analyze the audio to create a story'),
      imageObjectPaths,
      audioObjectPath,
      characterIds: characterIds.length ? characterIds : undefined,
      locale,
      storyPreferences: journey?.preferences,
      factuality: journey?.mode === 'memory' ? 'memory' : undefined,
      structureRequestId,
      ...(whisperer ? { storyWhisperer: true } : {}),
      ...(questionReferences.length ? { characterReferences: questionReferences } : {}),
    }),
    creationAnalytics:
      creationObservation && consent?.state.analytics_storage === 'granted'
        ? { consentAt: consent.timestamp, snapshot: creationObservation }
        : undefined,
  };
  saveStep2Submission(prepared, templatesEnabled);
  return { submission: prepared, inputs: { ...inputs, imageObjectPaths } };
}

export async function queueStructureRequest(
  submission: Step2Submission,
  templatesEnabled: boolean,
  structureError: () => Error,
): Promise<Step2Submission> {
  let payload = submission.structurePayload;
  const consent = getStoredConsent();
  if (
    payload &&
    submission.creationAnalytics &&
    consent?.state.analytics_storage === 'granted' &&
    consent.timestamp === submission.creationAnalytics.consentAt
  ) {
    payload = JSON.stringify({
      ...JSON.parse(payload),
      creationObservation: submission.creationAnalytics.snapshot,
    });
  }
  const response = await fetch('/api/stories/genai-structure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  const data = await response.json();
  if (!response.ok || !data.jobId) throw structureError();
  const queued = { ...submission, jobId: data.jobId };
  saveStep2Submission(queued, templatesEnabled);
  return queued;
}
