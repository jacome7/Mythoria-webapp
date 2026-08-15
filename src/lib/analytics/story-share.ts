import type { CampaignParams } from '@/lib/campaign-context';

export const STORY_SHARE_METHODS = [
  'whatsapp',
  'facebook',
  'email',
  'copy_link',
  'native_share',
] as const;
export const STORY_SHARE_SCOPES = ['public', 'private_view', 'private_edit'] as const;

export type StoryShareMethod = (typeof STORY_SHARE_METHODS)[number];
export type StoryShareScope = (typeof STORY_SHARE_SCOPES)[number];

export interface StoryShareContext {
  itemId: string;
  method: StoryShareMethod;
  scope: StoryShareScope;
}

const MEDIUM_BY_METHOD: Record<StoryShareMethod, 'social' | 'email' | 'referral'> = {
  whatsapp: 'social',
  facebook: 'social',
  email: 'email',
  copy_link: 'referral',
  native_share: 'referral',
};
const OPAQUE_STORY_REFERENCE = /^[a-f0-9]{12}$/;

export function isStoryShareMethod(value: unknown): value is StoryShareMethod {
  return typeof value === 'string' && (STORY_SHARE_METHODS as readonly string[]).includes(value);
}

export function isStoryShareScope(value: unknown): value is StoryShareScope {
  return typeof value === 'string' && (STORY_SHARE_SCOPES as readonly string[]).includes(value);
}

export function storyShareFromCampaign(campaign: CampaignParams): StoryShareContext | undefined {
  const method = campaign.utm_source;
  const scope = campaign.utm_content;
  const itemId = campaign.utm_id;
  if (
    campaign.utm_campaign !== 'story_share' ||
    !isStoryShareMethod(method) ||
    !isStoryShareScope(scope) ||
    !itemId ||
    !OPAQUE_STORY_REFERENCE.test(itemId) ||
    campaign.utm_medium !== MEDIUM_BY_METHOD[method]
  ) {
    return undefined;
  }

  return { itemId, method, scope };
}

export function buildStoryShareUrl(
  url: string,
  context: StoryShareContext,
  origin = typeof window === 'undefined' ? 'https://mythoria.pt' : window.location.origin,
): string {
  const target = new URL(url, origin);
  target.searchParams.set('utm_source', context.method);
  target.searchParams.set('utm_medium', MEDIUM_BY_METHOD[context.method]);
  target.searchParams.set('utm_campaign', 'story_share');
  target.searchParams.set('utm_id', context.itemId);
  target.searchParams.set('utm_content', context.scope);
  return target.toString();
}

export function storyShareEventParams(context: StoryShareContext): Record<string, string> {
  return {
    story_share_method: context.method,
    story_share_scope: context.scope,
    story_share_item_id: context.itemId,
  };
}
