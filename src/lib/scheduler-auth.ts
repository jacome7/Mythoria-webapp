import { OAuth2Client } from 'google-auth-library';

const authClient = new OAuth2Client();

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

export function getSchedulerAudience(request: Request): string {
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  const forwardedHost =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ||
    firstHeaderValue(request.headers.get('host'));

  return forwardedProto && forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;
}

export async function verifySchedulerRequest(request: Request): Promise<boolean> {
  const expectedEmail = process.env.ANALYTICS_SCHEDULER_SERVICE_ACCOUNT?.trim();
  if (!expectedEmail) return false;

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return false;

  try {
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: getSchedulerAudience(request),
    });
    const payload = ticket.getPayload();
    return payload?.email_verified === true && payload.email === expectedEmail;
  } catch {
    return false;
  }
}
