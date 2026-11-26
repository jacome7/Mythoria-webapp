'use client';

import { useId, useState } from 'react';
import { Check, Edit, MapPin, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getCountryOptions } from '@/utils/countries';
import { subdivisionLabel, subdivisionOptions } from '@/lib/print/delivery-regions';
import { luluAddressIssue, luluRequiresSubdivision } from '@/lib/print/lulu-shipping';

export interface Address {
  addressId: string;
  type: 'billing' | 'delivery';
  line1: string;
  line2?: string;
  city: string;
  stateRegion?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface AddressCardProps {
  address?: Address;
  mode: 'create' | 'edit' | 'view';
  onSave: (address: Address) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onCancel?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  hideAddressType?: boolean;
  shippingAutocomplete?: boolean;
  requiresLuluAddress?: (country: string) => boolean;
  defaultAddressType?: 'billing' | 'delivery';
}

export default function AddressCard({
  address,
  mode,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  isSelected = false,
  onSelect,
  hideAddressType = false,
  shippingAutocomplete = false,
  requiresLuluAddress,
  defaultAddressType = 'delivery',
}: AddressCardProps) {
  const fieldId = useId();
  const addressAutocompletePrefix = shippingAutocomplete ? 'shipping ' : '';
  const tAddresses = useTranslations('Addresses');
  const locale = useLocale();
  const countries = getCountryOptions(locale);
  const [formData, setFormData] = useState<Address>({
    addressId: address?.addressId || '',
    type: address?.type || defaultAddressType,
    line1: address?.line1 || '',
    line2: address?.line2 || '',
    city: address?.city || '',
    stateRegion: address?.stateRegion || '',
    postalCode: address?.postalCode || '',
    country: address?.country || (shippingAutocomplete ? '' : 'US'),
    phone: address?.phone || '',
    ...address,
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandLine2, setExpandLine2] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const country = formData.country.trim().toUpperCase();
  const requireLuluAddress = requiresLuluAddress?.(country) ?? false;
  const regions = shippingAutocomplete ? subdivisionOptions(country, locale) : [];
  const requiresRegion = requireLuluAddress && luluRequiresSubdivision(country);
  const showRegion =
    !shippingAutocomplete || Boolean(formData.stateRegion) || luluRequiresSubdivision(country);

  const handleInputChange = (field: keyof Address, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.line1.trim() || !formData.city.trim() || !formData.country.trim()) {
      setSaveError(tAddresses('validation.requiredFields'));
      return;
    }

    const issue = requireLuluAddress
      ? luluAddressIssue({
          street1: formData.line1,
          street2: formData.line2,
          city: formData.city,
          country_code: country,
          postcode: formData.postalCode ?? '',
          state_code: formData.stateRegion,
        })
      : undefined;
    if (issue) {
      setSaveError(tAddresses(`validation.${issue}`));
      return;
    }

    setSaveError(undefined);
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving address:', error);
      setSaveError(tAddresses('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(tAddresses('confirmDelete'))) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert(tAddresses('errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  if (mode === 'view') {
    return (
      <div
        className={`card border-2 transition-all ${
          isSelected ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-base-400'
        }`}
      >
        <div className="card-body">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="badge badge-outline">
                {tAddresses(`types.${address?.type || 'shipping'}`)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label={tAddresses('editAddress')}
                className="btn btn-ghost btn-sm"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={tAddresses('buttons.deleteAddress')}
                className="btn btn-ghost btn-sm text-error"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div id={`${fieldId}-summary`} className="mt-2">
            <p className="font-medium">{address?.line1}</p>
            {address?.line2 && <p>{address.line2}</p>}
            <p>
              {address?.city}
              {address?.stateRegion &&
                `, ${subdivisionOptions(address.country, locale).find(({ value }) => value === address.stateRegion)?.label ?? address.stateRegion}`}
              {address?.postalCode && ` ${address.postalCode}`}
            </p>
            <p>{countries.find((c) => c.value === address?.country)?.label || address?.country}</p>
            {address?.phone && <p className="text-sm text-base-content/70">{address.phone}</p>}
          </div>
          {onSelect && (
            <div className="card-actions justify-end">
              <button
                type="button"
                aria-pressed={isSelected}
                aria-describedby={`${fieldId}-summary`}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                onClick={onSelect}
              >
                {tAddresses(isSelected ? 'buttons.selectedAddress' : 'buttons.useAddress')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card border-2 border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title">
            {mode === 'create' ? tAddresses('addAddress') : tAddresses('editAddress')}
          </h3>
        </div>{' '}
        <div className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor={`${fieldId}-country`}>
              <span className="label-text">{tAddresses('fields.country')} *</span>
            </label>
            <select
              className="select select-bordered"
              id={`${fieldId}-country`}
              name="country"
              autoComplete={`${addressAutocompletePrefix}country`}
              value={country}
              required
              onChange={(e) => {
                const nextCountry = e.target.value;
                setFormData((previous) => ({
                  ...previous,
                  country: nextCountry,
                  ...(shippingAutocomplete ? { stateRegion: '' } : {}),
                }));
              }}
            >
              {!country && <option value="">{tAddresses('placeholders.country')}</option>}
              {country && !countries.some(({ value }) => value === country) && (
                <option value={country}>{country}</option>
              )}
              {countries.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {/* Address Type - only show if not hidden */}
          {!hideAddressType && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{tAddresses('fields.type')}</span>
              </label>{' '}
              <select
                className="select select-bordered"
                value={formData.type}
                onChange={(e) =>
                  handleInputChange('type', e.target.value as 'billing' | 'delivery')
                }
              >
                <option value="delivery">{tAddresses('types.delivery')}</option>
                <option value="billing">{tAddresses('types.billing')}</option>
              </select>
            </div>
          )}

          {/* Address Line 1 */}
          <div className="form-control">
            <label className="label" htmlFor={`${fieldId}-line1`}>
              <span className="label-text">{tAddresses('fields.line1')} *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              id={`${fieldId}-line1`}
              name="line1"
              autoComplete={`${addressAutocompletePrefix}address-line1`}
              value={formData.line1}
              onChange={(e) => handleInputChange('line1', e.target.value)}
              placeholder={tAddresses('placeholders.line1')}
            />
          </div>

          {!shippingAutocomplete || expandLine2 || formData.line2 ? (
            <div className="form-control">
              <label className="label" htmlFor={`${fieldId}-line2`}>
                <span className="label-text">{tAddresses('fields.line2')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                id={`${fieldId}-line2`}
                name="line2"
                autoComplete={`${addressAutocompletePrefix}address-line2`}
                value={formData.line2}
                onChange={(e) => handleInputChange('line2', e.target.value)}
                placeholder={tAddresses('placeholders.line2')}
              />
            </div>
          ) : (
            <button type="button" className="link text-sm" onClick={() => setExpandLine2(true)}>
              {tAddresses('buttons.addLine2')}
            </button>
          )}

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label" htmlFor={`${fieldId}-city`}>
                <span className="label-text">{tAddresses('fields.city')} *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                id={`${fieldId}-city`}
                autoComplete={`${addressAutocompletePrefix}address-level2`}
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={tAddresses('placeholders.city')}
              />
            </div>

            {showRegion && (
              <div className="form-control">
                <label className="label" htmlFor={`${fieldId}-region`}>
                  <span className="label-text">
                    {shippingAutocomplete
                      ? tAddresses(`regionLabels.${subdivisionLabel(country)}`)
                      : tAddresses('fields.stateRegion')}
                    {requiresRegion ? ' *' : ''}
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  id={`${fieldId}-region`}
                  name="stateRegion"
                  autoComplete={`${addressAutocompletePrefix}address-level1`}
                  list={regions.length ? `${fieldId}-regions` : undefined}
                  value={formData.stateRegion ?? ''}
                  required={requiresRegion}
                  onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                  placeholder={tAddresses('placeholders.stateRegion')}
                />
                {regions.length > 0 && (
                  <datalist id={`${fieldId}-regions`}>
                    {regions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </datalist>
                )}
              </div>
            )}

            <div className="form-control">
              <label className="label" htmlFor={`${fieldId}-postcode`}>
                <span className="label-text">
                  {tAddresses('fields.postalCode')}
                  {requireLuluAddress ? ' *' : ''}
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                id={`${fieldId}-postcode`}
                autoComplete={`${addressAutocompletePrefix}postal-code`}
                value={formData.postalCode ?? ''}
                required={requireLuluAddress}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder={tAddresses('placeholders.postalCode')}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="form-control">
            <label className="label" htmlFor={`${fieldId}-phone`}>
              <span className="label-text">{tAddresses('fields.phone')}</span>
            </label>
            <input
              type="tel"
              className="input input-bordered"
              id={`${fieldId}-phone`}
              autoComplete={`${addressAutocompletePrefix}tel`}
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder={tAddresses('placeholders.phone')}
            />
          </div>
        </div>
        {saveError && (
          <p role="alert" className="text-sm text-error">
            {saveError}
          </p>
        )}
        <div className="card-actions justify-end mt-6">
          <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            <X className="w-4 h-4 mr-2" />
            {tAddresses('buttons.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {tAddresses('buttons.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
