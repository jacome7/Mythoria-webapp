'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiArrowLeft, FiPrinter, FiCheck, FiMapPin, FiCreditCard, FiBook, FiPlus } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import AddressCard, { type Address as AddressType } from '@/components/AddressCard';

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  pdfUri: string;
  authorId: string;
  frontCoverImageUrl?: string;
}

interface PrintProvider {
  id: string;
  name: string;
  companyName: string;
  prices: {
    paperback: {
      basePrice: number;
      perPagePrice: number;
      minPages: number;
      maxPages: number;
    };
    hardcover: {
      basePrice: number;
      perPagePrice: number;
      minPages: number;
      maxPages: number;
    };
    shipping: {
      standard: number;
      express: number;
      free_threshold: number;
    };
  };
  availableCountries: string[];
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

type Step = 'story' | 'address' | 'provider' | 'payment' | 'confirmation';

export default function PrintOrderPage() {
  const { storyId } = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('PrintOrder');
  const [currentStep, setCurrentStep] = useState<Step>('story');
  const [story, setStory] = useState<Story | null>(null);
  const [providers, setProviders] = useState<PrintProvider[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PrintProvider | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'paperback' | 'hardcover'>('paperback');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateAddress, setShowCreateAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [printOrderPricing, setPrintOrderPricing] = useState<{ credits: number } | null>(null);  useEffect(() => {
    loadStoryData();
    loadProviders();
    loadAddresses();
    loadPrintOrderPricing();
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
        if (!storyData.pdfUri) {
          setError(t('errors.pdfNotAvailable'));
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

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/print-providers');
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error('Error loading providers:', err);
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
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrintOrderPricing = async () => {
    try {
      const response = await fetch('/api/pricing/services?serviceCode=printOrder');
      const data = await response.json();
      
      if (data.success && data.pricing) {
        setPrintOrderPricing(data.pricing);
      } else {
        console.error('Error loading print order pricing:', data.error);
      }
    } catch (err) {
      console.error('Error loading print order pricing:', err);
    }
  };
  const calculatePrice = (provider: PrintProvider, format: 'paperback' | 'hardcover') => {
    // Assuming 200 pages for demo - this should come from the story data
    const pageCount = 200;
    const formatPricing = provider.prices[format];
    const basePrice = formatPricing.basePrice;
    const pagePrice = formatPricing.perPagePrice * pageCount;
    const subtotal = basePrice + pagePrice;
    const shippingCost = provider.prices.shipping.standard;
    
    // Add print order cost from database pricing if available
    const printOrderCost = printOrderPricing ? printOrderPricing.credits : 0;
    const total = subtotal + shippingCost + printOrderCost;
    
    return {
      subtotal,
      shipping: shippingCost,
      printOrderCost,
      total,
      pageCount
    };
  };

  const handlePlaceOrder = async () => {
    if (!story || !selectedProvider || !selectedAddress) {
      setError(t('errors.missingRequiredFields'));
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/print-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: story.storyId,
          pdfUrl: story.pdfUri,
          printProviderId: selectedProvider.id,
          shippingId: selectedAddress.addressId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStep('confirmation');
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
      setLoading(false);
    }
  };
  const steps = [
    { id: 'story', title: t('steps.story'), icon: FiBook },
    { id: 'address', title: t('steps.address'), icon: FiMapPin },
    { id: 'provider', title: t('steps.provider'), icon: FiPrinter },
    { id: 'payment', title: t('steps.payment'), icon: FiCreditCard },
    { id: 'confirmation', title: t('steps.confirmation'), icon: FiCheck },
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

      const data = await response.json();      if (data.success) {
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
      <div className="min-h-screen bg-base-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 p-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <div className="max-w-4xl mx-auto">
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
          <ul className="steps steps-horizontal w-full">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < getCurrentStepIndex();
              const Icon = step.icon;
              
              return (
                <li 
                  key={step.id}
                  className={`step ${isCompleted || isActive ? 'step-primary' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{step.title}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Step Content */}
        <div className="card bg-base-200">
          <div className="card-body">
            
            {currentStep === 'story' && story && (
              <div>
                <h2 className="card-title mb-4">{story.title}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="prose max-w-none">
                    <p>{story.synopsis}</p>
                  </div>
                  
                  {/* Front Cover Image - Desktop: right side, Mobile: below synopsis */}
                  {story.frontCoverImageUrl && (
                    <div className="flex justify-center md:justify-end">
                      <div className="relative w-64 h-80 rounded-lg overflow-hidden shadow-lg">
                        <Image
                          src={story.frontCoverImageUrl}
                          alt={`Front cover of ${story.title}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 256px"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="card-actions justify-end mt-6">
                  <button 
                    className="btn btn-primary"
                    onClick={() => setCurrentStep('address')}
                  >
                    {t('buttons.continue')}
                  </button>
                </div>
              </div>
            )}            {currentStep === 'address' && (
              <div>
                <h2 className="card-title mb-4">{t('steps.address')}</h2>
                <p className="mb-4">{t('addressInfo.selectShipping')}</p>
                  {showCreateAddress || editingAddress ? (
                  <AddressCard
                    address={editingAddress || undefined}
                    mode={editingAddress ? 'edit' : 'create'}
                    onSave={handleSaveAddress}
                    onEdit={() => {}}
                    onDelete={async () => {}}
                    onCancel={handleCancelAddressEdit}                    hideAddressType={true}
                    defaultAddressType="delivery"
                  />
                ) : (
                  <div>
                    {addresses.length === 0 ? (
                      <div className="alert alert-warning mb-4">
                        <span>{t('addressInfo.noAddresses')}</span>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-4">
                        {addresses.map((address) => (
                          <AddressCard
                            key={address.addressId}
                            address={address}
                            mode="view"
                            onSave={handleSaveAddress}
                            onEdit={() => handleEditAddress(address)}
                            onDelete={() => handleDeleteAddress(address)}
                            isSelected={selectedAddress?.addressId === address.addressId}
                            onSelect={() => setSelectedAddress(address)}
                          />
                        ))}
                      </div>
                    )}
                    
                    <button
                      className="btn btn-outline mb-4"
                      onClick={() => setShowCreateAddress(true)}
                    >
                      <FiPlus className="w-4 h-4 mr-2" />
                      {t('addressInfo.addNewAddress')}
                    </button>
                  </div>
                )}
                
                {!showCreateAddress && !editingAddress && (
                  <div className="card-actions justify-between mt-6">
                    <button 
                      className="btn btn-ghost"
                      onClick={() => setCurrentStep('story')}
                    >
                      {t('buttons.back')}
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setCurrentStep('provider')}
                      disabled={!selectedAddress}
                    >
                      {t('buttons.continue')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'provider' && (
              <div>
                <h2 className="card-title mb-4">{t('steps.provider')}</h2>
                <p className="mb-4">{t('providerInfo.selectProvider')}</p>
                
                <div className="mb-4">
                  <div className="tabs tabs-bordered">
                    <a 
                      className={`tab ${selectedFormat === 'paperback' ? 'tab-active' : ''}`}
                      onClick={() => setSelectedFormat('paperback')}
                    >
                      {t('formats.paperback')}
                    </a>
                    <a 
                      className={`tab ${selectedFormat === 'hardcover' ? 'tab-active' : ''}`}
                      onClick={() => setSelectedFormat('hardcover')}
                    >
                      {t('formats.hardcover')}
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  {providers.map((provider) => {
                    const pricing = calculatePrice(provider, selectedFormat);
                    
                    return (
                      <div 
                        key={provider.id}
                        className={`card border-2 cursor-pointer ${
                          selectedProvider?.id === provider.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-base-300'
                        }`}
                        onClick={() => setSelectedProvider(provider)}
                      >
                        <div className="card-body">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="card-title">{provider.name}</h3>
                              <p className="text-sm text-base-content/70">{provider.companyName}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">${pricing.total.toFixed(2)}</div>
                              <div className="text-sm text-base-content/70">
                                ${pricing.subtotal.toFixed(2)} + ${pricing.shipping.toFixed(2)} shipping
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-base-content/70 mt-2">
                            {pricing.pageCount} pages • {selectedFormat}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="card-actions justify-between mt-6">
                  <button 
                    className="btn btn-ghost"
                    onClick={() => setCurrentStep('address')}
                  >
                    {t('buttons.back')}
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setCurrentStep('payment')}
                    disabled={!selectedProvider}
                  >
                    {t('buttons.continue')}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'payment' && selectedProvider && (
              <div>
                <h2 className="card-title mb-4">{t('steps.payment')}</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">{t('payment.orderSummary')}</h3>
                      <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{story?.title} ({selectedFormat})</span>
                        <span>${calculatePrice(selectedProvider, selectedFormat).subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('payment.shipping')}</span>
                        <span>${calculatePrice(selectedProvider, selectedFormat).shipping.toFixed(2)}</span>
                      </div>
                      {calculatePrice(selectedProvider, selectedFormat).printOrderCost > 0 && (
                        <div className="flex justify-between">
                          <span>{t('payment.printOrderFee')}</span>
                          <span>{calculatePrice(selectedProvider, selectedFormat).printOrderCost} {t('payment.credits')}</span>
                        </div>
                      )}
                      <div className="divider"></div>
                      <div className="flex justify-between font-bold">
                        <span>{t('payment.total')}</span>
                        <span>
                          ${(calculatePrice(selectedProvider, selectedFormat).total - calculatePrice(selectedProvider, selectedFormat).printOrderCost).toFixed(2)}
                          {calculatePrice(selectedProvider, selectedFormat).printOrderCost > 0 && (
                            <span className="text-sm font-normal"> + {calculatePrice(selectedProvider, selectedFormat).printOrderCost} {t('payment.credits')}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">{t('payment.method')}</h3>
                    <div className="alert alert-info">
                      <FiCreditCard className="w-5 h-5" />
                      <span>{t('payment.creditsInfo')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="card-actions justify-between mt-6">
                  <button 
                    className="btn btn-ghost"
                    onClick={() => setCurrentStep('provider')}
                  >
                    {t('buttons.back')}
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handlePlaceOrder}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      t('buttons.placeOrder')
                    )}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'confirmation' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-success text-success-content rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-bold mb-4">{t('confirmation.title')}</h2>
                <p className="mb-6">{t('confirmation.message')}</p>
                
                <div className="space-y-2 mb-6">
                  <button 
                    className="btn btn-outline"
                    onClick={() => router.push(`/${locale}/my-stories`)}
                  >
                    {t('buttons.backToStories')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
