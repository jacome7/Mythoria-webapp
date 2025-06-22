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

const getCountries = (t: (key: string) => string): Array<{ value: string, label: string }> => {
  const countries = [
    { value: 'US', label: t('countries.us') },
    { value: 'GB', label: t('countries.gb') },
    { value: 'DE', label: t('countries.de') },
    { value: 'FR', label: t('countries.fr') },
    { value: 'ES', label: t('countries.es') },
    { value: 'IT', label: t('countries.it') },
    { value: 'PT', label: t('countries.pt') },
    { value: 'NL', label: t('countries.nl') },
    { value: 'BE', label: t('countries.be') },
    { value: 'CA', label: t('countries.ca') },
    { value: 'AU', label: t('countries.au') },
    { value: 'JP', label: t('countries.jp') },
    { value: 'BR', label: t('countries.br') },
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
  const t = useTranslations('Addresses');
  const countries = getCountries(t);
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
      alert(t('validation.requiredFields'));
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving address:', error);
      alert(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete'))) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert(t('errors.deleteFailed'));
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
                {t(`types.${address?.type || 'shipping'}`)}
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
            {mode === 'create' ? t('addAddress') : t('editAddress')}
          </h3>
        </div>        <div className="space-y-4">
          {/* Address Type - only show if not hidden */}
          {!hideAddressType && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('fields.type')}</span>
              </label>            <select
              className="select select-bordered"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as 'billing' | 'delivery')}
            >
              <option value="delivery">{t('types.delivery')}</option>
              <option value="billing">{t('types.billing')}</option>
            </select>
            </div>
          )}

          {/* Address Line 1 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('fields.line1')} *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.line1}
              onChange={(e) => handleInputChange('line1', e.target.value)}
              placeholder={t('placeholders.line1')}
            />
          </div>

          {/* Address Line 2 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('fields.line2')}</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.line2}
              onChange={(e) => handleInputChange('line2', e.target.value)}
              placeholder={t('placeholders.line2')}
            />
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('fields.city')} *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={t('placeholders.city')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('fields.stateRegion')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.stateRegion}
                onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                placeholder={t('placeholders.stateRegion')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('fields.postalCode')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder={t('placeholders.postalCode')}
              />
            </div>
          </div>

          {/* Country */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('fields.country')} *</span>
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
              <span className="label-text">{t('fields.phone')}</span>
            </label>
            <input
              type="tel"
              className="input input-bordered"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder={t('placeholders.phone')}
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
            {t('buttons.cancel')}
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
                {t('buttons.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
