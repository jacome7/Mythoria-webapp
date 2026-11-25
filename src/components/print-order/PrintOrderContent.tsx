'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, BookOpen, MapPin, Printer } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { type Address as AddressType } from '@/components/AddressCard';
import { getGoogleAnalyticsContext, trackPaidAction } from '@/lib/analytics';
import { conversions } from '@/lib/openai-ads/events';
import { trackOpenAiAdsEvent } from '@/lib/openai-ads/pixel';
import type {
  PaymentOrderDetails,
  PrintingOption,
} from '@/components/print-order/steps/PaymentStep';

// Lazy load step components
const StoryStep = dynamic(() => import('@/components/print-order/steps/StoryStep'));
const AddressStep = dynamic(() => import('@/components/print-order/steps/AddressStep'));
const PaymentStep = dynamic(() => import('@/components/print-order/steps/PaymentStep'));

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  bookType?: string;
  editionRevision?: string;
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

type Step = 'story' | 'address' | 'payment';

interface PrintOrderSubmission {
  body: string;
  storageKey: string;
  storyId: string;
  numberOfCopies: number;
  totalCost: number;
}

interface PrintOrderContentProps {
  storyId: string;
}

export default function PrintOrderContent({ storyId }: PrintOrderContentProps) {
  const [accepted, setAccepted] = useState(false);
  const intent = useRef<{ key: string; id: string } | null>(null);
  const submittingOrder = useRef(false);
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
  const [orderError, setOrderError] = useState<string | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<PrintOrderSubmission | null>(null);
  const [paymentRefreshVersion, setPaymentRefreshVersion] = useState(0);
  const [showCreateAddress, setShowCreateAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const loadStoryData = async () => {
    try {
      const response = await fetch(`/api/print-requests/story/${storyId}`);
      const data = await response.json();

      if (response.ok && data.story) {
        const storyData = data.story;
        if (storyData.status !== 'published') {
          setError(tPrintOrder('errors.storyNotPublished'));
          return false;
        }
        setStory(storyData);
        return true;
      } else {
        setError(tPrintOrder('errors.storyNotFound'));
      }
    } catch (err) {
      console.error('Error loading story:', err);
      setError(tPrintOrder('errors.loadingFailed'));
    }
    return false;
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

  useEffect(() => {
    loadStoryData();
    loadAddresses();
  }, [storyId]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewCurrentEdition = async () => {
    if (await loadStoryData()) {
      setSelectedPrintingOption(null);
      setCurrentStep('story');
      setOrderError(tPrintOrder('errors.editionChanged'));
    }
  };

  const handlePlaceOrder = async (details?: PaymentOrderDetails) => {
    if (submittingOrder.current) return;

    submittingOrder.current = true;
    let submission = pendingSubmission;
    try {
      setOrderLoading(true);
      setOrderError(null);
      if (!submission) {
        if (!details || !story || !selectedAddress || !selectedPrintingOption) {
          setOrderError(tPrintOrder('errors.missingRequiredFields'));
          return;
        }
        if (story.editionRevision !== selectedPrintingOption.editionRevision) {
          await reviewCurrentEdition();
          return;
        }
        const { numberOfCopies, totalCost, recipient } = details;
        const { serviceCode, editionRevision } = selectedPrintingOption;
        const analyticsContext = await getGoogleAnalyticsContext();
        const key = JSON.stringify([
          story.storyId,
          selectedAddress.addressId,
          serviceCode,
          numberOfCopies,
          totalCost,
          recipient,
          ...(editionRevision ? [editionRevision] : []),
        ]);
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
        const fingerprint = Array.from(new Uint8Array(hash), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
        const storageKey = 'mythoria:print-intent:' + fingerprint;
        if (intent.current?.key !== key) {
          const id = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
          sessionStorage.setItem(storageKey, id);
          intent.current = { key, id };
        }
        submission = {
          storageKey,
          storyId: story.storyId,
          numberOfCopies,
          totalCost,
          body: JSON.stringify({
            checkout: {
              storyId: story.storyId,
              shippingId: selectedAddress.addressId,
              recipient,
              intentId: intent.current.id,
              printingOption: { serviceCode, editionRevision },
              totalCost,
              numberOfCopies,
              analyticsContext,
            },
          }),
        };
      }

      const response = await fetch('/api/print-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: submission.body,
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.removeItem(submission.storageKey);
        intent.current = null;
        setPendingSubmission(null);
        setAccepted(true);
        trackPaidAction({
          action_type: 'print',
          story_id: submission.storyId,
          credits_spent: submission.totalCost,
        });
        if (typeof data.adEventId === 'string' && data.adEventId) {
          const printRequestId = typeof data.request?.id === 'string' ? data.request.id : '';
          trackOpenAiAdsEvent({
            ...conversions.printOrderRequested(printRequestId, submission.numberOfCopies),
            eventId: data.adEventId,
          });
        }
      } else if (response.status >= 500) {
        setPendingSubmission(submission);
        setOrderError(tPrintOrder('errors.orderPending'));
      } else {
        setPendingSubmission(null);
        if (response.status === 402) {
          setOrderError(tPrintOrder('errors.insufficientCredits'));
          setPaymentRefreshVersion((version) => version + 1);
        } else if (data.code === 'print_edition_changed') {
          await reviewCurrentEdition();
        } else if (data.code === 'pricing_changed' || data.code === 'printing_option_unavailable') {
          setOrderError(tPrintOrder('errors.pricingChanged'));
          setPaymentRefreshVersion((version) => version + 1);
        } else if (
          data.code === 'square_print_unavailable' ||
          data.code === 'square_edition_unavailable'
        ) {
          setOrderError(tPrintOrder('errors.squareUnavailable'));
          setPaymentRefreshVersion((version) => version + 1);
        } else if (
          data.code === 'country_unsupported' ||
          data.code === 'square_lulu_country_unavailable' ||
          data.code === 'address_unavailable'
        ) {
          setOrderError(tPrintOrder('errors.destinationUnavailable'));
          setCurrentStep('address');
        } else if (data.code === 'shipping_details_required') {
          setOrderError(tPrintOrder('errors.shippingDetailsRequired'));
          setPaymentRefreshVersion((version) => version + 1);
        } else {
          setOrderError(tPrintOrder('errors.orderFailed'));
        }
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setPendingSubmission(submission);
      setOrderError(tPrintOrder(submission ? 'errors.orderPending' : 'errors.orderFailed'));
    } finally {
      submittingOrder.current = false;
      setOrderLoading(false);
    }
  };
  const steps = [
    { id: 'story', title: tPrintOrder('steps.story'), icon: BookOpen },
    { id: 'address', title: tPrintOrder('steps.address'), icon: MapPin },
    { id: 'payment', title: tPrintOrder('steps.payment'), icon: Printer },
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
          setSelectedAddress((current) =>
            current?.addressId === data.address.addressId ? data.address : current,
          );
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

  if (accepted)
    return (
      <main className="container max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">{tPrintOrder('confirmation.title')}</h1>
        <p className="my-4">{tPrintOrder('confirmation.message')}</p>
        <Link className="btn btn-primary" href={`/${locale}/my-stories`}>
          {tPrintOrder('buttons.backToStories')}
        </Link>
      </main>
    );

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
            <ArrowLeft className="w-4 h-4 mr-2" />
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
          <ArrowLeft className="w-4 h-4" />
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
          {orderError && (
            <div className="alert alert-warning mb-3" role="alert">
              <span>{orderError}</span>
              {pendingSubmission && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void handlePlaceOrder()}
                  disabled={orderLoading}
                >
                  {tPrintOrder('buttons.checkOrder')}
                </button>
              )}
            </div>
          )}
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
          {currentStep === 'payment' && story && selectedAddress && (
            <fieldset className="min-w-0" disabled={orderLoading || Boolean(pendingSubmission)}>
              <PaymentStep
                address={selectedAddress}
                story={story}
                selectedPrintingOption={selectedPrintingOption}
                onSelectPrintingOption={setSelectedPrintingOption}
                onBack={() => setCurrentStep('address')}
                onPlaceOrder={handlePlaceOrder}
                loading={orderLoading}
                refreshVersion={paymentRefreshVersion}
              />
            </fieldset>
          )}
        </div>
      </div>
    </div>
  );
}
