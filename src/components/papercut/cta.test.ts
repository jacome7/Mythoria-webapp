import { buildHeroCtaHref } from './cta';

describe('buildHeroCtaHref', () => {
  it.each(['romance', 'grandparents', 'sports_teams', 'kids_adventures'] as const)(
    'sends signed-out %s visitors to sign-up and preserves their story intent',
    (intent) => {
      expect(buildHeroCtaHref({ locale: 'pt-PT', intent, isSignedIn: false })).toBe(
        `/pt-PT/sign-up?redirect=${encodeURIComponent(
          `/pt-PT/tell-your-story/step-1?primaryIntent=${intent}`,
        )}`,
      );
    },
  );

  it('sends signed-in visitors directly to the matching story-creation flow', () => {
    expect(buildHeroCtaHref({ locale: 'pt-PT', intent: 'romance', isSignedIn: true })).toBe(
      '/pt-PT/tell-your-story/step-1?primaryIntent=romance',
    );
  });
});
