import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getLandingPageIndexItems } from '@/content/landing-pages';
import { routing } from '@/i18n/routing';
import { buildLocalizedUrl } from '@/lib/seo';

interface LandingPageIndexRouteProps {
  params: Promise<{
    locale: string;
  }>;
}

const copy = {
  'pt-PT': {
    eyebrow: 'Guias Mythoria',
    title: 'Landing pages',
    intro:
      'Explore as páginas especializadas da Mythoria para livros personalizados, workshops e ocasiões familiares.',
    updatedLabel: 'Atualizada em',
    empty: 'Ainda não existem landing pages indexáveis.',
  },
  fallback: {
    eyebrow: 'Internal index',
    title: 'Landing pages',
    intro: 'Simple list of registered Mythoria landing pages for quick navigation and review.',
    updatedLabel: 'Updated',
    empty: 'There are no indexable landing pages yet.',
  },
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LandingPageIndexRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = buildLocalizedUrl('pt-PT', '/lp');
  const isCanonicalLocale = locale === 'pt-PT';

  return {
    title: 'Landing pages Mythoria | Livros personalizados e workshops',
    description:
      'Explore as páginas especializadas da Mythoria para livros personalizados, workshops infantis e presentes familiares.',
    robots: isCanonicalLocale
      ? 'index,follow,max-snippet:-1,max-image-preview:large'
      : 'noindex,follow',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: 'Landing pages Mythoria | Livros personalizados e workshops',
      description:
        'Explore as páginas especializadas da Mythoria para livros personalizados, workshops infantis e presentes familiares.',
      type: 'website',
      url: canonicalUrl,
    },
  };
}

export default async function LandingPageIndexRoute({ params }: LandingPageIndexRouteProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const t = locale === 'pt-PT' ? copy['pt-PT'] : copy.fallback;
  const pages = getLandingPageIndexItems();

  return (
    <main className="min-h-screen bg-[#fff8ea] px-4 py-12 text-base-content sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.eyebrow}</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-[#33251c] md:text-5xl">
          {t.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-base-content/75">{t.intro}</p>

        {pages.length > 0 ? (
          <div className="mt-10 grid gap-4">
            {pages.map((page) => (
              <Link
                key={`${page.locale}-${page.slug}`}
                href={page.href}
                className="block rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#fff8ea]"
              >
                <article>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                      {page.locale}
                    </span>
                    <span className="rounded-full bg-base-200 px-3 py-1 text-xs font-semibold text-base-content/70">
                      /lp/{page.slug}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold leading-tight text-[#33251c]">
                    {page.title}
                  </h2>
                  <p className="mt-2 max-w-3xl leading-relaxed text-base-content/70">
                    {page.metaDescription}
                  </p>
                  <p className="mt-3 text-sm text-base-content/55">
                    {t.updatedLabel} {formatDate(page.updatedAt, locale)}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-primary/10 bg-white p-6 text-base-content/70">
            {t.empty}
          </p>
        )}
      </div>
    </main>
  );
}

function formatDate(value: string, locale: string): string {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
