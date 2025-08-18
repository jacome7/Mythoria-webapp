import { extractStoryImages } from '@/utils/imageUtils';

describe('extractStoryImages', () => {
  it('groups images by type and sorts versions', () => {
    const data = {
      'frontcover_v001.png': { url: 'https://storage.googleapis.com/b/frontcover_v001.png' },
      'frontcover_v002.png': { url: 'https://storage.googleapis.com/b/frontcover_v002.png' },
      'chapter_1.png': { url: 'https://storage.googleapis.com/b/chapter_1.png' },
      'chapter_1_v002.png': { url: 'https://storage.googleapis.com/b/chapter_1_v002.png' },
    } as any;

    const images = extractStoryImages(data);
    expect(images[0].type).toBe('frontcover');
    expect(images[0].versions).toHaveLength(2);
    expect(images[0].latestVersion.version).toBe('v002');

    const chapter = images.find(i => i.type === 'chapter')!;
    expect(chapter.chapterNumber).toBe(1);
    expect(chapter.versions).toHaveLength(2);
    expect(chapter.latestVersion.version).toBe('v002');
  });
});
