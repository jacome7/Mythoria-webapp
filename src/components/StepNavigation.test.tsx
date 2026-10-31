import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import StepNavigation from './StepNavigation';

const pushMock = jest.fn();

jest.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      next: 'Next',
      prev: 'Previous',
      finish: 'Finish',
    })[key] ?? key,
}));

describe('StepNavigation', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('uses an explicit nextLabel on the final handoff step instead of forcing the finish label', () => {
    render(
      <StepNavigation
        currentStep={4}
        totalSteps={5}
        nextHref="/tell-your-story/step-5"
        prevHref="/tell-your-story/step-3"
        nextLabel="Review and generate"
      />,
    );

    expect(screen.getByRole('link', { name: /review and generate/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /finish/i })).not.toBeInTheDocument();
  });

  it('falls back to the finish label on the final step when no nextLabel is supplied', () => {
    render(
      <StepNavigation
        currentStep={4}
        totalSteps={5}
        nextHref="/tell-your-story/step-5"
        prevHref="/tell-your-story/step-3"
      />,
    );

    expect(screen.getByRole('link', { name: /finish/i })).toBeInTheDocument();
  });

  it('keeps the explicit nextLabel when onNext handles validation before navigation', async () => {
    const onNext = jest.fn().mockResolvedValue(true);

    render(
      <StepNavigation
        currentStep={4}
        totalSteps={5}
        nextHref="/tell-your-story/step-5"
        prevHref="/tell-your-story/step-3"
        onNext={onNext}
        nextLabel="Review and generate"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /review and generate/i }));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith('/tell-your-story/step-5');
  });

  it('does not follow a disabled link', () => {
    render(
      <StepNavigation
        currentStep={2}
        totalSteps={5}
        nextHref="/next"
        prevHref={null}
        nextDisabled
      />,
    );
    expect(fireEvent.click(screen.getByRole('link', { name: /Next/ }))).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('waits for validation and suppresses duplicate submissions', async () => {
    let finish!: (value: boolean) => void;
    const onNext = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <StepNavigation
        currentStep={2}
        totalSteps={5}
        nextHref="/next"
        prevHref="/previous"
        onNext={onNext}
      />,
    );
    const button = screen.getByRole('button', { name: /Next/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(fireEvent.click(screen.getByRole('link', { name: /Previous/ }))).toBe(false);
    finish(false);
    await waitFor(() => expect(button).toBeEnabled());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
