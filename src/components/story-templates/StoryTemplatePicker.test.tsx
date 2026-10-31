import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StoryTemplatePicker from './StoryTemplatePicker';
import { getStoryTemplate, getStoryTemplates } from '@/lib/story-templates/catalog';
import {
  compileStoryBrief,
  canContinueTemplate,
  createTemplateJourney,
  type StoryTemplateJourney,
} from '@/lib/story-templates/journey';
import copy from '@/messages/en-US/StoryTemplates.json';
import formalTemplateCopy from '@/messages/pt-PT/StoryTemplates.json';
import inspired from '@/messages/en-US/GetInspiredPage.json';
import graphics from '@/messages/en-US/GraphicalStyles.json';

let mockPreview = false;

jest.mock('next-intl', () => ({
  useLocale: () => (mockPreview ? 'pt-PT' : 'en-US'),
  useTranslations: (namespace: string) => (key: string) => {
    const roots: Record<string, unknown> = {
      StoryTemplates: mockPreview ? formalTemplateCopy : copy,
      GetInspiredPage: inspired.GetInspiredPage,
      GraphicalStyles: graphics.GraphicalStyles,
    };
    const [root, ...parts] = namespace.split('.');
    let value: unknown = roots[root];
    for (const part of [...parts, ...key.split('.')])
      value = (value as Record<string, unknown>)?.[part];
    if (typeof value !== 'string') throw new Error(`Missing translation: ${namespace}.${key}`);
    return value;
  },
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: () => <span data-testid="template-image" />,
}));
jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

const templates = getStoryTemplates('en-US');
const fetchMock = jest.fn();
const mockPhotoUpload = jest.fn();
const mockPhotoAnalysis = jest.fn();
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: () => ({ uploadInput: mockPhotoUpload, analyzeImage: mockPhotoAnalysis }),
}));
let latest: StoryTemplateJourney | null;

function Harness({
  initial = null,
  contribution = '',
  simplified = false,
  needsMemoryContribution = false,
}: {
  initial?: StoryTemplateJourney | null;
  contribution?: string;
  simplified?: boolean;
  needsMemoryContribution?: boolean;
}) {
  const [journey, setJourney] = useState(initial);
  useEffect(() => {
    latest = journey;
  }, [journey]);
  return (
    <StoryTemplatePicker
      templates={templates}
      journey={journey}
      onChange={setJourney}
      onFreeform={() => setJourney(null)}
      contribution={contribution}
      simplified={simplified}
      needsMemoryContribution={needsMemoryContribution}
    />
  );
}

function respondWithQuestion(index: number, revision: number) {
  return {
    ok: true,
    json: async () => ({
      revision,
      source: 'ai',
      question: {
        id: `question-${index}`,
        text: `Question number ${index}?`,
        choices: ['one', 'two', 'three'].map((id) => ({
          id,
          label: `Option ${id}`,
          value: `Answer ${id} ${index}`,
        })),
        suggestedChoiceId: 'one',
      },
    }),
  };
}

beforeAll(() => {
  if (!crypto.randomUUID)
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: () => '00000000-0000-4000-8000-000000000001',
    });
});
beforeEach(() => {
  mockPreview = false;
  latest = null;
  fetchMock.mockReset();
  mockPhotoUpload.mockReset();
  mockPhotoAnalysis.mockReset();
  mockPhotoUpload.mockResolvedValue({
    objectPath: 'author/inputs/photo.jpg',
    publicUrl: 'https://example.com/photo.jpg',
  });
  mockPhotoAnalysis.mockResolvedValue({
    overallImageContent: 'photo',
    characters: [{ label: 'dog_1', physicalDescription: 'Um cão castanho' }],
  });
  global.fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

describe('StoryTemplatePicker', () => {
  it('updates an untouched legacy first question without requesting AI or losing a typed draft', () => {
    mockPreview = true;
    const initial = createTemplateJourney(templates[0]);
    initial.requests = 1;
    initial.question = {
      id: 'legacy-first',
      text: 'Old question?',
      choices: [1, 2, 3].map((id) => ({ id: String(id), label: String(id), value: String(id) })),
      suggestedChoiceId: null,
    };
    const first = render(<Harness initial={initial} simplified />);
    expect(latest?.question?.photoTarget).toBe('protagonist');
    expect(latest?.requests).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    first.unmount();
    initial.answerDraft = { questionId: 'legacy-first', text: 'Keep this detail' };
    render(<Harness initial={initial} simplified />);
    expect(latest?.question?.id).toBe('legacy-first');
    expect(latest?.answerDraft?.text).toBe('Keep this detail');
  });
  it('confirms a photo-only answer explicitly and removes its reference with the answer', async () => {
    mockPreview = true;
    fetchMock.mockRejectedValue(new Error('Use authored fallback'));
    render(<Harness initial={createTemplateJourney(templates[0])} simplified />);
    fireEvent.click(screen.getByRole('radio', { name: /A minha resposta.*Texto ou fotografia/i }));
    fireEvent.change(screen.getByLabelText(formalTemplateCopy.photoAnswerLabel), {
      target: { files: [new File(['photo'], 'dog.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect(latest?.answerDraft?.photo?.status).toBe('done'));
    expect(latest?.answers).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.questionNext }));
    await waitFor(() => expect(latest?.answers[0]?.photo?.sourceCharacterIndex).toBe(0));
    expect(latest?.answerDraft).toBeUndefined();
    expect(latest?.answers[0]?.isAuthorContribution).toBe(true);
    expect(latest?.answers[0]?.answer).toContain('referência visual');
    fireEvent.click(screen.getByText(/Rever as suas respostas/));
    fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.removeAnswer }));
    expect(latest?.answers).toEqual([]);
  });

  it('keeps a prepared photograph out of the story when its question is skipped', async () => {
    mockPreview = true;
    fetchMock.mockRejectedValue(new Error('Use authored fallback'));
    render(<Harness initial={createTemplateJourney(templates[0])} simplified />);
    fireEvent.click(screen.getByRole('radio', { name: /A minha resposta.*Texto ou fotografia/i }));
    fireEvent.change(screen.getByLabelText(formalTemplateCopy.photoAnswerLabel), {
      target: { files: [new File(['photo'], 'dog.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect(latest?.answerDraft?.photo?.status).toBe('done'));
    fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.skip }));
    await waitFor(() => expect(latest?.previousQuestions).toHaveLength(1));
    expect(latest?.answerDraft).toBeUndefined();
    expect(latest?.answers).toEqual([]);
  });
  it('shows authored personalization immediately with no general inputs or initial AI request', () => {
    mockPreview = true;
    render(<Harness initial={createTemplateJourney(templates[0])} simplified />);
    expect(screen.getByText(formalTemplateCopy.selectedModel)).toBeVisible();
    expect(screen.getByLabelText(formalTemplateCopy.summary)).toHaveValue(templates[0].premise);
    expect(screen.getByText(formalTemplateCopy.fictionContinueHint)).toBeVisible();
    expect(screen.queryByRole('button', { name: formalTemplateCopy.browse })).toBeNull();
    expect(screen.queryByRole('button', { name: formalTemplateCopy.mine })).toBeNull();
    expect(screen.getByRole('heading', { name: /Quem é a personagem principal/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Escrever' })).toBeNull();
    expect(screen.queryByRole('button', { name: formalTemplateCopy.answerQuestions })).toBeNull();
    expect(screen.getByText(formalTemplateCopy.preferences).closest('details')).not.toHaveAttribute(
      'open',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the authored answer and shows one follow-up after explicit confirmation', async () => {
    mockPreview = true;
    fetchMock.mockImplementation((_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      return Promise.resolve(respondWithQuestion(body.previousQuestions.length + 1, body.revision));
    });
    render(<Harness initial={createTemplateJourney(templates[0])} simplified />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: formalTemplateCopy.questionNext })).toBeEnabled(),
    );
    const authoredQuestion = latest!.question!;
    fireEvent.click(screen.getByRole('button', { name: formalTemplateCopy.questionNext }));
    await screen.findByRole('heading', { name: 'Question number 2?' });
    expect(latest?.answers.map(({ answer }) => answer)).toEqual([
      authoredQuestion.choices[0].value,
    ]);
    fireEvent.click(screen.getByText(/Rever as suas respostas/));
    expect(screen.getByLabelText(authoredQuestion.text)).toHaveValue(
      authoredQuestion.choices[0].value,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).photoAnswers).toBe(true);
  });

  it('keeps edited preferences and the summary when toggling optional sections', () => {
    mockPreview = true;
    render(<Harness initial={createTemplateJourney(templates[0])} simplified />);
    fireEvent.change(screen.getByLabelText(formalTemplateCopy.summary), {
      target: { value: 'A new premise' },
    });
    const preferences = screen.getByText(formalTemplateCopy.preferences);
    fireEvent.click(preferences);
    fireEvent.change(screen.getByLabelText(formalTemplateCopy.tone), {
      target: { value: 'Calmo' },
    });
    fireEvent.click(preferences);
    fireEvent.click(preferences);
    expect(screen.getByLabelText(formalTemplateCopy.tone)).toHaveValue('Calmo');
    expect(screen.getByLabelText(formalTemplateCopy.summary)).toHaveValue('A new premise');
    expect(latest?.preferences.tone).toBe('Calmo');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains the required real contribution without labelling memory personalization as optional', () => {
    mockPreview = true;
    const initial = createTemplateJourney(getStoryTemplate('grandparent-memory', 'en-US'));
    render(<Harness initial={initial} simplified needsMemoryContribution />);
    expect(screen.getByText(formalTemplateCopy.memoryContributionRequired)).toBeVisible();
    expect(screen.getByText(formalTemplateCopy.personalization)).not.toHaveTextContent('Opcional');
    expect(screen.getByText(formalTemplateCopy.preferences)).toHaveTextContent('(Opcional)');
  });

  it('ignores an unfinished guide response after leaving the picker', async () => {
    let finish: (value: unknown) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const onChange = jest.fn();
    const { unmount } = render(
      <StoryTemplatePicker
        templates={templates}
        journey={createTemplateJourney(templates[0])}
        onChange={onChange}
        onFreeform={jest.fn()}
        contribution=""
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: copy.personalize }));
    const revision = JSON.parse(fetchMock.mock.calls[0][1].body).revision;
    expect(onChange).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      finish(respondWithQuestion(1, revision));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('selects a ready premise without requesting the optional guide', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /A drawing comes alive/ }));
    expect(latest?.templateId).toBe('drawing-adventure');
    expect(latest?.answers).toEqual([]);
    expect(screen.getByLabelText(copy.summary)).toHaveValue(templates[0].premise);
    expect(screen.getByRole('button', { name: copy.personalize })).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires confirmation to replace a selected template', () => {
    const initial = createTemplateJourney(templates[0]);
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: copy.browse }));
    fireEvent.click(screen.getByRole('button', { name: /A pet on a secret mission/ }));
    expect(latest?.templateId).toBe('drawing-adventure');
    fireEvent.click(screen.getByRole('button', { name: copy.cancel }));
    expect(latest?.templateId).toBe('drawing-adventure');
    fireEvent.click(screen.getByRole('button', { name: /A pet on a secret mission/ }));
    fireEvent.click(screen.getByRole('button', { name: copy.confirmChange }));
    expect(latest?.templateId).toBe('pet-mission');
  });

  it('does not accept a suggested answer until Next and never accepts a skipped answer', async () => {
    fetchMock.mockImplementation((_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      return Promise.resolve(respondWithQuestion(body.previousQuestions.length + 1, body.revision));
    });
    render(<Harness initial={createTemplateJourney(templates[0])} />);
    fireEvent.click(screen.getByRole('button', { name: copy.personalize }));
    await screen.findByRole('heading', { name: 'Question number 1?' });
    expect(latest?.answers).toEqual([]);
    expect(compileStoryBrief(latest, '')).not.toContain('Answer one 1');
    fireEvent.click(screen.getByRole('button', { name: copy.skip }));
    await screen.findByRole('heading', { name: 'Question number 2?' });
    expect(latest?.answers).toEqual([]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: copy.questionNext })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: copy.questionNext }));
    await screen.findByRole('heading', { name: 'Question number 3?' });
    expect(latest?.answers.map(({ answer }) => answer)).toEqual(['Answer one 2']);
    expect(compileStoryBrief(latest, '')).not.toContain('Answer one 3');
  });

  it('pauses after each three-question round and ends at nine without another request', async () => {
    fetchMock.mockImplementation((_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      return Promise.resolve(respondWithQuestion(body.previousQuestions.length + 1, body.revision));
    });
    render(<Harness initial={createTemplateJourney(templates[0])} />);
    fireEvent.click(screen.getByRole('button', { name: copy.personalize }));
    for (let index = 1; index <= 9; index += 1) {
      await screen.findByRole('heading', { name: `Question number ${index}?` });
      fireEvent.click(screen.getByRole('button', { name: copy.skip }));
      if (index === 3 || index === 6) {
        expect(screen.getByText(copy.roundComplete)).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(index);
        fireEvent.click(screen.getByRole('button', { name: copy.more }));
      }
    }
    expect(screen.getByText(copy.guideComplete)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(9);
    expect(latest?.answers).toEqual([]);
    expect(latest?.previousQuestions).toHaveLength(9);
  });

  it('clears earlier answers when switching from fiction to real memories', () => {
    const initial = createTemplateJourney(getStoryTemplate('little-love', 'en-US'));
    initial.answers = [{ questionId: 'old', question: 'An invented meeting?', answer: 'On Mars' }];
    initial.requests = 4;
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('radio', { name: copy.memory }));
    expect(latest?.mode).toBe('memory');
    expect(latest?.answers).toEqual([]);
    expect(latest?.requests).toBe(4);
    expect(compileStoryBrief(latest, '')).not.toContain('On Mars');
  });

  it('counts custom memory text only after the author confirms it', () => {
    const template = getStoryTemplate('grandparent-memory', 'en-US')!;
    const initial = createTemplateJourney(template);
    initial.question = { ...template.fallbackQuestions[0], suggestedChoiceId: null };
    initial.previousQuestions = ['Earlier question one', 'Earlier question two'];
    initial.requests = 3;
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('radio', { name: copy.customAnswer }));
    fireEvent.change(screen.getByRole('textbox', { name: copy.customAnswer }), {
      target: { value: 'Grandma taught me to make bread on Sundays.' },
    });
    expect(canContinueTemplate(latest, '', false)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: copy.questionNext }));
    expect(latest?.answers[0].isAuthorContribution).toBe(true);
    expect(canContinueTemplate(latest, '', false)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not count a preset alone but counts a manually edited accepted answer', () => {
    const template = getStoryTemplate('grandparent-memory', 'en-US')!;
    const initial = createTemplateJourney(template);
    initial.question = { ...template.fallbackQuestions[0], suggestedChoiceId: null };
    initial.previousQuestions = ['Earlier question one', 'Earlier question two'];
    initial.requests = 3;
    render(<Harness initial={initial} />);
    fireEvent.click(
      screen.getByRole('radio', { name: template.fallbackQuestions[0].choices[0].label }),
    );
    fireEvent.click(screen.getByRole('button', { name: copy.questionNext }));
    expect(latest?.answers[0].isAuthorContribution).toBe(false);
    expect(canContinueTemplate(latest, '', false)).toBe(false);
    fireEvent.change(screen.getByRole('textbox', { name: template.fallbackQuestions[0].text }), {
      target: { value: 'Warm, like Grandma’s kitchen when she baked bread.' },
    });
    expect(latest?.answers[0].isAuthorContribution).toBe(true);
    expect(canContinueTemplate(latest, '', false)).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: template.fallbackQuestions[0].text }), {
      target: { value: '' },
    });
    expect(canContinueTemplate(latest, '', false)).toBe(false);
  });

  it('ignores a response arriving after the author changes their contribution', async () => {
    let complete: (response: unknown) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const initial = createTemplateJourney(templates[0]);
    const { rerender } = render(<Harness initial={initial} contribution="First idea" />);
    fireEvent.click(screen.getByRole('button', { name: copy.personalize }));
    const revision = JSON.parse(fetchMock.mock.calls[0][1].body).revision;
    rerender(<Harness initial={initial} contribution="Changed idea" />);
    await act(async () => {
      complete(respondWithQuestion(1, revision));
    });
    expect(latest?.question).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Question number 1?' })).not.toBeInTheDocument();
  });

  it('uses a local fallback on timeout and keeps the story usable', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    render(<Harness initial={createTemplateJourney(templates[0])} />);
    fireEvent.click(screen.getByRole('button', { name: copy.personalize }));
    await act(async () => {
      jest.advanceTimersByTime(12_000);
    });
    expect(
      screen.getByRole('heading', { name: templates[0].fallbackQuestions[0].text }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.fallback)).toBeInTheDocument();
    expect(latest?.answers).toEqual([]);
    expect(latest?.premise).toBe(templates[0].premise);
    expect(screen.getByRole('button', { name: copy.mine })).toBeEnabled();
  });

  it('does not preselect a factual fallback answer after a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const initial = createTemplateJourney(getStoryTemplate('grandparent-memory', 'en-US'));
    render(<Harness initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: copy.personalize }));
    await waitFor(() => expect(latest?.question).not.toBeNull());
    expect(screen.getByRole('button', { name: copy.questionNext })).toBeDisabled();
    expect(
      screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
  });
});
