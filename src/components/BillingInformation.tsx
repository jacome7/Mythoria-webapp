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
              <span className="ml-2">Loading your information...</span>
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
                  placeholder="e.g., PT123456789, ES12345678A, FR12345678901"
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
                  placeholder="+351 912 345 678"
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
                    placeholder="12345"
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
                    <option value="">Select country</option>
                    <optgroup label="European Union">
                      <option value="AT">Austria</option>
                      <option value="BE">Belgium</option>
                      <option value="BG">Bulgaria</option>
                      <option value="HR">Croatia</option>
                      <option value="CY">Cyprus</option>
                      <option value="CZ">Czech Republic</option>
                      <option value="DK">Denmark</option>
                      <option value="EE">Estonia</option>
                      <option value="FI">Finland</option>
                      <option value="FR">France</option>
                      <option value="DE">Germany</option>
                      <option value="GR">Greece</option>
                      <option value="HU">Hungary</option>
                      <option value="IE">Ireland</option>
                      <option value="IT">Italy</option>
                      <option value="LV">Latvia</option>
                      <option value="LT">Lithuania</option>
                      <option value="LU">Luxembourg</option>
                      <option value="MT">Malta</option>
                      <option value="NL">Netherlands</option>
                      <option value="PL">Poland</option>
                      <option value="PT">Portugal</option>
                      <option value="RO">Romania</option>
                      <option value="SK">Slovakia</option>
                      <option value="SI">Slovenia</option>
                      <option value="ES">Spain</option>
                      <option value="SE">Sweden</option>
                    </optgroup>
                    <optgroup label="Other European Countries">
                      <option value="CH">Switzerland</option>
                      <option value="NO">Norway</option>
                      <option value="GB">United Kingdom</option>
                    </optgroup>
                    <optgroup label="Other Countries">
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="JP">Japan</option>
                      <option value="BR">Brazil</option>
                      <option value="MX">Mexico</option>
                      <option value="IN">India</option>
                      <option value="SG">Singapore</option>
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
