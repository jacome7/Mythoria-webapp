import { getLandingPageBySlug } from '@/content/landing-pages';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { isValidIntent } from '@/constants/intents';
import { isStoryTemplateId } from '@/lib/story-templates/ids';
import { sanitizeAnalyticsPathname } from './page-context';
import { isStoryShareMethod, isStoryShareScope } from './story-share';

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
  'story_template_selected',
  'story_guide_question',
  'story_guide_answer',
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
  'story_share_open',
  'story_share_qualified_open',
  'creation_outline_accepted',
  'creation_input_retained',
  'earn_virtual_currency',
  'audiobook_interaction',
  'paid_action',
  'survey_opened',
  'survey_started',
  'survey_question_answered',
  'survey_submitted',
  'survey_reward_selected',
  'survey_reward_redeemed',
  'survey_reward_failed',
] as const;

export type GA4EventName = (typeof GA4_EVENT_NAMES)[number];

const EVENT_NAMES = new Set<string>(GA4_EVENT_NAMES);
type Validator = (value: unknown) => boolean;

const oneOf =
  (...allowed: string[]): Validator =>
  (value) =>
    typeof value === 'string' && allowed.includes(value);
const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;
const flag: Validator = (value) => typeof value === 'boolean';
const stepNumber: Validator = (value) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
const reference: Validator = (value) =>
  typeof value === 'string' && /^(?:[a-f0-9]{12}|[a-f0-9]{32})$/.test(value);
const transaction: Validator = (value) =>
  typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const landingSlug: Validator = (value) =>
  typeof value === 'string' && Boolean(getLandingPageBySlug(value));
const locale: Validator = (value) => typeof value === 'string' && SUPPORTED_LOCALES.includes(value);
const pathname: Validator = (value) =>
  typeof value === 'string' && sanitizeAnalyticsPathname(value) === value;

const common = { primary_intent: isValidIntent };
const step = { step_number: stepNumber };
const template = { template_id: isStoryTemplateId };
const landing = {
  landing_slug: landingSlug,
  locale,
  variant: oneOf('default', 'control', 'treatment'),
};
const share = {
  content_type: oneOf('story'),
  item_id: reference,
  story_share_method: isStoryShareMethod,
  story_share_scope: isStoryShareScope,
  story_share_item_id: reference,
};
const assist = {
  story_share_method: isStoryShareMethod,
  story_share_scope: isStoryShareScope,
  story_share_item_id: reference,
  story_share_attribution: oneOf('within_30d'),
};
const identityFreeRun = {
  item_id: reference,
  run_ref: reference,
  workflow_ref: reference,
  print_request_ref: reference,
  landing_slug: landingSlug,
  credits_spent: nonnegative,
  duration_seconds: nonnegative,
  action_type: oneOf(
    'ebook',
    'audiobook',
    'print',
    'self_print',
    'ai_edit',
    'audiobook_generation',
  ),
  failure_code: oneOf(
    'auth_error',
    'chapter_persistence_race',
    'delivery_failed',
    'incomplete_output',
    'invalid_input',
    'pdf_generation_failed',
    'provider_error',
    'qa_failed',
    'quota_exhausted',
    'rate_limited',
    'safety_blocked',
    'storage_failed',
    'timeout',
    'unknown_failure',
  ),
  failure_stage: oneOf(
    'outline',
    'writing',
    'illustration',
    'audio',
    'print',
    'delivery',
    'unknown',
  ),
  ...assist,
};
const commerceItem = {
  item_id: (value: unknown) =>
    typeof value === 'string' && /^credit_package_[a-zA-Z0-9_-]{1,40}$/.test(value),
  item_brand: oneOf('Mythoria'),
  item_category: oneOf('Credits'),
  price: nonnegative,
  quantity: nonnegative,
  discount: nonnegative,
};
const commerce = {
  currency: oneOf('EUR', 'USD', 'GBP', 'CAD', 'AUD', 'BRL', 'CHF'),
  value: nonnegative,
  credits_purchased: nonnegative,
};
const method = oneOf(
  'email',
  'apple',
  'facebook',
  'github',
  'google',
  'microsoft',
  'social',
  'lead_session',
  'unknown',
);
const sample = { ...landing };
const schemaVersion: Validator = (value) => value === 2 || value === '2';
const reward = { reward_type: oneOf('audiobook', 'self_print', 'audiobook_generation') };
const events: Record<GA4EventName, Record<string, Validator>> = {
  page_view: {},
  sign_up_started: { method },
  sign_up: { method, landing_path: pathname, landing_slug: landingSlug, ...assist },
  login: { method },
  landing_cta_click: {
    ...landing,
    cta_destination: pathname,
    cta_placement: oneOf(
      'hero',
      'hero_primary',
      'hero_secondary',
      'final_primary',
      'pricing_transparency',
      'professional_panel',
      'challenge_card',
      'unknown',
    ),
  },
  landing_page_view: landing,
  landing_section_view: { ...landing, section_position: nonnegative },
  supportive_story_page_view: landing,
  challenge_selected: landing,
  sample_chapter_open: sample,
  sample_book_open: sample,
  sample_audio_start: sample,
  sample_audio_complete: sample,
  story_creation_started: { ...step, user_profile_exists: flag },
  story_step_viewed: { ...step, edit_mode: flag },
  story_step_completed: {
    ...step,
    ...template,
    edit_mode: flag,
    profile_updated: flag,
    custom_author_provided: flag,
    dedication_provided: flag,
    character_count: nonnegative,
    title_provided: flag,
    place_provided: flag,
    content_type: oneOf('template', 'image', 'audio', 'text', 'document'),
  },
  story_template_selected: { ...template, template_mode: oneOf('memory', 'fiction') },
  story_guide_question: {
    ...template,
    question_depth: nonnegative,
    guide_source: oneOf('fallback', 'ai'),
    latency_ms: nonnegative,
  },
  story_guide_answer: { ...template, question_depth: nonnegative, skipped: flag },
  story_generation_attempted: { ...step, credits_spent: nonnegative },
  story_generation_requested: identityFreeRun,
  story_generation_completed: identityFreeRun,
  story_generation_failed: identityFreeRun,
  self_print_requested: identityFreeRun,
  self_print_completed: identityFreeRun,
  self_print_failed: identityFreeRun,
  audiobook_generation_requested: identityFreeRun,
  audiobook_generation_completed: identityFreeRun,
  audiobook_generation_failed: identityFreeRun,
  print_order_requested: identityFreeRun,
  view_item_list: {},
  select_item: {},
  add_to_cart: commerce,
  remove_from_cart: commerce,
  begin_checkout: { ...commerce, ...assist },
  purchase: {
    ...commerce,
    ...assist,
    transaction_id: transaction,
    tax: nonnegative,
    shipping: nonnegative,
    customer_type: oneOf('new', 'returning'),
  },
  refund: { ...commerce, ...assist, transaction_id: transaction },
  share: { ...share, method: isStoryShareMethod },
  story_share_open: share,
  story_share_qualified_open: {
    ...share,
    schema_version: schemaVersion,
    reader_class: oneOf('browser', 'account'),
  },
  creation_outline_accepted: {
    schema_version: schemaVersion,
    option: oneOf(
      'text',
      'photo',
      'audio',
      'guide',
      'template',
      'document',
      'no_observed_open',
      'unknown',
    ),
    creation_route: oneOf('freeform', 'template', 'guide'),
    entry_kind: oneOf('wizard', 'direct_template', 'legacy'),
    outline_ref: reference,
    template_answer_count: (value) => nonnegative(value) && Number.isInteger(value) && value <= 100,
  },
  creation_input_retained: {
    schema_version: schemaVersion,
    input_kind: oneOf('text', 'photo', 'audio', 'guide', 'document', 'template_answer'),
    outline_ref: reference,
  },
  earn_virtual_currency: {
    virtual_currency_name: oneOf('credits'),
    credits_granted: nonnegative,
    new_balance: nonnegative,
  },
  audiobook_interaction: {
    action_type: oneOf('play', 'download'),
    chapter_index: nonnegative,
    total_chapters: nonnegative,
    interaction_type: oneOf('play_audio', 'download_audio'),
  },
  paid_action: {
    action_type: identityFreeRun.action_type,
    action_stage: oneOf('started', 'completed', 'failed'),
    credits_spent: nonnegative,
  },
  survey_opened: { survey_version: nonnegative },
  survey_started: { survey_version: nonnegative },
  survey_question_answered: { survey_version: nonnegative },
  survey_submitted: {
    survey_version: nonnegative,
    questions_answered: nonnegative,
    reward_eligible: flag,
  },
  survey_reward_selected: reward,
  survey_reward_redeemed: reward,
  survey_reward_failed: { ...reward, error_code: oneOf('generic', 'network') },
};

const ITEM_EVENTS = new Set<GA4EventName>([
  'view_item_list',
  'select_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'purchase',
  'refund',
]);

export function isGA4EventName(value: string): value is GA4EventName {
  return EVENT_NAMES.has(value);
}

function pickValidated(
  value: Record<string, unknown>,
  validators: Record<string, Validator>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(validators).flatMap(([key, valid]) =>
      valid(value[key]) ? [[key, value[key]]] : [],
    ),
  );
}

export function sanitizeAnalyticsEventParams(
  eventName: string,
  params: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!isGA4EventName(eventName)) return null;
  const safe = pickValidated(params, { ...common, ...events[eventName] });
  if (ITEM_EVENTS.has(eventName) && Array.isArray(params.items)) {
    safe.items = params.items.slice(0, 50).flatMap((item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const valid = pickValidated(item as Record<string, unknown>, commerceItem);
      if (!valid.item_id) return [];
      // GA only needs one of item_id and item_name. Use a fixed label for reports.
      return [{ ...valid, item_name: 'Credits package' }];
    });
  }
  if ((eventName === 'sign_up' || eventName === 'login') && !safe.method) return null;
  if (
    (eventName === 'begin_checkout' || eventName === 'purchase') &&
    (!safe.currency || safe.value === undefined || !Array.isArray(safe.items) || !safe.items.length)
  )
    return null;
  if ((eventName === 'purchase' || eventName === 'refund') && !safe.transaction_id) return null;
  if (
    (eventName === 'story_share_open' || eventName === 'story_share_qualified_open') &&
    (!safe.story_share_method || !safe.story_share_scope || !safe.story_share_item_id)
  )
    return null;
  return safe;
}
