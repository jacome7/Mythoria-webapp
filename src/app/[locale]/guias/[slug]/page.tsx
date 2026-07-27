import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getGuideBySlug, getGuideStaticParams } from '@/content/guides';
import { buildPublicRedirectSearch } from '@/lib/campaign-context';
import { buildLocalizedUrl } from '@/lib/seo';

interface GuideRouteProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return getGuideStaticParams();
}

export async function generateMetadata({ params }: GuideRouteProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};

  const canonical = buildLocalizedUrl(guide.locale, `/guias/${guide.slug}`);
  const isCanonical = locale === guide.locale;

  return {
    title: `${guide.title} | Mythoria`,
    description: guide.description,
    robots: isCanonical ? 'index,follow,max-snippet:-1,max-image-preview:large' : 'noindex,follow',
    alternates: { canonical },
    openGraph: {
      type: 'article',
      locale: guide.locale.replace('-', '_'),
      title: guide.title,
      description: guide.description,
      url: canonical,
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function GuideRoute({ params, searchParams }: GuideRouteProps) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  if (locale !== guide.locale) {
    permanentRedirect(`/${guide.locale}/guias/${guide.slug}${buildPublicRedirectSearch(query)}`);
  }

  const canonical = buildLocalizedUrl(guide.locale, `/guias/${guide.slug}`);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updatedAt,
    datePublished: guide.updatedAt,
    inLanguage: guide.locale,
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: 'Mythoria' },
    publisher: {
      '@type': 'Organization',
      name: 'Mythoria',
      url: 'https://mythoria.pt',
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Mythoria',
        item: buildLocalizedUrl(guide.locale),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Guias',
        item: buildLocalizedUrl(guide.locale, '/lp'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: canonical,
      },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-[#fff8ea] px-4 py-10 text-[#33251c] sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([articleSchema, breadcrumbSchema, faqSchema]),
          }}
        />

        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-base-content/65">
          <Link href="/pt-PT" className="font-semibold text-primary hover:underline">
            Mythoria
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <Link href={guide.hub.href} className="font-semibold text-primary hover:underline">
            Guias
          </Link>{' '}
          <span aria-hidden="true">/</span> <span>{guide.title}</span>
        </nav>

        <header className="rounded-3xl border border-primary/10 bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">{guide.eyebrow}</p>
          <h1 className="font-display mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-base-content/75">{guide.description}</p>
          <p className="mt-5 text-sm text-base-content/55">
            Revisto em {formatDate(guide.updatedAt)} · Leitura: {guide.readingTime}
          </p>
        </header>

        <div className="mt-10 space-y-5 text-lg leading-8 text-base-content/80">
          {guide.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <nav
          aria-label="Conteúdos deste guia"
          className="my-10 rounded-2xl border border-primary/10 bg-white p-6"
        >
          <h2 className="font-display text-2xl font-bold">Neste guia</h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {guide.sections.map((section) => (
              <li key={section.id}>
                <a className="font-semibold text-primary hover:underline" href={`#${section.id}`}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-12">
          {guide.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display text-3xl font-bold">{section.heading}</h2>
              <div className="mt-5 space-y-5 text-lg leading-8 text-base-content/80">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets ? (
                <ul className="mt-5 list-disc space-y-2 pl-6 text-lg leading-8 text-base-content/80">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <aside className="my-12 rounded-3xl border border-secondary/25 bg-secondary/10 p-7 sm:p-9">
          <h2 className="font-display text-3xl font-bold">Ver a estrutura aplicada num exemplo</h2>
          <p className="mt-4 text-lg leading-relaxed text-base-content/80">
            {guide.featuredSample.title} é uma história inteiramente ficcional. O exemplo permite
            observar o ritmo, as imagens, o capítulo de amostra e os limites editoriais sem expor
            dados de uma pessoa real.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="btn btn-primary h-auto py-3" href={guide.featuredSample.href}>
              {guide.featuredSample.label}
            </Link>
            <Link className="btn btn-outline btn-primary h-auto py-3" href={guide.landingPage.href}>
              {guide.landingPage.label}
            </Link>
          </div>
        </aside>

        <section aria-labelledby="perguntas-frequentes" className="my-12">
          <h2 id="perguntas-frequentes" className="font-display text-3xl font-bold">
            Perguntas frequentes
          </h2>
          <div className="mt-6 space-y-4">
            {guide.faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-2xl border border-primary/10 bg-white p-5"
              >
                <summary className="cursor-pointer text-lg font-bold">{faq.question}</summary>
                <p className="mt-3 leading-7 text-base-content/75">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="my-12 border-t border-primary/15 pt-8">
          <Link className="font-bold text-primary hover:underline" href={guide.hub.href}>
            {guide.hub.label}
          </Link>
        </footer>
      </article>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
