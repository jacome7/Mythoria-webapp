import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));
jest.mock('next-intl', () => ({
  useLocale: () => 'pt-PT',
  useTranslations: () => (key: string) => key,
}));

const mockUsePathname = jest.mocked(usePathname);

describe('Footer', () => {
  it.each([
    '/pt-PT/stories/read/story-id',
    '/pt-PT/stories/read/story-id/chapter/1',
    '/en-US/p/story-slug',
    '/en-US/p/story-slug/chapter/2/',
  ])('hides the footer on mobile for %s', (pathname) => {
    mockUsePathname.mockReturnValue(pathname);
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toHaveClass('hidden', 'md:block');
  });

  it.each(['/pt-PT', '/pt-PT/stories/listen/story-id', '/en-US/p/story-slug/listen'])(
    'keeps the footer visible at every width for %s',
    (pathname) => {
      mockUsePathname.mockReturnValue(pathname);
      render(<Footer />);

      expect(screen.getByRole('contentinfo')).not.toHaveClass('hidden');
    },
  );

  it('omits the footer on creation steps', () => {
    mockUsePathname.mockReturnValue('/pt-PT/tell-your-story/step-2');
    render(<Footer />);

    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});
