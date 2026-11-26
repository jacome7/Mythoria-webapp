import { checkLuluAddress, LuluAddressReviewError } from './address-review';

const address = {
  name: 'Staff',
  email: 'owner@example.test',
  phone_number: '+351210000000',
  street1: 'Rua da Escola 10',
  city: 'São João',
  country_code: 'PT',
  postcode: '1000-001',
};

it('accepts conservative formatting equivalences', () => {
  expect(() =>
    checkLuluAddress(address, { city: 'SÃO   JOÃO', street1: ' Rua da Escola  10 ' }, { city: [] }),
  ).not.toThrow();
});

it('only retains changed delivery fields on an address-review hold', () => {
  try {
    checkLuluAddress(
      address,
      {
        city: 'São João',
        street1: 'Rua da Escola 11',
        email: 'someone@example.test',
        recipient_tax_id: 'secret',
      },
      {},
    );
    throw new Error('Expected an address review');
  } catch (err) {
    expect(err).toBeInstanceOf(LuluAddressReviewError);
    expect((err as LuluAddressReviewError).suggested).toEqual({ street1: 'Rua da Escola 11' });
  }
});

it('holds an incomplete address even when no replacement value is available', () => {
  expect(() => checkLuluAddress(address, null, ['incomplete'])).toThrow(LuluAddressReviewError);
  expect(() => checkLuluAddress(address, { city: address.city }, ['incomplete'])).toThrow(
    LuluAddressReviewError,
  );
});
