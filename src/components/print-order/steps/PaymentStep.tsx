'use client';

import { useTranslations } from 'next-intl';
import { FiCreditCard, FiCheck } from 'react-icons/fi';
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
  onPlaceOrder: () => void;
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
  const [printingOptions, setPrintingOptions] = useState<PrintingOption[]>([]);
  const [extraChapterCost, setExtraChapterCost] = useState<number>(0);
  const [userCredits, setUserCredits] = useState<number>(0);
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
      const printServices = data.services.filter((service: ServiceResponse) => 
        ['printedSoftCover', 'printedHardcover', 'printedPremium'].includes(service.serviceCode) &&
        service.isActive
      );

      // Get extra chapter cost
      const extraChapter = data.services.find((service: ServiceResponse) => 
        service.serviceCode === 'extraChapterCost'
      );
      if (extraChapter) {
        setExtraChapterCost(extraChapter.cost);
      }

      // Map services to printing options with localized titles and descriptions
      const options: PrintingOption[] = printServices.map((service: ServiceResponse) => {
        let title = '';
        let description = '';

        switch (service.serviceCode) {
          case 'printedSoftCover':
            title = tPrintOrder('payment.softcoverTitle');
            description = tPrintOrder('payment.softcoverDescription');
            break;
          case 'printedHardcover':
            title = tPrintOrder('payment.hardcoverTitle');
            description = tPrintOrder('payment.hardcoverDescription');
            break;
          default:
            title = service.name;
            description = service.name;
        }

        return {
          serviceCode: service.serviceCode,
          credits: service.cost,
          isActive: true,
          title,
          description
        };
      });

      setPrintingOptions(options);
    } catch (error) {
      console.error('Error fetching printing options:', error);
      setError(tPrintOrder('errors.loadPricingFailed'));
    }
  }, [tPrintOrder]);

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
    return Math.max(0, story.chapterCount - 2);
  };

  const calculateTotalCost = () => {
    if (!selectedPrintingOption) return 0;
    const extraChapters = calculateExtraChapters();
    return selectedPrintingOption.credits + (extraChapters * extraChapterCost);
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
    onPlaceOrder();
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
      <h2 className="card-title mb-4">{tPrintOrder('payment.selectBookType')}</h2>
      
      <p className="text-base-content/70 mb-6">{tPrintOrder('payment.chooseQuality')}</p>

      {/* Printing Options */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {printingOptions.map((option) => (
          <div
            key={option.serviceCode}
            className={`card bg-base-100 border-2 cursor-pointer transition-all hover:shadow-lg ${
              selectedPrintingOption?.serviceCode === option.serviceCode
                ? 'border-primary bg-primary/5'
                : 'border-base-300 hover:border-primary/50'
            }`}
            onClick={() => onSelectPrintingOption(option)}
          > <div className="card-body p-4">
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">{option.title}</h3>
                  <p className="text-sm text-base-content/70 mb-3 min-h-[3rem]">{option.description}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="text-lg font-semibold text-primary">
                    {option.credits} {tPrintOrder('payment.credits')}
                  </div>
                  {selectedPrintingOption?.serviceCode === option.serviceCode && (
                    <div className="text-primary">
                      <FiCheck className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Price Notes */}
      <div className="alert alert-info mb-6">
        <div className="text-sm">
          <p className="font-semibold mb-1">{tPrintOrder('payment.priceNote')}</p>
          <p>{tPrintOrder('payment.extraChapterNote')}</p>
          <p className="mt-2">
            <strong>{tPrintOrder('payment.yourStory')}:</strong> {story.chapterCount} chapters
            {calculateExtraChapters() > 0 && (
              <span> ({calculateExtraChapters()} {tPrintOrder('payment.extraChaptersNote')})</span>
            )}
          </p>
        </div>
      </div>

      {/* Order Summary & Credits Info */}
      {selectedPrintingOption && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{tPrintOrder('payment.orderSummary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{tPrintOrder('payment.selectedOption')}:</span>
                <span>{selectedPrintingOption.title}</span>
              </div>              <div className="flex justify-between">
                <span>{tPrintOrder('payment.basePrice')}:</span>
                <span>{selectedPrintingOption.credits} {tPrintOrder('payment.credits')}</span>
              </div>
              {calculateExtraChapters() > 0 && (
                <div className="flex justify-between">
                  <span>{tPrintOrder('payment.extraChapters')} ({calculateExtraChapters()}):</span>
                  <span>{calculateExtraChapters() * extraChapterCost} {tPrintOrder('payment.credits')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{tPrintOrder('payment.shipping')}:</span>
                <span className="text-success">{tPrintOrder('payment.included')}</span>
              </div>
              <div className="divider"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>{tPrintOrder('payment.total')}:</span>
                <span>{calculateTotalCost()} {tPrintOrder('payment.credits')}</span>
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
              </div>              {/* Credits Balance */}
              <div className="card bg-base-200 p-4">
                <div className="flex justify-center items-center gap-8">
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block mb-1">{tPrintOrder('payment.cost')}</span>
                    <div className="text-2xl font-bold text-primary">
                      {calculateTotalCost()} {tPrintOrder('payment.credits')}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block mb-1">{tPrintOrder('payment.yourCredits')}</span>
                    <div className={`text-2xl font-bold ${hasInsufficientCredits() ? 'text-error' : 'text-success'}`}>
                      {userCredits} {tPrintOrder('payment.credits')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Insufficient Credits Warning */}
              {hasInsufficientCredits() && (
                <div className="alert alert-warning">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{tPrintOrder('payment.insufficientCreditsTitle')}</span>
                    <span className="text-sm mt-2">
                      {tPrintOrder('payment.needMoreCredits', { count: calculateTotalCost() - userCredits })}
                    </span>
                    <a
                      href={`/${locale}/pricing`}
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

      {/* Error for no selection */}
      {!selectedPrintingOption && (
        <div className="alert alert-warning mb-6">
          <span>{tPrintOrder('payment.pleaseSelectOption')}</span>
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
      </div>      {/* Confirmation Modal */}
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
