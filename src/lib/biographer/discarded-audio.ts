import { sql, type SQLWrapper } from 'drizzle-orm';
import { biographerEvents } from '@/db/schema/biographer';

// Durable turn-scoped cancellation shares the existing live event ledger and is
// removed along with its session when the interview is deleted.
export const discardedTurnEventId = (projectId: string | SQLWrapper, turnId: string | SQLWrapper) =>
  sql<string>`md5('biographer-discard:' || ${projectId}::uuid::text || ':' || ${turnId}::uuid::text)::uuid`;

export const isDiscardedLiveTurn = (projectId: string | SQLWrapper, turnId: string | SQLWrapper) =>
  sql<boolean>`exists (
    select 1 from ${biographerEvents}
    where ${biographerEvents.eventId} = ${discardedTurnEventId(projectId, turnId)}
  )`;

export const liveTurnDiscardingSession = (projectId: string, turnId: string) =>
  sql<string | null>`(
    select ${biographerEvents.sessionId} from ${biographerEvents}
    where ${biographerEvents.eventId} = ${discardedTurnEventId(projectId, turnId)}
  )`;
