import { act, renderHook } from '@testing-library/react';
import { useStep2Session } from './useStep2Session';
it('clears only step 2 inputs and persists the reset across remounts', () => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('step1Data', 'author-and-dedication');
  sessionStorage.setItem('experimentalStep2Submission', 'pending-retry');
  const { result, unmount } = renderHook(() => useStep2Session());
  act(() => result.current.setStoryText('A story'));
  act(() => result.current.setSelectedCharacterIds(['character']));
  act(() => result.current.resetInputs());
  expect(result.current.storyText).toBe('');
  expect(result.current.selectedCharacterIds).toEqual([]);
  expect(localStorage.getItem('step1Data')).toBe('author-and-dedication');
  expect(sessionStorage.getItem('experimentalStep2Submission')).toBe('pending-retry');
  unmount();
  const restored = renderHook(() => useStep2Session());
  expect(restored.result.current.storyText).toBe('');
});

it('reports storage failure while keeping the text editable', () => {
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable');
  });
  try {
    const { result, unmount } = renderHook(() => useStep2Session());
    act(() => result.current.setStoryText('A história continua'));
    expect(result.current.storyText).toBe('A história continua');
    expect(result.current.saveError).toBe(true);
    unmount();
  } finally {
    spy.mockRestore();
  }
});
