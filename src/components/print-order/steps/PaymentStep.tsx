'use client';

import { useUser } from '@clerk/nextjs';
import ModalPortal from '@/components/ModalPortal';
import { useTranslations } from 'next-intl';
import { CreditCard } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
  luluAddressIssue,
  luluPhonePattern,
  luluRequiresTaxId,
  luluShippingLimits,
} from '@/lib/print/lulu-shipping';

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  authorId: string;
  frontCoverImageUrl?: string;
  chapterCount: number;
}

export interface PrintingOption {
  serviceCode: string;
  credits: number;
  isActive: boolean;
  title: string;
  description: string;
  editionRevision?: string;
}

export interface PaymentOrderBreakdown {
  basePrice: number;
  extraChaptersCost: number;
  extraCopiesCost: number;
  shippingCost: number;
}

export interface PaymentOrderDetails {
  recipient?: { name: string; email: string; phone_number: string; recipient_tax_id?: string };
  numberOfCopies: number;
  totalCost: number;
  breakdown: PaymentOrderBreakdown;
}

interface PaymentStepProps {
  address: {
    country: string;
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    stateRegion?: string;
    phone?: string;
  };
  story: Story;
  selectedPrintingOption: PrintingOption | null;
  onSelectPrintingOption: (option: PrintingOption) => void;
  onBack: () => void;
  onPlaceOrder: (order: PaymentOrderDetails) => void;
  loading: boolean;
}

interface ServiceResponse {
  serviceCode: string;
  cost: number;
  isActive: boolean;
  name: string;
}

interface ServicesApiResponse {
  success: boolean;
  services: ServiceResponse[];
}

export default function PaymentStep({
  story,
  address,
  selectedPrintingOption,
  onSelectPrintingOption,
  onBack,
  onPlaceOrder,
  loading,
}: PaymentStepProps) {
  const tPrintOrder = useTranslations('PrintOrder');
  const locale = useLocale();
  const [extraChapterCost, setExtraChapterCost] = useState<number>(0);
  const [extraBookCopyCost, setExtraBookCopyCost] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [numberOfCopies, setNumberOfCopies] = useState<number>(1);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { user } = useUser();
  const [options, setOptions] = useState<PrintingOption[]>([]);
  const [requiresCarrierContact, setRequiresCarrierContact] = useState(false);
  const isSquare = Boolean(selectedPrintingOption?.editionRevision);
  const [recipientName, setRecipientName] = useState<string>();
  const [recipientEmail, setRecipientEmail] = useState<string>();
  const [recipientPhone, setRecipientPhone] = useState<string>();
  const [taxId, setTaxId] = useState('');
  const name = (recipientName ?? user?.fullName ?? '').trim();
  const email = (recipientEmail ?? user?.primaryEmailAddress?.emailAddress ?? '').trim();
  const phone = (recipientPhone ?? address.phone ?? '').trim();
  const country = address.country.toUpperCase();
  const needsTaxId = requiresCarrierContact && luluRequiresTaxId(country);
  const addressIssue = requiresCarrierContact
    ? luluAddressIssue({
        street1: address.line1,
        street2: address.line2,
        city: address.city,
        postcode: address.postalCode ?? '',
        country_code: country,
        state_code: address.stateRegion,
      })
    : undefined;
  const contactValid =
    !requiresCarrierContact ||
    (name.length > 0 &&
      name.length <= luluShippingLimits.name &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      phone.length <= luluShippingLimits.phone &&
      luluPhonePattern.test(phone) &&
      (!needsTaxId || taxId.trim().length > 0));

  const fetchPrintingOptions = useCallback(async () => {
    try {
      const [response, availability] = await Promise.all([
        fetch('/api/pricing/services'),
        fetch('/api/print-requests/options?' + new URLSearchParams({ storyId: story.storyId })),
      ]);
      if (!response.ok || !availability.ok) {
        throw new Error('Failed to fetch pricing data');
      }

      const data: ServicesApiResponse = await response.json();

      const settings = (await availability.json()) as {
        hardcoverAvailable: boolean;
        luluDefault: boolean;
        paperbackAvailable?: boolean;
        squareEditionRevision?: string;
      };
      setRequiresCarrierContact(settings.luluDefault || Boolean(settings.squareEditionRevision));
      const isSquare = Boolean(settings.squareEditionRevision);
      const formats = [
        ...(settings.paperbackAvailable !== false ? ['printedSoftCover'] : []),
        ...(settings.hardcoverAvailable ? ['printedHardCover'] : []),
      ].flatMap((serviceCode) => {
        const service = data.services.find((s) => s.isActive && s.serviceCode === serviceCode);
        if (!service) return [];
        const title = tPrintOrder(
          isSquare
            ? 'payment.squareHardcoverTitle'
            : serviceCode === 'printedHardCover'
              ? 'payment.hardcoverTitle'
              : 'payment.softcoverTitle',
        );
        return [
          {
            serviceCode,
            title,
            credits: service.cost,
            isActive: true,
            description: title,
            editionRevision: settings.squareEditionRevision,
          },
        ];
      });
      setOptions(formats);
      if (!formats.length && settings.paperbackAvailable === false) {
        setError(tPrintOrder('errors.squareUnavailable'));
        return;
      }
      if (!formats.length) throw new Error('No active print formats');
      if (
        isSquare &&
        !['shippingCost', 'extraBookCopy'].every((serviceCode) =>
          data.services.some((service) => service.serviceCode === serviceCode && service.isActive),
        )
      ) {
        setError(tPrintOrder('errors.squareUnavailable'));
        return;
      }

      // Get extra chapter cost
      const extraChapter = data.services.find(
        (service: ServiceResponse) =>
          service.isActive && service.serviceCode === 'extraChapterCost',
      );
      if (extraChapter) {
        setExtraChapterCost(extraChapter.cost);
      }

      // Get extra book copy cost
      const extraBookCopy = data.services.find(
        (service: ServiceResponse) => service.isActive && service.serviceCode === 'extraBookCopy',
      );
      if (extraBookCopy) {
        setExtraBookCopyCost(extraBookCopy.cost);
      }

      // Get shipping cost
      const shipping = data.services.find(
        (service: ServiceResponse) => service.isActive && service.serviceCode === 'shippingCost',
      );
      if (shipping) {
        setShippingCost(shipping.cost);
      }

      if (
        !formats.some(
          (format) =>
            format.serviceCode === selectedPrintingOption?.serviceCode &&
            format.credits === selectedPrintingOption.credits &&
            format.editionRevision === selectedPrintingOption.editionRevision,
        )
      )
        onSelectPrintingOption(formats[0]);
    } catch (error) {
      console.error('Error fetching printing options:', error);
      setError(tPrintOrder('errors.loadPricingFailed'));
    }
  }, [tPrintOrder, story.storyId, selectedPrintingOption, onSelectPrintingOption]);

  const fetchUserCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/my-credits');
      if (!response.ok) {
        throw new Error('Failed to fetch user credits');
      }
      const data = await response.json();
      setUserCredits(data.currentBalance || 0);
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setError(tPrintOrder('errors.fetchCreditsFailed'));
    }
  }, [tPrintOrder]);
  useEffect(() => {
    const fetchData = async () => {
      await fetchPrintingOptions();
      await fetchUserCredits();
      setLoadingData(false);
    };

    fetchData();
  }, [fetchPrintingOptions, fetchUserCredits]);
  const calculateExtraChapters = () => {
    // Base price includes first 4 chapters, charge for additional chapters only
    return isSquare ? 0 : Math.max(0, story.chapterCount - 4);
  };

  const calculateExtraCopiesCost = () => {
    // First copy is included in base price, charge for additional copies
    const extraCopies = Math.max(0, numberOfCopies - 1);
    return extraCopies * extraBookCopyCost;
  };

  const getCostBreakdown = (): PaymentOrderBreakdown | null => {
    if (!selectedPrintingOption) {
      return null;
    }
    const extraChapters = calculateExtraChapters();
    return {
      basePrice: selectedPrintingOption.credits,
      extraChaptersCost: extraChapters * extraChapterCost * numberOfCopies,
      extraCopiesCost: calculateExtraCopiesCost(),
      shippingCost,
    };
  };

  const calculateTotalCost = () => {
    const breakdown = getCostBreakdown();
    if (!breakdown) {
      return 0;
    }
    return (
      breakdown.basePrice +
      breakdown.extraChaptersCost +
      breakdown.extraCopiesCost +
      breakdown.shippingCost
    );
  };

  const hasInsufficientCredits = () => {
    const totalCost = calculateTotalCost();
    return userCredits < totalCost;
  };

  const canPlaceOrder = () => {
    return (
      !error &&
      !addressIssue &&
      contactValid &&
      options.some((option) => option.serviceCode === selectedPrintingOption?.serviceCode) &&
      !hasInsufficientCredits() &&
      !loading
    );
  };

  const handlePlaceOrderClick = () => {
    if (canPlaceOrder()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmOrder = () => {
    const breakdown = getCostBreakdown();
    if (!breakdown || !canPlaceOrder()) {
      return;
    }
    setShowConfirmModal(false);
    onPlaceOrder({
      numberOfCopies,
      totalCost: calculateTotalCost(),
      breakdown,
      ...(requiresCarrierContact
        ? {
            recipient: {
              name,
              email,
              phone_number: phone,
              ...(needsTaxId ? { recipient_tax_id: taxId.trim() } : {}),
            },
          }
        : {}),
    });
  };

  if (loadingData) {
    return (
      <div>
        <h2 className="card-title mb-4">{tPrintOrder('steps.payment')}</h2>
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="card-title mb-4">{tPrintOrder('steps.payment')}</h2>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
        <div className="card-actions justify-between mt-6">
          <button className="btn btn-ghost" onClick={onBack}>
            {tPrintOrder('buttons.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Order Summary & Credits Info */}
      {selectedPrintingOption && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{tPrintOrder('payment.orderSummary')}</h3>
            {options.length > 1 ? (
              <label className="form-control mb-4">
                {tPrintOrder('payment.binding')}
                <select
                  className="select select-bordered"
                  value={selectedPrintingOption.serviceCode}
                  onChange={(event) => {
                    const next = options.find(
                      (format) => format.serviceCode === event.target.value,
                    );
                    if (next) onSelectPrintingOption(next);
                  }}
                >
                  {options.map((format) => (
                    <option key={format.serviceCode} value={format.serviceCode}>
                      {format.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p>{selectedPrintingOption.title}</p>
            )}
            {requiresCarrierContact && (
              <fieldset className="grid gap-2 my-4">
                <legend className="font-semibold">{tPrintOrder('payment.recipient')}</legend>
                <label>
                  {tPrintOrder('payment.recipientName')}
                  <input
                    className="input input-bordered w-full"
                    autoComplete="shipping name"
                    maxLength={luluShippingLimits.name}
                    value={recipientName ?? user?.fullName ?? ''}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </label>
                <label>
                  {tPrintOrder('payment.recipientEmail')}
                  <input
                    className="input input-bordered w-full"
                    autoComplete="shipping email"
                    type="email"
                    value={recipientEmail ?? user?.primaryEmailAddress?.emailAddress ?? ''}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </label>
                <label>
                  {tPrintOrder('payment.recipientPhone')}
                  <input
                    className="input input-bordered w-full"
                    autoComplete="shipping tel"
                    type="tel"
                    maxLength={luluShippingLimits.phone}
                    value={recipientPhone ?? address.phone ?? ''}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </label>
                {needsTaxId && (
                  <label>
                    {tPrintOrder('payment.taxId')}
                    <input
                      className="input input-bordered w-full"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                    />
                  </label>
                )}
              </fieldset>
            )}
            {addressIssue && (
              <p className="alert alert-warning mt-3" role="alert">
                {tPrintOrder(`payment.${addressIssue}`)}
              </p>
            )}

            {/* Number of Copies Control */}
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold">{tPrintOrder('payment.numberOfCopies')}:</span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-sm btn-circle btn-outline"
                    onClick={() => setNumberOfCopies(Math.max(1, numberOfCopies - 1))}
                    disabled={numberOfCopies <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numberOfCopies}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setNumberOfCopies(Math.min(10, Math.max(1, value)));
                    }}
                    className="input input-sm input-bordered w-16 text-center"
                  />
                  <button
                    className="btn btn-sm btn-circle btn-outline"
                    onClick={() => setNumberOfCopies(Math.min(10, numberOfCopies + 1))}
                    disabled={numberOfCopies >= 10}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="divider my-2"></div>

              <div className="flex justify-between">
                <span>
                  {tPrintOrder('payment.basePrice')}
                  {!isSquare && ` (${tPrintOrder('payment.includesFourChapters')})`}:
                </span>
                <span>
                  {selectedPrintingOption.credits} {tPrintOrder('payment.credits')}
                </span>
              </div>
              {numberOfCopies > 1 && (
                <div className="flex justify-between">
                  <span>
                    {tPrintOrder('payment.extraBookCopies')} ({numberOfCopies - 1}):
                  </span>
                  <span>
                    {calculateExtraCopiesCost()} {tPrintOrder('payment.credits')}
                  </span>
                </div>
              )}
              {calculateExtraChapters() > 0 && (
                <div className="flex justify-between">
                  <span>
                    {tPrintOrder('payment.extraChapters')} ({calculateExtraChapters()}
                    {numberOfCopies > 1
                      ? ` × ${numberOfCopies} ${tPrintOrder('payment.copiesLabel')}`
                      : ''}
                    ):
                  </span>
                  <span>
                    {calculateExtraChapters() * extraChapterCost * numberOfCopies}{' '}
                    {tPrintOrder('payment.credits')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{tPrintOrder('payment.shippingCost')}:</span>
                <span>
                  {shippingCost} {tPrintOrder('payment.credits')}
                </span>
              </div>
              <div className="divider"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>{tPrintOrder('payment.total')}:</span>
                <span>
                  {calculateTotalCost()} {tPrintOrder('payment.credits')}
                </span>
              </div>
            </div>
          </div>

          {/* Credits Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{tPrintOrder('payment.method')}</h3>
            <div className="space-y-4">
              <div className="alert alert-info">
                <CreditCard className="w-5 h-5" />
                <span>{tPrintOrder('payment.creditsInfo')}</span>
              </div>{' '}
              {/* Credits Balance */}
              <div className="card bg-base-200 p-4">
                <div className="flex justify-center items-center gap-8">
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block mb-1">
                      {tPrintOrder('payment.cost')}
                    </span>
                    <div className="text-2xl font-bold text-primary">
                      {calculateTotalCost()} {tPrintOrder('payment.credits')}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block mb-1">
                      {tPrintOrder('payment.yourCredits')}
                    </span>
                    <div
                      className={`text-2xl font-bold ${hasInsufficientCredits() ? 'text-error' : 'text-success'}`}
                    >
                      {userCredits} {tPrintOrder('payment.credits')}
                    </div>
                  </div>
                </div>
              </div>
              {/* Insufficient Credits Warning */}
              {hasInsufficientCredits() && (
                <div className="alert alert-warning">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">
                      {tPrintOrder('payment.insufficientCreditsTitle')}
                    </span>
                    <span className="text-sm mt-2">
                      {tPrintOrder('payment.needMoreCredits', {
                        count: calculateTotalCost() - userCredits,
                      })}
                    </span>
                    <a
                      href={`/${locale}/pricing#buy-credits`}
                      className="btn btn-outline btn-sm mt-2"
                    >
                      {tPrintOrder('payment.getMoreCredits')}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card-actions justify-between mt-6">
        <button className="btn btn-ghost" onClick={onBack}>
          {tPrintOrder('buttons.back')}
        </button>
        <button
          className={`btn btn-primary ${loading ? 'loading' : ''}`}
          onClick={handlePlaceOrderClick}
          disabled={!canPlaceOrder()}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            tPrintOrder('buttons.placeOrder')
          )}
        </button>
      </div>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ModalPortal>
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">{tPrintOrder('payment.confirmOrder')}</h3>
              <p className="text-sm text-base-content/70 mb-6">
                {tPrintOrder('payment.confirmOrderDescription')}
              </p>
              <div className="modal-action">
                <button className="btn btn-primary" onClick={handleConfirmOrder}>
                  {tPrintOrder('buttons.confirm')}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>
                  {tPrintOrder('buttons.cancel')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
