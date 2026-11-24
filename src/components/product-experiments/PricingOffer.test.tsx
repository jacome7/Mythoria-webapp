import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import { useExperimentArm } from '@/lib/product-experiments/client';
import PricingOffer from './PricingOffer';

jest.mock('@clerk/nextjs', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/product-experiments/client', () => ({
  useActiveExperiment: () => 'offer_clarity',
  useExperimentArm: jest.fn(),
}));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    [key, ...Object.values(values ?? {})].join(' '),
}));
const fetchOriginal = global.fetch;
beforeEach(() => {
  (useAuth as unknown as jest.Mock).mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
  });
  (useExperimentArm as jest.Mock).mockImplementation((_id, eligible) =>
    eligible ? 'treatment' : null,
  );
});
afterEach(() => {
  global.fetch = fetchOriginal;
  jest.clearAllMocks();
});
it('shows a live grant and ebook price without claiming a paid product is free', () => {
  const { container } = render(
    <PricingOffer
      cost={10}
      signupCredits={3}
      packages={[
        { credits: 5, price: 2 },
        { credits: 10, price: 8 },
      ]}
    />,
  );
  expect(container).toHaveTextContent('ebookCost 10 signupCredits 3 pack 10 €8.00');
  expect(container).not.toHaveTextContent('covered');
});
it('uses the signed-in balance and discards the last customer’s quote on account change', async () => {
  (useAuth as unknown as jest.Mock).mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId: 'one',
  });
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ balance: 7 }) })
    .mockResolvedValueOnce({ ok: false });
  const props = { cost: 5, signupCredits: 5, packages: [] };
  const { rerender } = render(<PricingOffer {...props} />);
  await waitFor(() => expect(screen.getByText(/balance 7/)).toHaveTextContent('covered'));
  (useAuth as unknown as jest.Mock).mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    userId: 'two',
  });
  rerender(<PricingOffer {...props} />);
  expect(screen.queryByText(/balance 7/)).not.toBeInTheDocument();
});
