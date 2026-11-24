import { renderHook } from '@testing-library/react';
import { useStep2Session } from '@/hooks/useStep2Session';
import { canStartMobileIdea, startMobileIdea } from './idea';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
it('restores the submitted idea through the regular wizard in the same tab', () => {
  expect(startMobileIdea(' My tiny story ')).toBe(true);
  expect(renderHook(() => useStep2Session()).result.current.storyText).toBe('My tiny story');
  expect(localStorage.length).toBe(0);
});
it('protects existing and concurrently created drafts', () => {
  expect(canStartMobileIdea()).toBe(true);
  sessionStorage.setItem('storyTemplateJourney', 'already being edited');
  expect(startMobileIdea('different idea')).toBe(false);
  expect(sessionStorage.getItem('step2Data')).toBeNull();
  sessionStorage.clear();
  localStorage.setItem('lastStoryWhispererDraft:owner', 'draft');
  expect(canStartMobileIdea()).toBe(false);
});
