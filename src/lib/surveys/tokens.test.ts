import { createSurveyToken, verifySurveyToken } from './tokens';

const SECRET = 'test-secret-test-secret-test-secret-00';
const INVITATION_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_ID = '9b2f3c1e-7a44-4d0e-8a51-2f6d9c1b7e10';
// Shared with notification-engine's survey link test suite; both must produce this exact value.
const TEST_VECTOR_TOKEN = 'AAAAAAAAQACAAAAAAAAAAQ.KYAPCFnyamMJ0c3yiv8zw2';

describe('survey link tokens', () => {
  const originalSecret = process.env.SURVEY_LINK_SECRET;
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SURVEY_LINK_SECRET;
    else process.env.SURVEY_LINK_SECRET = originalSecret;
  });

  it('matches the cross-service test vector', () => {
    expect(createSurveyToken(INVITATION_ID, SECRET)).toBe(TEST_VECTOR_TOKEN);
    expect(verifySurveyToken(TEST_VECTOR_TOKEN, SECRET)).toBe(INVITATION_ID);
  });

  it('round-trips an invitation id', () => {
    const token = createSurveyToken(OTHER_ID, SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}$/);
    expect(verifySurveyToken(token, SECRET)).toBe(OTHER_ID);
  });

  it('uses SURVEY_LINK_SECRET from the environment by default', () => {
    process.env.SURVEY_LINK_SECRET = SECRET;
    expect(createSurveyToken(INVITATION_ID)).toBe(TEST_VECTOR_TOKEN);
    expect(verifySurveyToken(TEST_VECTOR_TOKEN)).toBe(INVITATION_ID);
  });

  it('treats uuid case as insignificant and returns lowercase ids', () => {
    const upper = createSurveyToken(OTHER_ID.toUpperCase(), SECRET);
    expect(upper).toBe(createSurveyToken(OTHER_ID, SECRET));
    expect(verifySurveyToken(upper, SECRET)).toBe(OTHER_ID);
  });

  it('rejects a tampered signature', () => {
    const token = createSurveyToken(OTHER_ID, SECRET);
    const [id, signature] = token.split('.');
    const flipped = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    expect(verifySurveyToken(`${id}.${flipped}`, SECRET)).toBeNull();
  });

  it('rejects a token whose id part was swapped', () => {
    const [, signature] = createSurveyToken(OTHER_ID, SECRET).split('.');
    const [otherId] = createSurveyToken(INVITATION_ID, SECRET).split('.');
    expect(verifySurveyToken(`${otherId}.${signature}`, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSurveyToken(OTHER_ID, 'another-secret-another-secret-another-00');
    expect(verifySurveyToken(token, SECRET)).toBeNull();
  });

  it.each([
    '',
    'abc',
    '.',
    'abc.',
    '.abc',
    'not-a-token-at-all',
    'AAAAAAAAAAAAAAAAAAAAAA.short',
    '!!!!!!!!!!!!!!!!!!!!!!.AAAAAAAAAAAAAAAAAAAAAA',
  ])('rejects malformed token %p', (token) => {
    expect(verifySurveyToken(token, SECRET)).toBeNull();
  });

  it('rejects extra segments and oversized tokens', () => {
    const token = createSurveyToken(OTHER_ID, SECRET);
    expect(verifySurveyToken(`${token}.extra`, SECRET)).toBeNull();
    expect(verifySurveyToken(`${token}${'A'.repeat(64)}`, SECRET)).toBeNull();
  });

  it('refuses to mint tokens for invalid ids or weak secrets', () => {
    expect(() => createSurveyToken('not-a-uuid', SECRET)).toThrow('Invalid invitation id');
    expect(() => createSurveyToken(OTHER_ID, 'short')).toThrow(/SURVEY_LINK_SECRET/);
    delete process.env.SURVEY_LINK_SECRET;
    expect(() => verifySurveyToken(TEST_VECTOR_TOKEN)).toThrow(/SURVEY_LINK_SECRET/);
  });
});
