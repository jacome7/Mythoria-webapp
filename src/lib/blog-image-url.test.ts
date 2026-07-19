import { getRenderableBlogImageUrl } from './blog-image-url';

describe('blog image URLs', () => {
  it.each([
    ['/blog/hero.webp', '/blog/hero.webp'],
    [
      'https://storage.googleapis.com/mythoria-public/hero.webp',
      'https://storage.googleapis.com/mythoria-public/hero.webp',
    ],
    ['  /blog/hero.webp  ', '/blog/hero.webp'],
  ])('keeps a renderable image URL: %s', (value, expected) => {
    expect(getRenderableBlogImageUrl(value)).toBe(expected);
  });

  it.each(['./images/hero_16x9.png', 'images/hero.png', '//example.com/hero.png', 'javascript:x'])(
    'rejects a non-renderable image URL: %s',
    (value) => {
      expect(getRenderableBlogImageUrl(value)).toBeUndefined();
    },
  );
});
