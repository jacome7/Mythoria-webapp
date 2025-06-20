import { getTranslations, setRequestLocale } from 'next-intl/server';

interface ContactUsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactUsPage({ params }: ContactUsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('ContactUsPage');

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-12">
        <section>
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="mb-6">{t('intro')}</p>
          <h2 className="text-2xl font-semibold mb-2">{t('scrollTitle')}</h2>
          <p className="mb-4">{t('scrollIntro')}</p>
          <ul className="list-disc list-inside space-y-1 mb-8">
            <li>{t('categories.featureIdeas')}</li>
            <li>{t('categories.reportBug')}</li>
            <li>{t('categories.troubles')}</li>
            <li>{t('categories.delivery')}</li>
            <li>{t('categories.credits')}</li>
            <li>{t('categories.general')}</li>
          </ul>
          <h2 className="text-2xl font-semibold mb-4">{t('form.title')}</h2>
          <form className="space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="name">
                <span className="label-text">{t('form.name')}</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder={t('form.namePlaceholder')}
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text">{t('form.email')}</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder={t('form.emailPlaceholder')}
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control">
              <label className="label" htmlFor="category">
                <span className="label-text">{t('form.category')}</span>
              </label>
              <select id="category" className="select select-bordered w-full">
                <option>{t('categories.featureIdeas')}</option>
                <option>{t('categories.reportBug')}</option>
                <option>{t('categories.troubles')}</option>
                <option>{t('categories.delivery')}</option>
                <option>{t('categories.credits')}</option>
                <option>{t('categories.general')}</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label" htmlFor="message">
                <span className="label-text">{t('form.message')}</span>
              </label>
              <textarea
                id="message"
                className="textarea textarea-bordered h-32"
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">
              {t('form.submit')}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-4">{t('join.title')}</h2>
          <p className="mb-4">{t('join.intro')}</p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>{t('join.printing')}</li>
            <li>{t('join.country')}</li>
            <li>{t('join.developers')}</li>
          </ul>
          <p>{t('join.call')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">{t('bonus.title')}</h2>
          <p className="mb-2">{t('bonus.content')}</p>
          <p className="mb-4 text-sm">{t('bonus.disclaimer')}</p>
          <p className="font-semibold">{t('bonus.closing')}</p>
        </section>
      </div>
    </div>
  );
}
