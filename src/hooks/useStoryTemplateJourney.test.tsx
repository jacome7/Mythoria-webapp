import { act, renderHook } from '@testing-library/react';
import { getStoryTemplate } from '@/lib/story-templates/catalog';
import { createTemplateJourney } from '@/lib/story-templates/journey';
import { TEMPLATE_SESSION_KEY, useStoryTemplateJourney } from './useStoryTemplateJourney';

beforeAll(() => {
  if (!crypto.randomUUID)
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: () => '00000000-0000-4000-8000-000000000001',
    });
});
beforeEach(() => sessionStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe('useStoryTemplateJourney', () => {
  it('restores only a valid journey belonging to the signed-in author', () => {
    const journey = createTemplateJourney(getStoryTemplate('pet-mission', 'en-US'));
    sessionStorage.setItem(TEMPLATE_SESSION_KEY, JSON.stringify({ owner: 'author-one', journey }));
    const { result, rerender } = renderHook(({ owner }) => useStoryTemplateJourney(owner), {
      initialProps: { owner: 'author-one' },
    });
    expect(result.current.ready).toBe(true);
    expect(result.current.journey).toEqual(journey);
    rerender({ owner: 'author-two' });
    expect(result.current.journey).toBeNull();
    expect(result.current.latest.current).toBeNull();
  });

  it('clears the in-memory journey when the author signs out', () => {
    const journey = createTemplateJourney(getStoryTemplate('pet-mission', 'en-US'));
    const { result, rerender } = renderHook(
      ({ owner }: { owner: string | null }) => useStoryTemplateJourney(owner),
      {
        initialProps: { owner: 'author-one' as string | null },
      },
    );
    act(() => result.current.save(journey));
    rerender({ owner: null });
    expect(result.current.journey).toBeNull();
    expect(result.current.latest.current).toBeNull();
    expect(result.current.ready).toBe(false);
  });

  it.each(['not-json', JSON.stringify({ owner: 'author-one', journey: { version: 999 } })])(
    'recovers cleanly from damaged or incompatible storage',
    (raw) => {
      sessionStorage.setItem(TEMPLATE_SESSION_KEY, raw);
      const { result } = renderHook(() => useStoryTemplateJourney('author-one'));
      expect(result.current.ready).toBe(true);
      expect(result.current.journey).toBeNull();
    },
  );

  it('keeps current inputs usable when browser storage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    const { result } = renderHook(() => useStoryTemplateJourney('author-one'));
    const journey = createTemplateJourney(getStoryTemplate('pet-mission', 'en-US'));
    act(() => result.current.save(journey));
    expect(result.current.journey).toEqual(journey);
    expect(result.current.latest.current).toEqual(journey);
  });

  it('persists current accepted state and removes it for a new story', () => {
    const { result } = renderHook(() => useStoryTemplateJourney('author-one'));
    const journey = createTemplateJourney(getStoryTemplate('drawing-adventure', 'en-US'));
    act(() => result.current.save(journey));
    expect(JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!)).toEqual({
      owner: 'author-one',
      journey,
    });
    act(() => result.current.save(null));
    expect(sessionStorage.getItem(TEMPLATE_SESSION_KEY)).toBeNull();
    expect(result.current.journey).toBeNull();
  });
});
