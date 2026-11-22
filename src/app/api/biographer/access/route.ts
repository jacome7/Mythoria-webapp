import { body, handle } from '@/lib/biographer/http';
import {
  claimInvitation,
  invitationLanding,
  resumeInvitation,
  resumeLanding,
  requireGuestOrigin,
} from '@/lib/biographer/collaboration';
import { z } from 'zod';
const schema = z
  .object({
    operation: z.enum(['previewInvite', 'previewResume', 'claim', 'resume']),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    input: z.unknown().optional(),
  })
  .strict();
export const POST = (request: Request) =>
  handle(async () => {
    requireGuestOrigin(request);
    const value = schema.parse(await body(request));
    switch (value.operation) {
      case 'previewInvite':
        return invitationLanding(value.token);
      case 'previewResume':
        return resumeLanding(value.token);
      case 'claim':
        return claimInvitation(value.token, value.input);
      case 'resume':
        return resumeInvitation(value.token);
    }
  });
