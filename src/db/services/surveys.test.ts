import type { SurveyDefinition } from '@/lib/surveys/definition-schema';

type Row = Record<string, unknown>;

const state = {
  existingVersions: [] as Row[],
  surveyRows: [] as Row[],
  inserts: [] as Array<{ values: Row }>,
  updates: [] as Row[],
  upserts: 0,
};

function makeExecutor() {
  return {
    select: jest.fn((fields?: unknown) => ({
      from: () => ({
        where: () => ({
          limit: async () => (fields ? state.surveyRows : state.existingVersions),
        }),
      }),
    })),
    insert: jest.fn(() => ({
      values: (values: Row) => {
        state.inserts.push({ values });
        return {
          onConflictDoUpdate: async () => {
            state.upserts += 1;
          },
          then: (resolve: (value: unknown) => void) => resolve(undefined),
        };
      },
    })),
    update: jest.fn(() => ({
      set: (values: Row) => ({
        where: async () => {
          state.updates.push(values);
        },
      }),
    })),
  };
}

jest.mock('@/db', () => {
  const executor = makeExecutor();
  return {
    db: {
      ...executor,
      transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback(executor)),
    },
  };
});

jest.mock('@/lib/surveys/validate-definition', () => ({
  assertValidSurveyDefinition: (input: unknown) => input,
}));

import {
  getCurrentSurveyVersion,
  getPublishedSurveyVersion,
  publishSurveyDefinitions,
} from './surveys';
import { hashSurveyDefinition } from '@/lib/surveys/definition-hash';

function localized(text: string) {
  return { 'en-US': text, 'pt-PT': text, 'es-ES': text, 'fr-FR': text, 'de-DE': text };
}

function makeDefinition(overrides: Partial<SurveyDefinition> = {}): SurveyDefinition {
  return {
    schemaVersion: 1,
    id: 'demo_survey',
    version: 1,
    purpose: 'Testing',
    title: localized('Demo'),
    description: localized('Demo description'),
    completionMessage: localized('Thanks'),
    estimatedMinutes: 1,
    responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
    rewardEligible: false,
    internalOnly: true,
    questions: [{ id: 'intro', type: 'static_content', label: localized('Hello') }],
    ...overrides,
  } as SurveyDefinition;
}

beforeEach(() => {
  state.existingVersions = [];
  state.surveyRows = [];
  state.inserts = [];
  state.updates = [];
  state.upserts = 0;
});

describe('publishSurveyDefinitions', () => {
  it('creates a version that is not published yet', async () => {
    const definition = makeDefinition();
    const report = await publishSurveyDefinitions([definition], { dryRun: false });

    expect(report).toEqual([{ surveyId: 'demo_survey', version: 1, action: 'created' }]);
    expect(state.upserts).toBe(1);
    expect(state.inserts).toHaveLength(2);
    expect(state.inserts[1].values).toMatchObject({
      surveyId: 'demo_survey',
      version: 1,
      schemaVersion: 1,
      definitionHash: hashSurveyDefinition(definition),
    });
    expect(state.updates).toHaveLength(1);
  });

  it('reports unchanged when the stored hash matches', async () => {
    const definition = makeDefinition();
    state.existingVersions = [{ definitionHash: hashSurveyDefinition(definition) }];

    const report = await publishSurveyDefinitions([definition], { dryRun: false });

    expect(report).toEqual([{ surveyId: 'demo_survey', version: 1, action: 'unchanged' }]);
    expect(state.inserts).toHaveLength(1); // only the survey metadata upsert
    expect(state.updates).toHaveLength(0);
  });

  it('throws on a content conflict and writes nothing', async () => {
    state.existingVersions = [{ definitionHash: 'different' }];

    await expect(publishSurveyDefinitions([makeDefinition()], { dryRun: false })).rejects.toThrow(
      'Version 1 of demo_survey is already published with different content; create version 2',
    );
    expect(state.inserts).toHaveLength(0);
    expect(state.upserts).toBe(0);
  });

  it('reports a conflict without writing or throwing in dry run', async () => {
    state.existingVersions = [{ definitionHash: 'different' }];

    const report = await publishSurveyDefinitions([makeDefinition()], { dryRun: true });

    expect(report).toEqual([{ surveyId: 'demo_survey', version: 1, action: 'conflict' }]);
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it('does not write in dry run for a new version', async () => {
    const report = await publishSurveyDefinitions([makeDefinition()], { dryRun: true });
    expect(report[0].action).toBe('created');
    expect(state.inserts).toHaveLength(0);
  });

  it('rejects duplicate id/version pairs', async () => {
    await expect(
      publishSurveyDefinitions([makeDefinition(), makeDefinition()], { dryRun: true }),
    ).rejects.toThrow('listed twice');
  });
});

describe('readers', () => {
  it('returns null when a version is missing', async () => {
    await expect(getPublishedSurveyVersion('demo_survey', 3)).resolves.toBeNull();
  });

  it('returns the published version', async () => {
    const definition = makeDefinition();
    state.existingVersions = [{ surveyId: 'demo_survey', version: 1, definition }];
    await expect(getPublishedSurveyVersion('demo_survey', 1)).resolves.toMatchObject({
      version: 1,
      definition,
    });
  });

  it('resolves the current version through the survey row', async () => {
    const definition = makeDefinition();
    state.surveyRows = [{ currentVersion: 1 }];
    state.existingVersions = [{ surveyId: 'demo_survey', version: 1, definition }];
    await expect(getCurrentSurveyVersion('demo_survey')).resolves.toMatchObject({ version: 1 });
  });

  it('returns null when the survey has no current version', async () => {
    state.surveyRows = [{ currentVersion: null }];
    await expect(getCurrentSurveyVersion('demo_survey')).resolves.toBeNull();
  });
});
