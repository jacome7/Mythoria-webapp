import { render, screen } from '@testing-library/react';
import { ReadonlyURLSearchParams, usePathname, useSearchParams } from 'next/navigation';
import { INTENT_CONTEXT_COOKIE } from '@/types/intent-context';
import {
  HomepageThemeProvider,
  LandingPageIntentEntry,
  useHomepageTheme,
  useWebsiteIntentContext,
} from './useHomepageTheme';

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

function setNavigation(path: string, query = '') {
  jest.mocked(usePathname).mockReturnValue(path);
  jest.mocked(useSearchParams).mockReturnValue(new ReadonlyURLSearchParams(query));
}

function ThemeConsumer() {
  const theme = useHomepageTheme();
  const context = useWebsiteIntentContext();
  return <span>{[theme, context?.intent, context?.recipient].filter(Boolean).join(' ')}</span>;
}

function page(entry?: React.ReactNode) {
  return (
    <HomepageThemeProvider initialIntentContext={null}>
      {entry}
      <ThemeConsumer />
    </HomepageThemeProvider>
  );
}

function setIntentCookie(value: string) {
  document.cookie = `${INTENT_CONTEXT_COOKIE}=${encodeURIComponent(value)}; path=/`;
}

afterEach(() => {
  document.cookie = `${INTENT_CONTEXT_COOKIE}=; path=/; max-age=0`;
  delete document.documentElement.dataset.websiteTheme;
});

it('commits cached landing entry intent only when its route becomes current', async () => {
  const slug = 'livro-personalizado-para-casais';
  const landingContext = { intent: 'romance' } as const;
  const entry = () => (
    <LandingPageIntentEntry locale="pt-PT" slug={slug} landingContext={landingContext} />
  );
  setNavigation('/pt-PT');
  const { rerender } = render(page(entry()));
  expect(screen.getByText('christmas')).toBeInTheDocument();
  expect(document.cookie).not.toContain(INTENT_CONTEXT_COOKIE);

  setNavigation(`/pt-PT/lp/${slug}`);
  rerender(page(entry()));
  expect(decodeURIComponent(document.cookie)).toContain('"intent":"romance"');
  expect(await screen.findByText('kids romance')).toBeInTheDocument();

  setNavigation(`/pt-PT/lp/${slug}`, 'intent=christmas');
  rerender(page(entry()));
  expect(screen.getByText('christmas christmas')).toBeInTheDocument();
  expect(decodeURIComponent(document.cookie)).toContain('"intent":"christmas"');
});

it('tracks cookie and query context in a reused root layout across localized routes', () => {
  setNavigation('/pt-PT');
  const { rerender } = render(page());
  expect(screen.getByText('christmas')).toBeInTheDocument();
  expect(document.documentElement).toHaveAttribute('data-website-theme', 'christmas');

  setIntentCookie('{"intent":"romance","recipient":"partner"}');
  setNavigation('/pt-PT/lp/livro-personalizado-para-casais');
  rerender(page());
  expect(screen.getByText('kids romance partner')).toBeInTheDocument();
  expect(document.documentElement).toHaveAttribute('data-website-theme', 'kids');

  setNavigation('/de-DE/sign-up');
  rerender(page());
  expect(screen.getByText('kids romance partner')).toBeInTheDocument();

  setNavigation('/de-DE', 'intent=invalid');
  rerender(page());
  expect(screen.getByText('kids romance partner')).toBeInTheDocument();

  setNavigation('/de-DE', 'intent=christmas');
  rerender(page());
  expect(screen.getByText('christmas christmas partner')).toBeInTheDocument();
  expect(document.documentElement).toHaveAttribute('data-website-theme', 'christmas');

  setIntentCookie('{"intent":"unknown"}');
  setNavigation('/offline');
  rerender(page());
  expect(screen.getByText('christmas')).toBeInTheDocument();
});
