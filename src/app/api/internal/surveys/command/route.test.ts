const verifyIdTokenMock = jest.fn();
const serviceMocks = {
  listSurveys: jest.fn(),
  listStudies: jest.fn(),
  getStudy: jest.fn(),
  createStudy: jest.fn(),
  updateStudy: jest.fn(),
  setStudyStatus: jest.fn(),
  previewAudience: jest.fn(),
  snapshotAudience: jest.fn(),
  linkCampaigns: jest.fn(),
};
const logInfoMock = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args),
  })),
}));
jest.mock('@/db/services/survey-studies', () => ({
  listSurveys: (...a: unknown[]) => serviceMocks.listSurveys(...a),
  listStudies: (...a: unknown[]) => serviceMocks.listStudies(...a),
  getStudy: (...a: unknown[]) => serviceMocks.getStudy(...a),
  createStudy: (...a: unknown[]) => serviceMocks.createStudy(...a),
  updateStudy: (...a: unknown[]) => serviceMocks.updateStudy(...a),
  setStudyStatus: (...a: unknown[]) => serviceMocks.setStudyStatus(...a),
  previewAudience: (...a: unknown[]) => serviceMocks.previewAudience(...a),
  snapshotAudience: (...a: unknown[]) => serviceMocks.snapshotAudience(...a),
  linkCampaigns: (...a: unknown[]) => serviceMocks.linkCampaigns(...a),
}));
jest.mock('@/lib/surveys/logger', () => ({
  surveyLogger: {
    info: (...a: unknown[]) => logInfoMock(...a),
    error: jest.fn(),
  },
}));

import { POST } from './route';
import { SurveyAdminError } from '@/lib/surveys/errors';

const STUDY_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const ACTOR = { email: 'admin@mythoria.pt' };
const ADMIN_ACCOUNT = 'admin-sa@project.iam.gserviceaccount.com';

function call(body: unknown, headers: Record<string, string> = { authorization: 'Bearer token' }) {
  return POST(
    new Request('http://localhost/api/internal/surveys/command', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/internal/surveys/command', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SURVEY_INTERNAL_AUDIENCE = 'https://webapp.example';
    process.env.SURVEY_ADMIN_SERVICE_ACCOUNT = ADMIN_ACCOUNT;
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ email: ADMIN_ACCOUNT, email_verified: true }),
    });
  });
  afterAll(() => {
    process.env = env;
  });

  describe('authentication', () => {
    it('401 without a bearer token', async () => {
      const res = await call({ operation: 'listStudies', input: {}, actor: ACTOR }, {});
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe('unauthorized');
      expect(serviceMocks.listStudies).not.toHaveBeenCalled();
    });

    it('401 when the service is not configured', async () => {
      delete process.env.SURVEY_ADMIN_SERVICE_ACCOUNT;
      const res = await call({ operation: 'listStudies', input: {}, actor: ACTOR });
      expect(res.status).toBe(401);
    });

    it('401 when token verification fails', async () => {
      verifyIdTokenMock.mockRejectedValue(new Error('bad token'));
      const res = await call({ operation: 'listStudies', input: {}, actor: ACTOR });
      expect(res.status).toBe(401);
    });

    it('401 when the email is not verified', async () => {
      verifyIdTokenMock.mockResolvedValue({
        getPayload: () => ({ email: ADMIN_ACCOUNT, email_verified: false }),
      });
      const res = await call({ operation: 'listStudies', input: {}, actor: ACTOR });
      expect(res.status).toBe(401);
    });

    it('403 for another service account', async () => {
      verifyIdTokenMock.mockResolvedValue({
        getPayload: () => ({
          email: 'other@project.iam.gserviceaccount.com',
          email_verified: true,
        }),
      });
      const res = await call({ operation: 'listStudies', input: {}, actor: ACTOR });
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe('forbidden');
    });

    it('verifies the token against the configured audience', async () => {
      serviceMocks.listStudies.mockResolvedValue([]);
      await call({ operation: 'listStudies', input: {}, actor: ACTOR });
      expect(verifyIdTokenMock).toHaveBeenCalledWith({
        idToken: 'token',
        audience: 'https://webapp.example',
      });
    });
  });

  describe('validation', () => {
    it('400 for malformed JSON', async () => {
      const res = await call('{not json');
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('invalid_json');
    });

    it('400 for an unknown operation', async () => {
      const res = await call({ operation: 'dropEverything', input: {}, actor: ACTOR });
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('invalid_input');
    });

    it('400 when the actor email is missing', async () => {
      const res = await call({ operation: 'listStudies', input: {} });
      expect(res.status).toBe(400);
    });

    it('400 for invalid input (non-uuid study id)', async () => {
      const res = await call({ operation: 'getStudy', input: { studyId: 'nope' }, actor: ACTOR });
      expect(res.status).toBe(400);
      expect(serviceMocks.getStudy).not.toHaveBeenCalled();
    });

    it('400 for an out-of-range holdout percent', async () => {
      const res = await call({
        operation: 'createStudy',
        input: {
          studyKey: 'q4-2026',
          title: 'Q4',
          holdoutPercent: 80,
          cohorts: [{ cohortKey: 'C1', surveyId: 'activation_no_story', version: 1 }],
        },
        actor: ACTOR,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('operations', () => {
    it('listSurveys and listStudies', async () => {
      serviceMocks.listSurveys.mockResolvedValue([{ surveyId: 'a' }]);
      serviceMocks.listStudies.mockResolvedValue([{ study: { studyId: STUDY_ID } }]);
      const surveys = await call({ operation: 'listSurveys', actor: ACTOR });
      expect(await surveys.json()).toEqual({ data: { surveys: [{ surveyId: 'a' }] } });
      const studies = await call({ operation: 'listStudies', input: {}, actor: ACTOR });
      expect(await studies.json()).toEqual({
        data: { studies: [{ study: { studyId: STUDY_ID } }] },
      });
    });

    it('getStudy returns the service result with no-store caching', async () => {
      serviceMocks.getStudy.mockResolvedValue({ study: { studyId: STUDY_ID } });
      const res = await call({ operation: 'getStudy', input: { studyId: STUDY_ID }, actor: ACTOR });
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('private, no-store');
      expect(await res.json()).toEqual({ data: { study: { studyId: STUDY_ID } } });
      expect(serviceMocks.getStudy).toHaveBeenCalledWith(STUDY_ID);
    });

    it('createStudy parses dates and passes the actor email', async () => {
      serviceMocks.createStudy.mockResolvedValue({ study: { studyId: STUDY_ID } });
      const res = await call({
        operation: 'createStudy',
        input: {
          studyKey: 'q4-2026',
          title: 'Q4 research',
          opensAt: '2026-11-01T00:00:00Z',
          closesAt: '2026-11-30T23:59:59Z',
          holdoutPercent: 10,
          rewardPolicy: {
            rewardTypes: ['pdf', 'audiobook'],
            redemptionDeadline: '2027-01-31T23:59:59Z',
          },
          cohorts: [{ cohortKey: 'C1', surveyId: 'activation_no_story', version: 1 }],
        },
        actor: ACTOR,
      });
      expect(res.status).toBe(200);
      const [input, actorEmail] = serviceMocks.createStudy.mock.calls[0];
      expect(actorEmail).toBe(ACTOR.email);
      expect(input.opensAt).toEqual(new Date('2026-11-01T00:00:00Z'));
      expect(input.rewardPolicy.allowExistingAudiobook).toBe(false);
      expect(input.holdoutPercent).toBe(10);
    });

    it('accepts a null redemptionDeadline so drafts can be saved incomplete', async () => {
      serviceMocks.createStudy.mockResolvedValue({ study: { studyId: STUDY_ID } });
      const res = await call({
        operation: 'createStudy',
        input: {
          studyKey: 'q4-2026',
          title: 'Q4 research',
          holdoutPercent: 10,
          rewardPolicy: { rewardTypes: [], redemptionDeadline: null },
          cohorts: [{ cohortKey: 'C1', surveyId: 'activation_no_story', version: 1 }],
        },
        actor: ACTOR,
      });
      expect(res.status).toBe(200);
      expect(serviceMocks.createStudy.mock.calls.at(-1)?.[0].rewardPolicy).toMatchObject({
        redemptionDeadline: null,
      });

      serviceMocks.updateStudy.mockResolvedValue({ study: {} });
      const updated = await call({
        operation: 'updateStudy',
        input: { studyId: STUDY_ID, rewardPolicy: { rewardTypes: ['pdf'] } },
        actor: ACTOR,
      });
      expect(updated.status).toBe(200);
    });

    it('updateStudy splits the id from the patch and rejects unknown fields', async () => {
      serviceMocks.updateStudy.mockResolvedValue({ study: {} });
      const ok = await call({
        operation: 'updateStudy',
        input: { studyId: STUDY_ID, title: 'New title' },
        actor: ACTOR,
      });
      expect(ok.status).toBe(200);
      expect(serviceMocks.updateStudy).toHaveBeenCalledWith(STUDY_ID, { title: 'New title' });

      const bad = await call({
        operation: 'updateStudy',
        input: { studyId: STUDY_ID, studyKey: 'renamed' },
        actor: ACTOR,
      });
      expect(bad.status).toBe(400);
    });

    it('setStudyStatus, previewAudience, snapshotAudience and linkCampaigns', async () => {
      serviceMocks.setStudyStatus.mockResolvedValue({ study: {} });
      serviceMocks.previewAudience.mockResolvedValue({ reconciles: true });
      serviceMocks.snapshotAudience.mockResolvedValue({ skippedExisting: 0 });
      serviceMocks.linkCampaigns.mockResolvedValue({ cohortKey: 'C1' });

      await call({
        operation: 'setStudyStatus',
        input: { studyId: STUDY_ID, status: 'active' },
        actor: ACTOR,
      });
      expect(serviceMocks.setStudyStatus).toHaveBeenCalledWith(STUDY_ID, 'active');

      await call({
        operation: 'previewAudience',
        input: { studyId: STUDY_ID, notificationPreferences: ['news'] },
        actor: ACTOR,
      });
      expect(serviceMocks.previewAudience).toHaveBeenCalledWith(STUDY_ID, ['news']);

      await call({
        operation: 'snapshotAudience',
        input: { studyId: STUDY_ID, cohortKeys: ['C1', 'C2'] },
        actor: ACTOR,
      });
      expect(serviceMocks.snapshotAudience).toHaveBeenCalledWith(
        STUDY_ID,
        ['C1', 'C2'],
        undefined,
        false,
      );

      await call({
        operation: 'linkCampaigns',
        input: { studyId: STUDY_ID, cohortKey: 'C1', inviteCampaignId: 'camp-1' },
        actor: ACTOR,
      });
      expect(serviceMocks.linkCampaigns).toHaveBeenCalledWith({
        studyId: STUDY_ID,
        cohortKey: 'C1',
        inviteCampaignId: 'camp-1',
      });
    });

    it('rejects U1/U2 as snapshot cohorts', async () => {
      const res = await call({
        operation: 'snapshotAudience',
        input: { studyId: STUDY_ID, cohortKeys: ['U1'] },
        actor: ACTOR,
      });
      expect(res.status).toBe(400);
    });

    it('logs the actor and operation without request payloads', async () => {
      serviceMocks.getStudy.mockResolvedValue({});
      await call({ operation: 'getStudy', input: { studyId: STUDY_ID }, actor: ACTOR });
      expect(logInfoMock).toHaveBeenCalledWith('survey_command', {
        operation: 'getStudy',
        actorEmail: ACTOR.email,
        caller: ADMIN_ACCOUNT,
      });
    });
  });

  describe('domain errors', () => {
    it.each([
      [404, 'study_not_found'],
      [409, 'invalid_transition'],
      [400, 'survey_version_not_found'],
    ])('maps %i %s to a structured error', async (status, code) => {
      serviceMocks.getStudy.mockRejectedValue(
        new SurveyAdminError(code, 'message', status as 400 | 404 | 409),
      );
      const res = await call({ operation: 'getStudy', input: { studyId: STUDY_ID }, actor: ACTOR });
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: { code, message: 'message' } });
    });

    it('500 for unexpected errors without leaking details', async () => {
      serviceMocks.getStudy.mockRejectedValue(new Error('connection string leaked'));
      const res = await call({ operation: 'getStudy', input: { studyId: STUDY_ID }, actor: ACTOR });
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain('leaked');
    });
  });
});
