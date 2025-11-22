'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiArrowLeft, FiMapPin, FiPrinter, FiBook } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { type Address as AddressType } from '@/components/AddressCard';
import type { PaymentOrderDetails } from '@/components/print-order/steps/PaymentStep';

// Lazy load step components
const StoryStep = dynamic(() => import('@/components/print-order/steps/StoryStep'));
const AddressStep = dynamic(() => import('@/components/print-order/steps/AddressStep'));
const PaymentStep = dynamic(() => import('@/components/print-order/steps/PaymentStep'));

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  authorId: string;
  frontCoverImageUrl?: string;
  chapterCount: number;
}

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
  // Added for ordering & auto-selection UX improvements
  createdAt?: string; // ISO 8601 string (timestamptz); may be absent on legacy rows
}

interface PrintingOption {
  serviceCode: string;
  credits: number;
  isActive: boolean;
  title: string;
  description: string;
}

type Step = 'story' | 'address' | 'payment';

interface PrintOrderContentProps {
  storyId: string;
}

export default function PrintOrderContent({ storyId }: PrintOrderContentProps) {
  const router = useRouter();
  const locale = useLocale();
  const tPrintOrder = useTranslations('PrintOrder');

  // Helper to consistently sort addresses by createdAt descending
  const sortAddresses = (list: Address[]): Address[] => {
    return [...list].sort((a: Address, b: Address) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  };

  const [currentStep, setCurrentStep] = useState<Step>('story');
  const [story, setStory] = useState<Story | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPrintingOption, setSelectedPrintingOption] = useState<PrintingOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateAddress, setShowCreateAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    loadStoryData();
    loadAddresses();
  }, [storyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStoryData = async () => {
    try {
      const response = await fetch(`/api/stories/${storyId}`);
      const data = await response.json();

      if (response.ok && data.story) {
        const storyData = data.story;
        if (storyData.status !== 'published') {
          setError(tPrintOrder('errors.storyNotPublished'));
          return;
        }
        setStory(storyData);
      } else {
        setError(data.error || tPrintOrder('errors.storyNotFound'));
      }
    } catch (err) {
      console.error('Error loading story:', err);
      setError(tPrintOrder('errors.loadingFailed'));
    }
  };
  const loadAddresses = async () => {
    try {
      const response = await fetch('/api/addresses');
      const data = await response.json();

      if (data.success) {
        const sorted = sortAddresses(data.addresses as Address[]);
        setAddresses(sorted);
        // Auto-select the most recent if none selected yet
        if (!selectedAddress && sorted.length > 0) {
          setSelectedAddress(sorted[0]);
        }
      } else {
        console.error('Error loading addresses:', data.error);
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
    } finally {
      setLoading(false);
    }
  };
  const handlePlaceOrder = async ({ numberOfCopies, totalCost }: PaymentOrderDetails) => {
    if (!story || !selectedAddress || !selectedPrintingOption) {
      setError(tPrintOrder('errors.missingRequiredFields'));
      return;
    }

    try {
      setOrderLoading(true);

      const response = await fetch('/api/print-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: story.storyId,
          shippingId: selectedAddress.addressId,
          printingOption: {
            serviceCode: selectedPrintingOption.serviceCode,
            credits: selectedPrintingOption.credits,
            title: selectedPrintingOption.title,
          },
          chapterCount: story.chapterCount,
          totalCost: totalCost,
          numberOfCopies: numberOfCopies,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to my-stories instead of confirmation step
        router.push(`/${locale}/my-stories`);
      } else {
        // Handle insufficient credits error specifically
        if (response.status === 402) {
          setError(
            `${tPrintOrder('errors.insufficientCredits')} ${data.required} credits required, ${data.available} available.`,
          );
        } else {
          setError(data.error || tPrintOrder('errors.orderFailed'));
        }
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError(tPrintOrder('errors.orderFailed'));
    } finally {
      setOrderLoading(false);
    }
  };
  const steps = [
    { id: 'story', title: tPrintOrder('steps.story'), icon: FiBook },
    { id: 'address', title: tPrintOrder('steps.address'), icon: FiMapPin },
    { id: 'payment', title: tPrintOrder('steps.payment'), icon: FiPrinter },
  ];

  const getCurrentStepIndex = () => steps.findIndex((step) => step.id === currentStep);

  const handleSaveAddress = async (addressData: AddressType) => {
    try {
      const isEditing = editingAddress !== null;
      const url = isEditing ? `/api/addresses/${editingAddress.addressId}` : '/api/addresses';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressData),
      });

      const data = await response.json();

      if (data.success) {
        if (isEditing) {
          setAddresses((prev: Address[]) => {
            const updated: Address[] = prev.map((addr: Address) =>
              addr.addressId === data.address.addressId ? data.address : addr,
            );
            return sortAddresses(updated);
          });
        } else {
          setAddresses((prev: Address[]) => {
            const updated: Address[] = [...prev, data.address];
            return sortAddresses(updated);
          });
          // Automatically select the newly created (most recent) address
          setSelectedAddress(data.address);
        }
        setShowCreateAddress(false);
        setEditingAddress(null);
      } else {
        throw new Error(data.error || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      throw error;
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setShowCreateAddress(true);
  };

  const handleDeleteAddress = async (address: Address) => {
    try {
      const response = await fetch(`/api/addresses/${address.addressId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setAddresses((prev: Address[]) => {
          const remaining: Address[] = prev.filter(
            (addr: Address) => addr.addressId !== address.addressId,
          );
          const sortedRemaining = sortAddresses(remaining);
          if (selectedAddress?.addressId === address.addressId) {
            setSelectedAddress(sortedRemaining[0] || null);
          }
          return sortedRemaining;
        });
      } else {
        throw new Error(data.error || 'Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  };

  const handleCancelAddressEdit = () => {
    setShowCreateAddress(false);
    setEditingAddress(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="alert alert-error max-w-md mx-auto">
            <span>{error}</span>
          </div>
          <Link href={`/${locale}/my-stories`} className="btn btn-primary mt-4">
            <FiArrowLeft className="w-4 h-4 mr-2" />
            {tPrintOrder('backToStories')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${locale}/my-stories`} className="btn btn-ghost btn-sm">
          <FiArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{tPrintOrder('title')}</h1>
          {story && <p className="text-base-content/70">{story.title}</p>}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-center items-center w-full space-x-12">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = index < getCurrentStepIndex();
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center gap-3">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                    isCompleted || isActive
                      ? 'bg-primary border-primary text-primary-content shadow-lg'
                      : 'bg-base-200 border-base-300 text-base-content'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-sm font-medium text-center ${
                    isCompleted || isActive ? 'text-primary' : 'text-base-content/70'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="card bg-base-200">
        <div className="card-body">
          {currentStep === 'story' && story && (
            <StoryStep story={story} onNext={() => setCurrentStep('address')} />
          )}

          {currentStep === 'address' && (
            <AddressStep
              addresses={addresses}
              selectedAddress={selectedAddress}
              onSelectAddress={setSelectedAddress}
              onSaveAddress={handleSaveAddress}
              onEditAddress={handleEditAddress}
              onDeleteAddress={handleDeleteAddress}
              onBack={() => setCurrentStep('story')}
              onNext={() => setCurrentStep('payment')}
              showCreateAddress={showCreateAddress}
              editingAddress={editingAddress}
              onShowCreateAddress={setShowCreateAddress}
              onCancelAddressEdit={handleCancelAddressEdit}
            />
          )}
          {currentStep === 'payment' && story && (
            <PaymentStep
              story={story}
              selectedPrintingOption={selectedPrintingOption}
              onSelectPrintingOption={setSelectedPrintingOption}
              onBack={() => setCurrentStep('address')}
              onPlaceOrder={handlePlaceOrder}
              loading={orderLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
