import { resolveWebsiteTheme } from '@/constants/websiteTheme';
import { STORY_INTENTS } from '@/constants/intents';
import { resolveComposition } from './registry';

describe('homepage theme precedence', () => {
  it.each([undefined, null, 'invalid'])('defaults to Kids for %s', (intent) => {
    expect(resolveWebsiteTheme(intent)).toBe('kids');
    expect(resolveComposition(intent).id).toBe('kids_fantasy');
  });

  it('uses Christmas for the explicit Christmas intent', () => {
    expect(resolveWebsiteTheme(' Christmas ')).toBe('christmas');
    expect(resolveComposition(' Christmas ').id).toBe('christmas');
  });

  it.each(STORY_INTENTS.filter((intent) => intent !== 'christmas'))(
    'preserves the sitewide palette and hero for %s',
    (intent) => {
      const customCompositions = ['romance', 'grandparents', 'sports_teams'];
      expect(resolveWebsiteTheme(intent)).toBe('kids');
      expect(resolveComposition(intent).id).toBe(
        customCompositions.includes(intent) ? intent : 'kids_fantasy',
      );
    },
  );
});
