'use client';

import { useTranslations } from 'next-intl';
import { FiCreditCard } from 'react-icons/fi';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  authorId: string;
  frontCoverImageUrl?: string;
  chapterCount: number;
}

interface PrintingOption {
  serviceCode: string;
  credits: number;
  isActive: boolean;
  title: string;
  description: string;
}

interface PaymentStepProps {
  story: Story;
  selectedPrintingOption: PrintingOption | null;
  onSelectPrintingOption: (option: PrintingOption) => void;
  onBack: () => void;
  onPlaceOrder: (numberOfCopies: number) => void;
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

  const fetchPrintingOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/pricing/services');
      if (!response.ok) {
        throw new Error('Failed to fetch pricing data');
      }

      const data: ServicesApiResponse = await response.json();

      // Filter for print-related services that are active
      const printServices = data.services.filter(
        (service: ServiceResponse) =>
          service.serviceCode === 'printedSoftCover' && service.isActive,
      );

      // Get extra chapter cost
      const extraChapter = data.services.find(
        (service: ServiceResponse) => service.serviceCode === 'extraChapterCost',
      );
      if (extraChapter) {
        setExtraChapterCost(extraChapter.cost);
      }

      // Get extra book copy cost
      const extraBookCopy = data.services.find(
        (service: ServiceResponse) => service.serviceCode === 'extraBookCopy',
      );
      if (extraBookCopy) {
        setExtraBookCopyCost(extraBookCopy.cost);
      }

      // Get shipping cost
      const shipping = data.services.find(
        (service: ServiceResponse) => service.serviceCode === 'shippingCost',
      );
      if (shipping) {
        setShippingCost(shipping.cost);
      }

      // Auto-select softcover option if not already selected
      if (printServices.length > 0 && !selectedPrintingOption) {
        const softCoverService = printServices[0];
        onSelectPrintingOption({
          serviceCode: softCoverService.serviceCode,
          credits: softCoverService.cost,
          isActive: true,
          title: tPrintOrder('payment.softcoverTitle'),
          description: tPrintOrder('payment.softcoverDescription'),
        });
      }
    } catch (error) {
      console.error('Error fetching printing options:', error);
      setError(tPrintOrder('errors.loadPricingFailed'));
    }
  }, [tPrintOrder, selectedPrintingOption, onSelectPrintingOption]);

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
    return Math.max(0, story.chapterCount - 4);
  };

  const calculateExtraCopiesCost = () => {
    // First copy is included in base price, charge for additional copies
    const extraCopies = Math.max(0, numberOfCopies - 1);
    return extraCopies * extraBookCopyCost;
  };

  const calculateTotalCost = () => {
    if (!selectedPrintingOption) return 0;
    const extraChapters = calculateExtraChapters();
    const extraChaptersCostTotal = extraChapters * extraChapterCost * numberOfCopies; // Each copy needs extra chapters
    const extraCopiesCost = calculateExtraCopiesCost();
    return selectedPrintingOption.credits + extraChaptersCostTotal + extraCopiesCost + shippingCost;
  };

  const hasInsufficientCredits = () => {
    const totalCost = calculateTotalCost();
    return userCredits < totalCost;
  };

  const canPlaceOrder = () => {
    return selectedPrintingOption && !hasInsufficientCredits() && !loading;
  };

  const handlePlaceOrderClick = () => {
    if (canPlaceOrder()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmOrder = () => {
    setShowConfirmModal(false);
    onPlaceOrder(numberOfCopies);
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
            <p className="text-sm text-base-content/70 mb-4">
              {tPrintOrder('payment.paperbackDescriptionWithChapters', {
                chapters: story.chapterCount,
              })}
            </p>

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
                  {tPrintOrder('payment.basePrice')} ({tPrintOrder('payment.includesFourChapters')}
                  ):
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
                <FiCreditCard className="w-5 h-5" />
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
                    <a href={`/${locale}/pricing`} className="btn btn-outline btn-sm mt-2">
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
      )}
    </div>
  );
}
