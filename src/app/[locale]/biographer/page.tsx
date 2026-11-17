import BiographerHome from '@/components/biographer/BiographerHome';
import ClientAuthWrapper from '@/components/ClientAuthWrapper';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
export default async function BiographerPage() {
  const t = await getTranslations('Biographer');
  return (
    <ClientAuthWrapper
      signedOutFallback={
        <main className="container mx-auto p-8 text-center space-y-4">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p>{t('signIn')}</p>
          <Link href="/sign-in" className="btn btn-primary">
            {t('continue')}
          </Link>
        </main>
      }
    >
      <BiographerHome />
    </ClientAuthWrapper>
  );
}
