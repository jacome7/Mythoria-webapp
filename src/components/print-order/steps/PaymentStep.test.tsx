import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ComponentProps } from 'react';
import PaymentStep from './PaymentStep';

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      fullName: 'Test Recipient',
      primaryEmailAddress: { emailAddress: 'reader@example.org' },
    },
  }),
}));
jest.mock('next-intl', () => {
  const translate = (key: string) => key;
  return { useLocale: () => 'en-US', useTranslations: () => translate };
});

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
type Settings = {
  luluDefault: boolean;
  hardcoverAvailable: boolean;
  paperbackAvailable?: boolean;
  squareEditionRevision?: string;
};
async function show(
  settings: Settings,
  hardPriceActive: boolean,
  country = 'PT',
  address: Partial<ComponentProps<typeof PaymentStep>['address']> = {},
) {
  const onPlaceOrder = jest.fn();
  const payloads: Record<string, unknown> = {
    '/api/print-requests/options?storyId=story': settings,
    '/api/pricing/services': {
      services: [
        { serviceCode: 'printedSoftCover', cost: 5, isActive: true },
        { serviceCode: 'printedHardCover', cost: 12, isActive: hardPriceActive },
        { serviceCode: 'extraBookCopy', cost: 4, isActive: true },
        { serviceCode: 'extraChapterCost', cost: 7, isActive: true },
        { serviceCode: 'shippingCost', cost: 2, isActive: true },
      ],
    },
    '/api/my-credits': { currentBalance: 100 },
  };
  global.fetch = jest.fn(async (url: string) => {
    if (!(url in payloads)) throw new Error('Unexpected endpoint');
    return { ok: true, json: async () => payloads[url] };
  }) as unknown as typeof fetch;
  function Checkout() {
    const [format, setFormat] =
      useState<ComponentProps<typeof PaymentStep>['selectedPrintingOption']>(null);
    return (
      <PaymentStep
        story={{
          storyId: 'story',
          title: 'Fixture',
          authorId: 'author',
          synopsis: '',
          chapterCount: settings.squareEditionRevision ? 9 : 3,
        }}
        address={{
          country,
          line1: 'Fixture Street 1',
          city: 'City',
          postalCode: '00000',
          stateRegion: country === 'BR' ? 'RJ' : 'CMX',
          phone: '+351210000000',
          ...address,
        }}
        selectedPrintingOption={format}
        onSelectPrintingOption={setFormat}
        onBack={() => {}}
        onPlaceOrder={onPlaceOrder}
        loading={false}
      />
    );
  }
  render(<Checkout />);
  const place = await screen.findByRole('button', { name: 'buttons.placeOrder' });
  return { onPlaceOrder, place };
}

it.each([
  { luluDefault: false, hardcoverAvailable: false, active: true },
  { luluDefault: true, hardcoverAvailable: false, active: true },
  { luluDefault: true, hardcoverAvailable: true, active: false },
])(
  'offers only paperback for settings $luluDefault/$hardcoverAvailable and active hardcover price $active',
  async ({ luluDefault, hardcoverAvailable, active }) => {
    await show({ luluDefault, hardcoverAvailable }, active);
    expect(screen.queryByText('payment.hardcoverTitle')).not.toBeInTheDocument();
    expect(screen.getByText('payment.softcoverTitle')).toBeInTheDocument();
  },
);

it('offers only square hardcover and includes the carrier contact with the global default at None', async () => {
  const { place, onPlaceOrder } = await show(
    {
      luluDefault: false,
      hardcoverAvailable: true,
      paperbackAvailable: false,
      squareEditionRevision: 'revision-1',
    },
    true,
  );
  expect(screen.getByText('payment.squareHardcoverTitle')).toBeInTheDocument();
  expect(screen.queryByText('payment.softcoverTitle')).not.toBeInTheDocument();
  expect(screen.queryByText(/payment.includesFourChapters/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+' }));
  fireEvent.click(place);
  fireEvent.click(screen.getByRole('button', { name: 'buttons.confirm' }));
  expect(onPlaceOrder).toHaveBeenCalledWith({
    numberOfCopies: 2,
    totalCost: 18,
    breakdown: { basePrice: 12, extraChaptersCost: 0, extraCopiesCost: 4, shippingCost: 2 },
    recipient: {
      name: 'Test Recipient',
      email: 'reader@example.org',
      phone_number: '+351210000000',
    },
  });
});
it('allows a priced, available hardcover to be confirmed at its own credit price', async () => {
  const { place, onPlaceOrder } = await show({ luluDefault: true, hardcoverAvailable: true }, true);
  const select = screen.getByRole('combobox', { name: /payment.binding/ });
  expect(select).toHaveValue('printedSoftCover');
  fireEvent.change(select, { target: { value: 'printedHardCover' } });
  expect(select).toHaveValue('printedHardCover');
  fireEvent.click(place);
  fireEvent.click(screen.getByRole('button', { name: 'buttons.confirm' }));
  expect(onPlaceOrder).toHaveBeenCalledWith(
    expect.objectContaining({
      totalCost: 14,
      breakdown: expect.objectContaining({ basePrice: 12 }),
    }),
  );
});
it.each(['BR', 'CL', 'MX'])(
  'requires a recipient tax identifier for a Lulu shipment to %s',
  async (country) => {
    const { place, onPlaceOrder } = await show(
      { luluDefault: true, hardcoverAvailable: false },
      false,
      country,
    );
    expect(place).toBeDisabled();
    const tax = screen.getByLabelText('payment.taxId');
    fireEvent.change(tax, { target: { value: '  ' } });
    expect(place).toBeDisabled();
    fireEvent.change(tax, { target: { value: ' fixture-id ' } });
    expect(place).toBeEnabled();
    fireEvent.click(place);
    fireEvent.click(screen.getByRole('button', { name: 'buttons.confirm' }));
    expect(onPlaceOrder.mock.calls[0][0].recipient.recipient_tax_id).toBe('fixture-id');
  },
);
it('requires a valid Lulu carrier email and uses the recipient’s corrected address', async () => {
  const { place, onPlaceOrder } = await show(
    { luluDefault: true, hardcoverAvailable: false },
    false,
  );
  expect(screen.queryByLabelText('payment.taxId')).toBeNull();
  const email = screen.getByLabelText('payment.recipientEmail');
  for (const value of ['', 'broken@']) {
    fireEvent.change(email, { target: { value } });
    expect(place).toBeDisabled();
  }
  fireEvent.change(email, { target: { value: 'gift@example.org' } });
  expect(place).toBeEnabled();
  fireEvent.click(place);
  fireEvent.click(screen.getByRole('button', { name: 'buttons.confirm' }));
  expect(onPlaceOrder.mock.calls[0][0].recipient).toEqual({
    name: 'Test Recipient',
    email: 'gift@example.org',
    phone_number: '+351210000000',
  });
});
it('blocks a Lulu checkout and explains how to shorten an overlong address', async () => {
  const { place } = await show({ luluDefault: true, hardcoverAvailable: false }, false, 'PT', {
    line2: 'A'.repeat(31),
  });
  expect(place).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('payment.addressTooLong');
});

it('requires a provider subdivision code for a Lulu checkout in Spain', async () => {
  const { place } = await show({ luluDefault: true, hardcoverAvailable: false }, false, 'ES', {
    stateRegion: 'Madrid',
  });
  expect(place).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('payment.subdivisionRequired');
});

it('keeps manual checkout available without collecting a carrier email or tax identifier', async () => {
  const { place, onPlaceOrder } = await show(
    { luluDefault: false, hardcoverAvailable: false },
    false,
    'MX',
    { line2: 'A'.repeat(45), postalCode: '', stateRegion: undefined },
  );
  expect(screen.queryByLabelText('payment.recipientEmail')).toBeNull();
  expect(screen.queryByLabelText('payment.taxId')).toBeNull();
  fireEvent.click(place);
  fireEvent.click(screen.getByRole('button', { name: 'buttons.confirm' }));
  expect(onPlaceOrder.mock.calls[0][0]).not.toHaveProperty('recipient');
});
