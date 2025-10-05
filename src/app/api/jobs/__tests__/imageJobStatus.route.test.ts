// Test file for image job status credit deduction idempotency

// Mock next/server to avoid relying on Web API Request in Jest environment
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
    }),
  },
}));

// Inject a wrapper around the route to relax typing before importing
import type { NextRequest } from 'next/server';
jest.mock('../[jobId]/route', () => {
  const original = jest.requireActual('../[jobId]/route');
  return {
    GET: (req: unknown, ctx: { params: Promise<{ jobId: string }> }) =>
      original.GET(req as NextRequest, ctx),
  };
});

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn().mockResolvedValue({ userId: 'clerk_user_1' }),
}));

type RecordSuccessfulEditFn = (
  authorId: string,
  storyId: string,
  action: 'imageEdit',
  metadata?: Record<string, unknown>,
) => Promise<void> | void;
const recordSuccessfulEdit = jest.fn<
  ReturnType<RecordSuccessfulEditFn>,
  Parameters<RecordSuccessfulEditFn>
>();
const getAuthorByClerkId = jest.fn().mockResolvedValue({ authorId: 'author_1' });

jest.mock('@/db/services', () => ({
  aiEditService: { recordSuccessfulEdit },
  authorService: { getAuthorByClerkId },
}));

type LimitResult = { id: string };
const limitMock = jest.fn<Promise<LimitResult[]>, []>();

interface SelectBuilder {
  from: () => { where: () => { limit: typeof limitMock } };
}
const selectMock = jest
  .fn<SelectBuilder, []>()
  .mockReturnValue({ from: () => ({ where: () => ({ limit: limitMock }) }) });

jest.mock('@/db', () => ({ db: { select: () => selectMock() } }));

jest.mock('@/db/schema', () => ({
  aiEdits: { id: 'id', authorId: 'authorId', storyId: 'storyId', metadata: 'metadata' },
}));
jest.mock('drizzle-orm', () => ({ and: () => ({}), eq: () => ({}), sql: () => ({}) }));

interface PendingJobMeta {
  storyId: string;
  imageType: string;
  userRequest: string;
}
const pendingImageJobs: Record<string, PendingJobMeta> = {
  job_123: { storyId: 'story_1', imageType: 'cover', userRequest: 'Make it vivid' },
};

jest.mock('../image-edit-store', () => ({
  pendingImageJobs,
  getPendingImageJob: (id: string) => pendingImageJobs[id],
  deletePendingImageJob: (id: string) => {
    delete pendingImageJobs[id];
  },
}));

type SgwFetchResponse = { ok: boolean; json: () => Promise<unknown> };
const sgwFetchMock = jest.fn<Promise<SgwFetchResponse>, unknown[]>().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    job: {
      id: 'job_123',
      type: 'image_edit',
      status: 'completed',
      progress: 100,
      elapsedTime: 2000,
      remainingTime: 0,
      estimatedDuration: 2000,
      result: { newImageUrl: 'https://cdn/new.png', storyId: 'story_1' },
    },
  }),
});

jest.mock('@/lib/sgw-client', () => ({ sgwFetch: (...args: unknown[]) => sgwFetchMock(...args) }));

import { GET } from '../[jobId]/route';

interface MockNextRequest {
  headers: Map<string, string>;
  method: string;
  url: string;
}
function buildMockNextRequest(): MockNextRequest {
  return { headers: new Map(), method: 'GET', url: 'http://localhost/api/jobs/mock' };
}

interface ResponseLike {
  json: () => Promise<unknown>;
  status?: number;
}
interface ApiJobStatus {
  success: boolean;
  job?: { id: string; type: string; status: string };
}

describe('GET /api/jobs/[jobId] image edit completion', () => {
  afterEach(() => {
    jest.clearAllMocks();
    pendingImageJobs.job_123 = {
      storyId: 'story_1',
      imageType: 'cover',
      userRequest: 'Make it vivid',
    };
  });

  it('records successful edit (deducts credits) exactly once when job completes', async () => {
    limitMock.mockResolvedValueOnce([]);
    const mockReq = buildMockNextRequest();
    // @ts-expect-error - test provides minimal mock request
    const res1 = (await GET(mockReq, {
      params: Promise.resolve({ jobId: 'job_123' }),
    })) as unknown as ResponseLike;
    const json1 = (await res1.json()) as ApiJobStatus;
    expect(json1.success).toBe(true);
    expect(recordSuccessfulEdit).toHaveBeenCalledTimes(1);
    expect(recordSuccessfulEdit).toHaveBeenCalledWith(
      'author_1',
      'story_1',
      'imageEdit',
      expect.objectContaining({ jobId: 'job_123' }),
    );

    limitMock.mockResolvedValueOnce([{ id: 'existing-edit' }]);
    // @ts-expect-error - test provides minimal mock request
    const res2 = (await GET(mockReq, {
      params: Promise.resolve({ jobId: 'job_123' }),
    })) as unknown as ResponseLike;
    const json2 = (await res2.json()) as ApiJobStatus;
    expect(json2.success).toBe(true);
    expect(recordSuccessfulEdit).toHaveBeenCalledTimes(1);
  });

  it('skips recording if job not completed', async () => {
    sgwFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        job: { id: 'job_999', type: 'image_edit', status: 'processing', progress: 50 },
      }),
    });
    const mockReq = buildMockNextRequest();
    // @ts-expect-error - test provides minimal mock request
    const res = (await GET(mockReq, {
      params: Promise.resolve({ jobId: 'job_999' }),
    })) as unknown as ResponseLike;
    const json = (await res.json()) as ApiJobStatus;
    expect(json.success).toBe(true);
    expect(recordSuccessfulEdit).not.toHaveBeenCalled();
  });
});
