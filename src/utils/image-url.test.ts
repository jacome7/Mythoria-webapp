import {
  toAbsoluteImageUrl,
  formatImageUrl,
  toRelativeImagePath,
} from '@/utils/image-url';

describe('toAbsoluteImageUrl', () => {
  it('builds an absolute URL from a relative path', () => {
    expect(toAbsoluteImageUrl('story/1/image.jpg')).toBe('https://storage.googleapis.com/mythoria-generated-stories/story/1/image.jpg');
  });

  it('returns existing absolute URLs unchanged', () => {
    const url = 'https://example.com/img.png';
    expect(toAbsoluteImageUrl(url)).toBe(url);
  });

  it('returns null for empty input', () => {
    expect(toAbsoluteImageUrl(null)).toBeNull();
  });

  it('supports the alias formatImageUrl', () => {
    expect(formatImageUrl('file.png')).toBe(toAbsoluteImageUrl('file.png'));
  });
});

describe('toRelativeImagePath', () => {
  it('strips the storage base from absolute URLs', () => {
    const absolute = 'https://storage.googleapis.com/mythoria-generated-stories/story/1/image.jpg';
    expect(toRelativeImagePath(absolute)).toBe('story/1/image.jpg');
  });

  it('leaves relative paths untouched', () => {
    expect(toRelativeImagePath('story/1/image.jpg')).toBe('story/1/image.jpg');
  });

  it('returns original URL for external sources', () => {
    const external = 'https://example.com/other.png';
    expect(toRelativeImagePath(external)).toBe(external);
  });

  it('returns null for empty input', () => {
    expect(toRelativeImagePath(undefined)).toBeNull();
  });
});

