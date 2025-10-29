'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { FaHandshake, FaPaperPlane } from 'react-icons/fa';
import { trackPartnership } from '../lib/analytics';

interface PartnershipFormProps {
  className?: string;
}

const COUNTRY_CODES = ['PT', 'ES', 'FR', 'US', 'GB', 'DE', 'IT', 'BR'];

const PARTNERSHIP_TYPE_CODES = ['printing_service', 'attraction_venue', 'retail_brand', 'other'];

const PartnershipForm = ({ className = '' }: PartnershipFormProps) => {
  const { user, isSignedIn } = useUser();
  const t = useTranslations('Partners.form');
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    website: '',
    primaryLocation: '',
    partnershipType: '',
    businessDescription: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Auto-fill email and name if user is logged in
  useEffect(() => {
    if (isSignedIn && user) {
      const updates: Partial<typeof formData> = {};

      // Auto-fill email if available
      if (user.primaryEmailAddress?.emailAddress) {
        updates.email = user.primaryEmailAddress.emailAddress;
      }

      // Auto-fill name if available (firstName + lastName)
      if (user.firstName || user.lastName) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (fullName) {
          updates.name = fullName;
        }
      }

      // Only update if we have something to update
      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({
          ...prev,
          ...updates,
        }));
      }
    }
  }, [isSignedIn, user]);

  // Track when user starts filling the form
  useEffect(() => {
    let hasTracked = false;
    const trackStart = () => {
      if (!hasTracked && (formData.name || formData.companyName || formData.email)) {
        trackPartnership.started({
          partnership_type: formData.partnershipType || 'not_selected',
          primary_location: formData.primaryLocation || 'not_selected',
        });
        hasTracked = true;
      }
    };

    const timer = setTimeout(trackStart, 2000);
    return () => clearTimeout(timer);
  }, [
    formData.name,
    formData.companyName,
    formData.email,
    formData.partnershipType,
    formData.primaryLocation,
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.companyName.trim() ||
      !formData.email.trim() ||
      !formData.primaryLocation ||
      !formData.partnershipType
    ) {
      setResponseMessage(t('validationError'));
      setIsSuccess(false);
      setShowModal(true);
      return;
    }

    setIsLoading(true);
    setResponseMessage('');

    try {
      // Track partnership application submission
      trackPartnership.submitted({
        company_name: formData.companyName,
        partnership_type: formData.partnershipType,
        primary_location: formData.primaryLocation,
        has_phone: !!formData.phone.trim(),
        has_website: !!formData.website.trim(),
        has_description: !!formData.businessDescription.trim(),
      });

      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          companyName: formData.companyName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          website: formData.website.trim() || undefined,
          primaryLocation: formData.primaryLocation,
          partnershipType: formData.partnershipType,
          businessDescription: formData.businessDescription.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResponseMessage(t('successMessage'));
        setIsSuccess(true);
        setShowModal(true);

        // Clear form
        setFormData({
          name: '',
          companyName: '',
          email: '',
          phone: '',
          website: '',
          primaryLocation: '',
          partnershipType: '',
          businessDescription: '',
        });

        // Redirect to homepage after 5 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
      } else {
        setResponseMessage(result.error || t('errorMessage'));
        setIsSuccess(false);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Partnership form error:', error);
      setResponseMessage(t('errorMessage'));
      setIsSuccess(false);
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaHandshake className="text-2xl text-primary" />
          <h2 className="text-2xl font-semibold">{t('title')}</h2>
        </div>

        <p className="text-base-content/80 mb-6">{t('subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="form-control">
            <label className="label py-1" htmlFor="name">
              <span className="label-text font-medium text-sm">
                {t('fields.name.label')} <span className="text-error">*</span>
              </span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t('fields.name.placeholder')}
              className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
              required
            />
          </div>

          {/* Company Name */}
          <div className="form-control">
            <label className="label py-1" htmlFor="companyName">
              <span className="label-text font-medium text-sm">
                {t('fields.companyName.label')} <span className="text-error">*</span>
              </span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder={t('fields.companyName.placeholder')}
              className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
              required
            />
          </div>

          {/* Email */}
          <div className="form-control">
            <label className="label py-1" htmlFor="email">
              <span className="label-text font-medium text-sm">
                {t('fields.email.label')} <span className="text-error">*</span>
              </span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t('fields.email.placeholder')}
              className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
              required
            />
          </div>

          {/* Phone (Optional) */}
          <div className="form-control">
            <label className="label py-1" htmlFor="phone">
              <span className="label-text font-medium text-sm">{t('fields.phone.label')}</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder={t('fields.phone.placeholder')}
              className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            />
          </div>

          {/* Website (Optional) */}
          <div className="form-control">
            <label className="label py-1" htmlFor="website">
              <span className="label-text font-medium text-sm">{t('fields.website.label')}</span>
            </label>
            <input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleInputChange}
              placeholder={t('fields.website.placeholder')}
              className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            />
          </div>

          {/* Primary Location */}
          <div className="form-control">
            <label className="label py-1" htmlFor="primaryLocation">
              <span className="label-text font-medium text-sm">
                {t('fields.primaryLocation.label')} <span className="text-error">*</span>
              </span>
            </label>
            <select
              id="primaryLocation"
              name="primaryLocation"
              value={formData.primaryLocation}
              onChange={handleInputChange}
              className="select select-bordered select-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
              required
            >
              <option value="">{t('fields.primaryLocation.placeholder')}</option>
              {COUNTRY_CODES.map((countryCode) => (
                <option key={countryCode} value={countryCode}>
                  {t(`countries.${countryCode}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Partnership Type */}
          <div className="form-control">
            <label className="label py-1" htmlFor="partnershipType">
              <span className="label-text font-medium text-sm">
                {t('fields.partnershipType.label')} <span className="text-error">*</span>
              </span>
            </label>
            <select
              id="partnershipType"
              name="partnershipType"
              value={formData.partnershipType}
              onChange={handleInputChange}
              className="select select-bordered select-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
              required
            >
              <option value="">{t('fields.partnershipType.placeholder')}</option>
              {PARTNERSHIP_TYPE_CODES.map((typeCode) => (
                <option key={typeCode} value={typeCode}>
                  {t(`partnershipTypes.${typeCode}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Business Description */}
          <div className="form-control">
            <label className="label py-1" htmlFor="businessDescription">
              <span className="label-text font-medium text-sm">
                {t('fields.businessDescription.label')}
              </span>
            </label>
            <textarea
              id="businessDescription"
              name="businessDescription"
              value={formData.businessDescription}
              onChange={handleInputChange}
              className="textarea textarea-bordered textarea-primary h-24 w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t('fields.businessDescription.placeholder')}
              disabled={isLoading}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-block h-12 mt-6 text-lg"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <FaPaperPlane className="mr-2" />
                {t('submit')}
              </>
            )}
          </button>
        </form>

        {/* Success/Error Modal */}
        {showModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <div className="flex items-center justify-center mb-4">
                {isSuccess ? (
                  <div className="text-6xl">🚀</div>
                ) : (
                  <div className="text-6xl">❌</div>
                )}
              </div>
              <h3 className="font-bold text-lg text-center mb-4">
                {isSuccess ? t('successTitle') : t('errorTitle')}
              </h3>
              <p className="text-center text-base-content/80">{responseMessage}</p>
              {isSuccess && (
                <p className="text-center text-sm text-base-content/60 mt-2">
                  {t('redirectMessage')}
                </p>
              )}
              <div className="modal-action">
                {!isSuccess && (
                  <button className="btn btn-primary" onClick={() => setShowModal(false)}>
                    {t('tryAgain')}
                  </button>
                )}
                {isSuccess && (
                  <button className="btn btn-primary" onClick={() => (window.location.href = '/')}>
                    {t('goToHomepage')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnershipForm;
