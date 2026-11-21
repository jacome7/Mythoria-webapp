import { act, renderHook, waitFor } from '@testing-library/react';
import { useBiographerDictation } from './useBiographerDictation';
import { clearPending, pendingSegments, removePending } from '@/utils/biographer/pending';

jest.mock('@/utils/biographer/pending', () => ({
  clearPending: jest.fn(),
  pendingSegments: jest.fn(),
  removePending: jest.fn(),
  savePending: jest.fn(),
  isPendingAudioExpired: jest.fn(() => false),
}));

describe('Story Whisperer dictation recovery', () => {
  const fetchBefore = global.fetch;
  const capturedAt = '2026-11-20T15:06:00.000Z';
  const segment = { id: 'take', data: new Uint8Array([1, 2]).buffer, capturedAt };

  beforeEach(() => {
    jest.clearAllMocks();
    (pendingSegments as jest.Mock).mockResolvedValue([segment]);
  });

  afterEach(() => {
    global.fetch = fetchBefore;
  });

  it('returns editable draft text and does not send a conversation turn', async () => {
    const writeDraft = jest.fn().mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: ' My editable recording. ' }),
    });
    const { result } = renderHook(() =>
      useBiographerDictation('wizard-draft', 'project', 'author', writeDraft),
    );
    await waitFor(() => expect(result.current.hasPending).toBe(true));
    await act(async () => result.current.retry());
    expect(writeDraft).toHaveBeenCalledWith('My editable recording.', 'take');
    expect(removePending).toHaveBeenCalledWith('take');
    expect(result.current.hasPending).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/story-whisperer/wizard-draft/dictation',
      expect.objectContaining({
        body: JSON.stringify({
          contentType: 'audio/pcm;rate=16000',
          data: 'AQI=',
          capturedAt,
        }),
      }),
    );
  });

  it('keeps recoverable audio after a failed transcription and clears it on discard', async () => {
    const writeDraft = jest.fn().mockResolvedValue(undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
    const { result } = renderHook(() =>
      useBiographerDictation('wizard-draft', 'project', 'author', writeDraft),
    );
    await waitFor(() => expect(result.current.hasPending).toBe(true));
    await act(async () => result.current.retry());
    expect(result.current.error).toBe(true);
    expect(result.current.hasPending).toBe(true);
    expect(writeDraft).not.toHaveBeenCalled();
    expect(removePending).not.toHaveBeenCalled();
    await act(async () => result.current.cancel());
    expect(clearPending).toHaveBeenCalledWith('author', 'project', 'dictation');
    expect(result.current.hasPending).toBe(false);
  });
  it('retains the recording until the editable draft commit and retries with the same receipt', async () => {
    const writeDraft = jest.fn().mockRejectedValueOnce(new Error('Draft storage unavailable'));
    let commit!: () => void;
    writeDraft.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve;
        }),
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Recover me' }),
    });
    const { result } = renderHook(() =>
      useBiographerDictation('wizard-draft', 'project', 'author', writeDraft),
    );
    await waitFor(() => expect(result.current.hasPending).toBe(true));
    await act(async () => result.current.retry());
    expect(result.current.error).toBe(true);
    expect(result.current.hasPending).toBe(true);
    expect(removePending).not.toHaveBeenCalled();

    act(() => {
      void result.current.retry();
    });
    await waitFor(() => expect(writeDraft).toHaveBeenCalledTimes(2));
    expect(writeDraft.mock.calls).toEqual([
      ['Recover me', 'take'],
      ['Recover me', 'take'],
    ]);
    expect(removePending).not.toHaveBeenCalled();
    await act(async () => commit());
    expect(removePending).toHaveBeenCalledTimes(1);
    expect(result.current.hasPending).toBe(false);
  });
});
