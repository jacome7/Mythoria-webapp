import type { StoryIntent } from '@/constants/intents';

interface BuildHeroCtaHrefInput {
  locale: string;
  intent: StoryIntent;
  isSignedIn: boolean;
}

/**
 * Keep the intent in the registration return URL so a new account opens the
 * story-creation journey it started from. Existing users can start that same
 * journey immediately.
 */
export function buildHeroCtaHref({ locale, intent, isSignedIn }: BuildHeroCtaHrefInput): string {
  const storyPath = `/${locale}/tell-your-story/step-1?primaryIntent=${encodeURIComponent(intent)}`;

  if (isSignedIn) return storyPath;

  return `/${locale}/sign-up?redirect=${encodeURIComponent(storyPath)}`;
}
