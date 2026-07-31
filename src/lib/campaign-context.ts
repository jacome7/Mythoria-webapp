import { isValidIntent, normalizeIntent, type StoryIntent } from '@/constants/intents';
import { isValidRecipient } from '@/constants/recipients';
import type { IntentContext } from '@/types/intent-context';

export const CAMPAIGN_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_id',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'gclsrc',
  '_gl',
] as const;

export const PUBLIC_REDIRECT_QUERY_KEYS = [...CAMPAIGN_QUERY_KEYS, 'ref'] as const;

export type CampaignQueryKey = (typeof CAMPAIGN_QUERY_KEYS)[number];
export type CampaignParams = Partial<Record<CampaignQueryKey, string>>;
export type CampaignSearchParams =
  { get(name: string): string | null } | Record<string, string | string[] | undefined>;

const MAX_QUERY_VALUE_LENGTH = 255;

export function getFirstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getValidatedIntent(value: unknown): StoryIntent | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeIntent(value.trim());
  return isValidIntent(normalized) ? normalized : null;
}

export function parseIntentContext(value: string | undefined | null): IntentContext | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<string, unknown>;
    const intent = getValidatedIntent(parsed.intent);
    const recipient =
      typeof parsed.recipient === 'string' && isValidRecipient(parsed.recipient)
        ? parsed.recipient
        : undefined;

    if (!intent && !recipient) return null;
    return {
      ...(intent ? { intent } : {}),
      ...(recipient ? { recipient } : {}),
    };
  } catch {
    return null;
  }
}

export function serializeIntentContext(context: IntentContext): string {
  return JSON.stringify(context);
}

export function readIntentContextFromDocumentCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): IntentContext | null {
  if (!cookieHeader) return null;
  const prefix = `${cookieName}=`;
  const entry = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));
  return entry ? parseIntentContext(entry.slice(prefix.length)) : null;
}

function readSearchParam(searchParams: CampaignSearchParams, key: string): string | undefined {
  return 'get' in searchParams && typeof searchParams.get === 'function'
    ? (searchParams.get(key) ?? undefined)
    : getFirstQueryValue((searchParams as Record<string, string | string[] | undefined>)[key]);
}

export function collectCampaignParams(searchParams: CampaignSearchParams): CampaignParams {
  return Object.fromEntries(
    CAMPAIGN_QUERY_KEYS.flatMap((key) => {
      const value = readSearchParam(searchParams, key)?.trim();
      return value && value.length <= MAX_QUERY_VALUE_LENGTH ? [[key, value]] : [];
    }),
  ) as CampaignParams;
}

export function buildPublicRedirectSearch(
  searchParams: CampaignSearchParams,
  intent?: StoryIntent | null,
): URLSearchParams {
  const safe = new URLSearchParams();

  for (const key of PUBLIC_REDIRECT_QUERY_KEYS) {
    const value = readSearchParam(searchParams, key)?.trim();
    if (value && value.length <= MAX_QUERY_VALUE_LENGTH) safe.set(key, value);
  }

  const validatedIntent = intent ?? getValidatedIntent(readSearchParam(searchParams, 'intent'));
  if (validatedIntent) safe.set('intent', validatedIntent);

  return safe;
}

export function buildStoryAuthReturnSearch(searchParams: CampaignSearchParams): URLSearchParams {
  const safe = new URLSearchParams();

  for (const key of ['landingSlug', 'ref', ...CAMPAIGN_QUERY_KEYS]) {
    const value = readSearchParam(searchParams, key)?.trim();
    if (value && value.length <= MAX_QUERY_VALUE_LENGTH) safe.set(key, value);
  }

  const primaryIntent = getValidatedIntent(readSearchParam(searchParams, 'primaryIntent'));
  if (primaryIntent) safe.set('primaryIntent', primaryIntent);

  return safe;
}
