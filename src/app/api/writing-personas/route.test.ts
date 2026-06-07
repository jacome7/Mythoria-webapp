jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const listByAuthorMock = jest.fn();
const countByAuthorMock = jest.fn();
const createMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services/writing-personas', () => ({
  writingPersonaService: {
    listByAuthor: (...args: unknown[]) => listByAuthorMock(...args),
    countByAuthor: (...args: unknown[]) => countByAuthorMock(...args),
    create: (...args: unknown[]) => createMock(...args),
  },
}));

import type { NextRequest } from 'next/server';
import { GET, POST } from './route';

const validPersona = {
  name: 'Cozy narrator',
  pov: '3rd-limited',
  tone: 3,
  formality: 2,
  rhythm: 2,
  vocabulary: 3,
  fictionality: 3,
  dialogueDensity: 3,
  sensoriality: 4,
  subtextIrony: 2,
  techniques: ['show-dont-tell'],
  specialRequirements: 'Keep the voice gentle.',
};

describe('/api/writing-personas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1' });
  });

  it('requires authentication', async () => {
    getCurrentAuthorMock.mockResolvedValue(null);

    const response = (await GET()) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authentication required' });
  });

  it('lists personas for the current author', async () => {
    listByAuthorMock.mockResolvedValue([{ codename: 'persona-1', name: 'Cozy' }]);

    const response = (await GET()) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(listByAuthorMock).toHaveBeenCalledWith('author-1');
    await expect(response.json()).resolves.toEqual({
      success: true,
      personas: [{ codename: 'persona-1', name: 'Cozy' }],
    });
  });

  it('rejects invalid persona data', async () => {
    const response = (await POST({
      json: async () => ({ ...validPersona, tone: 6 }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string; details: unknown[] };
    expect(payload.error).toBe('Invalid writing persona data');
    expect(payload.details.length).toBeGreaterThan(0);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('enforces the three persona limit in the API', async () => {
    countByAuthorMock.mockResolvedValue(3);

    const response = (await POST({
      json: async () => validPersona,
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a valid persona', async () => {
    countByAuthorMock.mockResolvedValue(2);
    createMock.mockResolvedValue({ codename: 'persona-1', ...validPersona });

    const response = (await POST({
      json: async () => validPersona,
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith('author-1', validPersona);
    await expect(response.json()).resolves.toEqual({
      success: true,
      persona: { codename: 'persona-1', ...validPersona },
    });
  });
});
