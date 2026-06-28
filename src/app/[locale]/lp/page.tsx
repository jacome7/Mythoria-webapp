import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getLandingPageIndexItems } from '@/content/landing-pages';
import { routing } from '@/i18n/routing';

interface LandingPageIndexRouteProps {
  params: Promise<{
    locale: string;
  }>;
}

const copy = {
  'pt-PT': {
    eyebrow: 'Índice interno',
    title: 'Landing pages',
    intro:
      'Lista simples das landing pages registadas no Mythoria, para navegação e revisão rápida.',
    statusLabel: 'Indexável',
    updatedLabel: 'Atualizada em',
    openLabel: 'Abrir landing page',
    empty: 'Ainda não existem landing pages indexáveis.',
  },
  fallback: {
    eyebrow: 'Internal index',
    title: 'Landing pages',
    intro: 'Simple list of registered Mythoria landing pages for quick navigation and review.',
    statusLabel: 'Indexable',
    updatedLabel: 'Updated',
    openLabel: 'Open landing page',
    empty: 'There are no indexable landing pages yet.',
  },
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Landing pages | Mythoria',
    description: 'Internal index of Mythoria landing pages.',
    robots: 'noindex,nofollow',
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
              <article
                key={`${page.locale}-${page.slug}`}
                className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                        {page.locale}
                      </span>
                      <span className="rounded-full bg-base-200 px-3 py-1 text-xs font-semibold text-base-content/70">
                        /lp/{page.slug}
                      </span>
                      <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                        {t.statusLabel}
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
                  </div>
                  <Link
                    href={page.href}
                    className="btn btn-primary h-auto min-h-12 shrink-0 whitespace-normal py-3 text-center leading-tight"
                  >
                    {t.openLabel}
                  </Link>
                </div>
              </article>
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
