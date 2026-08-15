import {
  buildStoryShareUrl,
  storyShareFromCampaign,
  storyShareEventParams,
  type StoryShareMethod,
} from './story-share';

describe('story share campaign contract', () => {
  const itemId = 'a1b2c3d4e5f6';

  it.each([
    ['whatsapp', 'social'],
    ['facebook', 'social'],
    ['email', 'email'],
    ['copy_link', 'referral'],
    ['native_share', 'referral'],
  ] as const)('builds %s links with the documented campaign mapping', (method, medium) => {
    const url = new URL(
      buildStoryShareUrl('https://mythoria.pt/en-US/p/a-story?keep=value', {
        itemId,
        method: method as StoryShareMethod,
        scope: 'public',
      }),
    );

    expect(url.searchParams.get('keep')).toBe('value');
    expect(url.searchParams.get('utm_source')).toBe(method);
    expect(url.searchParams.get('utm_medium')).toBe(medium);
    expect(url.searchParams.get('utm_campaign')).toBe('story_share');
    expect(url.searchParams.get('utm_id')).toBe(itemId);
    expect(url.searchParams.get('utm_content')).toBe('public');
  });

  it('rejects a forged source, medium, scope, or opaque story reference', () => {
    const campaign = {
      utm_source: 'whatsapp',
      utm_medium: 'social',
      utm_campaign: 'story_share',
      utm_id: itemId,
      utm_content: 'private_view',
    };
    expect(storyShareFromCampaign(campaign)).toEqual({
      itemId,
      method: 'whatsapp',
      scope: 'private_view',
    });
    expect(storyShareFromCampaign({ ...campaign, utm_medium: 'email' })).toBeUndefined();
    expect(storyShareFromCampaign({ ...campaign, utm_source: 'sms' })).toBeUndefined();
    expect(storyShareFromCampaign({ ...campaign, utm_content: 'private_token' })).toBeUndefined();
    expect(storyShareFromCampaign({ ...campaign, utm_id: 'raw-story-id' })).toBeUndefined();
  });

  it('keeps the downstream event dimensions low-cardinality apart from the unregistered reference', () => {
    expect(
      storyShareEventParams({ itemId, method: 'native_share', scope: 'private_edit' }),
    ).toEqual({
      story_share_method: 'native_share',
      story_share_scope: 'private_edit',
      story_share_item_id: itemId,
    });
  });
});
