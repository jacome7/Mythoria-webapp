'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { FaChevronDown, FaChevronUp, FaUser, FaMapMarkerAlt, FaFileInvoice } from 'react-icons/fa';
import { validateVATNumber, formatVATNumber, VATValidationResult } from '@/lib/vat-validation';

export interface BillingInfo {
  displayName: string;
  fiscalNumber: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface BillingInformationProps {
  onBillingInfoChange?: (billingInfo: BillingInfo) => void;
}

export default function BillingInformation({ onBillingInfoChange }: BillingInformationProps) {
  const { user, isLoaded } = useUser();
  const tBuyCreditsPage = useTranslations('BuyCreditsPage.billing');
  const [isExpanded, setIsExpanded] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    displayName: '',
    fiscalNumber: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    country: '',
    phone: '',
  });
  const [vatValidation, setVatValidation] = useState<VATValidationResult>({ isValid: true });
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  // Use ref to store the latest callback to avoid dependency issues
  const onBillingInfoChangeRef = useRef(onBillingInfoChange);
  onBillingInfoChangeRef.current = onBillingInfoChange;

  // Use ref to store the latest billing info to avoid dependency issues
  const billingInfoRef = useRef(billingInfo);
  billingInfoRef.current = billingInfo;

  const loadUserBillingData = useCallback(async () => {
    if (!user) return;

    setIsLoadingUserData(true);
    try {
      // For now, we'll use the data from Clerk and local state
      // In a full implementation, you might fetch from your database
      const updatedInfo = {
        ...billingInfoRef.current,
        displayName: user.fullName || user.firstName + ' ' + user.lastName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
        // Other fields would come from your database if you store them
      };

      setBillingInfo(updatedInfo);

      // Notify parent component after state update, not during
      setTimeout(() => {
        onBillingInfoChangeRef.current?.(updatedInfo);
      }, 0);
    } catch (error) {
      console.error('Failed to load user billing data:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  }, [user]);

  // Load existing user data when component mounts
  useEffect(() => {
    if (isLoaded && user) {
      loadUserBillingData();
    }
  }, [isLoaded, user, loadUserBillingData]);

  // Notify parent about initial empty billing info state only once when component mounts
  useEffect(() => {
    if (isLoaded) {
      // Use setTimeout to avoid calling during render
      setTimeout(() => {
        onBillingInfoChangeRef.current?.(billingInfoRef.current);
      }, 0);
    }
  }, [isLoaded]); // Only depend on isLoaded, not on billingInfo to avoid loops
  const handleInputChange = (field: keyof BillingInfo, value: string) => {
    const updatedInfo = { ...billingInfo, [field]: value };
    setBillingInfo(updatedInfo);

    // Special handling for VAT number validation
    if (field === 'fiscalNumber') {
      if (value.trim()) {
        const validation = validateVATNumber(value);

        // Translate error messages
        let translatedError: string | undefined = undefined;
        if (validation.error) {
          if (validation.error.includes('too short')) {
            translatedError = tBuyCreditsPage('vatValidation.errors.tooShort');
          } else if (validation.error.includes('Unsupported country code')) {
            translatedError = tBuyCreditsPage('vatValidation.errors.unsupportedCountry');
          } else if (validation.error.includes('Invalid') && validation.country) {
            translatedError = tBuyCreditsPage('vatValidation.errors.invalidFormat', {
              country: validation.country,
              format: validation.error.split('Expected format: ')[1] || '',
            });
          } else {
            translatedError = validation.error; // Fallback to original error
          }
        }

        setVatValidation({
          ...validation,
          error: translatedError,
        });

        if (validation.isValid && validation.formattedVAT) {
          updatedInfo.fiscalNumber = validation.formattedVAT;
        }
      } else {
        setVatValidation({ isValid: true }); // Empty is valid (optional field)
      }
    }

    // Notify parent component using ref to avoid dependency issues
    // Use setTimeout to avoid calling during render
    setTimeout(() => {
      onBillingInfoChangeRef.current?.(updatedInfo);
    }, 0);
  };

  const handleVATBlur = () => {
    if (billingInfo.fiscalNumber.trim()) {
      const formatted = formatVATNumber(billingInfo.fiscalNumber);
      handleInputChange('fiscalNumber', formatted);
    }
  };

  return (
    <div className="bg-base-200 rounded-lg mb-6">
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-base-300 transition-colors rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {' '}
        <div className="flex items-center space-x-3">
          <FaFileInvoice className="text-primary text-xl" />
          <div>
            <h3 className="text-lg font-bold">{tBuyCreditsPage('title')}</h3>
            <p className="text-sm text-gray-600">
              {isExpanded ? tBuyCreditsPage('collapse') : tBuyCreditsPage('expand')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <FaChevronUp className="text-gray-500" />
          ) : (
            <FaChevronDown className="text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-base-300">
          {isLoadingUserData && (
            <div className="py-4 text-center">
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2">{tBuyCreditsPage('loading')}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <FaUser className="text-primary" />
                <h4 className="font-semibold">{tBuyCreditsPage('personalDetails')}</h4>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{tBuyCreditsPage('fields.fullName')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={billingInfo.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder={tBuyCreditsPage('fields.fullName')}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{tBuyCreditsPage('fields.email')}</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={billingInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={tBuyCreditsPage('fields.email')}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{tBuyCreditsPage('fields.vatNumberOptional')}</span>
                </label>
                <input
                  type="text"
                  className={`input input-bordered break-words ${
                    vatValidation.isValid === false ? 'input-error' : ''
                  }`}
                  value={billingInfo.fiscalNumber}
                  onChange={(e) => handleInputChange('fiscalNumber', e.target.value)}
                  onBlur={handleVATBlur}
                  placeholder={tBuyCreditsPage('placeholders.vatNumber')}
                />
                {vatValidation.error && (
                  <label className="label">
                    <span className="label-text-alt text-error break-words">
                      {vatValidation.error}
                    </span>
                  </label>
                )}
                {vatValidation.isValid && vatValidation.country && billingInfo.fiscalNumber && (
                  <label className="label">
                    <span className="label-text-alt text-success break-words">
                      ✓ {tBuyCreditsPage('vatValidation.valid')} ({vatValidation.country})
                    </span>
                  </label>
                )}
                <label className="label">
                  <span className="label-text-alt text-gray-500 text-xs break-words">
                    {tBuyCreditsPage('vatValidation.help')}
                  </span>
                </label>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{tBuyCreditsPage('fields.phoneOptional')}</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered"
                  value={billingInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={tBuyCreditsPage('placeholders.phone')}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <FaMapMarkerAlt className="text-primary" />
                <h4 className="font-semibold">{tBuyCreditsPage('billingAddress')}</h4>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{tBuyCreditsPage('fields.addressLine1')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={billingInfo.line1}
                  onChange={(e) => handleInputChange('line1', e.target.value)}
                  placeholder={tBuyCreditsPage('fields.addressLine1')}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    {tBuyCreditsPage('fields.addressLine2Optional')}
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={billingInfo.line2}
                  onChange={(e) => handleInputChange('line2', e.target.value)}
                  placeholder={tBuyCreditsPage('fields.addressLine2')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{tBuyCreditsPage('fields.city')}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={billingInfo.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder={tBuyCreditsPage('fields.city')}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{tBuyCreditsPage('fields.stateRegion')}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={billingInfo.stateRegion}
                    onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                    placeholder={tBuyCreditsPage('fields.stateRegion')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{tBuyCreditsPage('fields.postalCode')}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={billingInfo.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder={tBuyCreditsPage('placeholders.postalCode')}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{tBuyCreditsPage('fields.country')}</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={billingInfo.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  >
                    <option value="">{tBuyCreditsPage('selectCountry')}</option>
                    <optgroup label={tBuyCreditsPage('groups.eu')}>
                      <option value="AT">{tBuyCreditsPage('countries.at')}</option>
                      <option value="BE">{tBuyCreditsPage('countries.be')}</option>
                      <option value="BG">{tBuyCreditsPage('countries.bg')}</option>
                      <option value="HR">{tBuyCreditsPage('countries.hr')}</option>
                      <option value="CY">{tBuyCreditsPage('countries.cy')}</option>
                      <option value="CZ">{tBuyCreditsPage('countries.cz')}</option>
                      <option value="DK">{tBuyCreditsPage('countries.dk')}</option>
                      <option value="EE">{tBuyCreditsPage('countries.ee')}</option>
                      <option value="FI">{tBuyCreditsPage('countries.fi')}</option>
                      <option value="FR">{tBuyCreditsPage('countries.fr')}</option>
                      <option value="DE">{tBuyCreditsPage('countries.de')}</option>
                      <option value="GR">{tBuyCreditsPage('countries.gr')}</option>
                      <option value="HU">{tBuyCreditsPage('countries.hu')}</option>
                      <option value="IE">{tBuyCreditsPage('countries.ie')}</option>
                      <option value="IT">{tBuyCreditsPage('countries.it')}</option>
                      <option value="LV">{tBuyCreditsPage('countries.lv')}</option>
                      <option value="LT">{tBuyCreditsPage('countries.lt')}</option>
                      <option value="LU">{tBuyCreditsPage('countries.lu')}</option>
                      <option value="MT">{tBuyCreditsPage('countries.mt')}</option>
                      <option value="NL">{tBuyCreditsPage('countries.nl')}</option>
                      <option value="PL">{tBuyCreditsPage('countries.pl')}</option>
                      <option value="PT">{tBuyCreditsPage('countries.pt')}</option>
                      <option value="RO">{tBuyCreditsPage('countries.ro')}</option>
                      <option value="SK">{tBuyCreditsPage('countries.sk')}</option>
                      <option value="SI">{tBuyCreditsPage('countries.si')}</option>
                      <option value="ES">{tBuyCreditsPage('countries.es')}</option>
                      <option value="SE">{tBuyCreditsPage('countries.se')}</option>
                    </optgroup>
                    <optgroup label={tBuyCreditsPage('groups.otherEurope')}>
                      <option value="CH">{tBuyCreditsPage('countries.ch')}</option>
                      <option value="NO">{tBuyCreditsPage('countries.no')}</option>
                      <option value="GB">{tBuyCreditsPage('countries.gb')}</option>
                    </optgroup>
                    <optgroup label={tBuyCreditsPage('groups.other')}>
                      <option value="US">{tBuyCreditsPage('countries.us')}</option>
                      <option value="CA">{tBuyCreditsPage('countries.ca')}</option>
                      <option value="AU">{tBuyCreditsPage('countries.au')}</option>
                      <option value="JP">{tBuyCreditsPage('countries.jp')}</option>
                      <option value="BR">{tBuyCreditsPage('countries.br')}</option>
                      <option value="MX">{tBuyCreditsPage('countries.mx')}</option>
                      <option value="IN">{tBuyCreditsPage('countries.in')}</option>
                      <option value="SG">{tBuyCreditsPage('countries.sg')}</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-5 bg-base-100 rounded-lg border border-base-300 shadow-sm">
            <h5 className="font-bold text-base-content mb-3 flex items-center gap-2">
              <span className="text-info text-lg">ℹ️</span>
              {tBuyCreditsPage('info.title')}
            </h5>
            <ul className="text-sm text-base-content/80 space-y-2 pl-1">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{tBuyCreditsPage('info.description1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{tBuyCreditsPage('info.description2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{tBuyCreditsPage('info.description3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{tBuyCreditsPage('info.description4')}</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
