jest.mock('@/lib/story-templates/create-document-worker', () => ({
  createDocumentWorker: jest.fn(),
}));
import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Step2Client from './Step2Client';
import StoryWhisperer from '@/components/story-whisperer/StoryWhisperer';
import type { WhispererInterview } from '@/components/story-whisperer/api';
import { STORY_INTENTS, type StoryIntent } from '@/constants/intents';
import { getWhispererOpening } from '@/lib/story-whisperer/opening.server';
import { getStoryTemplate, getStoryTemplates } from '@/lib/story-templates/catalog';
import { createTemplateJourney, type StoryTemplateJourney } from '@/lib/story-templates/journey';
import {
  readStep2Submission,
  saveStep2Submission,
  type Step2Submission,
} from '@/lib/story-templates/submission';
import { TEMPLATE_SESSION_KEY } from '@/hooks/useStoryTemplateJourney';
import type { StoryTemplate } from '@/types/story-template';
import type { UploadedImage, UploadedAudio } from '@/hooks/useStep2Session';
import type { LiveEvent, LiveState } from '@/hooks/biographer/useBiographerLive';

let mockRecordingDictation = false;
let mockLiveState: LiveState = 'paused';
let mockLiveSaving: 'saved' | 'saving' | 'attention' | 'local' = 'saved';
const mockStartLive = jest.fn(async () => undefined);
const mockSyncLive = jest.fn(async () => undefined);
const mockPrepareOutline = jest.fn(async () => true);
const mockFinishOutline = jest.fn((_callId: string, _accepted: boolean) => true);
const mockStopLive = jest.fn(async () => undefined);
const mockCancelLive = jest.fn<
  {
    turnId?: string;
    cleanup: Promise<void>;
  },
  []
>(() => ({ cleanup: Promise.resolve() }));
const mockResumeCapture = jest.fn();
let mockLiveEvent: (event: LiveEvent) => void;
const mockSaveWhispererAnswer = jest.fn<
  Promise<undefined>,
  [string, string, { id: string; text: string } | null]
>(async () => undefined);
const mockStopDictation = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPoll = jest.fn();
const mockFetch = jest.fn();
const mockTrackOpenAiAdsEvent = jest.fn();
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => mockTrackOpenAiAdsEvent(...args),
}));
const mockSearch = new URLSearchParams();
let mockInitialText = '';
let mockLocale = 'en-US';
let mockProfileIntent: StoryIntent | undefined;
let mockPreviousWizardPath: string | null = null;
let mockInitialImages: UploadedImage[] = [];
let mockInitialAudio: UploadedAudio | null = null;
let mockFinishImages: (failed?: boolean) => void;
let mockFinishAudio: () => void;
const owner = 'clerk-owner';
const draftId = '96a5e5db-4793-4b39-960d-51028c05ff26';

jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true, userId: 'clerk-owner' }),
  Show: ({ when, children }: { when: string; children: React.ReactNode }) =>
    when === 'signed-in' ? children : null,
  RedirectToSignIn: () => null,
}));
jest.mock('@/components/WizardNavigation', () => ({
  usePreviousWizardPath: () => mockPreviousWizardPath,
}));
import enStorySteps from '@/messages/en-US/StorySteps.json';
import ptStorySteps from '@/messages/pt-PT/StorySteps.json';
import ptWhisperer from '@/messages/pt-PT/StoryWhisperer.json';
import esStorySteps from '@/messages/es-ES/StorySteps.json';
import frStorySteps from '@/messages/fr-FR/StorySteps.json';
import deStorySteps from '@/messages/de-DE/StorySteps.json';

const step2Bundles: Record<string, Record<string, unknown>> = {
  'en-US': enStorySteps.StorySteps.step2,
  'pt-PT': ptStorySteps.StorySteps.step2,
  'es-ES': esStorySteps.StorySteps.step2,
  'fr-FR': frStorySteps.StorySteps.step2,
  'de-DE': deStorySteps.StorySteps.step2,
};

jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearch }));
jest.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useMessages: () => ({}),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslations: (namespace?: string) => {
    const translate = (key: string, values?: Record<string, unknown>) => {
      const prefix =
        namespace === 'StorySteps.step2.guided'
          ? 'guided.'
          : namespace === 'StorySteps.step2'
            ? ''
            : null;
      const full = prefix !== null ? `${prefix}${key}` : '';
      if (
        prefix !== null &&
        (full.startsWith('guided.') || full.startsWith('resume.') || full.startsWith('mediaPrep.'))
      ) {
        let current: unknown = step2Bundles[mockLocale] ?? step2Bundles['en-US'];
        for (const part of full.split('.')) {
          current = (current as Record<string, unknown>)?.[part];
        }
        if (typeof current === 'string') {
          const count = typeof values?.count === 'number' ? values.count : undefined;
          let text = current.replace(
            /\{count,\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
            (_, one: string, other: string) =>
              (count === 1 ? one : other).replace('#', String(count ?? '')),
          );
          for (const [k, v] of Object.entries(values ?? {})) {
            text = text.replace(`{${k}}`, String(v));
          }
          return text;
        }
      }
      return key;
    };
    return Object.assign(translate, {
      rich: (key: string, tags: Record<string, (label: string) => React.ReactNode>) =>
        key === 'introInputs' ? (
          <>
            {key}
            {tags.photo('attach')}
            {tags.dictate('dictate')}
            {tags.live('liveVoice')}
          </>
        ) : (
          key
        ),
    });
  },
}));
jest.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
jest.mock('@/lib/analytics', () => ({
  trackStoryCreation: { stepViewed: jest.fn(), stepCompleted: jest.fn() },
}));
jest.mock('@/hooks/useIntentContext', () => ({
  useIntentContext: () => (mockProfileIntent ? { intent: mockProfileIntent } : null),
}));
jest.mock('@/hooks/useJobPolling', () => ({ useJobPolling: () => ({ pollJob: mockPoll }) }));
jest.mock('@/hooks/biographer/useBiographerLive', () => ({
  useBiographerLive: (_projectId: string, _owner: string, onEvent: typeof mockLiveEvent) => {
    mockLiveEvent = onEvent;
    return {
      state: mockLiveState,
      saving: mockLiveSaving,
      start: mockStartLive,
      pause: jest.fn(),
      reset: jest.fn(),
      sync: mockSyncLive,
      stop: mockStopLive,
      cancel: mockCancelLive,
      prepareOutline: mockPrepareOutline,
      finishOutline: mockFinishOutline,
      resumeCapture: mockResumeCapture,
    };
  },
}));
jest.mock('@/hooks/biographer/useBiographerDictation', () => ({
  useBiographerDictation: () => ({
    state: mockRecordingDictation ? 'recording' : 'idle',
    hasPending: mockRecordingDictation,
    stop: mockStopDictation,
    cancel: jest.fn(),
  }),
}));
jest.mock('@/utils/biographer/drafts', () => ({
  answerDraft: async () => undefined,
  saveAnswerDraft: (...args: Parameters<typeof mockSaveWhispererAnswer>) =>
    mockSaveWhispererAnswer(...args),
}));
jest.mock('@/hooks/useStep2Session', () => ({
  useStep2Session: () => {
    const [storyText, setStoryText] = useState(mockInitialText);
    const [uploadedImages, setUploadedImages] = useState(mockInitialImages);
    const [uploadedAudio, setUploadedAudio] = useState(mockInitialAudio);
    mockFinishImages = (failed = false) =>
      setUploadedImages((images) =>
        images.map((image) => ({
          ...image,
          objectPath: `test/${image.id}`,
          status: failed ? 'error' : 'done',
        })),
      );
    mockFinishAudio = () =>
      setUploadedAudio((audio) =>
        audio ? { ...audio, status: 'done', objectPath: 'test/audio' } : audio,
      );
    return {
      storyText,
      setStoryText,
      resetInputs: () => {
        setStoryText('');
        setUploadedImages([]);
        setUploadedAudio(null);
      },
      uploadedImages,
      uploadedAudio,
      setUploadedImages,
      setUploadedAudio,
      isSaving: false,
      saveToSession: jest.fn(),
      selectedCharacterIds: [],
      setSelectedCharacterIds: jest.fn(),
    };
  },
}));
jest.mock('@/lib/story-templates/submission', () => ({
  ...jest.requireActual('@/lib/story-templates/submission'),
  storyInputFingerprint: async (value: unknown) => JSON.stringify(value),
}));
jest.mock('@/components/StepNavigation', () => ({
  __esModule: true,
  default: ({ onNext, nextDisabled }: { onNext: () => void; nextDisabled: boolean }) => (
    <button data-testid="next" disabled={nextDisabled} onClick={onNext}>
      Next
    </button>
  ),
}));
jest.mock('@/components/ProgressIndicator', () => ({ __esModule: true, default: () => null }));
jest.mock('./MediaCapture', () => ({ __esModule: true, default: () => null }));
jest.mock('./CharacterSelection', () => ({ __esModule: true, default: () => null }));
jest.mock('./WritingTips', () => ({ __esModule: true, default: () => null }));
jest.mock('./Step2Page.module.css', () => ({}));
jest.mock('@/components/story-templates/StoryTemplatePicker', () => ({
  __esModule: true,
  default: ({
    templates,
    journey,
    onChange,
    onFreeform,
    personalizationContent,
  }: {
    templates: StoryTemplate[];
    journey: StoryTemplateJourney | null;
    onChange: (value: StoryTemplateJourney | null) => void;
    onFreeform: () => void;
    personalizationContent?: React.ReactNode;
  }) => (
    <div>
      <button
        onClick={() =>
          onChange(createTemplateJourney(templates.find(({ id }) => id === 'drawing-adventure')))
        }
      >
        Select fiction
      </button>
      <button
        onClick={() =>
          onChange(createTemplateJourney(templates.find(({ id }) => id === 'grandparent-memory')))
        }
      >
        Select memory
      </button>
      <button onClick={onFreeform}>Freeform</button>
      {journey && (
        <textarea
          aria-label="Premise"
          value={journey.premise}
          onChange={(e) => onChange({ ...journey, premise: e.target.value })}
        />
      )}
      {personalizationContent}
    </div>
  ),
}));

function seedJourney(
  journey = createTemplateJourney(getStoryTemplate('drawing-adventure', 'en-US')),
) {
  sessionStorage.setItem(TEMPLATE_SESSION_KEY, JSON.stringify({ owner, journey }));
  return journey;
}
function saved(overrides: Partial<Step2Submission> = {}): Step2Submission {
  return { owner, storyId: draftId, fingerprint: 'old-input', completed: true, ...overrides };
}
function seedPhotoJourney() {
  const journey = createTemplateJourney(getStoryTemplate('drawing-adventure', 'en-US'));
  journey.answers = [
    {
      questionId: 'photo-protagonist',
      question: 'Quem é o protagonista?',
      answer: 'O meu cão, Bento',
      isAuthorContribution: true,
      photo: {
        id: '906b02da-7889-4fb1-bd68-d84b0134d4f7',
        status: 'done',
        objectPath: 'author/inputs/bento.jpg',
        sourceCharacterIndex: 1,
        metadata: {
          overallImageContent: 'photo',
          characters: [
            { label: 'person_1' },
            { label: 'dog_1', physicalDescription: 'A brown dog' },
          ],
        },
      },
    },
  ];
  return seedJourney(journey);
}
function renderStep(enabled = true, resume = true) {
  const view = render(
    <Step2Client templatesEnabled={enabled} templates={getStoryTemplates(mockLocale)} />,
  );
  if (resume) {
    const button = screen.queryByRole('button', {
      name: /Continuar a minha história|Continue my story/,
    });
    if (button) fireEvent.click(button);
  }
  return view;
}
function clickContinue() {
  const guided = screen.queryByRole('button', { name: /^(Continue|Continuar)/ });
  fireEvent.click(guided ?? screen.getByTestId('next'));
}
const structureCalls = () =>
  mockFetch.mock.calls.filter(([url]) => url === '/api/stories/genai-structure');
const payload = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  mockSearch.delete('templateId');
  mockSearch.delete('primaryIntent');
  mockProfileIntent = undefined;
  mockInitialText = '';
  mockLocale = 'en-US';
  mockPreviousWizardPath = null;
  mockInitialImages = [];
  mockInitialAudio = null;
  mockPush.mockReset();
  mockReplace.mockReset();
  mockPoll.mockReset();
  mockFetch.mockReset();
  mockTrackOpenAiAdsEvent.mockReset();
  mockPoll.mockResolvedValue({ status: 'completed', result: { story: { title: 'Ready' } } });
  mockFetch.mockImplementation(async (url: string) => {
    if (url === '/api/stories')
      return { ok: true, json: async () => ({ story: { storyId: draftId } }) };
    if (url === '/api/stories/genai-structure')
      return { ok: true, json: async () => ({ jobId: 'job-new' }) };
    return { ok: true, json: async () => ({}) };
  });
  global.fetch = mockFetch;
});

describe('Step 2 template submission integration', () => {
  it('only clears the local journey and draft pointer after confirming a fresh story', async () => {
    seedJourney();
    saveStep2Submission(saved(), true);
    localStorage.setItem('currentStoryId', draftId);
    localStorage.setItem('step2RelocatedInputs', '{}');
    renderStep(true, false);
    fireEvent.click(screen.getByRole('button', { name: 'Start a new story' }));
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(localStorage.getItem('currentStoryId')).toBe(draftId);
    fireEvent.click(screen.getByRole('button', { name: 'Start a new story' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete and start' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'How do you want to start?' })).toBeVisible(),
    );
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).toBeNull();
    expect(readStep2Submission(owner, true)).toBeNull();
    expect(localStorage.getItem('currentStoryId')).toBeNull();
    expect(localStorage.getItem('step2RelocatedInputs')).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('creates a draft then structures a selected fiction premise with no text contribution', async () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /Start with a template/ }));
    fireEvent.click(screen.getByText('Select fiction'));
    clickContinue();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tell-your-story/step-3'));
    const draft = payload(mockFetch.mock.calls[0]);
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/story-guide/draft',
      `/api/stories/${draft.draftId}/characters`,
      '/api/stories/genai-structure',
    ]);
    const structure = payload(structureCalls()[0]);
    expect(structure.storyId).toBe(draft.draftId);
    expect(structure.userDescription).toContain(
      getStoryTemplate('drawing-adventure', 'en-US')!.premise,
    );
    expect(structure.storyPreferences.targetAudience).toBe('children_7-10');
    expect(structure.structureRequestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(structure.factuality).toBeUndefined();
  });

  it('requires a real contribution before submitting a memory template', async () => {
    seedJourney(createTemplateJourney(getStoryTemplate('grandparent-memory', 'en-US')));
    const first = renderStep();
    expect(screen.getByRole('button', { name: /^Continue/ })).toBeDisabled();
    first.unmount();
    mockInitialText = 'Grandpa baked bread on Sundays.';
    renderStep();
    expect(screen.getByRole('button', { name: /^Continue/ })).toBeEnabled();
    clickContinue();
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const structure = payload(structureCalls()[0]);
    expect(structure.factuality).toBe('memory');
    expect(structure.userDescription).toContain('Grandpa baked bread on Sundays.');
  });

  it('continues with accepted input while excluding a pending guide suggestion', async () => {
    const journey = seedJourney();
    journey.question = {
      id: 'pending',
      text: 'A secret?',
      choices: ['a', 'b', 'c'].map((id) => ({ id, label: id, value: `UNACCEPTED-${id}` })),
      suggestedChoiceId: 'a',
    };
    seedJourney(journey);
    renderStep();
    clickContinue();
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(payload(structureCalls()[0]).userDescription).not.toContain('UNACCEPTED');
  });

  it('returns unchanged completed input to Step 3 without another API call', async () => {
    seedJourney();
    const first = renderStep();
    clickContinue();
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    first.unmount();
    mockFetch.mockClear();
    mockPush.mockClear();
    mockPoll.mockClear();
    renderStep();
    clickContinue();
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it('requires confirmation for changed completed input and reuses the same draft', async () => {
    seedJourney();
    saveStep2Submission(saved(), true);
    renderStep();
    clickContinue();
    await screen.findByRole('alertdialog', { name: 'restructureTitle' });
    expect(mockFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(screen.queryByRole('alertdialog', { name: 'restructureTitle' })).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    clickContinue();
    await screen.findByRole('alertdialog', { name: 'restructureTitle' });
    fireEvent.click(screen.getByRole('button', { name: 'confirmRestructure' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(payload(mockFetch.mock.calls[0]).draftId).toBe(draftId);
    expect(payload(structureCalls()[0]).storyId).toBe(draftId);
  });

  it('retries a lost structure response using the exact saved payload and request id', async () => {
    seedJourney();
    let lost = true;
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/stories/genai-structure') {
        if (lost) {
          lost = false;
          throw new Error('Response lost');
        }
        return { ok: true, json: async () => ({ jobId: 'job-recovered' }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    renderStep();
    clickContinue();
    await screen.findByRole('alert');
    const cached = readStep2Submission(owner, true)!;
    expect(cached.structurePayload).toBe(String(structureCalls()[0][1].body));
    clickContinue();
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(structureCalls()).toHaveLength(2);
    expect(structureCalls()[1][1].body).toBe(structureCalls()[0][1].body);
    expect(readStep2Submission(owner, true)?.structureRequestId).toBe(cached.structureRequestId);
  });

  it('settles an older lost request before asking to replace it with changed input', async () => {
    seedJourney();
    const oldPayload = JSON.stringify({
      storyId: draftId,
      userDescription: 'Original accepted brief',
      structureRequestId: 'ef732091-0165-4439-9e10-58bab3572c3f',
    });
    saveStep2Submission(saved({ completed: false, structurePayload: oldPayload }), true);
    renderStep();
    clickContinue();
    await screen.findByRole('alertdialog', { name: 'restructureTitle' });
    expect(structureCalls()).toHaveLength(1);
    expect(structureCalls()[0][1].body).toBe(oldPayload);
    expect(mockPoll).toHaveBeenCalledWith('job-new');
    expect(mockFetch.mock.calls.some(([url]) => url === '/api/story-guide/draft')).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
    expect(readStep2Submission(owner, true)?.completed).toBe(true);
  });

  it('uses the legacy freeform endpoint with the feature disabled', async () => {
    mockInitialText = 'My own story idea';
    renderStep(false);
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe('/api/stories');
    expect(payload(structureCalls()[0]).storyPreferences).toBeUndefined();
    expect(payload(structureCalls()[0]).structureRequestId).toBeUndefined();
  });

  it('pauses saved experimental work and ignores template deep links when access is disabled', async () => {
    const journey = seedJourney();
    const paused = saved({ completed: false, structurePayload: '{"experimental":"old payload"}' });
    saveStep2Submission(paused, true);
    mockSearch.set('templateId', 'drawing-adventure');
    mockInitialText = 'A new standard story';
    renderStep(false);
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe('/api/stories');
    expect(payload(structureCalls()[0]).userDescription).toBe('A new standard story');
    expect(payload(structureCalls()[0]).storyPreferences).toBeUndefined();
    expect(readStep2Submission(owner, true)?.structurePayload).toBe(paused.structurePayload);
    expect(JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!).journey).toEqual(journey);
    expect(readStep2Submission(owner)?.completed).toBe(true);
  });

  it('combines a chosen premise, accepted answers and original contribution when submitting', async () => {
    const journey = seedJourney();
    journey.answers = [{ questionId: 'accepted', question: 'A companion?', answer: 'A paper fox' }];
    seedJourney(journey);
    mockInitialText = 'Use my red notebook.';
    renderStep();
    expect(screen.getByLabelText('Premise')).toHaveValue(journey.premise);
    clickContinue();
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const brief = payload(structureCalls()[0]).userDescription;
    expect(brief).toContain(journey.premise);
    expect(brief).toContain('A paper fox');
    expect(brief).toContain('Use my red notebook.');
  });
});

describe('pt-PT experimental preview', () => {
  it('submits the confirmed photograph with its subject and protagonist role', async () => {
    mockLocale = 'pt-PT';
    const journey = seedPhotoJourney();
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tell-your-story/step-3'));
    const request = payload(structureCalls()[0]);
    expect(request.imageObjectPaths).toEqual(['author/inputs/bento.jpg']);
    expect(request.characterReferences).toEqual([
      {
        questionId: journey.answers[0].questionId,
        question: journey.answers[0].question,
        answer: journey.answers[0].answer,
        imageObjectPath: 'author/inputs/bento.jpg',
        sourceCharacterIndex: 1,
        targetRole: 'protagonist',
      },
    ]);
  });

  it('replays a lost structure reply without deleting the generated protagonist association', async () => {
    mockLocale = 'pt-PT';
    seedPhotoJourney();
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/stories/genai-structure') throw new Error('Lost response');
      return { ok: true, json: async () => ({ characters: [] }) };
    });
    const first = renderStep();
    fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
    await screen.findByText('structureError');
    const pending = readStep2Submission(owner, true)!;
    expect(pending.structurePayload).toBeDefined();
    first.unmount();
    mockFetch.mockClear();
    mockFetch.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ jobId: 'accepted-photo-job' }),
    }));
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual(['/api/stories/genai-structure']);
    expect(structureCalls()[0][1].body).toBe(pending.structurePayload);
  });

  it('requires a decision about an unconfirmed photo before continuing without it', async () => {
    mockLocale = 'pt-PT';
    const journey = seedPhotoJourney();
    journey.answerDraft = {
      questionId: 'pending',
      text: 'Unconfirmed detail',
      photo: journey.answers[0].photo,
    };
    journey.answers = [];
    seedJourney(journey);
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
    expect(
      screen.getByRole('alertdialog', { name: 'Há uma resposta por confirmar' }),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sem esta resposta' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(payload(structureCalls()[0]).characterReferences).toBeUndefined();
    expect(payload(structureCalls()[0]).imageObjectPaths).toEqual([]);
  });

  it.each(['en-US', 'es-ES', 'fr-FR', 'de-DE'])(
    'allows continuing a photo journey in %s',
    async (locale) => {
      mockLocale = locale;
      const journey = seedPhotoJourney();
      renderStep(true, false);
      const resumeBtn = screen.getByRole('button', {
        name: /Continue my story|Continuar mi historia|Continuer mon histoire|Meine Geschichte fortsetzen/,
      });
      fireEvent.click(resumeBtn);
      const continueBtn = screen.getByRole('button', {
        name: /^(Continue|Continuar|Continuer|Weiter)/,
      });
      expect(continueBtn).toBeEnabled();
      fireEvent.click(continueBtn);
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tell-your-story/step-3'));
      const request = payload(structureCalls()[0]);
      expect(request.characterReferences).toEqual([
        expect.objectContaining({
          questionId: journey.answers[0].questionId,
          imageObjectPath: 'author/inputs/bento.jpg',
          targetRole: 'protagonist',
        }),
      ]);
    },
  );
  it('shows personal inputs first and hides continuation until there is content', () => {
    mockLocale = 'pt-PT';
    renderStep();
    expect(screen.getByRole('heading', { name: 'Como quer começar?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Continuar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Escrever/ }));
    const textarea = screen.getByPlaceholderText('textPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Uma aventura com amigos.' } });
    fireEvent.click(screen.getByRole('button', { name: 'actions.done' }));
    expect(screen.getByRole('button', { name: /^Continuar/ })).toBeEnabled();
    expect(screen.getByText('Ideia breve')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Escrever/ }));
    expect(screen.getByPlaceholderText('textPlaceholder')).toHaveValue('Uma aventura com amigos.');
  });
  it('preserves text while browsing and cancelling, and clears only on confirmation', () => {
    mockLocale = 'pt-PT';
    mockInitialText = 'O meu contributo';
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /Começar com um modelo/ }));
    fireEvent.click(screen.getByText('Select fiction'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(screen.getByText('Ideia breve')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Começar com um modelo/ }));
    fireEvent.click(screen.getByText('Select fiction'));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar e começar' }));
    expect(screen.queryByText('Ideia breve')).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!).journey.templateId).toBe(
      'drawing-adventure',
    );
  });
  it('does not let an incoming template erase an existing contribution', () => {
    mockLocale = 'pt-PT';
    mockInitialText = 'Keep this';
    mockSearch.set('templateId', 'drawing-adventure');
    renderStep();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).toBeNull();
  });

  it('asks before leaving even an unchanged model', () => {
    mockLocale = 'pt-PT';
    mockInitialText = 'Keep my personal details';
    const journey = seedJourney();
    seedJourney(journey);
    renderStep();
    expect(screen.queryByText('Alterar o ponto de partida')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Personalize a sua história' })).toBeInTheDocument();
    expect(screen.getByText('Ideia breve')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!).journey).toEqual(journey);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('asks before discarding customized preferences and preserves personal text', () => {
    mockLocale = 'pt-PT';
    mockInitialText = 'Keep my text';
    const journey = seedJourney();
    journey.preferences.tone = 'My own tone';
    seedJourney(journey);
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!).journey.preferences.tone).toBe(
      'My own tone',
    );
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(screen.getByText('Ideia breve')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!).journey.preferences).toEqual(
      {},
    );
  });
});

it.each(['uploading', 'analyzing', 'error'] as const)(
  'does not silently continue past an image in %s state',
  (status) => {
    mockLocale = 'pt-PT';
    mockInitialText = 'My own text';
    mockInitialImages = [{ id: 'image', preview: '', status, attempts: 1 }];
    renderStep();
    expect(screen.getByRole('button', { name: /Escrever/ })).toBeEnabled();
    expect(screen.queryByText('imageAnalysis.waitingHint')).not.toBeInTheDocument();
    expect(screen.queryByText('Aguarde que os ficheiros fiquem prontos.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
    expect(screen.getByRole('dialog', { name: 'Preparar os seus ficheiros' })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    if (status === 'error') {
      fireEvent.click(screen.getByRole('button', { name: 'Rever imagens' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } else {
      expect(screen.getByText('Estamos a preparar as suas imagens…')).toBeInTheDocument();
    }
  },
);
it('enables continuation with combined completed text, photos and audio', () => {
  mockLocale = 'pt-PT';
  mockInitialText = 'A seaside adventure';
  mockInitialImages = [
    { id: 'image', preview: '', status: 'done', attempts: 1, objectPath: 'test/image' },
  ];
  mockInitialAudio = { preview: '', status: 'done', objectPath: 'test/audio' };
  renderStep();
  expect(screen.getByRole('button', { name: /^Continuar/ })).toBeEnabled();
  expect(screen.getByText(/1 imagem/)).toBeInTheDocument();
  expect(screen.getByText(/Áudio adicionado/)).toBeInTheDocument();
});
it('preserves direct text and removes guided answers on returning to an own idea', () => {
  mockLocale = 'pt-PT';
  mockInitialText = 'Personal contribution';
  const journey = seedJourney();
  journey.answers = [{ questionId: 'q', question: 'Place?', answer: 'The beach' }];
  seedJourney(journey);
  renderStep();
  fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao início' }));
  expect(screen.getByText('Ideia breve')).toBeInTheDocument();
  const next = JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!).journey;
  expect(next.templateId).toBeNull();
  expect(next.answers).toEqual([]);
  expect(next.premise).toBe('');
});

it('waits for every image and audio before submitting the latest completed inputs once', async () => {
  mockLocale = 'pt-PT';
  mockInitialImages = [{ id: 'image', preview: '', status: 'analyzing', attempts: 1 }];
  mockInitialAudio = { preview: '', status: 'uploading' };
  renderStep();
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  act(() => mockFinishImages());
  expect(mockFetch).not.toHaveBeenCalled();
  act(() => mockFinishAudio());
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tell-your-story/step-3'));
  expect(structureCalls()).toHaveLength(1);
  expect(payload(structureCalls()[0]).imageObjectPaths).toEqual(['test/image']);
  expect(payload(structureCalls()[0]).audioObjectPath).toBe('test/audio');
});
it('cancels automatic continuation when returning to edit, without discarding media', () => {
  mockLocale = 'pt-PT';
  mockInitialImages = [{ id: 'image', preview: '', status: 'analyzing', attempts: 1 }];
  renderStep();
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Voltar a editar' }));
  act(() => mockFinishImages());
  expect(screen.getByText(/1 imagem/)).toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
});
it('keeps a processing failure in the modal and never submits partial input', () => {
  mockLocale = 'pt-PT';
  mockInitialImages = [{ id: 'image', preview: '', status: 'analyzing', attempts: 1 }];
  renderStep();
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  act(() => mockFinishImages(true));
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível preparar');
  expect(screen.getByRole('button', { name: 'Rever imagens' })).toBeEnabled();
  expect(mockFetch).not.toHaveBeenCalled();
});

describe('saved preview entry', () => {
  beforeEach(() => {
    mockLocale = 'pt-PT';
  });

  it('offers recovery before opening a saved model and preserves its answers', () => {
    const journey = seedPhotoJourney();
    renderStep(true, false);
    expect(
      screen.getByRole('heading', { name: 'Já tem uma história em preparação' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Premise')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a minha história' }));
    expect(screen.getByLabelText('Premise')).toHaveValue(journey.premise);
    expect(JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!).journey.answers).toEqual(
      journey.answers,
    );
  });

  it('opens an empty entry directly and skips recovery when returning from step 3', () => {
    const view = renderStep(true, false);
    expect(screen.getByRole('heading', { name: 'Como quer começar?' })).toBeVisible();
    view.unmount();
    seedJourney();
    mockPreviousWizardPath = '/tell-your-story/step-3';
    renderStep(true, false);
    expect(screen.getByLabelText('Premise')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continuar a minha história' })).toBeNull();
  });

  it('confirms a fresh start, preserves author data and detaches the previous draft', async () => {
    mockInitialText = 'A saved idea';
    mockSearch.set('templateId', 'drawing-adventure');
    seedJourney();
    localStorage.setItem(
      'step1Data',
      JSON.stringify({ customAuthor: 'Author', dedicationMessage: 'For you' }),
    );
    localStorage.setItem('currentStoryId', draftId);
    localStorage.setItem('step3Data', 'old characters');
    saveStep2Submission(saved(), true);
    renderStep(true, false);
    fireEvent.click(screen.getByRole('button', { name: 'Começar uma nova história' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Começar uma nova história' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar e começar' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Como quer começar?' })).toBeVisible(),
    );
    expect(localStorage.getItem('step1Data')).toContain('Author');
    expect(localStorage.getItem('currentStoryId')).toBeNull();
    expect(localStorage.getItem('step3Data')).toBeNull();
    expect(readStep2Submission(owner, true)).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/tell-your-story/step-2');
  });

  it('keeps a pending request recoverable and does not replay it to start over', async () => {
    seedJourney();
    saveStep2Submission(saved({ completed: false, jobId: 'pending-job' }), true);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ job: { status: 'running' } }) });
    renderStep(true, false);
    fireEvent.click(screen.getByRole('button', { name: 'Começar uma nova história' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar e começar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pedido de preparação por resolver');
    expect(readStep2Submission(owner, true)?.jobId).toBe('pending-job');
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/jobs/pending-job');
  });
});

it('blocks continuation for an oversized restored story without discarding it', () => {
  mockInitialText = 'x'.repeat(40_001);
  renderStep(false);
  expect(screen.getByTestId('next')).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('documentImport.overLimit');
  expect(mockFetch).not.toHaveBeenCalled();
});

it('allows a freeform story at the complete brief limit', () => {
  mockInitialText = 'x'.repeat(40_000);
  renderStep(false);
  expect(screen.getByTestId('next')).toBeEnabled();
});

describe('OpenAI Ads story_creation_started', () => {
  const withAdEventId = (endpoint: string, body: Record<string, unknown>) => {
    const fallback = mockFetch.getMockImplementation()!;
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) =>
      url === endpoint ? { ok: true, json: async () => body } : fallback(url, init),
    );
  };

  it('fires with the server event id after the legacy draft is created', async () => {
    withAdEventId('/api/stories', {
      story: { storyId: draftId },
      adEventId: `story_start_${draftId}`,
    });
    mockInitialText = 'My own story idea';
    renderStep(false);
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith({
      eventType: 'custom',
      customEventName: 'story_creation_started',
      eventId: `story_start_${draftId}`,
      data: { type: 'custom' },
    });
  });

  it('fires with the server event id after a template draft is created', async () => {
    withAdEventId('/api/story-guide/draft', { adEventId: 'story_start_server-id' });
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /Start with a template/ }));
    fireEvent.click(screen.getByText('Select fiction'));
    clickContinue();
    await waitFor(() => expect(structureCalls()).toHaveLength(1));
    expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        customEventName: 'story_creation_started',
        eventId: 'story_start_server-id',
      }),
    );
  });

  it('does not fire when the response has no adEventId', async () => {
    mockInitialText = 'My own story idea';
    renderStep(false);
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
  });
});

describe('Story Whisperer in Step 2', () => {
  const projectId = '39b4d055-55f0-47bd-ba4e-d27ed6710bec';
  const requestId = '389d7bd7-2b13-4cc9-8649-f67da5c59927';
  const emptyInterview = (id = projectId): WhispererInterview => ({
    projectId: id,
    revision: 0,
    opening: getWhispererOpening(mockLocale),
    turns: [],
    assets: [],
    readiness: {
      ready: false,
      areas: { characters: 'missing', setting: 'missing', plot: 'missing' },
      missing: ['characters', 'setting', 'plot'],
      hint: '',
    },
  });
  const interviewResponse = (interview = emptyInterview()) => ({
    ok: true,
    json: async () => ({ interview }),
  });
  const startCalls = () =>
    mockFetch.mock.calls.filter(
      ([url, init]) => /^\/api\/story-whisperer\/[^/]+$/.test(url) && init?.method === 'POST',
    );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockLiveState = 'paused';
    mockLiveSaving = 'saved';
    mockStartLive.mockClear();
    mockSyncLive.mockClear();
    mockPrepareOutline.mockClear();
    mockFinishOutline.mockClear();
    mockStopLive.mockClear();
    mockCancelLive.mockClear();
    mockResumeCapture.mockClear();
    mockSaveWhispererAnswer.mockClear();
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  });

  it.each(
    Object.keys(step2Bundles).flatMap((locale) =>
      [...STORY_INTENTS, null].flatMap((intent) =>
        getWhispererOpening(locale, intent).choices.map((choice, index) => ({
          locale,
          intent,
          choice,
          index,
        })),
      ),
    ),
  )('sends starter $index for $intent in $locale', async ({ locale, intent, choice, index }) => {
    const opening = getWhispererOpening(locale, intent);
    mockLocale = locale;
    const initial = { ...emptyInterview(), primaryIntent: intent, opening };
    const saved = { ...initial, revision: 1 };
    const onInterview = jest.fn();
    mockFetch.mockResolvedValueOnce(interviewResponse(saved));
    render(
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        primaryIntent="romance"
        onClose={jest.fn()}
        onInterview={onInterview}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={initial}
      />,
    );
    expect(screen.getByText(opening.question)).toBeVisible();
    const suggestions = screen.getByRole('group', { name: 'suggestions' });
    await waitFor(() => expect(suggestions).toBeEnabled());
    const buttons = within(suggestions).getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(new Set(opening.choices).size).toBe(4);
    const starter = buttons[index];
    expect(choice.length).toBeLessThanOrEqual(60);
    expect(starter).toHaveAccessibleName(choice);
    expect(starter).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'reply' })).toBeEnabled();
    expect(mockFetch).not.toHaveBeenCalled();

    fireEvent.click(starter);
    await waitFor(() => expect(onInterview).toHaveBeenCalledWith(saved));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(`/api/story-whisperer/${draftId}/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-story-whisperer-project': projectId,
      },
      body: expect.any(String),
    });
    expect(payload(mockFetch.mock.calls[0])).toEqual({
      id: expect.any(String),
      text: choice,
      role: 'user',
      final: true,
    });
  });

  it('binds a saved empty interview opening before accepting its first reply', async () => {
    jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(500);
    sessionStorage.setItem(`storyWhispererDraft:${owner}`, draftId);
    mockSearch.set('primaryIntent', 'romance');
    const empty = { ...emptyInterview(), opening: undefined };
    const initialized = {
      ...empty,
      revision: 1,
      primaryIntent: 'romance' as const,
      opening: getWhispererOpening(mockLocale, 'romance'),
    };
    const followUp = 'Where did that happen?';
    mockFetch
      .mockResolvedValueOnce(interviewResponse(empty))
      .mockResolvedValueOnce(interviewResponse(initialized))
      .mockResolvedValueOnce(
        interviewResponse({
          ...initialized,
          revision: 2,
          turns: [
            {
              id: 'follow-up',
              projectId,
              participantId: 'owner',
              revision: 2,
              createdAt: '2026-11-22T00:00:00.000Z',
              role: 'assistant',
              text: followUp,
              originalText: followUp,
              final: true,
              included: true,
              interrupted: false,
            },
          ],
        }),
      );

    render(
      <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'resume' }));
    expect(await screen.findByText(initialized.opening.question)).toBeVisible();
    const conversation = screen.getByRole('log', { name: 'conversation' });
    expect(conversation.scrollTop).toBe(0);
    const inputTip = within(conversation).getByText(/^introInputs/);
    expect(inputTip.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(3);
    const openingMessages = [
      'introQuestions',
      'introProgress',
      inputTip.textContent,
      initialized.opening.question,
    ];
    expect(
      within(conversation)
        .getAllByRole('paragraph')
        .map((p) => p.textContent),
    ).toEqual(openingMessages);
    expect(
      within(screen.getByRole('group', { name: 'suggestions' })).getAllByRole('button'),
    ).toHaveLength(4);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(startCalls()).toHaveLength(1);
    expect(startCalls()[0][1].headers).toMatchObject({ 'x-story-whisperer-project': projectId });
    expect(payload(startCalls()[0])).toEqual({ locale: mockLocale, primaryIntent: 'romance' });

    const starter = screen.getByRole('button', { name: initialized.opening.choices[0] });
    await waitFor(() => expect(starter).toBeEnabled());
    fireEvent.click(starter);
    expect(await screen.findByText(followUp)).toBeVisible();
    expect(conversation.scrollTop).toBe(500);
    expect(
      within(conversation)
        .getAllByRole('paragraph')
        .map((p) => p.textContent),
    ).toEqual([...openingMessages, followUp]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('addresses the author informally in every European Portuguese opening, including the legacy fallback', () => {
    const questions = [
      ptWhisperer.StoryWhisperer.opening,
      ...[...STORY_INTENTS, null].map((intent) => getWhispererOpening('pt-PT', intent).question),
    ];
    for (const question of questions) {
      expect(question).toMatch(/\bqueres\b/);
      expect(question).not.toMatch(/\b(gostaria|você)\b/i);
    }
  });

  it.each([
    ['pet_stories', 'romance', 'pet_stories'],
    ['invalid', 'romance', 'romance'],
    [undefined, 'romance', 'romance'],
    [undefined, undefined, undefined],
  ] as const)(
    'starts with the selected intent (%s query, %s profile)',
    async (query, profile, intent) => {
      if (query) mockSearch.set('primaryIntent', query);
      mockProfileIntent = profile;
      const opening = getWhispererOpening(mockLocale, intent);
      mockFetch.mockResolvedValue(interviewResponse({ ...emptyInterview(), opening }));
      render(
        <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
      );
      fireEvent.click(await screen.findByRole('button', { name: 'title subtitle' }));
      expect(await screen.findByText(opening.question)).toBeVisible();
      expect(startCalls()).toHaveLength(1);
      expect(payload(startCalls()[0])).toEqual({
        locale: mockLocale,
        ...(intent && { primaryIntent: intent }),
      });
    },
  );

  it.each(['desktop', 'touch'] as const)(
    'keeps story reply keyboard behavior consistent on %s',
    async (input) => {
      const desktop = input === 'desktop';
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockReturnValue({
        matches: desktop,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });
      try {
        mockFetch.mockResolvedValueOnce(interviewResponse());
        render(
          <StoryWhisperer
            draftId={draftId}
            owner={owner}
            onClose={jest.fn()}
            onInterview={jest.fn()}
            onContinue={jest.fn()}
            availablePhotos={3}
            inputsBlocked={false}
            interview={emptyInterview()}
          />,
        );
        const reply = await screen.findByRole('textbox', { name: 'reply' });
        await waitFor(() => expect(reply).toBeEnabled());
        const live = screen.getByRole('button', { name: 'liveVoice' });
        expect(live).not.toHaveClass('max-sm:hidden');
        expect(screen.queryByRole('button', { name: 'send' })).not.toBeInTheDocument();
        fireEvent.keyDown(reply, { key: 'Enter' });
        expect(mockFetch).not.toHaveBeenCalled();

        fireEvent.change(reply, { target: { value: 'The first line.\nThe second line.' } });
        const button = screen.getByRole('button', { name: 'send' });
        expect(live).toHaveClass('max-sm:hidden');
        if (desktop) {
          expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('sendShortcut');
        } else {
          expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
        }
        expect(fireEvent.keyDown(reply, { key: 'Enter', shiftKey: true })).toBe(true);
        expect(fireEvent.keyDown(reply, { key: 'Enter', isComposing: true })).toBe(true);
        expect(fireEvent.keyDown(reply, { key: 'Enter', keyCode: 229 })).toBe(true);
        fireEvent.keyDown(reply, { key: 'Enter', repeat: true });
        expect(mockFetch).not.toHaveBeenCalled();

        expect(fireEvent.keyDown(reply, { key: 'Enter' })).toBe(!desktop);
        if (!desktop) {
          expect(mockFetch).not.toHaveBeenCalled();
          fireEvent.click(button);
        }
        await waitFor(() => expect(reply).toBeEnabled());
        expect(reply).toHaveValue('');
        expect(live).not.toHaveClass('max-sm:hidden');
        const sends = mockFetch.mock.calls.filter(([url]) => url.endsWith('/interview'));
        expect(sends).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(payload(sends[0])).toMatchObject({ text: 'The first line.\nThe second line.' });
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    },
  );

  it('sends an opening starter as the first user turn without requesting a follow-up GET', async () => {
    const opening = getWhispererOpening(mockLocale, 'romance');
    const initial = { ...emptyInterview(), primaryIntent: 'romance' as const, opening };
    const onInterview = jest.fn();
    mockFetch.mockResolvedValueOnce(interviewResponse({ ...initial, revision: 1 }));
    render(
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        onClose={jest.fn()}
        onInterview={onInterview}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={initial}
      />,
    );
    const starter = screen.getByRole('button', { name: opening.choices[0] });
    await waitFor(() => expect(starter).toBeEnabled());
    fireEvent.click(starter);
    await waitFor(() => expect(onInterview).toHaveBeenCalledWith({ ...initial, revision: 1 }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(payload(mockFetch.mock.calls[0])).toMatchObject({
      role: 'user',
      final: true,
      text: opening.choices[0],
    });
  });

  it('shows the sent reply and an in-chat indicator while the assistant responds', async () => {
    const message = 'I met my wife at a bookshop.';
    const question = 'Which book were you looking for?';
    let finishResponse!: () => void;
    const waitForResponse = new Promise<void>((resolve) => {
      finishResponse = resolve;
    });
    mockFetch.mockImplementationOnce(async (_url, init) => {
      const { id } = JSON.parse(init.body) as { id: string };
      await waitForResponse;
      const turn = {
        projectId,
        participantId: 'owner',
        revision: 1,
        createdAt: '2026-11-22T00:00:00.000Z',
        final: true,
        included: true,
        interrupted: false,
      };
      return interviewResponse({
        ...emptyInterview(),
        revision: 1,
        turns: [
          { ...turn, id, role: 'user', text: message, originalText: message },
          { ...turn, id: 'question', role: 'assistant', text: question, originalText: question },
        ],
      });
    });
    function Chat() {
      const [interview, setInterview] = useState<WhispererInterview | null>(emptyInterview);
      return (
        <StoryWhisperer
          draftId={draftId}
          owner={owner}
          onClose={jest.fn()}
          onInterview={setInterview}
          onContinue={jest.fn()}
          availablePhotos={3}
          inputsBlocked={false}
          interview={interview}
        />
      );
    }
    render(<Chat />);
    const reply = await screen.findByRole('textbox', { name: 'reply' });
    await waitFor(() => expect(reply).toBeEnabled());
    fireEvent.change(reply, { target: { value: message } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));

    const conversation = within(screen.getByRole('log', { name: 'conversation' }));
    expect(conversation.getByText(message)).toBeVisible();
    expect(conversation.getByText('assistantResponding')).toBeInTheDocument();
    expect(screen.queryByText('working')).not.toBeInTheDocument();
    expect(reply).toHaveValue('');

    finishResponse();
    expect(await conversation.findByText(question)).toBeVisible();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(conversation.getAllByText(message)).toHaveLength(1);
    expect(conversation.queryByText('assistantResponding')).not.toBeInTheDocument();
    expect(reply).toHaveValue('');
  });

  it('ignores a readiness refresh that arrives after a newer send response', async () => {
    const initial = { ...emptyInterview(), revision: 1, readinessNeedsRefresh: true };
    const updated = { ...emptyInterview(), revision: 3 };
    const onInterview = jest.fn();
    let finishRefresh!: (response: ReturnType<typeof interviewResponse>) => void;
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockImplementationOnce(() => new Promise((resolve) => (finishRefresh = resolve)))
      .mockResolvedValueOnce(interviewResponse(updated));
    render(
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        onClose={jest.fn()}
        onInterview={onInterview}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={initial}
      />,
    );
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const reply = screen.getByRole('textbox', { name: 'reply' });
    await waitFor(() => expect(reply).toBeEnabled());
    fireEvent.change(reply, { target: { value: 'We met at school.' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    await waitFor(() => expect(onInterview).toHaveBeenCalledWith(updated));
    await act(async () => finishRefresh(interviewResponse({ ...initial, revision: 2 })));
    expect(onInterview).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('shows a live-sync retry only when an upload needs attention', async () => {
    mockFetch.mockResolvedValue(interviewResponse());
    const renderChat = () => (
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        onClose={jest.fn()}
        onInterview={jest.fn()}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={emptyInterview()}
      />
    );
    mockLiveSaving = 'saving';
    const { rerender } = render(renderChat());
    await screen.findByRole('textbox', { name: 'reply' });
    expect(screen.queryByRole('button', { name: 'retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('saveStatus.saving')).not.toBeInTheDocument();

    mockLiveSaving = 'attention';
    rerender(renderChat());
    fireEvent.click(within(screen.getByRole('log')).getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(mockSyncLive).toHaveBeenCalledTimes(1));

    mockLiveSaving = 'saved';
    rerender(renderChat());
    expect(screen.queryByRole('button', { name: 'retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('saveStatus.saved')).not.toBeInTheDocument();
  });

  it('shows and updates the live voice status in the conversation', async () => {
    const initial = emptyInterview();
    const renderChat = () => (
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        onClose={jest.fn()}
        onInterview={jest.fn()}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={initial}
      />
    );
    const { rerender } = render(renderChat());
    const conversation = within(screen.getByRole('log'));
    const liveButton = screen.getByRole('button', { name: 'liveVoice' });
    await waitFor(() => expect(liveButton).toBeEnabled());
    fireEvent.click(liveButton);
    expect(mockStartLive).toHaveBeenCalledTimes(1);

    for (const state of ['connecting', 'listening', 'speaking', 'reconnecting'] as const) {
      mockLiveState = state;
      rerender(renderChat());
      const status = conversation.getByText(state);
      expect(status).toBeVisible();
      expect(status).toHaveAttribute('role', 'status');
      if (state === 'speaking') {
        expect(status.firstElementChild).toBeNull();
      } else {
        expect(status.firstElementChild).toHaveAttribute('aria-hidden', 'true');
        expect(status.firstElementChild).toHaveClass('motion-safe:animate-pulse');
      }
      expect(screen.getAllByText(state)).toHaveLength(1);
    }
    mockLiveState = 'paused';
    rerender(renderChat());
    expect(screen.queryByText('reconnecting')).not.toBeInTheDocument();
    expect(conversation.getByText(initial.opening!.question)).toBeVisible();
  });

  it.each(['switchToText', 'pauseVoice'])(
    'discards unfinished live voice and restores the composer immediately via %s',
    async (control) => {
      mockLiveState = 'listening';
      let finishCleanup!: () => void;
      mockCancelLive.mockImplementationOnce(() => ({
        turnId: 'unfinished-voice-turn',
        cleanup: new Promise((resolve) => (finishCleanup = resolve)),
      }));
      const savedReply = {
        id: 'saved-voice-turn',
        projectId,
        participantId: owner,
        role: 'user' as const,
        text: 'The match took place in the rain.',
        originalText: 'The match took place in the rain.',
        revision: 1,
        final: true,
        included: true,
        interrupted: false,
        createdAt: '2026-11-22T00:00:00.000Z',
      };
      const partialReply = {
        ...savedReply,
        id: 'unfinished-voice-turn',
        final: false,
        text: 'It was on…',
      };
      const latest = { ...emptyInterview(), revision: 2, turns: [savedReply] };
      const onInterview = jest.fn();
      const onContinue = jest.fn();
      const renderChat = () => (
        <StoryWhisperer
          draftId={draftId}
          owner={owner}
          onClose={jest.fn()}
          onInterview={onInterview}
          onContinue={onContinue}
          availablePhotos={3}
          inputsBlocked={false}
          interview={{
            ...latest,
            readiness: {
              rubricVersion: 3,
              ready: true,
              areas: { characters: 'ready', setting: 'ready', plot: 'ready' },
              missing: [],
              hint: '',
            },
            turns: [savedReply, partialReply],
          }}
        />
      );
      const { rerender } = render(renderChat());
      expect(screen.getByText(partialReply.text)).toBeVisible();
      act(() =>
        mockLiveEvent({
          type: 'transcript',
          turnId: 'unfinished-question',
          role: 'assistant',
          text: 'Where were you…',
        }),
      );
      expect(screen.getByText('Where were you…')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: control }));
      expect(mockCancelLive).toHaveBeenCalledTimes(1);
      expect(mockPrepareOutline).not.toHaveBeenCalled();
      expect(mockStopLive).not.toHaveBeenCalled();
      mockLiveState = 'paused';
      rerender(renderChat());

      const reply = screen.getByRole('textbox', { name: 'reply' });
      await waitFor(() => expect(reply).toBeEnabled());
      if (control === 'switchToText') expect(reply).toHaveFocus();
      expect(screen.getByRole('button', { name: 'continue' })).toBeEnabled();
      expect(screen.queryByText('working')).not.toBeInTheDocument();
      expect(screen.queryByText(partialReply.text)).not.toBeInTheDocument();
      expect(screen.queryByText('Where were you…')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'recoverDictation' })).not.toBeInTheDocument();
      expect(screen.getByText(savedReply.text)).toBeVisible();

      fireEvent.change(reply, { target: { value: 'Our team won.' } });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ interview: latest }) });
      fireEvent.click(screen.getByRole('button', { name: 'send' }));
      await waitFor(() => expect(onInterview).toHaveBeenCalledWith(latest));
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/story-whisperer/${draftId}/interview`,
        expect.objectContaining({ method: 'POST' }),
      );
      expect(onContinue).not.toHaveBeenCalled();

      mockFetch.mockResolvedValueOnce(interviewResponse(latest));
      await act(async () => finishCleanup());
    },
  );

  it.each(['write', 'transcribe'] as const)(
    'can %s an unfinished recording without offering edits to sent replies',
    async (recovery) => {
      const initial = emptyInterview();
      const sentReply = {
        id: 'sent-reply',
        projectId,
        participantId: owner,
        role: 'user' as const,
        text: 'My brother met me at the station.',
        originalText: 'My brother met me at the station.',
        revision: 1,
        final: true,
        included: true,
        interrupted: false,
        createdAt: '2026-11-22T00:00:00.000Z',
      };
      const recording = {
        ...sentReply,
        id: 'unfinished-reply',
        text: '',
        originalText: '',
        final: false,
        interrupted: true,
        recoverableAudio: true,
      };
      const savedText = 'We took the train together.';
      const latest = {
        ...initial,
        turns: [
          sentReply,
          {
            ...recording,
            text: savedText,
            final: true,
            interrupted: false,
            recoverableAudio: false,
          },
        ],
      };
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce(interviewResponse(latest))
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce(interviewResponse(latest));
      const onInterview = jest.fn();
      const renderChat = (interview: WhispererInterview) => (
        <StoryWhisperer
          draftId={draftId}
          owner={owner}
          onClose={jest.fn()}
          onInterview={onInterview}
          onContinue={jest.fn()}
          availablePhotos={3}
          inputsBlocked={false}
          interview={interview}
        />
      );
      const { rerender } = render(renderChat({ ...initial, turns: [sentReply, recording] }));
      const conversation = within(screen.getByRole('log'));
      expect(conversation.getByText(sentReply.text)).toBeVisible();
      expect(conversation.queryByRole('button', { name: 'editReply' })).not.toBeInTheDocument();
      if (recovery === 'write') {
        fireEvent.click(conversation.getByRole('button', { name: 'writeReply' }));
        fireEvent.change(conversation.getByRole('textbox', { name: 'writeReply' }), {
          target: { value: savedText },
        });
        fireEvent.click(conversation.getByRole('button', { name: 'saveReply' }));
      } else {
        fireEvent.click(conversation.getByRole('button', { name: 'recoverDictation' }));
      }
      const turnUrl = `/api/biographer/projects/${projectId}/turns/${recording.id}`;
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(recovery === 'write' ? turnUrl : `${turnUrl}/transcribe`);
      expect(init.method).toBe(recovery === 'write' ? 'PATCH' : 'POST');
      if (recovery === 'write') expect(payload([url, init])).toEqual({ text: savedText });
      expect(onInterview).toHaveBeenLastCalledWith(latest);
      rerender(renderChat(latest));
      expect(conversation.getByText(savedText)).toBeVisible();
      expect(conversation.queryByRole('textbox', { name: 'writeReply' })).not.toBeInTheDocument();
      expect(conversation.queryByRole('button', { name: 'writeReply' })).not.toBeInTheDocument();
      expect(conversation.queryByRole('button', { name: 'editReply' })).not.toBeInTheDocument();
    },
  );

  it('keeps a failed suggested reply and retries with its original ID', async () => {
    const savedInterview = {
      ...emptyInterview(),
      turns: [
        {
          id: 'question',
          projectId,
          participantId: 'owner',
          role: 'assistant' as const,
          text: 'What memory comes to mind?',
          originalText: 'What memory comes to mind?',
          revision: 0,
          createdAt: '2026-11-22T00:00:00.000Z',
          final: true,
          included: true,
          interrupted: false,
          choices: ['How we met'],
          choicesMode: 'button' as const,
        },
      ],
    };
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(interviewResponse(savedInterview));
    render(
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        onClose={jest.fn()}
        onInterview={jest.fn()}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={savedInterview}
      />,
    );
    const suggestion = await screen.findByRole('button', { name: 'How we met' });
    await waitFor(() => expect(suggestion).toBeEnabled());
    fireEvent.click(suggestion);
    const retry = await screen.findByRole('button', { name: 'retry' });
    expect(screen.queryByText('assistantResponding')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'reply' })).toHaveValue('How we met');
    const first = payload(mockFetch.mock.calls[0]);
    expect(first).toMatchObject({ text: 'How we met' });
    expect(mockSaveWhispererAnswer).toHaveBeenCalledWith(owner, projectId, {
      id: first.id,
      text: 'How we met',
    });
    fireEvent.click(retry);
    await waitFor(() => expect(retry).not.toBeInTheDocument());
    expect(payload(mockFetch.mock.calls[1])).toEqual(first);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('saveStatus.saved')).not.toBeInTheDocument();
  });

  it('can stop dictation after the first audio has been journaled', async () => {
    mockRecordingDictation = true;
    try {
      render(
        <StoryWhisperer
          draftId={draftId}
          owner={owner}
          onClose={jest.fn()}
          onInterview={jest.fn()}
          onContinue={jest.fn()}
          availablePhotos={3}
          inputsBlocked={false}
          interview={{
            projectId,
            revision: 1,
            opening: getWhispererOpening(mockLocale),
            turns: [],
            assets: [],
            readiness: {
              ready: false,
              areas: { characters: 'missing', setting: 'missing', plot: 'missing' },
              missing: ['characters', 'setting', 'plot'],
              hint: '',
            },
          }}
        />,
      );
      const stop = await screen.findByRole('button', { name: 'stopDictation' });
      await waitFor(() => expect(stop).toBeEnabled());
      fireEvent.click(stop);
      expect(mockStopDictation).toHaveBeenCalledTimes(1);
    } finally {
      mockRecordingDictation = false;
    }
  });

  it.each(['success', 'lost response', 'terminal failure', 'unconfirmed poll', 'content decline'])(
    'uses the existing outline job before Step 3 (%s)',
    async (scenario) => {
      const loseResponse = scenario === 'lost response';
      const terminalFailure = scenario === 'terminal failure';
      const unconfirmed = scenario === 'unconfirmed poll';
      const declined = scenario === 'content decline';
      const secondRequestId = '53cf3b47-c9fe-437f-9670-3c467ead9bb9';
      if (terminalFailure)
        mockPoll.mockResolvedValueOnce({ status: 'failed', error: 'Workflow unavailable' });
      if (unconfirmed) mockPoll.mockResolvedValueOnce({ status: 'unconfirmed' });
      if (declined)
        mockPoll.mockResolvedValueOnce({ status: 'failed', error: 'STORY_CONTENT_DECLINED' });
      let ready = false;
      let firstStructure = true;
      let boundDraftId: string | undefined;
      const fallback = mockFetch.getMockImplementation()!;
      mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
        if (loseResponse && firstStructure && url === '/api/stories/genai-structure') {
          firstStructure = false;
          throw new Error('Response lost');
        }
        if (url.startsWith('/api/story-whisperer/')) {
          boundDraftId = url.split('/')[3];
          if (url.endsWith('/interview')) {
            expect(payload([url, init])).toMatchObject({
              text: 'Nina finds a lost dog in Lisbon.',
            });
            ready = true;
          }
          if (url.endsWith('/handoff')) {
            const input = payload([url, init]);
            expect(input).toMatchObject({ revision: 2, brief: '' });
            return {
              ok: true,
              json: async () => ({
                draftId: boundDraftId,
                structureRequestId: input.retryOf === requestId ? secondRequestId : requestId,
                userDescription: 'Nina finds a lost dog in Lisbon.',
                imageObjectPaths: ['author/inputs/dog.webp'],
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              interview: {
                projectId,
                revision: ready ? 2 : 0,
                opening: getWhispererOpening(mockLocale),
                assets: [],
                turns: [],
                readiness: {
                  rubricVersion: 3,
                  ready,
                  missing: ready ? [] : ['characters', 'setting', 'plot'],
                  areas: Object.fromEntries(
                    ['characters', 'setting', 'plot'].map((area) => [
                      area,
                      ready ? 'ready' : 'missing',
                    ]),
                  ),
                  hint: '',
                },
              },
            }),
          };
        }
        return fallback(url, init);
      });
      render(
        <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
      );
      fireEvent.click(await screen.findByRole('button', { name: 'title subtitle' }));
      const next = await screen.findByRole('button', { name: 'continue' });
      expect(startCalls().map(payload)).toEqual([{ locale: mockLocale }]);
      expect(sessionStorage.getItem(`storyWhispererDraft:${owner}`)).toBe(boundDraftId);
      expect(localStorage.getItem(`lastStoryWhispererDraft:${owner}`)).toBe(boundDraftId);
      expect(next).toBeDisabled();
      const reply = screen.getByRole('textbox', { name: 'reply' });
      await waitFor(() => expect(reply).toBeEnabled());
      fireEvent.change(reply, { target: { value: 'Nina finds a lost dog in Lisbon.' } });
      fireEvent.click(screen.getByRole('button', { name: 'send' }));
      await waitFor(() => expect(next).toBeEnabled());
      fireEvent.click(next);
      if (declined) {
        expect(await screen.findByText('structureDeclined')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'retryOutline' })).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();
        fireEvent.click(await screen.findByRole('button', { name: 'title subtitle' }));
        const reopened = await screen.findByRole('button', { name: 'continue' });
        await waitFor(() => expect(reopened).toBeEnabled());
        fireEvent.click(reopened);
        expect(await screen.findByText('structureDeclined')).toBeInTheDocument();
        await waitFor(() => expect(reopened).not.toBeInTheDocument());
        expect(structureCalls()).toHaveLength(1);
        expect(readStep2Submission(owner, true)).toMatchObject({
          storyId: boundDraftId,
          jobId: 'job-new',
          outlineFailure: 'declined',
          completed: false,
        });
        return;
      }
      if (unconfirmed) {
        expect(await screen.findByText('structureUnconfirmed')).toBeInTheDocument();
        expect(readStep2Submission(owner, true)).toMatchObject({ jobId: 'job-new' });
      }
      if (loseResponse || terminalFailure || unconfirmed) {
        const recover = await screen.findByRole('button', { name: 'retryOutline' });
        expect(mockPush).not.toHaveBeenCalled();
        fireEvent.click(recover);
      }
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tell-your-story/step-3'));

      expect(
        payload(mockFetch.mock.calls.find(([url]) => url === '/api/story-guide/draft')!),
      ).toMatchObject({ draftId: boundDraftId, storyWhisperer: true });
      expect(structureCalls()).toHaveLength(loseResponse || terminalFailure ? 2 : 1);
      if (terminalFailure)
        expect(payload(structureCalls()[1]).structureRequestId).toBe(secondRequestId);
      if (loseResponse) expect(structureCalls()[1][1]?.body).toBe(structureCalls()[0][1]?.body);
      expect(payload(structureCalls()[0])).toMatchObject({
        storyId: boundDraftId,
        structureRequestId: requestId,
        userDescription: 'Nina finds a lost dog in Lisbon.',
        imageObjectPaths: ['author/inputs/dog.webp'],
        storyWhisperer: true,
      });
      expect(mockPoll).toHaveBeenCalledWith('job-new');
      expect(readStep2Submission(owner, true)).toMatchObject({
        storyId: boundDraftId,
        completed: true,
      });
    },
  );

  it.each(['same tab', 'browser reopened'])(
    'opens the saved chat directly when a returning author continues (%s)',
    async (scenario) => {
      const tabKey = `storyWhispererDraft:${owner}`;
      if (scenario === 'same tab') sessionStorage.setItem(tabKey, draftId);
      else localStorage.setItem(`lastStoryWhispererDraft:${owner}`, draftId);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          interview: {
            projectId,
            revision: 1,
            turns: [
              { id: 'message', role: 'user', text: 'Saved reply', included: true, final: true },
            ],
            assets: [],
            readiness: {
              ready: false,
              areas: { characters: 'developing', setting: 'missing', plot: 'missing' },
              missing: ['characters', 'setting', 'plot'],
              hint: '',
            },
          },
        }),
      });
      render(
        <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
      );
      const resume = await screen.findByRole('button', { name: 'resume' });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.queryByText('Saved reply')).not.toBeInTheDocument();
      if (scenario === 'browser reopened') expect(sessionStorage.getItem(tabKey)).toBeNull();
      const rootOverflow = document.documentElement.style.overflow;
      const bodyOverflow = document.body.style.overflow;
      fireEvent.click(resume);
      expect(await screen.findByText('Saved reply')).toBeVisible();
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.body.style.overflow).toBe('hidden');
      expect(sessionStorage.getItem(tabKey)).toBe(draftId);
      expect(screen.getByRole('button', { name: 'liveVoice' })).toBeVisible();
      expect(screen.queryByText('resumePrompt')).not.toBeInTheDocument();
      const reset = screen.getByRole('button', { name: 'reset' });
      await waitFor(() => expect(reset).toBeEnabled());
      fireEvent.click(reset);
      const conversation = within(screen.getByRole('log'));
      expect(conversation.getByText('resetConfirm')).toBeVisible();
      expect(conversation.getByRole('button', { name: 'resetYes' })).toBeEnabled();
      fireEvent.click(conversation.getByRole('button', { name: 'resetNo' }));
      expect(screen.queryByRole('button', { name: 'resetYes' })).not.toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('Saved reply')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'otherInputs' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'checkProgress' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'reset' })).toHaveAttribute('title', 'reset');
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.documentElement.style.overflow).toBe(rootOverflow);
      expect(document.body.style.overflow).toBe(bodyOverflow);
      expect(screen.getByRole('button', { name: 'title subtitle' })).toBeVisible();
    },
  );

  it.each(['click', 'voice', 'voice with an unsaved final line'])(
    'uses freshly assessed and durably saved answers before advancing from Live Voice by %s',
    async (method) => {
      mockLiveState = 'listening';
      mockLiveSaving = 'saving';
      const initial = emptyInterview();
      const ready: WhispererInterview['readiness'] = {
        rubricVersion: 3,
        ready: true,
        areas: { characters: 'ready', setting: 'ready', plot: 'ready' },
        missing: [],
        hint: '',
      };
      const latest: WhispererInterview = {
        ...initial,
        revision: 2,
        readiness: ready,
        turns: [
          {
            id: 'confirmation',
            projectId,
            participantId: owner,
            role: 'user',
            text: 'Yes, go ahead and make the outline.',
            originalText: 'Yes, go ahead and make the outline.',
            revision: 2,
            final: method !== 'voice with an unsaved final line',
            included: true,
            interrupted: false,
            createdAt: '2026-11-22T00:00:00.000Z',
          },
        ],
      };
      const onContinue = jest.fn();
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce(interviewResponse(latest));
      render(
        <StoryWhisperer
          draftId={draftId}
          owner={owner}
          onClose={jest.fn()}
          onInterview={jest.fn()}
          onContinue={onContinue}
          availablePhotos={3}
          inputsBlocked={false}
          interview={method === 'click' ? { ...initial, readiness: ready } : initial}
        />,
      );

      const outline = screen.getByRole('button', { name: 'continue' });
      // Let the stored reply draft load so it can participate in the handoff guard.
      await act(async () => {});
      if (method === 'click') {
        expect(outline).toBeEnabled();
        fireEvent.click(outline);
      } else {
        expect(outline).toBeDisabled();
        act(() =>
          mockLiveEvent({ type: 'advance_to_outline', callId: 'call', turnId: 'confirmation' }),
        );
      }

      if (method === 'voice with an unsaved final line') {
        await waitFor(() => expect(mockFinishOutline).toHaveBeenCalledWith('call', false));
        expect(mockResumeCapture).toHaveBeenCalled();
        expect(mockResumeCapture.mock.invocationCallOrder[0]).toBeLessThan(
          mockFinishOutline.mock.invocationCallOrder[0],
        );
        expect(mockStopLive).not.toHaveBeenCalled();
        expect(onContinue).not.toHaveBeenCalled();
      } else {
        await waitFor(() =>
          expect(onContinue).toHaveBeenCalledWith({ draftId, projectId, revision: 2 }),
        );
        expect(onContinue).toHaveBeenCalledTimes(1);
        expect(mockStopLive).toHaveBeenCalledTimes(1);
        if (method === 'voice') {
          expect(mockFinishOutline).toHaveBeenCalledWith('call', true);
          expect(mockFinishOutline.mock.invocationCallOrder[0]).toBeLessThan(
            mockStopLive.mock.invocationCallOrder[0],
          );
        }
      }
      expect(mockPrepareOutline).toHaveBeenCalledTimes(1);
      expect(mockPrepareOutline.mock.invocationCallOrder[0]).toBeLessThan(
        mockFetch.mock.invocationCallOrder[0],
      );
      expect(mockFetch).toHaveBeenCalledTimes(2);
    },
  );

  it('keeps a resumed chat unavailable until stale readiness is reassessed', async () => {
    sessionStorage.setItem(`storyWhispererDraft:${owner}`, draftId);
    const initial = {
      ...emptyInterview(),
      readinessNeedsRefresh: true,
      turns: [
        {
          id: 'saved-reply',
          projectId,
          participantId: owner,
          role: 'user',
          text: 'We met at school.',
          originalText: 'We met at school.',
          revision: 2,
          final: true,
          recoverableAudio: false,
          interrupted: false,
          included: true,
          createdAt: '2026-11-22T00:00:00.000Z',
        },
      ],
      revision: 2,
      readiness: {
        rubricVersion: 2,
        ready: true,
        firstReadyTurnId: 'saved-reply',
        areas: { characters: 'ready', setting: 'ready', plot: 'ready' },
        missing: [],
        hint: '',
      },
    } satisfies WhispererInterview;
    const fresh: WhispererInterview = {
      ...initial,
      readinessNeedsRefresh: false,
      readiness: {
        rubricVersion: 3,
        ready: true,
        firstReadyTurnId: 'saved-reply',
        areas: { characters: 'ready', setting: 'ready', plot: 'ready' },
        missing: [],
        hint: '',
      },
    };
    let finishAssessment!: (response: { ok: true }) => void;
    mockFetch
      .mockResolvedValueOnce(interviewResponse(initial))
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ code: 'READINESS_REVISION_CHANGED' }),
      })
      .mockImplementationOnce(() => new Promise((resolve) => (finishAssessment = resolve)))
      .mockResolvedValueOnce(interviewResponse(fresh));
    render(
      <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'resume' }));
    const outline = await screen.findByRole('button', { name: 'continue' });
    await waitFor(() =>
      expect(mockFetch.mock.calls.filter(([url]) => url.endsWith('/readiness'))).toHaveLength(2),
    );
    expect(outline).toBeDisabled();
    expect(screen.queryByText('readyNotice')).not.toBeInTheDocument();
    const progress = within(screen.getByRole('list', { name: 'progress' }));
    expect(progress.getAllByText('missing')).toHaveLength(3);
    expect(screen.getByText('We met at school.')).toBeVisible();
    await act(async () => finishAssessment({ ok: true }));
    await waitFor(() => expect(outline).toBeEnabled());
    expect(screen.getByText('readyNotice')).toBeVisible();
    expect(progress.getAllByText('ready')).toHaveLength(3);
  });
  it('replaces a permanently deleted interview pointer and opens a fresh chat', async () => {
    const tabKey = `storyWhispererDraft:${owner}`;
    const lastKey = `lastStoryWhispererDraft:${owner}`;
    sessionStorage.setItem(tabKey, draftId);
    localStorage.setItem(lastKey, draftId);
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 410 })
      .mockResolvedValueOnce(interviewResponse());
    render(
      <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'resume' }));
    expect(await screen.findByRole('textbox', { name: 'reply' })).toBeVisible();
    expect(mockFetch).toHaveBeenCalledWith(`/api/story-whisperer/${draftId}`, {
      cache: 'no-store',
    });
    const replacement = sessionStorage.getItem(tabKey);
    expect(replacement).toBeTruthy();
    expect(replacement).not.toBe(draftId);
    expect(localStorage.getItem(lastKey)).toBe(replacement);
    expect(startCalls()[0][0]).toBe(`/api/story-whisperer/${replacement}`);
  });

  it('keeps an unrelated same-tab draft separate from the last active interview', async () => {
    localStorage.setItem(`lastStoryWhispererDraft:${owner}`, draftId);
    mockInitialText = 'A new story in this tab';
    mockFetch.mockResolvedValue(interviewResponse());
    render(
      <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Continue my story' }));
    fireEvent.click(screen.getByRole('button', { name: 'title subtitle' }));
    expect(await screen.findByRole('textbox', { name: 'reply' })).toBeVisible();
    expect(sessionStorage.getItem(`storyWhispererDraft:${owner}`)).not.toBe(draftId);
    expect(startCalls().map(payload)).toEqual([{ locale: mockLocale }]);

    fireEvent.click(screen.getByRole('button', { name: 'useExisting' }));
    await waitFor(() =>
      expect(startCalls().map(payload)).toEqual([
        { locale: mockLocale },
        {
          locale: mockLocale,
          brief: 'Author contribution:\nA new story in this tab',
          imageObjectPaths: [],
          characterIds: [],
        },
      ]),
    );
  });

  it('retries a failed initialization only when asked and leaves the chat saved after closing', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue(interviewResponse());
    render(
      <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
      { reactStrictMode: true },
    );
    expect(startCalls()).toHaveLength(0);
    fireEvent.click(await screen.findByRole('button', { name: 'title subtitle' }));
    const working = within(screen.getByRole('log')).getByText('working');
    expect(working).toHaveAttribute('role', 'status');
    expect(working.firstElementChild).toHaveClass('motion-safe:animate-pulse');
    expect(await screen.findByText('error')).toHaveAttribute('role', 'alert');
    expect(startCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(await screen.findByRole('textbox', { name: 'reply' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(startCalls().map(payload)).toEqual([{ locale: mockLocale }, { locale: mockLocale }]);

    fireEvent.click(screen.getByRole('button', { name: 'title subtitle' }));
    expect(await screen.findByRole('textbox', { name: 'reply' })).toBeVisible();
    expect(startCalls()).toHaveLength(2);
  });

  it('keeps the composer and unsent reply visible while attaching a photo', async () => {
    render(
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        onClose={jest.fn()}
        onInterview={jest.fn()}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={emptyInterview()}
      />,
    );
    const reply = screen.getByRole('textbox', { name: 'reply' });
    await waitFor(() => expect(reply).toBeEnabled());
    const draftReply = 'A aventura começa junto ao rio.';
    await act(async () => {
      fireEvent.change(reply, { target: { value: draftReply } });
    });
    const attach = screen.getByRole('button', { name: 'attach' });
    fireEvent.click(attach);

    const conversation = within(screen.getByRole('log'));
    expect(conversation.getByLabelText('photo')).toBeEnabled();
    expect(conversation.getByRole('textbox', { name: 'caption' })).toBeEnabled();
    expect(reply).toBeVisible();
    expect(reply).toHaveValue(draftReply);
    expect(attach).toBeVisible();
    expect(screen.getByRole('button', { name: 'dictate' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'liveVoice' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'send' })).toBeDisabled();

    fireEvent.click(conversation.getByRole('button', { name: 'cancel' }));
    expect(conversation.queryByLabelText('photo')).not.toBeInTheDocument();
    expect(reply).toBeEnabled();
    expect(reply).toHaveValue(draftReply);
    expect(screen.getByRole('button', { name: 'send' })).toBeEnabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('keeps the story draft when a typed reset reply is ambiguous or declines the reset', async () => {
    mockLocale = 'pt-PT';
    const initial = emptyInterview();
    render(
      <StoryWhisperer
        draftId={draftId}
        owner={owner}
        onClose={jest.fn()}
        onInterview={jest.fn()}
        onContinue={jest.fn()}
        availablePhotos={3}
        inputsBlocked={false}
        interview={initial}
      />,
    );
    const reply = screen.getByRole('textbox', { name: 'reply' });
    await waitFor(() => expect(reply).toBeEnabled());
    const draftReply = 'A aventura começa junto ao rio.';
    fireEvent.change(reply, { target: { value: draftReply } });
    await waitFor(() =>
      expect(mockSaveWhispererAnswer).toHaveBeenCalledWith(
        owner,
        projectId,
        expect.objectContaining({ text: draftReply }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    const conversation = within(screen.getByRole('log'));
    expect(conversation.getByText('resetConfirm')).toBeVisible();
    expect(reply).toBeVisible();
    expect(reply).toBeEnabled();
    expect(reply).toHaveValue('');

    fireEvent.change(reply, { target: { value: 'Sim, mas ainda não' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    expect(conversation.getByText('resetClarify')).toBeVisible();
    expect(conversation.getByRole('button', { name: 'resetYes' })).toBeEnabled();
    expect(mockFetch).not.toHaveBeenCalled();

    fireEvent.change(reply, { target: { value: '  NOPE! ' } });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    expect(conversation.queryByText('resetConfirm')).not.toBeInTheDocument();
    expect(conversation.queryByText('resetClarify')).not.toBeInTheDocument();
    expect(conversation.getByText(initial.opening!.question)).toBeVisible();
    expect(reply).toHaveValue(draftReply);
    expect(mockSaveWhispererAnswer).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each(['button', 'text'])('opens a fresh chat after confirming a reset by %s', async (mode) => {
    const replacementId = '709daad7-4498-4443-8d97-dda7cc5ffd75';
    mockFetch
      .mockResolvedValueOnce(interviewResponse())
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce(interviewResponse(emptyInterview(replacementId)));
    render(
      <Step2Client templatesEnabled whispererEnabled templates={getStoryTemplates(mockLocale)} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'title subtitle' }));
    const reset = await screen.findByRole('button', { name: 'reset' });
    await waitFor(() => expect(reset).toBeEnabled());
    fireEvent.click(reset);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const conversation = within(screen.getByRole('log'));
    if (mode === 'text') {
      const reply = screen.getByRole('textbox', { name: 'reply' });
      await waitFor(() => expect(reply).toBeEnabled());
      fireEvent.change(reply, { target: { value: 'YES.' } });
      fireEvent.click(screen.getByRole('button', { name: 'send' }));
    } else {
      fireEvent.click(conversation.getByRole('button', { name: 'resetYes' }));
    }
    await waitFor(() => expect(startCalls()).toHaveLength(2));
    const [first, second] = startCalls();
    expect(first[0]).toBe(second[0]);
    expect(mockFetch).toHaveBeenNthCalledWith(2, `${first[0]}?projectId=${projectId}`, {
      method: 'DELETE',
    });
    expect(await screen.findByRole('textbox', { name: 'reply' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
