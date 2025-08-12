'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { FaTicketAlt } from 'react-icons/fa';
import { trackContact } from '../lib/analytics';

interface ContactFormProps {
  className?: string;
}

// Separate component for search params to handle suspense
function ContactFormContent({ className = "" }: ContactFormProps) {
  const t = useTranslations('components.contactForm');
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Pre-select category based on URL parameter
  useEffect(() => {
    const categoryParam = searchParams?.get('category');
    if (categoryParam) {
      setFormData(prev => ({
        ...prev,
        category: categoryParam
      }));
    }
  }, [searchParams]);

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
        setFormData(prev => ({
          ...prev,
          ...updates
        }));
      }
    }
  }, [isSignedIn, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setResponseMessage(t('errors.fillRequired'));
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setResponseMessage('');

    try {
      // Track contact request
      trackContact.request({
        form_type: 'contact_us_ticket',
        inquiry_type: formData.category || 'general',
        has_name: !!formData.name.trim(),
        has_email: !!formData.email.trim(),
        has_message: !!formData.message.trim()
      });

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          category: formData.category,
          message: formData.message.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setResponseMessage(t('success.ticketCreated'));
        setIsSuccess(true);
        setShowModal(true);
        
        // Clear form
        setFormData({
          name: '',
          email: '',
          category: '',
          message: ''
        });

        // Redirect to homepage after 4 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 4000);
        
      } else {
        setResponseMessage(result.error || t('errors.createFailed'));
        setIsSuccess(false);
        setShowModal(true);
      }
        } catch (error) {
      console.error('Contact form error:', error);
      setResponseMessage(t('errors.createFailed'));
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
          <FaTicketAlt className="text-xl text-primary" />
          <h2 className="text-xl font-semibold">{t('form.title')}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="form-control">
            <label className="label py-1" htmlFor="name">
              <span className="label-text font-medium text-sm">{t('form.name')}</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t('form.namePlaceholder')}
              className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label py-1" htmlFor="email">
              <span className="label-text font-medium text-sm">{t('form.email')}</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t('form.emailPlaceholder')}
              className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label py-1" htmlFor="category">
              <span className="label-text font-medium text-sm">{t('form.category')}</span>
            </label>
            <select 
              id="category" 
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="select select-bordered select-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            >
              <option value="">{t('form.selectCategory')}</option>              <option value="feature_ideas">{t('categoriesShort.featureIdeas')}</option>
              <option value="bug_report">{t('categoriesShort.reportBug')}</option>
              <option value="technical_issues">{t('categoriesShort.troubles')}</option>
              <option value="delivery">{t('categoriesShort.delivery')}</option>
              <option value="credits">{t('categoriesShort.credits')}</option>
              <option value="business_partnership">{t('categoriesShort.businessPartnership')}</option>
              <option value="general">{t('categoriesShort.general')}</option>
            </select>
          </div>
          
          <div className="form-control">
            <label className="label py-1" htmlFor="message">
              <span className="label-text font-medium text-sm">{t('form.message')}</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              className="textarea textarea-bordered textarea-primary h-20 w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t('form.messagePlaceholder')}
              disabled={isLoading}
              required
            ></textarea>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="btn btn-primary btn-block h-10 mt-4"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <FaTicketAlt className="mr-2" />
                {t('form.submit')}
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
                {isSuccess ? t('modal.ticketCreated') : t('modal.oops')}
              </h3>
              <p className="text-center text-base-content/80">
                {responseMessage}
              </p>
              {isSuccess && (
                <p className="text-center text-sm text-base-content/60 mt-2">
                  {t('modal.redirectingMessage')}
                </p>
              )}
              <div className="modal-action">
                {!isSuccess && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setShowModal(false)}
                  >
                    {t('modal.tryAgain')}
                  </button>
                )}
                {isSuccess && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => window.location.href = '/'}
                  >
                    {t('modal.goToHomepage')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ContactForm = ({ className = "" }: ContactFormProps) => {
  return (
    <Suspense fallback={<div className="loading loading-spinner loading-lg"></div>}>
      <ContactFormContent className={className} />
    </Suspense>
  );
};

export default ContactForm;
