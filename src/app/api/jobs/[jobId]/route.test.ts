/** @jest-environment node */
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sgwFetch } from '@/lib/sgw-client';
import { authorService, storyService } from '@/db/services';
import { GET } from './route';

jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));
jest.mock('@/db/services', () => ({
  authorService: { getAuthorByClerkId: jest.fn() },
  storyService: { getStoryById: jest.fn() },
  aiEditService: {},
  chapterService: {},
}));
jest.mock('@/db', () => ({ db: {} }));
jest.mock('../image-edit-store', () => ({
  getPendingImageJob: jest.fn(),
  deletePendingImageJob: jest.fn(),
}));

const payload = {
  success: true,
  job: {
    id: 'job-1',
    type: 'story_structure',
    status: 'completed',
    metadata: { storyId: 'story-1' },
    result: { privateOutline: 'Personal family memory' },
  },
};
const read = () =>
  GET(new NextRequest('https://mythoria.pt/api/jobs/job-1'), {
    params: Promise.resolve({ jobId: 'job-1' }),
  });
const upstream = (data: unknown) =>
  jest.mocked(sgwFetch).mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

describe('private story structure job polling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    upstream(payload);
    jest.mocked(auth).mockResolvedValue({ userId: 'clerk-1' } as Awaited<ReturnType<typeof auth>>);
    jest
      .mocked(authorService.getAuthorByClerkId)
      .mockResolvedValue({ authorId: 'author-1' } as NonNullable<
        Awaited<ReturnType<typeof authorService.getAuthorByClerkId>>
      >);
    jest
      .mocked(storyService.getStoryById)
      .mockResolvedValue({ authorId: 'author-1' } as NonNullable<
        Awaited<ReturnType<typeof storyService.getStoryById>>
      >);
  });

  it('returns the outline only to the owning author', async () => {
    const response = await read();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(authorService.getAuthorByClerkId).toHaveBeenCalledWith('clerk-1');
    expect(storyService.getStoryById).toHaveBeenCalledWith('story-1');
  });

  it('requires authentication before returning private job data', async () => {
    jest.mocked(auth).mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
    const response = await read();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(storyService.getStoryById).not.toHaveBeenCalled();
  });

  it.each(['different-owner', 'missing-author', 'missing-story', 'missing-metadata'])(
    'hides private data for %s',
    async (scenario) => {
      if (scenario === 'different-owner')
        jest
          .mocked(storyService.getStoryById)
          .mockResolvedValue({ authorId: 'another-author' } as NonNullable<
            Awaited<ReturnType<typeof storyService.getStoryById>>
          >);
      if (scenario === 'missing-author')
        jest.mocked(authorService.getAuthorByClerkId).mockResolvedValue(undefined);
      if (scenario === 'missing-story')
        jest
          .mocked(storyService.getStoryById)
          .mockResolvedValue(
            undefined as unknown as Awaited<ReturnType<typeof storyService.getStoryById>>,
          );
      if (scenario === 'missing-metadata')
        upstream({ ...payload, job: { ...payload.job, metadata: {} } });
      const response = await read();
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Job not found' });
    },
  );

  it.each(['text_edit', 'image_edit', 'legacy_other'])(
    'preserves the existing status contract for non-structure %s jobs',
    async (type) => {
      const legacy = { success: true, job: { id: 'job-1', type, status: 'processing' } };
      upstream(legacy);
      const response = await read();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(legacy);
      expect(auth).not.toHaveBeenCalled();
      expect(storyService.getStoryById).not.toHaveBeenCalled();
    },
  );
});
