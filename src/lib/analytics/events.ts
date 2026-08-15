export const GA4_EVENT_NAMES = [
  'page_view',
  'sign_up_started',
  'sign_up',
  'login',
  'landing_cta_click',
  'landing_page_view',
  'landing_section_view',
  'supportive_story_page_view',
  'challenge_selected',
  'sample_chapter_open',
  'sample_book_open',
  'sample_audio_start',
  'sample_audio_complete',
  'story_creation_started',
  'story_step_viewed',
  'story_step_completed',
  'story_generation_attempted',
  'story_generation_requested',
  'story_generation_completed',
  'story_generation_failed',
  'self_print_requested',
  'self_print_completed',
  'self_print_failed',
  'audiobook_generation_requested',
  'audiobook_generation_completed',
  'audiobook_generation_failed',
  'print_order_requested',
  'view_item_list',
  'select_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'purchase',
  'refund',
  'share',
  'earn_virtual_currency',
  'audiobook_interaction',
  'paid_action',
] as const;

export type GA4EventName = (typeof GA4_EVENT_NAMES)[number];

const EVENT_NAMES = new Set<string>(GA4_EVENT_NAMES);
const BLOCKED_PARAM_NAMES = new Set([
  'email',
  'email_address',
  'phone',
  'phone_number',
  'name',
  'story_content',
  'chapter_content',
  'plot_description',
  'prompt',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'gclsrc',
  '_gl',
]);
const PARAM_NAME = /^[a-z][a-z0-9_]{0,39}$/;

export function isGA4EventName(value: string): value is GA4EventName {
  return EVENT_NAMES.has(value);
}

export function sanitizeAnalyticsEventParams(
  eventName: string,
  params: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!isGA4EventName(eventName)) return null;
  const safe = Object.fromEntries(
    Object.entries(params).filter(
      ([key]) => PARAM_NAME.test(key) && !BLOCKED_PARAM_NAMES.has(key.toLowerCase()),
    ),
  );

  if ((eventName === 'sign_up' || eventName === 'login') && !hasString(safe.method)) return null;
  if (eventName === 'begin_checkout' && !hasCommerceContext(safe)) return null;
  if (eventName === 'purchase' && (!hasCommerceContext(safe) || !hasString(safe.transaction_id))) {
    return null;
  }
  if (hasString(safe.landing_slug) && safe.landing_slug.includes('/')) return null;
  if (hasString(safe.landing_path) && !safe.landing_path.startsWith('/')) return null;
  return safe;
}

function hasString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCommerceContext(params: Record<string, unknown>): boolean {
  return (
    hasString(params.currency) &&
    typeof params.value === 'number' &&
    Number.isFinite(params.value) &&
    params.value >= 0 &&
    Array.isArray(params.items) &&
    params.items.length > 0
  );
}
