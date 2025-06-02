'use client';

import { useTranslations } from 'next-intl';

export default function PrivacyPolicyPage() {
  const t = useTranslations('PrivacyPolicy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-4xl font-bold text-center mb-8 text-primary">
            {t('title')}
          </h1>
          
          <div className="prose prose-lg max-w-none">
            {/* At-a-Glance Section */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-r-lg">
              <h2 className="text-2xl font-semibold mb-4 text-blue-800">
                {t('atAGlance.title')}
              </h2>
              <div className="space-y-3 text-blue-700">
                <p>{t('atAGlance.summary1')}</p>
                <p>{t('atAGlance.summary2')}</p>
                <p>{t('atAGlance.summary3')}</p>
              </div>
            </div>

            {/* Main Content Sections */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section1.title')}
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">{t('section1.controller.title')}</h3>
                  <div className="pl-4 space-y-1">
                    <p>{t('section1.controller.company')}</p>
                    <p>{t('section1.controller.address')}</p>
                    <p>{t('section1.controller.email')}</p>
                    <p>{t('section1.controller.privacy')}</p>
                    <p>{t('section1.controller.dpo')}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">{t('section1.authority.title')}</h3>
                  <p className="pl-4">{t('section1.authority.contact')}</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section2.title')}
              </h2>
              <p>{t('section2.content')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section3.title')}
              </h2>
              <div className="overflow-x-auto">
                <table className="table w-full border">
                  <thead>
                    <tr className="bg-base-200">
                      <th>{t('section3.table.category')}</th>
                      <th>{t('section3.table.examples')}</th>
                      <th>{t('section3.table.source')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t('section3.table.rows.account.category')}</td>
                      <td>{t('section3.table.rows.account.examples')}</td>
                      <td>{t('section3.table.rows.account.source')}</td>
                    </tr>
                    <tr>
                      <td>{t('section3.table.rows.story.category')}</td>
                      <td>{t('section3.table.rows.story.examples')}</td>
                      <td>{t('section3.table.rows.story.source')}</td>
                    </tr>
                    <tr>
                      <td>{t('section3.table.rows.generated.category')}</td>
                      <td>{t('section3.table.rows.generated.examples')}</td>
                      <td>{t('section3.table.rows.generated.source')}</td>
                    </tr>
                    <tr>
                      <td>{t('section3.table.rows.usage.category')}</td>
                      <td>{t('section3.table.rows.usage.examples')}</td>
                      <td>{t('section3.table.rows.usage.source')}</td>
                    </tr>
                    <tr>
                      <td>{t('section3.table.rows.cookies.category')}</td>
                      <td>{t('section3.table.rows.cookies.examples')}</td>
                      <td>{t('section3.table.rows.cookies.source')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-gray-600">{t('section3.note')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section4.title')}
              </h2>
              <div className="overflow-x-auto">
                <table className="table w-full border">
                  <thead>
                    <tr className="bg-base-200">
                      <th>{t('section4.table.purpose')}</th>
                      <th>{t('section4.table.data')}</th>
                      <th>{t('section4.table.legalBasis')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t('section4.table.rows.stories.purpose')}</td>
                      <td>{t('section4.table.rows.stories.data')}</td>
                      <td>{t('section4.table.rows.stories.legalBasis')}</td>
                    </tr>
                    <tr>
                      <td>{t('section4.table.rows.account.purpose')}</td>
                      <td>{t('section4.table.rows.account.data')}</td>
                      <td>{t('section4.table.rows.account.legalBasis')}</td>
                    </tr>
                    <tr>
                      <td>{t('section4.table.rows.abuse.purpose')}</td>
                      <td>{t('section4.table.rows.abuse.data')}</td>
                      <td>{t('section4.table.rows.abuse.legalBasis')}</td>
                    </tr>
                    <tr>
                      <td>{t('section4.table.rows.analytics.purpose')}</td>
                      <td>{t('section4.table.rows.analytics.data')}</td>
                      <td>{t('section4.table.rows.analytics.legalBasis')}</td>
                    </tr>
                    <tr>
                      <td>{t('section4.table.rows.legal.purpose')}</td>
                      <td>{t('section4.table.rows.legal.data')}</td>
                      <td>{t('section4.table.rows.legal.legalBasis')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-gray-600">{t('section4.note')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section5.title')}
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">{t('section5.openai.title')}</h3>
                  <p>{t('section5.openai.description')}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">{t('section5.google.title')}</h3>
                  <p>{t('section5.google.description')}</p>
                </div>
                <p className="text-sm text-gray-600">{t('section5.note')}</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section6.title')}
              </h2>
              <p>{t('section6.content')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section7.title')}
              </h2>
              <div className="overflow-x-auto">
                <table className="table w-full border">
                  <thead>
                    <tr className="bg-base-200">
                      <th>{t('section7.table.cookie')}</th>
                      <th>{t('section7.table.purpose')}</th>
                      <th>{t('section7.table.expiry')}</th>
                      <th>{t('section7.table.consent')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t('section7.table.rows.session.cookie')}</td>
                      <td>{t('section7.table.rows.session.purpose')}</td>
                      <td>{t('section7.table.rows.session.expiry')}</td>
                      <td>{t('section7.table.rows.session.consent')}</td>
                    </tr>
                    <tr>
                      <td>{t('section7.table.rows.auth.cookie')}</td>
                      <td>{t('section7.table.rows.auth.purpose')}</td>
                      <td>{t('section7.table.rows.auth.expiry')}</td>
                      <td>{t('section7.table.rows.auth.consent')}</td>
                    </tr>
                    <tr>
                      <td>{t('section7.table.rows.analytics.cookie')}</td>
                      <td>{t('section7.table.rows.analytics.purpose')}</td>
                      <td>{t('section7.table.rows.analytics.expiry')}</td>
                      <td>{t('section7.table.rows.analytics.consent')}</td>
                    </tr>
                    <tr>
                      <td>{t('section7.table.rows.consent.cookie')}</td>
                      <td>{t('section7.table.rows.consent.purpose')}</td>
                      <td>{t('section7.table.rows.consent.expiry')}</td>
                      <td>{t('section7.table.rows.consent.consent')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-gray-600">{t('section7.note')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section8.title')}
              </h2>
              <div className="overflow-x-auto">
                <table className="table w-full border">
                  <thead>
                    <tr className="bg-base-200">
                      <th>{t('section8.table.dataSet')}</th>
                      <th>{t('section8.table.retention')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t('section8.table.rows.account.dataSet')}</td>
                      <td>{t('section8.table.rows.account.retention')}</td>
                    </tr>
                    <tr>
                      <td>{t('section8.table.rows.openai.dataSet')}</td>
                      <td>{t('section8.table.rows.openai.retention')}</td>
                    </tr>
                    <tr>
                      <td>{t('section8.table.rows.logs.dataSet')}</td>
                      <td>{t('section8.table.rows.logs.retention')}</td>
                    </tr>
                    <tr>
                      <td>{t('section8.table.rows.backups.dataSet')}</td>
                      <td>{t('section8.table.rows.backups.retention')}</td>
                    </tr>
                    <tr>
                      <td>{t('section8.table.rows.financial.dataSet')}</td>
                      <td>{t('section8.table.rows.financial.retention')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section9.title')}
              </h2>
              <p>{t('section9.content')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section10.title')}
              </h2>
              <p>{t('section10.content')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section11.title')}
              </h2>
              <div className="space-y-4">
                <p>{t('section11.content1')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('section11.list.item1')}</li>
                  <li>{t('section11.list.item2')}</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section12.title')}
              </h2>
              <p>{t('section12.content')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">
                {t('section13.title')}
              </h2>
              <p>{t('section13.content')}</p>
            </section>

            <div className="text-center mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">{t('lastUpdated')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}