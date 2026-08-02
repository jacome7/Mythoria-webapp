import { fireEvent, render, screen } from '@testing-library/react';

const mockSignUpStarted = jest.fn();

jest.mock('@clerk/nextjs', () => ({
  SignUp: () => <button type="button">Clerk sign up</button>,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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
  });

  it('emits sign_up_started only after the first genuine form interaction', () => {
    render(<SignUpClient locale="pt-PT" translations={translations} leadSession={null} />);

    expect(mockSignUpStarted).not.toHaveBeenCalled();

    const signUp = screen.getByRole('button', { name: 'Clerk sign up' });
    fireEvent.pointerDown(signUp);
    fireEvent.keyDown(signUp, { key: 'Enter' });

    expect(mockSignUpStarted).toHaveBeenCalledTimes(1);
    expect(mockSignUpStarted).toHaveBeenCalledWith({
      sign_up_method: 'unknown',
    });
  });
});
