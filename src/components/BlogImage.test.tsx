import { fireEvent, render, screen } from '@testing-library/react';
import BlogImage, { BLOG_FALLBACK_IMAGE } from './BlogImage';

describe('BlogImage', () => {
  it('uses the local illustration if an editorial image fails', () => {
    render(
      <BlogImage src="https://example.com/missing.jpg" alt="Article" width={600} height={400} />,
    );

    const image = screen.getByRole('img', { name: 'Article' });
    fireEvent.error(image);
    expect(image.getAttribute('src')).toContain(encodeURIComponent(BLOG_FALLBACK_IMAGE));

    fireEvent.error(image);
    expect(image.getAttribute('src')).toContain(encodeURIComponent(BLOG_FALLBACK_IMAGE));
  });
});
