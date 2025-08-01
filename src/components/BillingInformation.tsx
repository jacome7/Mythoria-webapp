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
  const t = useTranslations('BuyCreditsPage.billing');
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
    phone: ''
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
            translatedError = t('vatValidation.errors.tooShort');
          } else if (validation.error.includes('Unsupported country code')) {
            translatedError = t('vatValidation.errors.unsupportedCountry');
          } else if (validation.error.includes('Invalid') && validation.country) {
            translatedError = t('vatValidation.errors.invalidFormat', {
              country: validation.country,
              format: validation.error.split('Expected format: ')[1] || ''
            });
          } else {
            translatedError = validation.error; // Fallback to original error
          }
        }
        
        setVatValidation({
          ...validation,
          error: translatedError
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
      >        <div className="flex items-center space-x-3">
          <FaFileInvoice className="text-primary text-xl" />
          <div>
            <h3 className="text-lg font-bold">{t('title')}</h3>
            <p className="text-sm text-gray-600">
              {isExpanded ? t('collapse') : t('expand')}
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
              <span className="ml-2">{t('loading')}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <FaUser className="text-primary" />
                <h4 className="font-semibold">{t('personalDetails')}</h4>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('fields.fullName')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={billingInfo.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder={t('fields.fullName')}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('fields.email')}</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={billingInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('fields.email')}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('fields.vatNumberOptional')}</span>
                </label>
                <input
                  type="text"
                  className={`input input-bordered break-words ${
                    vatValidation.isValid === false ? 'input-error' : ''
                  }`}
                  value={billingInfo.fiscalNumber}
                  onChange={(e) => handleInputChange('fiscalNumber', e.target.value)}
                  onBlur={handleVATBlur}
                  placeholder={t('placeholders.vatNumber')}
                />
                {vatValidation.error && (
                  <label className="label">
                    <span className="label-text-alt text-error break-words">{vatValidation.error}</span>
                  </label>
                )}
                {vatValidation.isValid && vatValidation.country && billingInfo.fiscalNumber && (
                  <label className="label">
                    <span className="label-text-alt text-success break-words">
                      ✓ {t('vatValidation.valid')} ({vatValidation.country})
                    </span>
                  </label>
                )}
                <label className="label">
                  <span className="label-text-alt text-gray-500 text-xs break-words">
                    {t('vatValidation.help')}
                  </span>
                </label>
              </div>
               <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('fields.phoneOptional')}</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered"
                  value={billingInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={t('placeholders.phone')}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <FaMapMarkerAlt className="text-primary" />
                <h4 className="font-semibold">{t('billingAddress')}</h4>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('fields.addressLine1')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={billingInfo.line1}
                  onChange={(e) => handleInputChange('line1', e.target.value)}
                  placeholder={t('fields.addressLine1')}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('fields.addressLine2Optional')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={billingInfo.line2}
                  onChange={(e) => handleInputChange('line2', e.target.value)}
                  placeholder={t('fields.addressLine2')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{t('fields.city')}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={billingInfo.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder={t('fields.city')}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{t('fields.stateRegion')}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={billingInfo.stateRegion}
                    onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                    placeholder={t('fields.stateRegion')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{t('fields.postalCode')}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={billingInfo.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder={t('placeholders.postalCode')}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{t('fields.country')}</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={billingInfo.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  >
                    <option value="">{t('selectCountry')}</option>
                    <optgroup label={t('groups.eu')}>
                      <option value="AT">{t('countries.at')}</option>
                      <option value="BE">{t('countries.be')}</option>
                      <option value="BG">{t('countries.bg')}</option>
                      <option value="HR">{t('countries.hr')}</option>
                      <option value="CY">{t('countries.cy')}</option>
                      <option value="CZ">{t('countries.cz')}</option>
                      <option value="DK">{t('countries.dk')}</option>
                      <option value="EE">{t('countries.ee')}</option>
                      <option value="FI">{t('countries.fi')}</option>
                      <option value="FR">{t('countries.fr')}</option>
                      <option value="DE">{t('countries.de')}</option>
                      <option value="GR">{t('countries.gr')}</option>
                      <option value="HU">{t('countries.hu')}</option>
                      <option value="IE">{t('countries.ie')}</option>
                      <option value="IT">{t('countries.it')}</option>
                      <option value="LV">{t('countries.lv')}</option>
                      <option value="LT">{t('countries.lt')}</option>
                      <option value="LU">{t('countries.lu')}</option>
                      <option value="MT">{t('countries.mt')}</option>
                      <option value="NL">{t('countries.nl')}</option>
                      <option value="PL">{t('countries.pl')}</option>
                      <option value="PT">{t('countries.pt')}</option>
                      <option value="RO">{t('countries.ro')}</option>
                      <option value="SK">{t('countries.sk')}</option>
                      <option value="SI">{t('countries.si')}</option>
                      <option value="ES">{t('countries.es')}</option>
                      <option value="SE">{t('countries.se')}</option>
                    </optgroup>
                    <optgroup label={t('groups.otherEurope')}>
                      <option value="CH">{t('countries.ch')}</option>
                      <option value="NO">{t('countries.no')}</option>
                      <option value="GB">{t('countries.gb')}</option>
                    </optgroup>
                    <optgroup label={t('groups.other')}>
                      <option value="US">{t('countries.us')}</option>
                      <option value="CA">{t('countries.ca')}</option>
                      <option value="AU">{t('countries.au')}</option>
                      <option value="JP">{t('countries.jp')}</option>
                      <option value="BR">{t('countries.br')}</option>
                      <option value="MX">{t('countries.mx')}</option>
                      <option value="IN">{t('countries.in')}</option>
                      <option value="SG">{t('countries.sg')}</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-info/10 rounded-lg">
            <h5 className="font-medium text-info mb-2">ℹ️ {t('info.title')}</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {t('info.description1')}</li>
              <li>• {t('info.description2')}</li>
              <li>• {t('info.description3')}</li>
              <li>• {t('info.description4')}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
