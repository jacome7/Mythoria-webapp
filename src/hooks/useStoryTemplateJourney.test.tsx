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
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

describe('useStoryTemplateJourney', () => {
  const photo = {
    id: 'e9428e21-4f9c-4d3e-8c3b-e49f9a528c21',
    status: 'done' as const,
    objectPath: 'author-one/inputs/protagonist.jpg',
    publicUrl: 'https://example.test/author-one/inputs/protagonist.jpg',
    sourceCharacterIndex: 1,
  };
  const journeyWithPhoto = () => ({
    ...createTemplateJourney(getStoryTemplate('pet-mission', 'pt-PT')),
    answers: [
      {
        questionId: 'hero',
        question: 'Quem é o protagonista?',
        answer: 'O meu cão',
        photo: { ...photo },
        isAuthorContribution: true,
      },
    ],
  });

  it.each([undefined, false])(
    'keeps staged photo paths and previews when relocation is unconfirmed (%s)',
    (completed) => {
      const journey = journeyWithPhoto();
      sessionStorage.setItem(
        TEMPLATE_SESSION_KEY,
        JSON.stringify({ owner: 'author-one', journey }),
      );
      localStorage.setItem(
        'step2RelocatedInputs',
        JSON.stringify({
          storyId: 'story-id',
          paths: [photo.objectPath],
          ...(completed !== undefined ? { completed } : {}),
        }),
      );
      const { result } = renderHook(() => useStoryTemplateJourney('author-one'));
      expect(result.current.journey?.answers[0].photo).toEqual(photo);
    },
  );

  it('remaps only a confirmed completed photo preview while preserving the original retry source', () => {
    const journey = journeyWithPhoto();
    sessionStorage.setItem(TEMPLATE_SESSION_KEY, JSON.stringify({ owner: 'author-one', journey }));
    localStorage.setItem(
      'step2RelocatedInputs',
      JSON.stringify({
        storyId: 'story-id',
        paths: [photo.objectPath],
        completed: true,
      }),
    );
    const { result } = renderHook(() => useStoryTemplateJourney('author-one'));
    expect(result.current.journey?.answers[0].photo).toEqual({
      ...photo,
      publicUrl: 'https://example.test/story-id/inputs/protagonist.jpg',
    });
    act(() => result.current.save(result.current.journey));
    const persisted = JSON.parse(sessionStorage.getItem(TEMPLATE_SESSION_KEY)!);
    expect(persisted.journey.answers[0].photo.objectPath).toBe(photo.objectPath);
    expect(persisted.journey.answers[0].photo.sourceCharacterIndex).toBe(1);
  });

  it('does not remap an unrelated photo or expose a prior author photo after account change', () => {
    const journey = journeyWithPhoto();
    sessionStorage.setItem(TEMPLATE_SESSION_KEY, JSON.stringify({ owner: 'author-one', journey }));
    localStorage.setItem(
      'step2RelocatedInputs',
      JSON.stringify({
        storyId: 'story-id',
        paths: ['author-one/inputs/unrelated.jpg'],
        completed: true,
      }),
    );
    const { result, rerender } = renderHook(({ owner }) => useStoryTemplateJourney(owner), {
      initialProps: { owner: 'author-one' },
    });
    expect(result.current.journey?.answers[0].photo).toEqual(photo);
    rerender({ owner: 'author-two' });
    expect(result.current.journey).toBeNull();
    expect(result.current.latest.current).toBeNull();
  });

  it.each(['uploading', 'analyzing'] as const)(
    'restores interrupted %s photos as recoverable drafts',
    (status) => {
      const journey = {
        ...journeyWithPhoto(),
        answerDraft: {
          questionId: 'pending',
          text: 'Keep this draft',
          photo: { ...photo, status },
        },
      };
      sessionStorage.setItem(
        TEMPLATE_SESSION_KEY,
        JSON.stringify({ owner: 'author-one', journey }),
      );
      const { result } = renderHook(() => useStoryTemplateJourney('author-one'));
      expect(result.current.journey?.answerDraft).toEqual({
        ...journey.answerDraft,
        photo: { ...photo, status: 'error' },
      });
      expect(result.current.journey?.answers).toEqual(journey.answers);
    },
  );

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
