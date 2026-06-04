jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const getCharacterByIdMock = jest.fn();
const updateCharacterPhotoMock = jest.fn();
const sgwFetchMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  getCurrentAuthor: () => getCurrentAuthorMock(),
}));

jest.mock('@/db/services', () => ({
  characterService: {
    getCharacterById: (...args: unknown[]) => getCharacterByIdMock(...args),
    updateCharacterPhoto: (...args: unknown[]) => updateCharacterPhotoMock(...args),
  },
}));

jest.mock('@/lib/sgw-client', () => ({
  sgwFetch: (...args: unknown[]) => sgwFetchMock(...args),
}));

import type { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/media/character-photo', () => {
  const authorId = 'author-1';
  const characterId = 'character-1';
  const oldGcsPath = 'characters/author-1/character-1/old.jpg';
  const newGcsPath = 'author-1/characters/character-1/new.jpg';
  const newPublicUrl = `https://storage.googleapis.com/mythoria-generated-stories/${newGcsPath}`;

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({ authorId });
    getCharacterByIdMock.mockResolvedValue({
      characterId,
      authorId,
      photoUrl: 'https://storage.googleapis.com/mythoria-generated-stories/old.jpg',
      photoGcsUri: oldGcsPath,
    });
  });

  it('uploads and stores the replacement before deleting the previous object', async () => {
    const calls: string[] = [];

    sgwFetchMock.mockImplementation((_path: string, init: { method?: string }) => {
      if (init.method === 'POST') {
        calls.push('upload');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, publicUrl: newPublicUrl, gcsPath: newGcsPath }),
        });
      }

      calls.push('delete');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    });

    updateCharacterPhotoMock.mockImplementation(() => {
      calls.push('db');
      return Promise.resolve({
        characterId,
        authorId,
        photoUrl: newPublicUrl,
        photoGcsUri: newGcsPath,
      });
    });

    const response = (await POST({
      json: async () => ({ characterId, dataUrl: 'data:image/jpeg;base64,abc' }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(calls).toEqual(['upload', 'db', 'delete']);
    expect(updateCharacterPhotoMock).toHaveBeenCalledWith(characterId, newGcsPath, newGcsPath);
    expect(sgwFetchMock).toHaveBeenNthCalledWith(
      2,
      '/ai/media/character-photo',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ gcsPath: oldGcsPath }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      photoUrl: newPublicUrl,
      photoGcsUri: newGcsPath,
      character: {
        characterId,
        authorId,
        photoUrl: newPublicUrl,
        photoGcsUri: newGcsPath,
      },
    });
  });

  it('does not delete the previous object when the replacement upload fails', async () => {
    sgwFetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ success: false, error: 'Upload failed upstream' }),
    });

    const response = (await POST({
      json: async () => ({ characterId, dataUrl: 'data:image/jpeg;base64,abc' }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(502);
    expect(sgwFetchMock).toHaveBeenCalledTimes(1);
    expect(updateCharacterPhotoMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Upload failed upstream',
    });
  });

  it('keeps a successful response when previous object cleanup fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    sgwFetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, publicUrl: newPublicUrl, gcsPath: newGcsPath }),
      })
      .mockRejectedValueOnce(new Error('delete failed'));
    updateCharacterPhotoMock.mockResolvedValue({
      characterId,
      authorId,
      photoUrl: newPublicUrl,
      photoGcsUri: newGcsPath,
    });

    const response = (await POST({
      json: async () => ({ characterId, dataUrl: 'data:image/jpeg;base64,abc' }),
    } as unknown as NextRequest)) as { status: number; json: () => Promise<unknown> };

    expect(response.status).toBe(200);
    expect(updateCharacterPhotoMock).toHaveBeenCalledWith(characterId, newGcsPath, newGcsPath);
    expect(sgwFetchMock).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      photoUrl: newPublicUrl,
      photoGcsUri: newGcsPath,
    });

    warnSpy.mockRestore();
  });
});
