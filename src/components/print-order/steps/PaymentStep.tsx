'use client';

import { useTranslations } from 'next-intl';
import { FiCreditCard, FiCheck } from 'react-icons/fi';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';

interface Story {
  storyId: string;
  title: string;
  synopsis: string;
  pdfUri: string;
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
  const t = useTranslations('PrintOrder');
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
            title = t('payment.softcoverTitle');
            description = t('payment.softcoverDescription');
            break;
          case 'printedHardcover':
            title = t('payment.hardcoverTitle');
            description = t('payment.hardcoverDescription');
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
      throw error;
    }
  }, [t]);

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
      throw error;
    }
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchPrintingOptions(),
          fetchUserCredits()
        ]);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load pricing information');
      } finally {
        setLoadingData(false);
      }
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
        <h2 className="card-title mb-4">{t('steps.payment')}</h2>
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="card-title mb-4">{t('steps.payment')}</h2>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
        <div className="card-actions justify-between mt-6">
          <button className="btn btn-ghost" onClick={onBack}>
            {t('buttons.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="card-title mb-4">{t('payment.selectBookType')}</h2>
      
      <p className="text-base-content/70 mb-6">{t('payment.chooseQuality')}</p>

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
                    {option.credits} {t('payment.credits')}
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
          <p className="font-semibold mb-1">{t('payment.priceNote')}</p>
          <p>{t('payment.extraChapterNote')}</p>
          <p className="mt-2">
            <strong>{t('payment.yourStory')}:</strong> {story.chapterCount} chapters
            {calculateExtraChapters() > 0 && (
              <span> ({calculateExtraChapters()} {t('payment.extraChaptersNote')})</span>
            )}
          </p>
        </div>
      </div>

      {/* Order Summary & Credits Info */}
      {selectedPrintingOption && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('payment.orderSummary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('payment.selectedOption')}:</span>
                <span>{selectedPrintingOption.title}</span>
              </div>              <div className="flex justify-between">
                <span>{t('payment.basePrice')}:</span>
                <span>{selectedPrintingOption.credits} {t('payment.credits')}</span>
              </div>
              {calculateExtraChapters() > 0 && (
                <div className="flex justify-between">
                  <span>{t('payment.extraChapters')} ({calculateExtraChapters()}):</span>
                  <span>{calculateExtraChapters() * extraChapterCost} {t('payment.credits')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('payment.shipping')}:</span>
                <span className="text-success">{t('payment.included')}</span>
              </div>
              <div className="divider"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>{t('payment.total')}:</span>
                <span>{calculateTotalCost()} {t('payment.credits')}</span>
              </div>
            </div>
          </div>

          {/* Credits Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('payment.method')}</h3>
            <div className="space-y-4">
              <div className="alert alert-info">
                <FiCreditCard className="w-5 h-5" />
                <span>{t('payment.creditsInfo')}</span>
              </div>              {/* Credits Balance */}
              <div className="card bg-base-200 p-4">
                <div className="flex justify-center items-center gap-8">
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block mb-1">{t('payment.cost')}</span>
                    <div className="text-2xl font-bold text-primary">
                      {calculateTotalCost()} {t('payment.credits')}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-gray-600 block mb-1">{t('payment.yourCredits')}</span>
                    <div className={`text-2xl font-bold ${hasInsufficientCredits() ? 'text-error' : 'text-success'}`}>
                      {userCredits} {t('payment.credits')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Insufficient Credits Warning */}
              {hasInsufficientCredits() && (
                <div className="alert alert-warning">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{t('payment.insufficientCreditsTitle')}</span>
                    <span className="text-sm mt-2">
                      {t('payment.needMoreCredits', { count: calculateTotalCost() - userCredits })}
                    </span>
                    <a
                      href={`/${locale}/pricing`}
                      className="btn btn-outline btn-sm mt-2"
                    >
                      {t('payment.getMoreCredits')}
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
          <span>{t('payment.pleaseSelectOption')}</span>
        </div>
      )}

      <div className="card-actions justify-between mt-6">
        <button className="btn btn-ghost" onClick={onBack}>
          {t('buttons.back')}
        </button>
        <button
          className={`btn btn-primary ${loading ? 'loading' : ''}`}
          onClick={handlePlaceOrderClick}
          disabled={!canPlaceOrder()}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            t('buttons.placeOrder')
          )}
        </button>
      </div>      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{t('payment.confirmOrder')}</h3>
            <p className="text-sm text-base-content/70 mb-6">
              {t('payment.confirmOrderDescription')}
            </p>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={handleConfirmOrder}>
                {t('buttons.confirm')}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>
                {t('buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
