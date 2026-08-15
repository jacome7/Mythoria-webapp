import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsOutbox, productGenerationRequests } from '@/db/schema';

const TERMINAL_EVENT_NAMES = [
  'self_print_completed',
  'self_print_failed',
  'audiobook_generation_completed',
  'audiobook_generation_failed',
] as const;

type TerminalEventName = (typeof TERMINAL_EVENT_NAMES)[number];
type ReconciliationState = 'missing' | 'pending' | 'deferred' | 'delivered' | 'failed' | 'skipped';

type OutboxState = Pick<
  typeof analyticsOutbox.$inferSelect,
  'availableAt' | 'attempts' | 'deliveredAt' | 'skippedAt' | 'lastError'
>;

export function classifyProductOutboxState(
  row: OutboxState | undefined,
  now = new Date(),
): ReconciliationState {
  if (!row) return 'missing';
  if (row.deliveredAt) return 'delivered';
  if (row.skippedAt) return 'skipped';
  if (row.availableAt > now || row.lastError?.startsWith('Awaiting ')) return 'deferred';
  if (row.attempts > 0 && row.lastError) return 'failed';
  return 'pending';
}

const expectedEventName = (
  request: Pick<typeof productGenerationRequests.$inferSelect, 'actionType' | 'status'>,
): TerminalEventName =>
  request.actionType === 'self_print'
    ? request.status === 'completed'
      ? 'self_print_completed'
      : 'self_print_failed'
    : request.status === 'completed'
      ? 'audiobook_generation_completed'
      : 'audiobook_generation_failed';

const oppositeEventName = (eventName: TerminalEventName): TerminalEventName =>
  eventName.endsWith('_completed')
    ? (eventName.replace('_completed', '_failed') as TerminalEventName)
    : (eventName.replace('_failed', '_completed') as TerminalEventName);

export async function reconcileProductAnalytics(now = new Date()) {
  const [requests, outboxRows] = await Promise.all([
    db
      .select()
      .from(productGenerationRequests)
      .where(inArray(productGenerationRequests.status, ['completed', 'failed'])),
    db
      .select()
      .from(analyticsOutbox)
      .where(inArray(analyticsOutbox.eventName, [...TERMINAL_EVENT_NAMES])),
  ]);
  const outboxByKey = new Map(outboxRows.map((row) => [row.dedupeKey, row]));
  const counts = Object.fromEntries(
    TERMINAL_EVENT_NAMES.map((eventName) => [
      eventName,
      { missing: 0, pending: 0, deferred: 0, delivered: 0, failed: 0, skipped: 0 },
    ]),
  ) as Record<TerminalEventName, Record<ReconciliationState, number>>;
  const alerts: Array<{
    code: 'completed_outbox_missing' | 'delivery_deadline_exceeded' | 'terminal_event_conflict';
    runId: string;
    eventName: TerminalEventName;
  }> = [];

  for (const request of requests) {
    const eventName = expectedEventName(request);
    const expected = outboxByKey.get(`${eventName}:${request.runId}`);
    const oppositeName = oppositeEventName(eventName);
    const opposite = outboxByKey.get(`${oppositeName}:${request.runId}`);
    const state = classifyProductOutboxState(expected, now);
    counts[eventName][state] += 1;

    if (request.status === 'completed' && !expected) {
      alerts.push({ code: 'completed_outbox_missing', runId: request.runId, eventName });
    }
    if (expected && !expected.deliveredAt && !expected.skippedAt) {
      const deadline = new Date(request.createdAt.getTime() + 24 * 60 * 60 * 1000);
      if (now > deadline) {
        alerts.push({ code: 'delivery_deadline_exceeded', runId: request.runId, eventName });
      }
    }
    if (expected && opposite) {
      alerts.push({ code: 'terminal_event_conflict', runId: request.runId, eventName });
    }
  }

  return { generatedAt: now, terminalRequestCount: requests.length, counts, alerts };
}
