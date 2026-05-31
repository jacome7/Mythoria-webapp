jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({})),
}));

const getCurrentAuthorMock = jest.fn();
const getStoryByIdMock = jest.fn();
const updateStoryMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services', () => ({
  storyService: {
    getStoryById: (...args: unknown[]) => getStoryByIdMock(...args),
    updateStory: (...args: unknown[]) => updateStoryMock(...args),
  },
}));

import type { NextRequest } from 'next/server';
import { PUT } from './route';

const routeContext = {
  params: Promise.resolve({ storyId: 'story-1' }),
};

const validCustomPersona = {
  pov: '3rd-limited',
  tone: 3,
  formality: 2,
  rhythm: 4,
  vocabulary: 3,
  fictionality: 4,
  dialogueDensity: 4,
  sensoriality: 5,
  subtextIrony: 2,
  techniques: ['show-dont-tell'],
  specialRequirements: 'Keep the narrator warm and brisk.',
};

describe('/api/my-stories/[storyId] persona updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
    getStoryByIdMock.mockResolvedValue({ storyId: 'story-1', authorId: 'author-1' });
  });

  it('saves a built-in literary persona with no custom persona', async () => {
    updateStoryMock.mockResolvedValue({
      storyId: 'story-1',
      literaryPersona: 'classic-novelist',
      customWritingPersona: null,
    });

    const response = (await PUT(
      {
        json: async () => ({
          literaryPersona: 'classic-novelist',
          customWritingPersona: null,
        }),
      } as unknown as NextRequest,
      routeContext,
    )) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(updateStoryMock).toHaveBeenCalledWith('story-1', {
      literaryPersona: 'classic-novelist',
      customWritingPersona: null,
    });
  });

  it('saves one-book custom writing persona settings', async () => {
    updateStoryMock.mockResolvedValue({
      storyId: 'story-1',
      literaryPersona: null,
      customWritingPersona: validCustomPersona,
    });

    const response = (await PUT(
      {
        json: async () => ({
          literaryPersona: null,
          customWritingPersona: validCustomPersona,
        }),
      } as unknown as NextRequest,
      routeContext,
    )) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(updateStoryMock).toHaveBeenCalledWith('story-1', {
      literaryPersona: null,
      customWritingPersona: validCustomPersona,
    });
  });

  it('rejects invalid one-book custom writing persona settings', async () => {
    const response = (await PUT(
      {
        json: async () => ({
          literaryPersona: null,
          customWritingPersona: {
            ...validCustomPersona,
            tone: 9,
          },
        }),
      } as unknown as NextRequest,
      routeContext,
    )) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(400);
    expect(updateStoryMock).not.toHaveBeenCalled();
  });
});
