import { McpToolUserError } from './tool-result';

export type TrackedJobType = 'story_generation' | 'audiobook_generation' | 'export' | 'print';

type TrackedJobToken = {
  type: TrackedJobType;
  storyId: string;
  runId: string | null;
  requestedAt: string;
};

export type TrackedJobDescriptor = TrackedJobToken & {
  jobId: string;
  etaSeconds: number;
};

export const TRACKED_JOB_TYPES = [
  'story_generation',
  'audiobook_generation',
  'export',
  'print',
] as const;

const TRACKED_JOB_ID_PREFIX = 'mythoria-job:';

function resolveTrackedJobEtaSeconds(type: TrackedJobType): number {
  if (type === 'story_generation') return 300;
  if (type === 'audiobook_generation') return 240;
  if (type === 'print') return 180;
  return 90;
}

export function createTrackedJobDescriptor(
  type: TrackedJobType,
  storyId: string,
  options?: { runId?: string | null; requestedAt?: string },
): TrackedJobDescriptor {
  const requestedAt = options?.requestedAt ?? new Date().toISOString();
  const token: TrackedJobToken = {
    type,
    storyId,
    runId: options?.runId ?? null,
    requestedAt,
  };
  const encoded = Buffer.from(JSON.stringify(token), 'utf8').toString('base64url');

  return {
    ...token,
    jobId: `${TRACKED_JOB_ID_PREFIX}${encoded}`,
    etaSeconds: resolveTrackedJobEtaSeconds(type),
  };
}

export function parseTrackedJobId(jobId: string): TrackedJobDescriptor {
  const trimmed = jobId.trim();
  if (!trimmed.startsWith(TRACKED_JOB_ID_PREFIX)) {
    throw new McpToolUserError('Invalid Mythoria job ID format.');
  }

  const encoded = trimmed.slice(TRACKED_JOB_ID_PREFIX.length);
  if (!encoded) {
    throw new McpToolUserError('Invalid Mythoria job ID payload.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown;
  } catch {
    throw new McpToolUserError('Invalid Mythoria job ID payload.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new McpToolUserError('Invalid Mythoria job ID payload.');
  }

  const candidate = parsed as Partial<TrackedJobToken>;
  const runId =
    candidate.runId === null || candidate.runId === undefined
      ? null
      : typeof candidate.runId === 'string'
        ? candidate.runId
        : null;

  if (
    typeof candidate.type !== 'string' ||
    !(TRACKED_JOB_TYPES as readonly string[]).includes(candidate.type)
  ) {
    throw new McpToolUserError('Invalid job type in job ID.');
  }
  if (typeof candidate.storyId !== 'string' || candidate.storyId.trim().length === 0) {
    throw new McpToolUserError('Invalid story ID in job ID.');
  }
  if (
    typeof candidate.requestedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.requestedAt))
  ) {
    throw new McpToolUserError('Invalid requestedAt in job ID.');
  }

  return {
    type: candidate.type as TrackedJobType,
    storyId: candidate.storyId,
    runId,
    requestedAt: candidate.requestedAt,
    etaSeconds: resolveTrackedJobEtaSeconds(candidate.type as TrackedJobType),
    jobId: trimmed,
  };
}
