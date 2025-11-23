import { getTranslations } from 'next-intl/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService } from '@/db/services';
import { redirect } from 'next/navigation';
import CreditsHistoryTable from '@/components/CreditsHistoryTable';
import Link from 'next/link';
import { MdAccountBalanceWallet, MdHistory, MdAddCircleOutline } from 'react-icons/md';
import { FaCoins } from 'react-icons/fa';
import ScrollFadeIn from '@/components/ScrollFadeIn';

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
              <MdAccountBalanceWallet />
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
                  <FaCoins className="text-4xl text-yellow-500" />
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
                  <MdAddCircleOutline className="text-xl" />
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
                <MdHistory className="text-2xl text-primary" />
                <h2 className="card-title text-2xl">{t('historyTitle')}</h2>
              </div>
              <div className="overflow-x-auto">
                <CreditsHistoryTable history={historyOldestFirstWithBalance} />
              </div>
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </div>
  );
}
