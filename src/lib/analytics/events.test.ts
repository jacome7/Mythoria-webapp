import { sanitizeAnalyticsEventParams } from './events';

describe('GA4 runtime event contract', () => {
  it('requires recommended auth and commerce parameters', () => {
    expect(sanitizeAnalyticsEventParams('sign_up', { method: 'google' })).toEqual({
      method: 'google',
    });
    expect(sanitizeAnalyticsEventParams('sign_up', { sign_up_method: 'google' })).toBeNull();
    expect(
      sanitizeAnalyticsEventParams('purchase', {
        transaction_id: 'order-1',
        currency: 'EUR',
        value: 10,
        items: [{ item_id: 'credits-1' }],
      }),
    ).not.toBeNull();
  });

  it('blocks PII, content, raw click identifiers, and non-snake-case parameters', () => {
    expect(
      sanitizeAnalyticsEventParams('story_generation_completed', {
        story_id: 'story-1',
        landing_path: '/pt-PT/lp/example',
        email: 'person@example.com',
        prompt: 'private prompt',
        gclid: 'raw-click-id',
        firstLandingPath: '/wrong-name',
      }),
    ).toEqual({ landing_path: '/pt-PT/lp/example' });
  });

  it('requires a valid story-share open contract', () => {
    expect(sanitizeAnalyticsEventParams('story_share_open', { content_type: 'story' })).toBeNull();
    expect(
      sanitizeAnalyticsEventParams('story_share_open', {
        content_type: 'story',
        story_share_method: 'copy_link',
        story_share_scope: 'public',
        story_share_item_id: 'a1b2c3d4e5f6',
        story_id: 'raw-story-id',
      }),
    ).toEqual({
      content_type: 'story',
      story_share_method: 'copy_link',
      story_share_scope: 'public',
      story_share_item_id: 'a1b2c3d4e5f6',
    });
  });
});
