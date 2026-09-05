import { fireEvent, render, screen } from '@testing-library/react';

const mockSignUpStarted = jest.fn();
const mockClerkSignUp = jest.fn();
let mockSearch = new URLSearchParams();

jest.mock('@clerk/nextjs', () => ({
  SignUp: (props: Record<string, unknown>) => {
    mockClerkSignUp(props);
    return <button type="button">Clerk sign up</button>;
  },
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearch,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src }: { src: string }) => <span data-image-src={src} />,
}));

jest.mock('@/lib/analytics', () => ({
  trackAuth: {
    signUpStarted: (...args: unknown[]) => mockSignUpStarted(...args),
  },
}));

import SignUpClient from './SignUpClient';

const translations = {
  title: 'Create',
  subtitle: 'Subtitle',
  pageTitle: 'Register',
  pageSubtitle: 'Start here',
  features: {
    free: 'Free',
    character: 'Character',
    quality: 'Quality',
    creativity: 'Creativity',
  },
};

describe('SignUpClient analytics', () => {
  beforeEach(() => {
    mockSignUpStarted.mockClear();
    mockSearch = new URLSearchParams();
    mockClerkSignUp.mockClear();
  });

  it('emits sign_up_started only after the first genuine form interaction', () => {
    render(<SignUpClient locale="pt-PT" translations={translations} leadSession={null} />);

    expect(mockSignUpStarted).not.toHaveBeenCalled();

    const signUp = screen.getByRole('button', { name: 'Clerk sign up' });
    fireEvent.pointerDown(signUp);
    fireEvent.keyDown(signUp, { key: 'Enter' });

    expect(mockSignUpStarted).toHaveBeenCalledTimes(1);
    expect(mockSignUpStarted).toHaveBeenCalledWith({
      method: 'unknown',
    });
  });
});

it('keeps the selected package when an existing user switches from signup to login', () => {
  mockSearch = new URLSearchParams({ redirect: '/pt-PT/buy-credits?package=2' });
  render(<SignUpClient locale="pt-PT" translations={translations} leadSession={null} />);
  const props = mockClerkSignUp.mock.calls.at(-1)![0];
  const entry = new URL(props.signInUrl, 'https://mythoria.pt');
  expect(entry.pathname).toBe('/pt-PT/sign-in');
  expect(entry.searchParams.get('auth_mode')).toBe('sign-in');
  expect(entry.searchParams.get('redirect')).toContain('/pt-PT/buy-credits?package=2');
  expect(props.forceRedirectUrl).toContain('/pt-PT/buy-credits?package=2');
});
