import { render, screen } from '@testing-library/react';
import LandingCreationLink from './LandingCreationLink';

let mockAuth = { isLoaded: true, isSignedIn: false };
let mockPath = '/pt-PT/lp/casais';
let mockSearch = new URLSearchParams('utm_source=google&gclid=test&ref=partner&prompt=private');
jest.mock('@clerk/nextjs', () => ({ useAuth: () => mockAuth }));
jest.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useSearchParams: () => mockSearch,
}));

beforeEach(() => {
  mockAuth = { isLoaded: true, isSignedIn: false };
  mockPath = '/pt-PT/lp/casais';
  mockSearch = new URLSearchParams('utm_source=google&gclid=test&ref=partner&prompt=private');
});

it.each(['pt-PT', 'en-US', 'es-ES', 'fr-FR', 'de-DE'])(
  'sends anonymous %s visitors straight to signup with their intent and campaign',
  (locale) => {
    mockPath = `/${locale}/lp/casais`;
    render(
      <LandingCreationLink
        href={`/${locale}/tell-your-story/step-1?landingSlug=casais&primaryIntent=romance`}
        data-cta-placement="hero_primary"
      >
        Create
      </LandingCreationLink>,
    );
    const entry = new URL(screen.getByRole('link').getAttribute('href')!, 'https://mythoria.pt');
    expect(entry.pathname).toBe(`/${locale}/sign-up`);
    const target = new URL(entry.searchParams.get('redirect')!, 'https://mythoria.pt');
    expect(target.pathname).toBe(`/${locale}/tell-your-story/step-1`);
    expect(target.searchParams.get('primaryIntent')).toBe('romance');
    expect(target.searchParams.get('gclid')).toBe('test');
    expect(target.searchParams.get('ref')).toBe('partner');
    expect(target.searchParams.has('prompt')).toBe(false);
    expect(screen.getByRole('link')).toHaveAttribute('data-cta-placement', 'hero_primary');
  },
);
it('waits for Clerk and uses step 1 for an authenticated visitor', () => {
  mockAuth.isLoaded = false;
  const { rerender } = render(
    <LandingCreationLink href="/pt-PT/tell-your-story/step-1">Create</LandingCreationLink>,
  );
  expect(screen.getByText('Create')).not.toHaveAttribute('href');
  mockAuth = { isLoaded: true, isSignedIn: true };
  rerender(<LandingCreationLink href="/pt-PT/tell-your-story/step-1">Create</LandingCreationLink>);
  expect(screen.getByRole('link').getAttribute('href')).toMatch(
    /^\/pt-PT\/tell-your-story\/step-1\?/,
  );
});
it('preserves custom destinations and navigation outside landings', () => {
  const { rerender } = render(
    <LandingCreationLink href="/pt-PT/contactUs?topic=workshop">Contact</LandingCreationLink>,
  );
  expect(screen.getByRole('link')).toHaveAttribute('href', '/pt-PT/contactUs?topic=workshop');
  mockPath = '/pt-PT';
  rerender(
    <LandingCreationLink onlyOnLanding href="/pt-PT/tell-your-story">
      Create
    </LandingCreationLink>,
  );
  expect(screen.getByRole('link')).toHaveAttribute('href', '/pt-PT/tell-your-story');
});
it('uses the landing context for the shared navigation CTA', () => {
  render(
    <>
      <main id="landing-page-top" data-primary-intent="romance" />
      <LandingCreationLink onlyOnLanding href="/pt-PT/tell-your-story">
        Create
      </LandingCreationLink>
    </>,
  );
  const entry = new URL(screen.getByRole('link').getAttribute('href')!, 'https://mythoria.pt');
  const target = new URL(entry.searchParams.get('redirect')!, 'https://mythoria.pt');
  expect(target.pathname).toBe('/pt-PT/tell-your-story/step-1');
  expect(target.searchParams.get('primaryIntent')).toBe('romance');
  expect(target.searchParams.get('landingSlug')).toBe('casais');
});
