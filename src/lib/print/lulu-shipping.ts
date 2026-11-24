export const luluShippingLimits = { name: 35, address: 30, phone: 20 };
export const luluPhonePattern = /^\+?[\d\s\-./()]{8,20}$/;

// Lulu's shipping-options endpoint requires a short subdivision code in these markets.
const subdivisionCountries = new Set([
  'AE',
  'AS',
  'AU',
  'BR',
  'CA',
  'CN',
  'CO',
  'CR',
  'KY',
  'ES',
  'FM',
  'HK',
  'HN',
  'ID',
  'IN',
  'IQ',
  'IT',
  'JM',
  'JP',
  'KN',
  'KR',
  'MX',
  'MH',
  'MP',
  'NR',
  'PW',
  'PG',
  'PF',
  'RU',
  'SV',
  'SO',
  'TW',
  'UM',
  'US',
  'VE',
  'VI',
]);

export function luluRequiresTaxId(country: string) {
  return ['BR', 'CL', 'MX'].includes(country);
}

export function luluAddressIssue(shipping: {
  street1: string;
  street2?: string;
  city: string;
  country_code: string;
  postcode: string;
  state_code?: string;
}) {
  if (
    [shipping.street1, shipping.street2, shipping.city].some(
      (part) => (part?.trim().length ?? 0) > luluShippingLimits.address,
    )
  )
    return 'addressTooLong';
  if (!shipping.postcode.trim()) return 'postalCodeRequired';
  if (
    subdivisionCountries.has(shipping.country_code) &&
    !/^[A-Z0-9]{1,3}$/i.test(shipping.state_code?.trim() ?? '')
  )
    return 'subdivisionRequired';
  return undefined;
}
