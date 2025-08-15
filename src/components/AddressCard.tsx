'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiEdit, FiTrash2, FiCheck, FiX, FiMapPin } from 'react-icons/fi';

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
  defaultAddressType?: 'billing' | 'delivery';
}

const getCountries = (tAddresses: (key: string) => string): Array<{ value: string, label: string }> => {
  const countries = [
    { value: 'US', label: tAddresses('countries.us') },
    { value: 'GB', label: tAddresses('countries.gb') },
    { value: 'DE', label: tAddresses('countries.de') },
    { value: 'FR', label: tAddresses('countries.fr') },
    { value: 'ES', label: tAddresses('countries.es') },
    { value: 'IT', label: tAddresses('countries.it') },
    { value: 'PT', label: tAddresses('countries.pt') },
    { value: 'NL', label: tAddresses('countries.nl') },
    { value: 'BE', label: tAddresses('countries.be') },
    { value: 'CA', label: tAddresses('countries.ca') },
    { value: 'AU', label: tAddresses('countries.au') },
    { value: 'JP', label: tAddresses('countries.jp') },
    { value: 'BR', label: tAddresses('countries.br') },
  ];
  
  // Sort countries alphabetically by label
  return countries.sort((a, b) => a.label.localeCompare(b.label));
};

export default function AddressCard({
  address,
  mode,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  isSelected = false,
  onSelect,  hideAddressType = false,
  defaultAddressType = 'delivery'
}: AddressCardProps) {
  const tAddresses = useTranslations('Addresses');
  const countries = getCountries(tAddresses);
  const [formData, setFormData] = useState<Address>({
    addressId: address?.addressId || '',
    type: address?.type || defaultAddressType,
    line1: address?.line1 || '',
    line2: address?.line2 || '',
    city: address?.city || '',
    stateRegion: address?.stateRegion || '',
    postalCode: address?.postalCode || '',
    country: address?.country || 'US',
    phone: address?.phone || '',
    ...address
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleInputChange = (field: keyof Address, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.line1.trim() || !formData.city.trim() || !formData.country.trim()) {
      alert(tAddresses('validation.requiredFields'));
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving address:', error);
      alert(tAddresses('errors.saveFailed'));
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
        className={`card border-2 cursor-pointer transition-all ${
          isSelected 
            ? 'border-primary bg-primary/10' 
            : 'border-base-300 hover:border-base-400'
        }`}
        onClick={onSelect}
      >
        <div className="card-body">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <FiMapPin className="w-4 h-4 text-primary" />
              <span className="badge badge-outline">
                {tAddresses(`types.${address?.type || 'shipping'}`)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <FiEdit className="w-4 h-4" />
              </button>
              <button
                className="btn btn-ghost btn-sm text-error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleting}
              >
                {deleting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <FiTrash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-2">
            <p className="font-medium">{address?.line1}</p>
            {address?.line2 && <p>{address.line2}</p>}
            <p>
              {address?.city}
              {address?.stateRegion && `, ${address.stateRegion}`}
              {address?.postalCode && ` ${address.postalCode}`}
            </p>
            <p>{countries.find(c => c.value === address?.country)?.label || address?.country}</p>
            {address?.phone && <p className="text-sm text-base-content/70">{address.phone}</p>}
          </div>
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
        </div>        <div className="space-y-4">
          {/* Address Type - only show if not hidden */}
          {!hideAddressType && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{tAddresses('fields.type')}</span>
              </label>            <select
              className="select select-bordered"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as 'billing' | 'delivery')}
            >
              <option value="delivery">{tAddresses('types.delivery')}</option>
              <option value="billing">{tAddresses('types.billing')}</option>
            </select>
            </div>
          )}

          {/* Address Line 1 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{tAddresses('fields.line1')} *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.line1}
              onChange={(e) => handleInputChange('line1', e.target.value)}
              placeholder={tAddresses('placeholders.line1')}
            />
          </div>

          {/* Address Line 2 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{tAddresses('fields.line2')}</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.line2}
              onChange={(e) => handleInputChange('line2', e.target.value)}
              placeholder={tAddresses('placeholders.line2')}
            />
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{tAddresses('fields.city')} *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={tAddresses('placeholders.city')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{tAddresses('fields.stateRegion')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.stateRegion}
                onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                placeholder={tAddresses('placeholders.stateRegion')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{tAddresses('fields.postalCode')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder={tAddresses('placeholders.postalCode')}
              />
            </div>
          </div>

          {/* Country */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{tAddresses('fields.country')} *</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{tAddresses('fields.phone')}</span>
            </label>
            <input
              type="tel"
              className="input input-bordered"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder={tAddresses('placeholders.phone')}
            />
          </div>
        </div>

        <div className="card-actions justify-end mt-6">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={saving}
          >
            <FiX className="w-4 h-4 mr-2" />
            {tAddresses('buttons.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <FiCheck className="w-4 h-4 mr-2" />
                {tAddresses('buttons.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
