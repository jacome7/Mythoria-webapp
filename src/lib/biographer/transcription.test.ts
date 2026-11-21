/** @jest-environment node */
const select = jest.fn();
const transaction = jest.fn();
jest.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => select(...args),
    transaction: (...args: unknown[]) => transaction(...args),
  },
}));
jest.mock('next/server', () => ({ after: jest.fn() }));
jest.mock('@/db/services/biographer', () => ({
  BiographerError: class extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  },
  ownedProject: jest.fn(),
}));
jest.mock('@/lib/biographer/storage', () => ({ readSegment: jest.fn() }));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));
import { validateRecoverySegments, recoverTranscription } from './transcription';
import { ownedProject } from '@/db/services/biographer';
import { readSegment } from '@/lib/biographer/storage';
import { sgwFetch } from '@/lib/sgw-client';
describe('recovery audio validation', () => {
  const segment = { sequence: 0, contentType: 'audio/pcm;rate=16000', bytes: 32000 };
  it('accepts ordered PCM and rejects missing, reordered, or partial samples', () => {
    expect(() => validateRecoverySegments([segment, { ...segment, sequence: 1 }])).not.toThrow();
    for (const segments of [
      [],
      [{ ...segment, sequence: 1 }],
      [segment, { ...segment, sequence: 2 }],
      [{ ...segment, bytes: 31 }],
      [{ ...segment, contentType: 'audio/webm' }],
    ]) {
      expect(() => validateRecoverySegments(segments)).toThrow('incomplete or unsupported');
    }
  });
  it('bounds total work before downloading or invoking the model', () => {
    expect(() => validateRecoverySegments([{ ...segment, bytes: 34 * 1024 * 1024 }])).toThrow(
      'too long',
    );
  });
});

describe('guest recovery access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ownedProject as jest.Mock).mockResolvedValue({ locale: 'en-US' });
  });
  it('rejects closed guests before downloading audio or calling the model', async () => {
    select.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ status: 'closed' }]) }),
    });
    await expect(
      recoverTranscription('author', 'project', 'turn', {
        participantId: 'participant',
        accessVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 423 });
    expect(readSegment).not.toHaveBeenCalled();
    expect(sgwFetch).not.toHaveBeenCalled();
  });
});

describe('Whisperer recovery', () => {
  it.each([
    { text: 'Partial speech', final: false, interrupted: false },
    { text: 'Interrupted speech', final: true, interrupted: true },
  ])('recovers an unfinished capture with an existing transcript: %j', async (partial) => {
    const turn = { ...partial, id: 'turn', revision: 0 };
    const segment = { id: 'segment', sequence: 0, contentType: 'audio/pcm;rate=16000', bytes: 2 };
    const recovered = {
      ...turn,
      text: 'Recovered speech',
      final: true,
      interrupted: false,
      revision: 1,
    };
    const updated = jest.fn().mockReturnValue({
      where: () => ({ returning: async () => [recovered] }),
    });
    const query = (result: unknown[]) => ({
      from: () => ({
        where: () => Object.assign(Promise.resolve(result), { orderBy: async () => result }),
      }),
    });

    (ownedProject as jest.Mock).mockResolvedValue({ locale: 'en-US' });
    select.mockReturnValueOnce(query([turn])).mockReturnValueOnce(query([segment]));
    (readSegment as jest.Mock).mockResolvedValue({ bytes: Buffer.from([0, 0]) });
    (sgwFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Recovered speech' }),
    });
    transaction.mockImplementationOnce((run) =>
      run({
        execute: jest.fn(),
        select: jest
          .fn()
          .mockReturnValueOnce(query([{ status: 'draft' }]))
          .mockReturnValueOnce(query([turn]))
          .mockReturnValueOnce(query([segment])),
        update: jest
          .fn()
          .mockReturnValueOnce({ set: updated })
          .mockReturnValueOnce({ set: () => ({ where: jest.fn() }) }),
      }),
    );

    await expect(recoverTranscription('author', 'project', 'turn')).resolves.toEqual({
      turn: recovered,
    });
    expect(updated).toHaveBeenCalledWith(
      expect.objectContaining({
        final: true,
        interrupted: false,
        revision: expect.anything(),
        text: 'Recovered speech',
      }),
    );
  });
});
