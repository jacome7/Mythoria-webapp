import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Opaque survey invitation link tokens.
 *
 * token = base64url(invitation uuid bytes) + '.' + base64url(HMAC-SHA256(secret, CONTEXT + id))[0..22]
 *
 * Nothing is stored in plaintext: the token is re-derivable from the invitation id and the shared
 * `SURVEY_LINK_SECRET` (also used by notification-engine to build campaign links). The token
 * reveals no personal data; the invitation id alone is useless without a valid signature.
 * Keep this algorithm byte-identical to notification-engine `src/services/surveyLinks.ts`.
 */

const CONTEXT = 'survey-invite:v1:';
const SIGNATURE_LENGTH = 22;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSecret(secret?: string): string {
  const value = secret ?? process.env.SURVEY_LINK_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SURVEY_LINK_SECRET must be configured with at least 32 characters');
  }
  return value;
}

function uuidToBase64Url(uuid: string): string {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64url');
}

function base64UrlToUuid(value: string): string | null {
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length !== 16 || bytes.toString('base64url') !== value) return null;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sign(invitationId: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(CONTEXT + invitationId.toLowerCase())
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH);
}

export function createSurveyToken(invitationId: string, secret?: string): string {
  if (!UUID_PATTERN.test(invitationId)) throw new Error('Invalid invitation id');
  return `${uuidToBase64Url(invitationId)}.${sign(invitationId, getSecret(secret))}`;
}

/** Returns the invitation id for a well-formed, correctly signed token; otherwise null. */
export function verifySurveyToken(token: string, secret?: string): string | null {
  if (typeof token !== 'string' || token.length > 64) return null;
  const [idPart, signature, extra] = token.split('.');
  if (!idPart || !signature || extra !== undefined) return null;
  const invitationId = base64UrlToUuid(idPart);
  if (!invitationId) return null;
  const expected = Buffer.from(sign(invitationId, getSecret(secret)));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return invitationId;
}
