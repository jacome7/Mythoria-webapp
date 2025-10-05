import { toAbsoluteImageUrl, toRelativeImagePath, formatImageUrl } from '@/utils/image-url';

const BASE = 'https://storage.googleapis.com/mythoria-generated-stories';

describe('toAbsoluteImageUrl', () => {
  it('returns null for falsy paths', () => {
    expect(toAbsoluteImageUrl(null)).toBeNull();
    expect(toAbsoluteImageUrl('')).toBeNull();
  });

  it('passes through absolute URLs', () => {
    const url = 'https://example.com/test.png';
    expect(toAbsoluteImageUrl(url)).toBe(url);
  });

  it('converts relative paths', () => {
    expect(toAbsoluteImageUrl('story/img.png')).toBe(`${BASE}/story/img.png`);
  });

  it('handles leading slashes', () => {
    expect(toAbsoluteImageUrl('/root.png')).toBe(`${BASE}//root.png`);
  });

  it('formatImageUrl alias works', () => {
    expect(formatImageUrl('alias/test.jpg')).toBe(`${BASE}/alias/test.jpg`);
  });
});

describe('toRelativeImagePath', () => {
  it('returns null for falsy input', () => {
    expect(toRelativeImagePath(null)).toBeNull();
    expect(toRelativeImagePath('')).toBeNull();
  });

  it('passes through relative paths', () => {
    expect(toRelativeImagePath('story/img.png')).toBe('story/img.png');
  });

  it('converts absolute storage URLs', () => {
    const rel = 'story/img.png';
    expect(toRelativeImagePath(`${BASE}/${rel}`)).toBe(rel);
  });

  it('returns external URLs unchanged', () => {
    const external = 'https://example.com/other.png';
    expect(toRelativeImagePath(external)).toBe(external);
  });

  it('leaves base URL without path unchanged', () => {
    expect(toRelativeImagePath(BASE)).toBe(BASE);
  });
});
