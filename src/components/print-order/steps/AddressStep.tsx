'use client';

import { useTranslations } from 'next-intl';
import { FiPlus } from 'react-icons/fi';
import AddressCard, { type Address as AddressType } from '@/components/AddressCard';

interface Address {
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

interface AddressStepProps {
  addresses: Address[];
  selectedAddress: Address | null;
  onSelectAddress: (address: Address) => void;
  onSaveAddress: (address: AddressType) => Promise<void>;
  onEditAddress: (address: Address) => void;
  onDeleteAddress: (address: Address) => Promise<void>;
  onBack: () => void;
  onNext: () => void;
  showCreateAddress: boolean;
  editingAddress: Address | null;
  onShowCreateAddress: (show: boolean) => void;
  onCancelAddressEdit: () => void;
}

export default function AddressStep({
  addresses,
  selectedAddress,
  onSelectAddress,
  onSaveAddress,
  onEditAddress,
  onDeleteAddress,
  onBack,
  onNext,
  showCreateAddress,
  editingAddress,
  onShowCreateAddress,
  onCancelAddressEdit,
}: AddressStepProps) {
  const tPrintOrder = useTranslations('PrintOrder');

  return (
    <div>
      <h2 className="card-title mb-4">{tPrintOrder('steps.address')}</h2>
      <p className="mb-4">{tPrintOrder('addressInfo.selectShipping')}</p>
      
      {showCreateAddress || editingAddress ? (
        <AddressCard
          address={editingAddress || undefined}
          mode={editingAddress ? 'edit' : 'create'}
          onSave={onSaveAddress}
          onEdit={() => {}}
          onDelete={async () => {}}
          onCancel={onCancelAddressEdit}
          hideAddressType={true}
          defaultAddressType="delivery"
        />
      ) : (
        <div>
          {addresses.length === 0 ? (
            <div className="alert alert-warning mb-4">
              <span>{tPrintOrder('addressInfo.noAddresses')}</span>
            </div>
          ) : (
            <div className="space-y-4 mb-4">
              {addresses.map((address) => (
                <AddressCard
                  key={address.addressId}
                  address={address}
                  mode="view"
                  onSave={onSaveAddress}
                  onEdit={() => onEditAddress(address)}
                  onDelete={() => onDeleteAddress(address)}
                  isSelected={selectedAddress?.addressId === address.addressId}
                  onSelect={() => onSelectAddress(address)}
                />
              ))}
            </div>
          )}
          
          <button
            className="btn btn-outline mb-4"
            onClick={() => onShowCreateAddress(true)}
          >
            <FiPlus className="w-4 h-4 mr-2" />
            {tPrintOrder('addressInfo.addNewAddress')}
          </button>
        </div>
      )}
      
      {!showCreateAddress && !editingAddress && (
        <div className="card-actions justify-between mt-6">
          <button 
            className="btn btn-ghost"
            onClick={onBack}
          >
            {tPrintOrder('buttons.back')}
          </button>
          <button 
            className="btn btn-primary"
            onClick={onNext}
            disabled={!selectedAddress}
          >
            {tPrintOrder('buttons.continue')}
          </button>
        </div>
      )}
    </div>
  );
}
