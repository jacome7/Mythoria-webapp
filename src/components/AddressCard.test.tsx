import { fireEvent, render, screen } from '@testing-library/react';
import AddressCard from './AddressCard';

jest.mock('next-intl', () => ({
  useLocale: () => 'fr-FR',
  useTranslations: () => (key: string) => key,
}));

it('shows a country-first form and expands a second line only when selected', () => {
  render(
    <AddressCard
      mode="create"
      onSave={jest.fn()}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      shippingAutocomplete
      requiresLuluAddress={() => true}
    />,
  );
  const country = screen.getByRole('combobox', { name: /fields.country/ });
  expect(country).toHaveValue('');
  fireEvent.change(country, { target: { value: 'PT' } });
  expect(screen.getByRole('option', { name: 'Portugal' })).toBeInTheDocument();
  expect(screen.queryByLabelText(/regionLabels\./)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('fields.line2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'buttons.addLine2' }));
  expect(screen.getByLabelText('fields.line2')).toBeInTheDocument();

  fireEvent.change(country, { target: { value: 'ES' } });
  expect(screen.getByRole('option', { name: 'Espagne' })).toBeInTheDocument();
  const province = screen.getByLabelText(/regionLabels.province/);
  expect(province).toBeRequired();
  expect(document.getElementById(province.getAttribute('list') ?? '')).toHaveTextContent(
    'Barcelone',
  );
});
