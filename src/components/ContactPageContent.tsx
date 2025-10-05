'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { FaComments, FaUsers, FaHeart } from 'react-icons/fa';
import ContactForm from './ContactForm';
import CategoryGrid from './CategoryGrid';

const ContactPageContent = () => {
  const tContactUsPage = useTranslations('ContactUsPage');
  const formRef = useRef<HTMLDivElement>(null);

  const handleCategoryClick = (categoryKey: string) => {
    // First scroll to the form
    if (formRef.current) {
      formRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    // Then update the URL without navigation after scroll starts
    setTimeout(() => {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('category', categoryKey);
      window.history.pushState({}, '', currentUrl.toString());
    }, 100);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
      {/* Categories Grid - First on mobile */}
      <div className="order-1 lg:order-2">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
              <FaComments className="text-primary" />
              {tContactUsPage('scrollTitle')}
            </h2>
            <p className="mb-6 text-base-content/80">{tContactUsPage('scrollIntro')}</p>

            <CategoryGrid onCategoryClick={handleCategoryClick} />
          </div>
        </div>
      </div>

      {/* Contact Form - Second on mobile */}
      <div className="order-2 lg:order-1" ref={formRef}>
        <ContactForm />
      </div>

      {/* Bonus Section - Third on mobile */}
      <div className="order-3 lg:col-span-2">
        <div className="card bg-gradient-to-r from-accent/10 to-warning/10 border border-accent/20 max-w-2xl mx-auto">
          <div className="card-body p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-3">
              <FaHeart className="text-accent" />
              {tContactUsPage('bonus.title')}
            </h2>
            <p className="mb-2 text-sm">{tContactUsPage('bonus.content')}</p>
            <p className="mb-3 text-xs text-base-content/60">
              {tContactUsPage('bonus.disclaimer')}
            </p>
            <p className="font-semibold text-sm">{tContactUsPage('bonus.closing')}</p>
          </div>
        </div>
      </div>

      {/* Join Community - Fourth on mobile */}
      <div className="order-4 lg:col-span-2">
        <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 max-w-4xl mx-auto">
          <div className="card-body">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <FaUsers className="text-primary" />
              {tContactUsPage('join.title')}
            </h2>
            <p className="mb-4 text-base-content/80">{tContactUsPage('join.intro')}</p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm">{tContactUsPage('join.printing')}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm">{tContactUsPage('join.country')}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm">{tContactUsPage('join.developers')}</span>
              </div>
            </div>

            <p className="mt-4 font-medium">{tContactUsPage('join.call')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPageContent;
