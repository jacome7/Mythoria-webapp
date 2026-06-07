jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const updateMock = jest.fn();
const deleteMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services/writing-personas', () => ({
  writingPersonaService: {
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

import type { NextRequest } from 'next/server';
import { DELETE, PATCH } from './route';

const validPersona = {
  name: 'Bright narrator',
  pov: '1st',
  tone: 4,
  formality: 2,
  rhythm: 4,
  vocabulary: 3,
  fictionality: 4,
  dialogueDensity: 4,
  sensoriality: 3,
  subtextIrony: 2,
  techniques: [],
  specialRequirements: '',
};

describe('/api/writing-personas/[codename]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
  });

  it('updates an owned persona', async () => {
    updateMock.mockResolvedValue({ codename: 'persona-1', ...validPersona });

    const response = (await PATCH({ json: async () => validPersona } as unknown as NextRequest, {
      params: Promise.resolve({ codename: 'persona-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('author-1', 'persona-1', validPersona);
    await expect(response.json()).resolves.toEqual({
      success: true,
      persona: { codename: 'persona-1', ...validPersona },
    });
  });

  it('returns 404 when updating a missing or cross-author persona', async () => {
    updateMock.mockResolvedValue(null);

    const response = (await PATCH({ json: async () => validPersona } as unknown as NextRequest, {
      params: Promise.resolve({ codename: 'persona-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Writing persona not found' });
  });

  it('deletes an owned persona', async () => {
    deleteMock.mockResolvedValue({ codename: 'persona-1' });

    const response = (await DELETE({} as NextRequest, {
      params: Promise.resolve({ codename: 'persona-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith('author-1', 'persona-1');
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('returns 401 when deleting without authentication', async () => {
    getCurrentAuthorMock.mockResolvedValue(null);

    const response = (await DELETE({} as NextRequest, {
      params: Promise.resolve({ codename: 'persona-1' }),
    })) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(401);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
