import { isValidIntent, normalizeIntent, type StoryIntent } from '@/constants/intents';
import { getIntentContext } from '@/app/i/actions';
import type { IntentContext } from '@/types/intent-context';
import HomePageClient from './HomePageClient';

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildIntentContext(
  cookieContext: IntentContext | null,
  intentOverride: string | null,
): IntentContext | null {
  if (!intentOverride) return cookieContext;

  if (!isValidIntent(intentOverride)) return null;

  return {
    ...cookieContext,
    intent: intentOverride as StoryIntent,
  };
}

export default async function Home({ searchParams }: HomePageProps) {
  const [params, cookieIntentContext] = await Promise.all([searchParams, getIntentContext()]);
  const rawIntentOverride = firstSearchParam(params.intent);
  const initialHeroIntentOverride = rawIntentOverride ? normalizeIntent(rawIntentOverride) : null;
  const initialIntentContext = buildIntentContext(cookieIntentContext, initialHeroIntentOverride);

  return (
    <HomePageClient
      initialHeroIntentOverride={initialHeroIntentOverride}
      initialIntentContext={initialIntentContext}
      intentOverrideActive={initialHeroIntentOverride !== null}
    />
  );
}
