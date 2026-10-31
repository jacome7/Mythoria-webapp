jest.mock('@/lib/story-templates/create-document-worker', () => ({
  createDocumentWorker: jest.fn(),
}));
import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Step2Client from './Step2Client';
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

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPoll = jest.fn();
const mockFetch = jest.fn();
const mockSearch = new URLSearchParams();
let mockInitialText = '';
let mockLocale = 'en-US';
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
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
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
jest.mock('@/hooks/useIntentContext', () => ({ useIntentContext: () => null }));
jest.mock('@/hooks/useJobPolling', () => ({ useJobPolling: () => ({ pollJob: mockPoll }) }));
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
  mockInitialText = '';
  mockLocale = 'en-US';
  mockPreviousWizardPath = null;
  mockInitialImages = [];
  mockInitialAudio = null;
  mockPush.mockReset();
  mockReplace.mockReset();
  mockPoll.mockReset();
  mockFetch.mockReset();
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
