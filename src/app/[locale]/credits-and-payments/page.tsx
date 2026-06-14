import { CirclePlus, Coins, FileText, History, WalletCards } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService, paymentService } from '@/db/services';
import { redirect } from 'next/navigation';
import CreditsHistoryTable from '@/components/CreditsHistoryTable';
import Link from 'next/link';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import { formatDate } from '@/utils/date';

export default async function CreditsAndPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CreditsAndPayments' });
  const author = await getCurrentAuthor();

  if (!author) {
    redirect(`/${locale}/sign-in`);
  }

  // Fetch data
  // Fetching a reasonable amount of history.
  const creditHistoryRaw = await creditService.getCreditHistory(author.authorId, 100);
  const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
  const paymentHistory = await paymentService.getUserPaymentHistory(author.authorId, 20);

  // Calculate balance for each transaction working backwards from current balance
  // creditHistoryRaw is expected to be Newest -> Oldest
  const historyWithBalance = [];
  let runningBalance = currentBalance;

  for (const entry of creditHistoryRaw) {
    historyWithBalance.push({
      ...entry,
      balanceAfter: runningBalance,
      // Ensure dates are strings for serialization
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    });
    runningBalance -= entry.amount;
  }

  // We want Oldest -> Newest for the table display
  const historyOldestFirstWithBalance = historyWithBalance.reverse();

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <ScrollFadeIn>
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
              <WalletCards />
              {t('title')}
            </h1>
            <p className="text-xl opacity-70">{t('subtitle')}</p>
          </header>
        </ScrollFadeIn>

        {/* Balance Section */}
        <ScrollFadeIn delay={100}>
          <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
            {/* Balance Card */}
            <div className="card bg-base-200 shadow-xl border-2 border-primary/10">
              <div className="card-body items-center text-center">
                <h2 className="card-title text-lg opacity-70 uppercase tracking-wide">
                  {t('currentBalance')}
                </h2>
                <div className="flex items-center gap-2 my-4">
                  <Coins className="text-4xl text-yellow-500" />
                  <span className="text-5xl font-bold text-primary">{currentBalance}</span>
                </div>
                <p className="text-sm opacity-60">{t('creditsAvailable')}</p>
              </div>
            </div>

            {/* Action Card */}
            <div className="card bg-base-200 shadow-xl border-2 border-primary/10">
              <div className="card-body items-center text-center justify-center">
                <h2 className="card-title text-lg opacity-70 uppercase tracking-wide">
                  {t('needMore')}
                </h2>
                <Link
                  href={`/${locale}/buy-credits`}
                  className="btn btn-primary btn-lg w-full max-w-xs gap-2 mt-4"
                >
                  <CirclePlus className="text-xl" />
                  {t('buyCredits')}
                </Link>
                <p className="text-sm opacity-60 mt-2">{t('checkPricing')}</p>
              </div>
            </div>
          </div>
        </ScrollFadeIn>

        {/* History Section */}
        <ScrollFadeIn delay={200}>
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body p-0 sm:p-6">
              <div className="flex items-center gap-2 px-6 pt-6 sm:px-0 sm:pt-0 mb-4">
                <History className="text-2xl text-primary" />
                <h2 className="card-title text-2xl">{t('historyTitle')}</h2>
              </div>
              <div className="overflow-x-auto">
                <CreditsHistoryTable history={historyOldestFirstWithBalance} />
              </div>
            </div>
          </div>
        </ScrollFadeIn>

        <ScrollFadeIn delay={300}>
          <div className="card bg-base-100 shadow-xl border border-base-200 mt-12">
            <div className="card-body p-0 sm:p-6">
              <div className="flex items-center gap-2 px-6 pt-6 sm:px-0 sm:pt-0 mb-4">
                <FileText className="text-2xl text-primary" />
                <h2 className="card-title text-2xl">{t('paymentHistoryTitle')}</h2>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto border rounded-lg bg-base-100 shadow-sm">
                <table className="table table-zebra w-full table-pin-rows">
                  <thead className="z-10">
                    <tr>
                      <th className="bg-base-200">{t('paymentTable.date')}</th>
                      <th className="bg-base-200">{t('paymentTable.description')}</th>
                      <th className="text-right bg-base-200">{t('paymentTable.amount')}</th>
                      <th className="bg-base-200">{t('paymentTable.status')}</th>
                      <th className="bg-base-200">{t('paymentTable.invoice')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => {
                      const creditBundle = payment.creditBundle as { credits?: number };
                      const fiscalDocument = payment.fiscalDocument;
                      const invoiceStatus = fiscalDocument?.status || 'not_available';
                      return (
                        <tr key={payment.id}>
                          <td className="text-sm whitespace-nowrap">
                            {formatDate(payment.createdAt, {
                              locale,
                              year: '2-digit',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td>
                            {creditBundle.credits || 0} {t('credits')}
                          </td>
                          <td className="text-right font-mono whitespace-nowrap">
                            €{(payment.amount / 100).toFixed(2)}
                          </td>
                          <td>
                            <span className="badge badge-outline">{payment.status}</span>
                          </td>
                          <td>
                            {fiscalDocument?.pdfUrl ? (
                              <a
                                href={fiscalDocument.pdfUrl}
                                className="btn btn-xs btn-outline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {fiscalDocument.fullDocNumber || t('paymentTable.download')}
                              </a>
                            ) : (
                              <span className="text-sm opacity-70">
                                {t(`invoiceStatus.${invoiceStatus}`)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {paymentHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center opacity-70 py-8">
                          {t('paymentTable.empty')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </div>
  );
}
