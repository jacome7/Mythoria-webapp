import { OAuth2Client } from 'google-auth-library';

const authClient = new OAuth2Client();

export async function verifySchedulerRequest(request: Request): Promise<boolean> {
  const expectedEmail = process.env.ANALYTICS_SCHEDULER_SERVICE_ACCOUNT?.trim();
  if (!expectedEmail) return false;

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return false;

  try {
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: new URL(request.url).origin,
    });
    const payload = ticket.getPayload();
    return payload?.email_verified === true && payload.email === expectedEmail;
  } catch {
    return false;
  }
}
