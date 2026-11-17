/**
 * Browser side of the OpenAI (ChatGPT Ads) Measurement Pixel.
 *
 * Client-safe: never import `./hashing.server` from here. The pixel only loads and sends events
 * when `NEXT_PUBLIC_OPENAI_PIXEL_ID` is set and the visitor granted Advertising consent.
 */
import { SUPPORTED_LOCALES } from '@/config/locales';
import { getStoredConsent } from '@/lib/consent';
import {
  OPENAI_CUSTOM_EVENT_TYPE,
  validateConversion,
  type OpenAiContentItem,
  type OpenAiConversion,
} from './events';

export const OAIQ_LOADED_EVENT = 'mythoria:oaiq-loaded';
export const OAIQ_SCRIPT_SRC = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
const OAIQ_SCRIPT_ID = 'openai-ads-pixel';

/** Content fields the Pixel accepts (`group_id` / `variant_dict` are Conversions API only). */
const PIXEL_CONTENT_FIELDS = [
  'id',
  'name',
  'content_type',
  'quantity',
  'amount',
  'currency',
] as const;

export interface OpenAiPixelUser {
  email_sha256?: string;
  phone_number_sha256?: string;
  external_id_sha256?: string;
  first_name_sha256?: string;
  last_name_sha256?: string;
  country?: string;
  city?: string;
  region?: string;
  postal_code?: string;
}

let bootstrapped = false;
let consentGranted = false;

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/** Build-time inlined Pixel id; `undefined` disables the Pixel entirely. */
export function getOpenAiPixelId(): string | undefined {
  const pixelId = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID?.trim();
  return pixelId ? pixelId : undefined;
}

export function isOpenAiPixelDebug(): boolean {
  return process.env.NEXT_PUBLIC_OPENAI_PIXEL_DEBUG === 'true';
}

/** Advertising consent as stored in the `mythoria_consent` cookie. */
export function hasAdvertisingConsent(): boolean {
  return getStoredConsent()?.preferences?.advertising === true;
}

export function isOpenAiPixelEnabled(): boolean {
  return typeof window !== 'undefined' && Boolean(getOpenAiPixelId()) && hasAdvertisingConsent();
}

function oaiq(...args: unknown[]): void {
  window.oaiq?.(...args);
}

/** Installs the official queue stub (without the loader's auto-init) when it is missing. */
function installQueueStub(): void {
  if (window.oaiq) return;
  const queue = ((...args: unknown[]) => {
    queue.q?.push(args);
  }) as NonNullable<Window['oaiq']>;
  queue.q = [];
  window.oaiq = queue;
}

function injectScript(): void {
  if (document.getElementById(OAIQ_SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = OAIQ_SCRIPT_ID;
  script.async = true;
  script.src = OAIQ_SCRIPT_SRC;
  script.onload = () => {
    window.__mythoriaOaiqLoaded = true;
    window.dispatchEvent(new Event(OAIQ_LOADED_EVENT));
  };
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
  else document.head.appendChild(script);
}

/**
 * Loads the Pixel once Advertising consent is granted: queue stub, `consent(true)`, `init`, then
 * the SDK script. Idempotent; a later call after a revocation only re-grants consent.
 */
export function loadOpenAiPixel(): boolean {
  const pixelId = getOpenAiPixelId();
  if (!isOpenAiPixelEnabled() || !pixelId) return false;
  try {
    if (!bootstrapped) {
      installQueueStub();
      oaiq('consent', true);
      oaiq('init', { pixelId, ...(isOpenAiPixelDebug() ? { debug: true } : {}) });
      injectScript();
      bootstrapped = true;
      consentGranted = true;
    } else if (!consentGranted) {
      oaiq('consent', true);
      consentGranted = true;
    }
    return true;
  } catch (error) {
    if (isDev()) console.warn('[OpenAIAds] Pixel failed to load', error);
    return false;
  }
}

/** Tells a loaded Pixel that Advertising consent was withdrawn (it then drops its cookies). */
export function revokeOpenAiPixelConsent(): void {
  if (typeof window === 'undefined' || !window.oaiq) return;
  try {
    oaiq('consent', false);
  } catch {
    // Never break the consent flow on a third-party failure.
  }
  consentGranted = false;
}

/** Re-runs `init` with hashed user identifiers for better matching (supported by the SDK). */
export function identifyOpenAiPixelUser(user: OpenAiPixelUser): void {
  const pixelId = getOpenAiPixelId();
  if (!pixelId || !loadOpenAiPixel()) return;
  try {
    oaiq('init', { pixelId, ...(isOpenAiPixelDebug() ? { debug: true } : {}), user });
  } catch {
    // Matching is best effort.
  }
}

/** `/s/<share token>` and `/survey/<invitation token>` paths carry a bearer credential. */
export function isCredentialPath(pathname: string | null | undefined): boolean {
  const segments = (pathname ?? '').split(/[?#]/)[0].split('/').filter(Boolean);
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) segments.shift();
  if (segments.length < 2) return false;
  return segments[0] === 's' || (segments[0] === 'survey' && segments[1] !== 'reward');
}

/**
 * True when the SDK would leak a credential: it sends `origin + pathname` of the current page
 * (`source_url`) and of `document.referrer` (`referrer_url`) with every `measure` call.
 */
function pageCarriesCredentialUrl(): boolean {
  if (isCredentialPath(window.location.pathname)) return true;
  if (!document.referrer) return false;
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin && isCredentialPath(referrer.pathname);
  } catch {
    return false;
  }
}

function toPixelContents(contents: OpenAiContentItem[]): Record<string, unknown>[] {
  return contents.map((item) =>
    Object.fromEntries(
      PIXEL_CONTENT_FIELDS.flatMap((field) =>
        item[field] === undefined ? [] : [[field, item[field]]],
      ),
    ),
  );
}

/**
 * Sends one conversion through the Pixel with the shared `event_id`, so OpenAI can deduplicate it
 * against the Conversions API copy. No-op without the Pixel id or Advertising consent; never throws.
 */
export function trackOpenAiAdsEvent(conversion: OpenAiConversion): void {
  try {
    if (!isOpenAiPixelEnabled()) return;
    // The SDK attaches the page URL and referrer path to every event on its own.
    if (pageCarriesCredentialUrl()) return;

    const errors = validateConversion(conversion);
    if (errors.length > 0) {
      if (isDev()) console.warn('[OpenAIAds] Dropped invalid conversion', conversion, errors);
      return;
    }
    if (!loadOpenAiPixel()) return;

    const { contents, ...rest } = conversion.data as typeof conversion.data & {
      contents?: OpenAiContentItem[];
    };
    const data = contents ? { ...rest, contents: toPixelContents(contents) } : rest;
    const isCustom = conversion.eventType === OPENAI_CUSTOM_EVENT_TYPE;

    oaiq('measure', conversion.eventType, data, {
      event_id: conversion.eventId,
      ...(isCustom ? { custom_event_name: conversion.customEventName } : {}),
    });
  } catch (error) {
    if (isDev()) console.warn('[OpenAIAds] Failed to send conversion', error);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_TOKEN_PATTERN = /^[0-9a-f]{16,}$/i;
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,}$/;
/** Readable kebab-case slugs (`how-to-write-a-bedtime-story`) are public and kept. */
const READABLE_SLUG_PATTERN = /^[a-z]+(?:-[a-z0-9]{1,15})+$/;
const LONG_NUMBER_PATTERN = /^\d{6,}$/;
/** Segments after these prefixes are private (share tokens) or user-derived (story slugs). */
const REDACTED_SEGMENT_AFTER: Record<string, string> = { s: ':token', p: ':slug' };

function redactSegment(segment: string): string {
  if (UUID_PATTERN.test(segment) || LONG_NUMBER_PATTERN.test(segment)) return ':id';
  if (HEX_TOKEN_PATTERN.test(segment)) return ':token';
  if (
    OPAQUE_TOKEN_PATTERN.test(segment) &&
    (segment.length >= 32 || /\d/.test(segment) || /[A-Z_]/.test(segment)) &&
    !READABLE_SLUG_PATTERN.test(segment)
  ) {
    return ':token';
  }
  return segment;
}

/**
 * Locale-free route template for `page_viewed`: ids, share tokens, survey tokens and story slugs
 * are replaced so no private identifier reaches OpenAI. `/pt-PT/s/<token>` -> `/s/:token`.
 */
export function openAiRouteTemplate(pathname: string | null | undefined): string {
  const path = (pathname ?? '').split(/[?#]/)[0] ?? '';
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) segments.shift();

  const template: string[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const previous = segments[index - 1];
    if (index === 1 && previous === 's') {
      // `/s/[...rest]`: every remaining segment belongs to the share token route.
      template.push(REDACTED_SEGMENT_AFTER.s);
      break;
    }
    if (index === 1 && previous && REDACTED_SEGMENT_AFTER[previous]) {
      template.push(REDACTED_SEGMENT_AFTER[previous]);
      continue;
    }
    if (previous === 'survey' && segment !== 'reward') {
      template.push(':token');
      continue;
    }
    if (previous === 'reward' && segments[index - 2] === 'survey') {
      template.push(':id');
      continue;
    }
    template.push(redactSegment(segment));
  }
  return template.length > 0 ? `/${template.join('/')}` : '/';
}

/** Test-only: resets module state between tests. */
export function __resetOpenAiPixelForTests(): void {
  bootstrapped = false;
  consentGranted = false;
}
