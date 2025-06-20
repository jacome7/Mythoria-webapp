import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FaEnvelope, FaBug, FaCogs, FaTruck, FaCoins, FaComments, FaLightbulb, FaUsers, FaHeart } from 'react-icons/fa';

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
          </div>

          {/* Contact Form - Second on mobile */}
          <div className="order-2 lg:order-1">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaEnvelope className="text-xl text-primary" />
                  <h2 className="text-xl font-semibold">{t('form.title')}</h2>
                </div>
                
                <form className="space-y-3">
                  <div className="form-control">
                    <label className="label py-1" htmlFor="name">
                      <span className="label-text font-medium text-sm">{t('form.name')}</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder={t('form.namePlaceholder')}
                      className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1" htmlFor="email">
                      <span className="label-text font-medium text-sm">{t('form.email')}</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder={t('form.emailPlaceholder')}
                      className="input input-bordered input-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1" htmlFor="category">
                      <span className="label-text font-medium text-sm">{t('form.category')}</span>
                    </label>
                    <select id="category" className="select select-bordered select-primary w-full h-10 focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option>{t('categoriesShort.featureIdeas')}</option>
                      <option>{t('categoriesShort.reportBug')}</option>
                      <option>{t('categoriesShort.troubles')}</option>
                      <option>{t('categoriesShort.delivery')}</option>
                      <option>{t('categoriesShort.credits')}</option>
                      <option>{t('categoriesShort.general')}</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label py-1" htmlFor="message">
                      <span className="label-text font-medium text-sm">{t('form.message')}</span>
                    </label>
                    <textarea
                      id="message"
                      className="textarea textarea-bordered textarea-primary h-20 w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder={t('form.messagePlaceholder')}
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary btn-block h-10 mt-4">
                    <FaEnvelope className="mr-2" />
                    {t('form.submit')}
                  </button>
                </form>
              </div>
            </div>
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
