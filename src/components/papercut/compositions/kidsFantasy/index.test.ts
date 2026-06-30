import { readFileSync } from 'fs';
import { join } from 'path';

describe('kidsFantasy hero composition', () => {
  it('sends anonymous homepage hero starts directly to sign-up', () => {
    const source = readFileSync(join(__dirname, 'index.ts'), 'utf8');

    expect(source).toContain("ctaPath: 'sign-up'");
    expect(source).not.toContain("ctaPath: 'tell-your-story'");
  });
});
