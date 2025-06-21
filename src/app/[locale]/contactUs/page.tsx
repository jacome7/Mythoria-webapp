import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FaBug, FaCogs, FaTruck, FaCoins, FaComments, FaLightbulb, FaUsers, FaHeart } from 'react-icons/fa';
import ContactForm from '../../../components/ContactForm';

interface ContactUsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactUsPage({ params }: ContactUsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('ContactUsPage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-lg text-base-content/80 max-w-2xl mx-auto">
            {t('intro')}
          </p>
        </div>
        
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
          {/* Categories Grid - First on mobile */}
          <div className="order-1 lg:order-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                  <FaComments className="text-primary" />
                  {t('scrollTitle')}
                </h2>
                <p className="mb-6 text-base-content/80">{t('scrollIntro')}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                    <FaLightbulb className="text-warning text-lg" />
                    <span className="text-sm">{t('categories.featureIdeas')}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                    <FaBug className="text-error text-lg" />
                    <span className="text-sm">{t('categories.reportBug')}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                    <FaCogs className="text-info text-lg" />
                    <span className="text-sm">{t('categories.troubles')}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                    <FaTruck className="text-success text-lg" />
                    <span className="text-sm">{t('categories.delivery')}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                    <FaCoins className="text-accent text-lg" />
                    <span className="text-sm">{t('categories.credits')}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                    <FaComments className="text-primary text-lg" />
                    <span className="text-sm">{t('categories.general')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>          {/* Contact Form - Second on mobile */}
          <div className="order-2 lg:order-1">
            <ContactForm />
          </div>

          {/* Bonus Section - Third on mobile */}
          <div className="order-3 lg:col-span-2">
            <div className="card bg-gradient-to-r from-accent/10 to-warning/10 border border-accent/20 max-w-2xl mx-auto">
              <div className="card-body p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-3">
                  <FaHeart className="text-accent" />
                  {t('bonus.title')}
                </h2>
                <p className="mb-2 text-sm">{t('bonus.content')}</p>
                <p className="mb-3 text-xs text-base-content/60">{t('bonus.disclaimer')}</p>
                <p className="font-semibold text-sm">{t('bonus.closing')}</p>
              </div>
            </div>
          </div>

          {/* Join Community - Fourth on mobile */}
          <div className="order-4 lg:col-span-2">
            <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 max-w-4xl mx-auto">
              <div className="card-body">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <FaUsers className="text-primary" />
                  {t('join.title')}
                </h2>
                <p className="mb-4 text-base-content/80">{t('join.intro')}</p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{t('join.printing')}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{t('join.country')}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{t('join.developers')}</span>
                  </div>
                </div>
                
                <p className="mt-4 font-medium">{t('join.call')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
