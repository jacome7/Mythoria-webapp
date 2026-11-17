import { renderHook, waitFor } from '@testing-library/react';
import { useScreenAwake } from './useScreenAwake';

describe('biographer screen wake lock', () => {
  let release: jest.Mock;
  let request: jest.Mock;
  beforeEach(() => {
    release = jest.fn().mockResolvedValue(undefined);
    request = jest.fn().mockResolvedValue({ release, addEventListener: jest.fn() });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });
  it('requests a foreground screen lock and releases it when the interview pauses', async () => {
    const { result, rerender } = renderHook(({ active }) => useScreenAwake(active, true), {
      initialProps: { active: true },
    });
    await waitFor(() => expect(result.current).toBe(true));
    expect(request).toHaveBeenCalledWith('screen');
    rerender({ active: false });
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
    expect(result.current).toBe(false);
  });
  it('does not request a lock when disabled or hidden', () => {
    const { unmount } = renderHook(() => useScreenAwake(true, false));
    expect(request).not.toHaveBeenCalled();
    unmount();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    renderHook(() => useScreenAwake(true, true));
    expect(request).not.toHaveBeenCalled();
  });
  it('handles power-saving denial without breaking the interview', async () => {
    request.mockRejectedValue(new Error('NotAllowedError'));
    const { result } = renderHook(() => useScreenAwake(true, true));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
