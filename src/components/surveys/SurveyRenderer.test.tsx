import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  surveyDefinitionSchema,
  type SurveyAnswers,
  type SurveyDefinition,
} from '@/lib/surveys/definition-schema';
import { getScreens } from '@/lib/surveys/engine';
import { demoAllControlsV1 } from '@/surveys/definitions/demo_all_controls.v1';
import { payingCreatorV3 } from '@/surveys/definitions/paying_creator.v3';
import SurveyRenderer from './SurveyRenderer';

jest.mock('next-intl', () => {
  const React = require('react');
  const messages = require('@/messages/en-US/Survey.json');

  function resolve(namespace: string, key: string): string {
    const path = [...namespace.split('.').slice(1), ...key.split('.')];
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === 'string' ? node : `${namespace}.${key}`;
  }

  function format(message: string, values: Record<string, unknown> = {}): string {
    const withPlurals = message.replace(
      /\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g,
      (_match, name, one, many) => (Number(values[name]) === 1 ? one : many),
    );
    return withPlurals.replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? ''));
  }

  return {
    useLocale: () => 'en-US',
    useTranslations: (namespace: string) => {
      const t = (key: string, values?: Record<string, unknown>) =>
        format(resolve(namespace, key), values);
      t.rich = (key: string, tags: Record<string, (chunks: unknown) => unknown>) => {
        const message = resolve(namespace, key);
        const match = message.match(/^(.*?)<(\w+)>(.*?)<\/\2>(.*)$/);
        if (!match) return message;
        return React.createElement(
          React.Fragment,
          null,
          match[1],
          tags[match[2]](match[3]),
          match[4],
        );
      };
      return t;
    },
  };
});

const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

const demo = surveyDefinitionSchema.parse(demoAllControlsV1);
const TOKEN = 'token-abc.signature';

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

let fetchCalls: FetchCall[] = [];
let submitResponse: { status: number; body: Record<string, unknown> };

beforeEach(() => {
  fetchCalls = [];
  mockTrackEvent.mockClear();
  submitResponse = {
    status: 200,
    body: { ok: true, entitlementId: 'ent-1', rewardStatus: 'eligible' },
  };
  window.localStorage.clear();
  window.sessionStorage.clear();
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? '{}')),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const isSubmit = String(url).endsWith('/submit');
    const payload = isSubmit ? submitResponse : { status: 200, body: { ok: true } };
    return {
      ok: payload.status >= 200 && payload.status < 300,
      status: payload.status,
      json: async () => payload.body,
    } as Response;
  }) as jest.Mock;
});

function renderSurvey(
  definition: SurveyDefinition,
  overrides: Partial<{
    initialAnswers: SurveyAnswers;
    initialStatus: 'not_started' | 'started';
  }> = {},
) {
  return render(
    <SurveyRenderer
      token={TOKEN}
      definition={definition}
      surveyId={definition.id}
      version={definition.version}
      cohortKey="C2"
      initialAnswers={overrides.initialAnswers ?? {}}
      initialStatus={overrides.initialStatus ?? 'not_started'}
    />,
  );
}

const clickNext = () => fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
const clickBack = () => fireEvent.click(screen.getByRole('button', { name: /^Back/ }));
const start = () =>
  fireEvent.click(screen.getByRole('button', { name: /Let's begin|Pick up where you left off/ }));
const pick = (name: string | RegExp) => fireEvent.click(screen.getByRole('radio', { name }));
const check = (name: string | RegExp) => fireEvent.click(screen.getByRole('checkbox', { name }));

const text = (value: string) => ({
  'en-US': value,
  'pt-PT': value,
  'es-ES': value,
  'fr-FR': value,
  'de-DE': value,
});

/** Small survey for branching/pruning: Q2 only appears when Q1 = yes. */
const branching = surveyDefinitionSchema.parse({
  schemaVersion: 1,
  id: 'branching_test',
  version: 1,
  purpose: 'renderer tests',
  title: text('Branching survey'),
  description: text('A short description'),
  completionMessage: text('All done, thanks for sharing!'),
  estimatedMinutes: 3,
  responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
  rewardEligible: true,
  questions: [
    {
      id: 'Q1',
      type: 'single_choice',
      dimension: 'intent',
      required: true,
      label: text('Do you like stories?'),
      options: [
        { id: 'yes', label: text('Yes') },
        { id: 'no', label: text('No') },
      ],
    },
    {
      id: 'Q2',
      type: 'single_choice',
      dimension: 'genre',
      required: true,
      visibleWhen: { question: 'Q1', operator: 'equals', value: 'yes' },
      label: text('Which genre?'),
      options: [
        { id: 'fantasy', label: text('Fantasy') },
        { id: 'crime', label: text('Crime') },
      ],
    },
  ],
});

describe('SurveyRenderer intro', () => {
  it('shows title, intro, estimated minutes and the privacy link, and records the open', () => {
    renderSurvey(demo);

    expect(screen.getByRole('heading', { name: 'Reading habits (demo)' })).toBeInTheDocument();
    expect(screen.getByText(/internal testing only/)).toBeInTheDocument();
    expect(screen.getByText('Less than 5 minutes of your time')).toBeInTheDocument();
    const privacy = screen.getByRole('link', { name: /Privacy Policy/ });
    expect(privacy).toHaveAttribute('href', '/en-US/privacy-policy');
    expect(screen.getByText(/learn how we handle your data in our/)).toBeInTheDocument();

    expect(mockTrackEvent).toHaveBeenCalledWith('survey_opened', {
      survey_id: 'demo_all_controls',
      survey_version: 1,
      cohort: 'C2',
      page_location: `${window.location.origin}/en-US/survey/:token`,
      page_path: '/en-US/survey/:token',
    });
    // The bearer token must never be part of any event parameter.
    expect(JSON.stringify(mockTrackEvent.mock.calls)).not.toContain(TOKEN);
    expect(fetchCalls[0]).toMatchObject({
      url: `/api/surveys/${encodeURIComponent(TOKEN)}/progress`,
      body: { event: 'opened' },
    });
  });

  it('offers to resume and skips the opened marker for started invitations', () => {
    renderSurvey(branching, {
      initialStatus: 'started',
      initialAnswers: { Q1: { kind: 'choice', optionIds: ['yes'] } },
    });
    expect(screen.getByRole('button', { name: /Pick up where you left off/ })).toBeInTheDocument();
    expect(fetchCalls).toHaveLength(0);
  });
});

describe('SurveyRenderer questions', () => {
  it('advances and saves the selected checkout rating while allowing a return to it', () => {
    renderSurvey(surveyDefinitionSchema.parse(payingCreatorV3));
    start();
    fireEvent.click(screen.getByRole('radio', { name: /quality of a story/i }));
    expect(screen.getByText('Neutral')).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: 'Neither easy nor difficult' }));
    expect(screen.getByText(/what, if anything, was unclear/i)).toBeVisible();
    expect(
      fetchCalls.some(
        (call) => call.body.answers && (call.body.answers as SurveyAnswers).C02?.kind === 'choice',
      ),
    ).toBe(true);
    clickBack();
    expect(screen.getByRole('radio', { name: 'Neither easy nor difficult' })).toBeChecked();
  });

  it('keeps an other choice on screen so the respondent can add detail', () => {
    renderSurvey(surveyDefinitionSchema.parse(payingCreatorV3));
    start();
    fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
    expect(
      screen.getByRole('radiogroup', { name: /confidence to make your first purchase/i }),
    ).toBeVisible();
    expect(screen.getByRole('textbox')).toBeVisible();
  });

  it('keeps a multiple-choice question open for additional selections', () => {
    renderSurvey(demo);
    start();
    clickNext();
    fireEvent.click(screen.getByRole('radio', { name: 'Every day' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fantasy' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mystery' }));
    expect(screen.getByRole('checkbox', { name: 'Fantasy' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Mystery' })).toBeChecked();
    clickNext();
    expect(screen.getByText('Which format do you prefer?')).toBeVisible();
  });
  it('shows an inline required error and stays on the question', () => {
    renderSurvey(demo);
    start();
    clickNext(); // D00 static content
    expect(
      screen.getByRole('radiogroup', { name: /How often do you read for pleasure/ }),
    ).toBeInTheDocument();

    clickNext();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Please answer this question before moving on.');
    expect(screen.getByRole('radiogroup', { name: /How often do you read/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    pick('Every day');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exclusive options clear the others and vice versa', () => {
    renderSurvey(demo);
    start();
    clickNext();
    pick('Every day');
    clickNext();

    check('Fantasy');
    check('Mystery');
    expect(screen.getByRole('checkbox', { name: 'Fantasy' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Mystery' })).toBeChecked();

    check('None of these');
    expect(screen.getByRole('checkbox', { name: 'None of these' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Fantasy' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Mystery' })).not.toBeChecked();

    check('History');
    expect(screen.getByRole('checkbox', { name: 'None of these' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'History' })).toBeChecked();
  });

  it('reveals the optional other text input only for the "other" option', () => {
    renderSurvey(demo);
    start();
    clickNext();
    expect(screen.queryByLabelText(/Tell us more/)).not.toBeInTheDocument();
    pick('Something else');
    const other = screen.getByLabelText(/Tell us more/);
    fireEvent.change(other, { target: { value: 'Comics' } });
    expect(other).toHaveValue('Comics');
    pick('Rarely');
    expect(screen.queryByLabelText(/Tell us more/)).not.toBeInTheDocument();
  });

  it('keeps answers when navigating back and forward', () => {
    renderSurvey(demo);
    start();
    clickNext();
    pick('Every day');
    clickNext();
    check('Fantasy');
    clickNext();
    pick('E-book');
    clickNext();

    clickBack(); // D03
    expect(screen.getByRole('radio', { name: 'E-book' })).toBeChecked();
    clickBack(); // D02
    expect(screen.getByRole('checkbox', { name: 'Fantasy' })).toBeChecked();
    clickBack(); // D01
    expect(screen.getByRole('radio', { name: 'Every day' })).toBeChecked();
  });

  it('updates progress along the applicable path when branching changes the screens', () => {
    renderSurvey(demo);
    start();
    clickNext();

    pick('Every day');
    const withBranch = getScreens(demo, { D01: { kind: 'choice', optionIds: ['daily'] } }).length;
    expect(screen.getByText(`Step 3 of ${withBranch}`)).toBeInTheDocument();

    clickBack();
    pick('A few times a month');
    const withoutBranch = getScreens(demo, {
      D01: { kind: 'choice', optionIds: ['monthly'] },
    }).length;
    expect(withoutBranch).toBe(withBranch - 1);
    expect(screen.getByText(`Step 3 of ${withoutBranch}`)).toBeInTheDocument();
  });

  it('renders slider with value, anchors, numeric alternative and N/A; stars and smileys with labels', () => {
    renderSurvey(demo, {
      initialAnswers: {
        D01: { kind: 'choice', optionIds: ['rarely'] },
        D02: { kind: 'choice', optionIds: ['none'] },
        D03: { kind: 'choice', optionIds: ['paper'] },
        D04: { kind: 'choice', optionIds: ['bedtime'] },
        D07: { kind: 'number', value: 3 },
      },
      initialStatus: 'started',
    });
    start();
    // Walk to the "ratings" screen: D00, D01, D02, D03, D04, D05, D06, D07.
    for (let i = 0; i < 8; i += 1) clickNext();

    // Slider + numeric alternative + N/A button
    const slider = screen.getByRole('slider');
    expect(screen.getByText('Nothing selected yet')).toBeInTheDocument();
    expect(screen.getByText('Not at all', { exact: false })).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '8' } });
    expect(screen.getByText('Selected: 8')).toBeInTheDocument();
    const numeric = screen.getByLabelText(/Or type a number from 0 to 10/);
    expect(numeric).toHaveValue(8);

    const na = screen.getByRole('button', { name: 'Not sure' });
    expect(na).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(na);
    expect(na).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Selected: Not sure')).toBeInTheDocument();
    fireEvent.change(numeric, { target: { value: '4' } });
    expect(screen.getByRole('button', { name: 'Not sure' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // Stars: radios named by their option labels, N/A as a separate tile in the same group
    const stars = screen.getByRole('radiogroup', { name: /rate your local library/ });
    fireEvent.click(within(stars).getByRole('radio', { name: 'Good' }));
    expect(within(stars).getByRole('radio', { name: 'Good' })).toBeChecked();
    fireEvent.click(within(stars).getByRole('radio', { name: "I don't use a library" }));
    expect(within(stars).getByRole('radio', { name: 'Good' })).not.toBeChecked();
    expect(within(stars).getByRole('radio', { name: "I don't use a library" })).toBeChecked();

    // Smileys: visible text labels (never emoji only)
    const smileys = screen.getByRole('radiogroup', { name: /finishing a good book/ });
    expect(within(smileys).getByText('Very happy')).toBeVisible();
    fireEvent.click(within(smileys).getByRole('radio', { name: 'Very happy' }));
    expect(within(smileys).getByRole('radio', { name: 'Very happy' })).toBeChecked();
  });

  it('validates numeric ranges inline', () => {
    renderSurvey(demo, {
      initialAnswers: {
        D01: { kind: 'choice', optionIds: ['rarely'] },
        D02: { kind: 'choice', optionIds: ['none'] },
        D03: { kind: 'choice', optionIds: ['paper'] },
        D04: { kind: 'choice', optionIds: ['bedtime'] },
      },
      initialStatus: 'started',
    });
    start();
    for (let i = 0; i < 7; i += 1) clickNext(); // arrive at D07 (number)

    const input = screen.getByLabelText(/How many books did you read last year/);
    fireEvent.change(input, { target: { value: '99' } });
    clickNext();
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter 20 or less.');
    fireEvent.change(input, { target: { value: '2' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a character counter for long text', () => {
    renderSurvey(demo, {
      initialAnswers: {
        D01: { kind: 'choice', optionIds: ['rarely'] },
        D02: { kind: 'choice', optionIds: ['none'] },
        D03: { kind: 'choice', optionIds: ['paper'] },
        D04: { kind: 'choice', optionIds: ['bedtime'] },
      },
      initialStatus: 'started',
    });
    start();
    for (let i = 0; i < 6; i += 1) clickNext(); // D06 long text
    const area = screen.getByLabelText(/Tell us about a book you remember well/);
    fireEvent.change(area, { target: { value: 'Hello' } });
    expect(screen.getByText('5 / 1000 characters')).toBeInTheDocument();
  });
});

describe('SurveyRenderer persistence and submission', () => {
  it('autosaves on Next and keeps a localStorage draft', async () => {
    renderSurvey(branching);
    start();
    pick('Yes');

    await waitFor(() =>
      expect(
        fetchCalls.some((call) => call.url.endsWith('/progress') && 'answers' in call.body),
      ).toBe(true),
    );
    const saved = fetchCalls.filter((call) => 'answers' in call.body).pop();
    expect(saved?.body.answers).toEqual({ Q1: { kind: 'choice', optionIds: ['yes'] } });
    expect(
      JSON.parse(window.localStorage.getItem(`mythoria_survey_draft:${TOKEN}`) ?? '{}'),
    ).toEqual({
      Q1: { kind: 'choice', optionIds: ['yes'] },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith('survey_started', expect.any(Object));
    expect(mockTrackEvent).toHaveBeenCalledWith('survey_question_answered', {
      survey_id: 'branching_test',
      survey_version: 1,
      cohort: 'C2',
      page_location: `${window.location.origin}/en-US/survey/:token`,
      page_path: '/en-US/survey/:token',
      question_id: 'Q1',
      option_ids: 'yes',
    });
  });

  it('restores a localStorage draft when the server has none, and survives broken storage', () => {
    window.localStorage.setItem(
      `mythoria_survey_draft:${TOKEN}`,
      JSON.stringify({ Q1: { kind: 'choice', optionIds: ['no'] } }),
    );
    renderSurvey(branching);
    expect(screen.getByRole('button', { name: /Pick up where you left off/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pick up where you left off/ }));
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
  });

  it('does not break when storage throws', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderSurvey(branching);
    start();
    pick('No');
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    spy.mockRestore();
    setSpy.mockRestore();
  });

  it('prunes answers to hidden questions before saving and submitting', async () => {
    renderSurvey(branching);
    start();
    pick('Yes');
    pick('Fantasy');
    clickBack();
    pick('No'); // hides Q2 and must drop its answer
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Thank you!' })).toBeInTheDocument(),
    );
    const submit = fetchCalls.find((call) => call.url.endsWith('/submit'));
    expect(submit?.body).toEqual({ answers: { Q1: { kind: 'choice', optionIds: ['no'] } } });
    const lastProgress = fetchCalls.filter((call) => 'answers' in call.body).pop();
    expect(lastProgress?.body.answers).toEqual({ Q1: { kind: 'choice', optionIds: ['no'] } });
  });

  it('submits with a stable Idempotency-Key and shows completion with the reward CTA', async () => {
    renderSurvey(branching);
    start();
    pick('Yes');
    pick('Crime');

    // First attempt fails, the retry must reuse the same key.
    submitResponse = { status: 500, body: { error: 'server_error' } };
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't send your answers"),
    );

    submitResponse = {
      status: 200,
      body: { ok: true, entitlementId: 'ent-42', rewardStatus: 'pending_story' },
    };
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }));
    await waitFor(() =>
      expect(screen.getByText('All done, thanks for sharing!')).toBeInTheDocument(),
    );

    const submits = fetchCalls.filter((call) => call.url.endsWith('/submit'));
    expect(submits).toHaveLength(2);
    const key = submits[0].headers['Idempotency-Key'];
    expect(key).toBeTruthy();
    expect(submits[1].headers['Idempotency-Key']).toBe(key);

    const cta = screen.getByRole('link', { name: 'See my gift' });
    expect(cta).toHaveAttribute('href', '/en-US/survey/reward/ent-42');
    expect(screen.getByText(/publish your first story/)).toBeInTheDocument();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'survey_submitted',
      expect.objectContaining({ survey_id: 'branching_test', cohort: 'C2' }),
    );
    expect(window.localStorage.getItem(`mythoria_survey_draft:${TOKEN}`)).toBeNull();
  });

  it('shows the sign-in reward text for eligible entitlements and no CTA without one', async () => {
    renderSurvey(branching);
    start();
    pick('No');
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Choose my gift' })).toBeInTheDocument(),
    );
    expect(screen.getByText(/sign in to your Mythoria account/)).toBeInTheDocument();
  });

  it('does not render a reward CTA when no entitlement was created', async () => {
    submitResponse = { status: 200, body: { ok: true, entitlementId: null, rewardStatus: null } };
    renderSurvey(branching);
    start();
    pick('No');
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }));
    await waitFor(() =>
      expect(screen.getByText('All done, thanks for sharing!')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('link', { name: /gift/ })).not.toBeInTheDocument();
  });

  it('maps server validation errors back to the question', async () => {
    submitResponse = {
      status: 422,
      body: { ok: false, error: 'validation', errors: { Q1: 'required' } },
    };
    renderSurvey(branching);
    start();
    pick('No');
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }));
    await waitFor(() =>
      expect(screen.getByText(/A few answers need another look/)).toBeInTheDocument(),
    );
    expect(screen.getByText('Please answer this question before moving on.')).toBeInTheDocument();
  });

  it('shows the closed message when the server reports the study closed', async () => {
    submitResponse = { status: 409, body: { error: 'closed' } };
    renderSurvey(branching);
    start();
    pick('No');
    fireEvent.click(screen.getByRole('button', { name: 'Send my answers' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/just closed/));
  });
});
