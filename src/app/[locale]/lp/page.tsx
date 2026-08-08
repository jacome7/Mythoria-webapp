import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getLandingPageIndexItems } from '@/content/landing-pages';
import { getGuides } from '@/content/guides';
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
    title: 'Guias e ideias para livros personalizados',
    intro:
      'Um livro personalizado pode guardar uma história de família, celebrar uma relação, transformar uma viagem numa memória narrativa ou ajudar uma criança a compreender uma mudança. Reunimos aqui os guias Mythoria para escolher o ponto de partida certo, conhecer exemplos ficcionais e perceber como cada livro é construído com as pessoas, memórias e detalhes que indicar. Encontrará ideias para avós e netos, casais, férias e viagens, crianças com diferentes formas de aprender, workshops criativos e histórias de apoio para momentos exigentes.',
    introSecondary:
      'Cada guia explica o propósito do livro, as opções de personalização, os formatos disponíveis e os cuidados de privacidade. Os exemplos servem apenas de inspiração: as personagens são ficcionais e o conteúdo final permanece sob controlo do adulto. Explore por tema, compare possibilidades e avance para a criação apenas quando encontrar a abordagem que faz sentido para a sua família, escola ou ocasião.',
    empty: 'Ainda não existem guias indexáveis.',
  },
  fallback: {
    eyebrow: 'Internal index',
    title: 'Landing pages',
    intro: 'Simple list of registered Mythoria landing pages for quick navigation and review.',
    introSecondary: '',
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
    title: 'Guias para livros personalizados | Mythoria',
    description:
      'Explore guias Mythoria para livros personalizados de família, casais, férias, crianças, histórias de apoio e workshops criativos.',
    robots: isCanonicalLocale
      ? 'index,follow,max-snippet:-1,max-image-preview:large'
      : 'noindex,follow',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: 'Guias para livros personalizados | Mythoria',
      description:
        'Explore guias Mythoria para livros personalizados de família, casais, férias, crianças, histórias de apoio e workshops criativos.',
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
  const guides = getGuides();
  const categories = [...new Set(pages.map((page) => page.category))];
  const canonicalUrl = buildLocalizedUrl('pt-PT', '/lp');
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Mythoria',
          item: buildLocalizedUrl('pt-PT'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: copy['pt-PT'].title,
          item: canonicalUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: copy['pt-PT'].title,
      description:
        'Guias Mythoria para escolher e criar livros personalizados para diferentes pessoas, relações e ocasiões.',
      url: canonicalUrl,
      inLanguage: 'pt-PT',
      publisher: {
        '@type': 'Organization',
        name: 'Mythoria',
        url: 'https://mythoria.pt',
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: pages.map((page, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: page.title,
          url: `https://mythoria.pt${page.href}`,
        })),
      },
    },
  ];

  return (
    <main className="min-h-screen bg-[#fff8ea] px-4 py-12 text-base-content sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-base-content/65">
          <Link href={`/${locale}`} className="font-semibold text-primary hover:underline">
            Mythoria
          </Link>{' '}
          <span aria-hidden="true">/</span> <span>{t.title}</span>
        </nav>

        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.eyebrow}</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-[#33251c] md:text-5xl">
          {t.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-base-content/75">{t.intro}</p>
        {t.introSecondary ? (
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-base-content/75">
            {t.introSecondary}
          </p>
        ) : null}

        {pages.length > 0 ? (
          <div className="mt-12 space-y-12">
            {categories.map((category) => (
              <section key={category} aria-labelledby={`category-${slugify(category)}`}>
                <h2
                  id={`category-${slugify(category)}`}
                  className="font-display text-3xl font-bold text-[#33251c]"
                >
                  {category}
                </h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  {pages
                    .filter((page) => page.category === category)
                    .map((page) => (
                      <article key={`${page.locale}-${page.slug}`}>
                        <Link
                          href={page.href}
                          className="group block h-full rounded-2xl border border-primary/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <h3 className="font-display text-2xl font-bold leading-tight text-[#33251c]">
                            {page.title}
                          </h3>
                          <p className="mt-3 leading-relaxed text-base-content/70">
                            {page.metaDescription}
                          </p>
                          <span className="mt-5 inline-flex font-semibold text-primary group-hover:underline">
                            Explorar {page.title.toLocaleLowerCase('pt-PT')}
                          </span>
                        </Link>
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-primary/10 bg-white p-6 text-base-content/70">
            {t.empty}
          </p>
        )}

        <section className="mt-16" aria-labelledby="cluster-guides">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Guias aprofundados
          </p>
          <h2 id="cluster-guides" className="font-display mt-2 text-3xl font-bold text-[#33251c]">
            Da primeira ideia à revisão final
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-base-content/75">
            Leia orientações completas, veja exemplos inteiramente ficcionais e avance para a página
            do tema quando estiver pronto para comparar formatos e opções.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {guides.map((guide) => (
              <article
                key={guide.slug}
                className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm"
              >
                <h3 className="font-display text-2xl font-bold leading-tight text-[#33251c]">
                  {guide.title}
                </h3>
                <p className="mt-3 leading-relaxed text-base-content/70">{guide.description}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <Link
                    className="font-semibold text-primary hover:underline"
                    href={`/${guide.locale}/guias/${guide.slug}`}
                  >
                    Ler o guia: {guide.title}
                  </Link>
                  <Link
                    className="font-semibold text-primary hover:underline"
                    href={guide.featuredSample.href}
                  >
                    Ver o exemplo ficcional “{guide.featuredSample.title}”
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
