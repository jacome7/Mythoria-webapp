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
import inspired from '@/messages/en-US/GetInspiredPage.json';
import graphics from '@/messages/en-US/GraphicalStyles.json';

jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: (namespace: string) => (key: string) => {
    const roots: Record<string, unknown> = {
      StoryTemplates: copy,
      GetInspiredPage: inspired.GetInspiredPage,
      GraphicalStyles: graphics.GraphicalStyles,
    };
    const [root, ...parts] = namespace.split('.');
    let value: unknown = roots[root];
    for (const part of [...parts, key]) value = (value as Record<string, unknown>)?.[part];
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
let latest: StoryTemplateJourney | null;

function Harness({
  initial = null,
  contribution = '',
}: {
  initial?: StoryTemplateJourney | null;
  contribution?: string;
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
  latest = null;
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

describe('StoryTemplatePicker', () => {
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
