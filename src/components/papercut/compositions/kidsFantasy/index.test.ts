import { readFileSync } from 'fs';
import { join } from 'path';

describe('kidsFantasy hero composition', () => {
  it('declares the canonical kids story intent for the hero CTA', () => {
    const source = readFileSync(join(__dirname, 'index.ts'), 'utf8');

    expect(source).toContain("storyIntent: 'kids_adventures'");
    expect(source).not.toContain('ctaPath');
  });
});
