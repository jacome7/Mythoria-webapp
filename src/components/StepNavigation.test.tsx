import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StepNavigation from './StepNavigation';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
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
});
