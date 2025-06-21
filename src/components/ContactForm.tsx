'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FaEnvelope } from 'react-icons/fa';
import { trackContact } from '../lib/analytics';

interface ContactFormProps {
  className?: string;
}

const ContactForm = ({ className = "" }: ContactFormProps) => {
  const t = useTranslations('ContactUsPage');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

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
      setResponseMessage('Please fill in all required fields');
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setResponseMessage('');

    try {
      // Track contact request
      trackContact.request({
        form_type: 'contact_us',
        inquiry_type: formData.category || 'general',
        has_name: !!formData.name.trim(),
        has_email: !!formData.email.trim(),
        has_message: !!formData.message.trim()
      });

      // For now, simulate sending (you would implement actual contact API here)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResponseMessage('Thank you for your message! We\'ll get back to you soon.');
      setIsSuccess(true);
      
      // Clear form
      setFormData({
        name: '',
        email: '',
        category: '',
        message: ''
      });
      
    } catch (error) {
      console.error('Contact form error:', error);
      setResponseMessage('Failed to send message. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body p-6">
        <div className="flex items-center gap-3 mb-4">
          <FaEnvelope className="text-xl text-primary" />
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
              <option value="">{t('form.selectCategory')}</option>
              <option value="feature_ideas">{t('categoriesShort.featureIdeas')}</option>
              <option value="bug_report">{t('categoriesShort.reportBug')}</option>
              <option value="technical_issues">{t('categoriesShort.troubles')}</option>
              <option value="delivery">{t('categoriesShort.delivery')}</option>
              <option value="credits">{t('categoriesShort.credits')}</option>
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
                <FaEnvelope className="mr-2" />
                {t('form.submit')}
              </>
            )}
          </button>
        </form>
        
        {responseMessage && (
          <div className={`alert ${isSuccess ? 'alert-success' : 'alert-error'} text-sm mt-4`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              {isSuccess ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <span>{responseMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactForm;
