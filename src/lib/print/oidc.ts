import { OAuth2Client } from 'google-auth-library';
import { PrintError } from './contracts';

const oidc = new OAuth2Client();

export async function verifyPrintIdentity(request: Request, role: 'admin' | 'scheduler') {
  const audience = process.env.PRINT_INTERNAL_AUDIENCE;
  const email =
    process.env[
      role === 'admin' ? 'PRINT_ADMIN_SERVICE_ACCOUNT' : 'PRINT_SCHEDULER_SERVICE_ACCOUNT'
    ];
  const bearer = request.headers.get('authorization');
  if (audience && email && bearer?.startsWith('Bearer ')) {
    try {
      const ticket = await oidc.verifyIdToken({ idToken: bearer.slice(7), audience });
      const payload = ticket.getPayload();
      if (payload?.email_verified && payload.email === email) return;
    } catch {
      // Keep identity errors opaque.
    }
  }
  throw new PrintError('unauthorized', 'Unauthorized.', 401);
}
