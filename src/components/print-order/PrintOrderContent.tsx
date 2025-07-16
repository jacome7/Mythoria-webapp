'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiArrowLeft, FiMapPin, FiPrinter, FiBook } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';
import { type Address as AddressType } from '@/components/AddressCard';
import { getEnvironmentConfig } from '../../../config/environment';

// Lazy load step components
const StoryStep = dynamic(() => import('@/components/print-order/steps/StoryStep'));
const AddressStep = dynamic(() => import('@/components/print-order/steps/AddressStep'));
const PaymentStep = dynamic(() => import('@/components/print-order/steps/PaymentStep'));

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  pdfUri?: string;
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
  const t = useTranslations('PrintOrder');
  const { user } = useUser();

  const [currentStep, setCurrentStep] = useState<Step>('story');
  const [story, setStory] = useState<Story | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPrintingOption, setSelectedPrintingOption] = useState<PrintingOption | null>(null);  const [loading, setLoading] = useState(true);
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
          setError(t('errors.storyNotPublished'));
          return;
        }
        setStory(storyData);
      } else {
        setError(data.error || t('errors.storyNotFound'));
      }
    } catch (err) {
      console.error('Error loading story:', err);
      setError(t('errors.loadingFailed'));
    }
  };
  const loadAddresses = async () => {
    try {
      const response = await fetch('/api/addresses');
      const data = await response.json();
      
      if (data.success) {
        setAddresses(data.addresses);
      } else {
        console.error('Error loading addresses:', data.error);
      }    } catch (err) {
      console.error('Error loading addresses:', err);
    } finally {
      setLoading(false);
    }
  };  const handlePlaceOrder = async () => {
    if (!story || !selectedAddress || !selectedPrintingOption) {
      setError(t('errors.missingRequiredFields'));
      return;
    }

    // Calculate total cost including extra chapters
    const extraChapters = Math.max(0, story.chapterCount - 4);
    const extraChapterCost = 2; // This should ideally come from the pricing API
    const totalCost = selectedPrintingOption.credits + (extraChapters * extraChapterCost);

    try {
      setOrderLoading(true);
      
      // Create ticket in admin system for print request
      const config = getEnvironmentConfig();
      try {
        const ticketResponse = await fetch(`${config.admin.apiUrl}/api/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: 'print_request',
            storyId: story.storyId,
            userId: user?.id,
            shippingAddress: {
              addressId: selectedAddress.addressId,
              line1: selectedAddress.line1,
              line2: selectedAddress.line2,
              city: selectedAddress.city,
              postalCode: selectedAddress.postalCode,
              country: selectedAddress.country,
              phone: selectedAddress.phone,
            },
            printFormat: selectedPrintingOption.serviceCode,
          })
        });

        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json();
          console.log('Print request ticket created:', ticketData.id);
        } else {
          console.warn('Failed to create print request ticket:', await ticketResponse.text());
          // Don't fail the entire process if ticket creation fails
        }
      } catch (ticketError) {
        console.warn('Print request ticket creation failed:', ticketError);
        // Don't fail the entire process if ticket creation fails
      }
      
      const response = await fetch('/api/print-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: story.storyId,
          pdfUrl: story.pdfUri || null,
          shippingId: selectedAddress.addressId,
          printingOption: {
            serviceCode: selectedPrintingOption.serviceCode,
            credits: selectedPrintingOption.credits,
            title: selectedPrintingOption.title
          },
          chapterCount: story.chapterCount,
          totalCost: totalCost,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to my-stories instead of confirmation step
        router.push(`/${locale}/my-stories`);
      } else {
        // Handle insufficient credits error specifically
        if (response.status === 402) {
          setError(`${t('errors.insufficientCredits')} ${data.required} credits required, ${data.available} available.`);
        } else {
          setError(data.error || t('errors.orderFailed'));
        }
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError(t('errors.orderFailed'));
    } finally {
      setOrderLoading(false);
    }
  };  const steps = [
    { id: 'story', title: t('steps.story'), icon: FiBook },
    { id: 'address', title: t('steps.address'), icon: FiMapPin },
    { id: 'payment', title: t('steps.payment'), icon: FiPrinter },
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);

  const handleSaveAddress = async (addressData: AddressType) => {
    try {
      const isEditing = editingAddress !== null;
      const url = isEditing 
        ? `/api/addresses/${editingAddress.addressId}`
        : '/api/addresses';
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
          setAddresses(prev => 
            prev.map(addr => addr.addressId === data.address.addressId ? data.address : addr)
          );
        } else {
          setAddresses(prev => [...prev, data.address]);
          // Automatically select the newly created address
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
        setAddresses(prev => prev.filter(addr => addr.addressId !== address.addressId));
        if (selectedAddress?.addressId === address.addressId) {
          setSelectedAddress(null);
        }
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
          <Link
            href={`/${locale}/my-stories`}
            className="btn btn-primary mt-4"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            {t('backToStories')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${locale}/my-stories`}
          className="btn btn-ghost btn-sm"
        >
          <FiArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          {story && (
            <p className="text-base-content/70">{story.title}</p>
          )}
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
              <div 
                key={step.id}
                className="flex flex-col items-center gap-3"
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                  isCompleted || isActive 
                    ? 'bg-primary border-primary text-primary-content shadow-lg' 
                    : 'bg-base-200 border-base-300 text-base-content'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-sm font-medium text-center ${
                  isCompleted || isActive ? 'text-primary' : 'text-base-content/70'
                }`}>
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
            <StoryStep 
              story={story}
              onNext={() => setCurrentStep('address')}
            />
          )}

          {currentStep === 'address' && (
            <AddressStep
              addresses={addresses}
              selectedAddress={selectedAddress}              onSelectAddress={setSelectedAddress}
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
          )}          {currentStep === 'payment' && story && (
            <PaymentStep
              story={story}              selectedPrintingOption={selectedPrintingOption}
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
