import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const mockPoll = jest.fn();
const mockFetch = jest.fn();
const mockSearch = new URLSearchParams();
let mockInitialText = '';
const owner = 'clerk-owner';
const draftId = '96a5e5db-4793-4b39-960d-51028c05ff26';

jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true, userId: 'clerk-owner' }),
  Show: ({ when, children }: { when: string; children: React.ReactNode }) =>
    when === 'signed-in' ? children : null,
  RedirectToSignIn: () => null,
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearch }));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string) => key,
}));
jest.mock('@/i18n/routing', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/analytics', () => ({
  trackStoryCreation: { stepViewed: jest.fn(), stepCompleted: jest.fn() },
}));
jest.mock('@/hooks/useIntentContext', () => ({ useIntentContext: () => null }));
jest.mock('@/hooks/useJobPolling', () => ({ useJobPolling: () => ({ pollJob: mockPoll }) }));
jest.mock('@/hooks/useStep2Session', () => ({
  useStep2Session: () => {
    const [storyText, setStoryText] = useState(mockInitialText);
    return {
      storyText,
      setStoryText,
      uploadedImages: [] as UploadedImage[],
      uploadedAudio: null as UploadedAudio | null,
      setUploadedImages: jest.fn(),
      setUploadedAudio: jest.fn(),
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
  }: {
    templates: StoryTemplate[];
    journey: StoryTemplateJourney | null;
    onChange: (value: StoryTemplateJourney | null) => void;
    onFreeform: () => void;
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
function renderStep(enabled = true) {
  return render(<Step2Client templatesEnabled={enabled} templates={getStoryTemplates('en-US')} />);
}
const structureCalls = () =>
  mockFetch.mock.calls.filter(([url]) => url === '/api/stories/genai-structure');
const payload = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  mockSearch.delete('templateId');
  mockInitialText = '';
  mockPush.mockReset();
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
    renderStep();
    fireEvent.click(screen.getByText('newStory'));
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).not.toBeNull();
    fireEvent.click(screen.getByText('cancel'));
    expect(localStorage.getItem('currentStoryId')).toBe(draftId);
    fireEvent.click(screen.getByText('newStory'));
    fireEvent.click(screen.getByText('confirmReset'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tell-your-story/step-1'));
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).toBeNull();
    expect(readStep2Submission(owner, true)).toBeNull();
    expect(localStorage.getItem('currentStoryId')).toBeNull();
    expect(localStorage.getItem('step2RelocatedInputs')).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('creates a draft then structures a selected fiction premise with no text contribution', async () => {
    renderStep();
    fireEvent.click(screen.getByText('Select fiction'));
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/tell-your-story/step-3'));
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/story-guide/draft',
      '/api/stories/genai-structure',
    ]);
    const draft = payload(mockFetch.mock.calls[0]);
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
    renderStep();
    fireEvent.click(screen.getByText('Select memory'));
    expect(screen.getByTestId('next')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('memoryContributionLabel'), {
      target: { value: 'Grandpa baked bread on Sundays.' },
    });
    expect(screen.getByTestId('next')).toBeEnabled();
    fireEvent.click(screen.getByTestId('next'));
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
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(payload(structureCalls()[0]).userDescription).not.toContain('UNACCEPTED');
  });

  it('returns unchanged completed input to Step 3 without another API call', async () => {
    seedJourney();
    const first = renderStep();
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    first.unmount();
    mockFetch.mockClear();
    mockPush.mockClear();
    mockPoll.mockClear();
    renderStep();
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it('requires confirmation for changed completed input and reuses the same draft', async () => {
    seedJourney();
    saveStep2Submission(saved(), true);
    renderStep();
    fireEvent.click(screen.getByTestId('next'));
    await screen.findByRole('region', { name: 'restructureTitle' });
    expect(mockFetch).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByTestId('next'));
    await screen.findByRole('alert');
    const cached = readStep2Submission(owner, true)!;
    expect(cached.structurePayload).toBe(String(structureCalls()[0][1].body));
    fireEvent.click(screen.getByTestId('next'));
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
    fireEvent.click(screen.getByTestId('next'));
    await screen.findByRole('region', { name: 'restructureTitle' });
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

  it('retains a chosen premise, accepted answers and original contribution when switching to freeform', async () => {
    const journey = seedJourney();
    journey.answers = [{ questionId: 'accepted', question: 'A companion?', answer: 'A paper fox' }];
    seedJourney(journey);
    mockInitialText = 'Use my red notebook.';
    renderStep();
    fireEvent.click(screen.getByText('Freeform'));
    expect(screen.getByLabelText('Premise')).toHaveValue(journey.premise);
    fireEvent.click(screen.getByTestId('next'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const brief = payload(structureCalls()[0]).userDescription;
    expect(brief).toContain(journey.premise);
    expect(brief).toContain('A paper fox');
    expect(brief).toContain('Use my red notebook.');
  });
});
