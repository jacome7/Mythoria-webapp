import { readFile } from 'fs/promises';
import path from 'path';
import { imageSize } from 'image-size';
import { getAllGraphicalStyles, getAllTargetAudiences } from '@/types/story-enums';

describe('graphic style gallery assets', () => {
  it('contains a usable 2:3 preview for every audience and style', async () => {
    const publicRoot = path.join(process.cwd(), 'public', 'images', 'GraphicTemplates');

    for (const audience of getAllTargetAudiences()) {
      for (const style of getAllGraphicalStyles()) {
        const assetPath = path.join(publicRoot, audience, `${style}.jpg`);
        const bytes = await readFile(assetPath);
        const dimensions = imageSize(bytes);

        expect(dimensions.width).toBeGreaterThanOrEqual(700);
        expect(dimensions.height).toBeGreaterThan(dimensions.width);
        expect(Math.abs(dimensions.width / dimensions.height - 2 / 3)).toBeLessThanOrEqual(0.035);
      }
    }
  });
});
