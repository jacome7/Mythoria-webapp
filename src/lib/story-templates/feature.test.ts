jest.mock('server-only', () => ({}));

import { isStoryTemplatesEnabled, isStoryTemplatesEnabledForAuthor } from './feature';

describe('story template runtime flag', () => {
  const previous = process.env.STORY_TEMPLATES_ENABLED;
  afterEach(() => {
    if (previous === undefined) delete process.env.STORY_TEMPLATES_ENABLED;
    else process.env.STORY_TEMPLATES_ENABLED = previous;
  });

  it.each([undefined, '', 'false', 'TRUE', '1'])('defaults off for %s', (value) => {
    if (value === undefined) delete process.env.STORY_TEMPLATES_ENABLED;
    else process.env.STORY_TEMPLATES_ENABLED = value;
    expect(isStoryTemplatesEnabled()).toBe(false);
  });

  it('enables only when explicitly true', () => {
    process.env.STORY_TEMPLATES_ENABLED = 'true';
    expect(isStoryTemplatesEnabled()).toBe(true);
  });

  it('requires the global switch and an explicit persisted opt-in', () => {
    process.env.STORY_TEMPLATES_ENABLED = 'true';
    for (const author of [null, undefined, {}, { experimentalFeaturesEnabled: false }])
      expect(isStoryTemplatesEnabledForAuthor(author)).toBe(false);
    expect(isStoryTemplatesEnabledForAuthor({ experimentalFeaturesEnabled: true })).toBe(true);
    process.env.STORY_TEMPLATES_ENABLED = 'false';
    expect(isStoryTemplatesEnabledForAuthor({ experimentalFeaturesEnabled: true })).toBe(false);
  });
});
