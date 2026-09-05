import { getSelectedCreditPackageId } from './credit-package-selection';

it.each([null, '', '0', '-1', '2extra', '2.5', '02', '999', '9007199254740993'])(
  'ignores invalid package %s',
  (value) => {
    expect(getSelectedCreditPackageId(value, [{ id: 2 }])).toBeNull();
  },
);
it('resolves only an available package', () => {
  expect(getSelectedCreditPackageId('2', [{ id: 2 }])).toBe(2);
  expect(getSelectedCreditPackageId('2', [])).toBeNull();
});
