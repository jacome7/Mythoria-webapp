import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FileText,
  CheckCircle2,
  Headphones,
  HeartHandshake,
  Printer,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { LandingPageContent } from '@/content/landing-pages';

interface LandingPageTemplateProps {
  page: LandingPageContent;
}

const formatIcons = [BookOpen, Headphones, Printer, Sparkles];

export default function LandingPageTemplate({ page }: LandingPageTemplateProps) {
  const createHref = `/${page.locale}/tell-your-story/step-1?landingSlug=${page.slug}&primaryIntent=${page.primaryIntent}`;
  const updatedLabel = formatUpdatedAt(page.updatedAt, page.locale);
  const professionalHref =
    page.forProfessionals?.ctaHref ??
    `/${page.locale}/contactUs?topic=parcerias&landingSlug=${page.slug}`;

  return (
    <main className="min-h-screen bg-[#fff8ea] text-base-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildStructuredData(page)),
        }}
      />

      <section className="relative overflow-hidden border-b border-primary/10 bg-[#f8ead2]">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {page.hero.eyebrow}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-[#33251c] sm:text-5xl lg:text-6xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-relaxed text-[#594332]">
              {page.hero.headline}
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-base-content/75">
              {page.hero.subheadline}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={createHref} className="btn btn-primary btn-lg gap-2">
                {page.primaryCta}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="#exemplos" className="btn btn-outline btn-primary btn-lg">
                {page.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 h-24 w-24 rounded-full bg-secondary/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white p-3 shadow-2xl">
              <Image
                src={page.hero.imageSrc}
                alt={page.hero.imageAlt}
                width={900}
                height={720}
                priority
                className="aspect-[5/4] w-full rounded-[1.1rem] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {updatedLabel && (
          <p className="mb-8 text-sm text-base-content/60">Atualizado em {updatedLabel}</p>
        )}

        <section className="rounded-2xl border border-primary/15 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-[#33251c]">
                {page.quickAnswer.title}
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-base-content/75">
                {page.quickAnswer.body}
              </p>
            </div>
          </div>
        </section>

        <TwoColumnSection
          leftTitle={page.intro.title}
          leftBody={page.intro.body}
          rightTitle={page.whyThisFits.title}
          rightBody={page.whyThisFits.body}
        />

        {page.socialStoryExplainer && (
          <section className="my-16">
            <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm md:p-8">
              <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
                {page.socialStoryExplainer.title}
              </h2>
              <div className="mt-5 space-y-4 text-lg leading-relaxed text-base-content/75">
                {page.socialStoryExplainer.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="my-16">
          <div className="mb-8 max-w-3xl">
            <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
              {page.carefulBenefits.title}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {page.carefulBenefits.items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
              >
                <HeartHandshake className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
                <p className="leading-relaxed text-base-content/75">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {page.useCases && (
          <section className="my-16">
            <div className="mb-8 max-w-3xl">
              <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
                {page.useCases.title}
              </h2>
              {page.useCases.intro && (
                <p className="mt-3 text-lg leading-relaxed text-base-content/75">
                  {page.useCases.intro}
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {page.useCases.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-display text-lg font-bold leading-tight text-[#33251c]">
                    {item.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-base-content/75">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="exemplos" className="my-16 scroll-mt-24">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Amostras completas
              </p>
              <h2 className="font-display mt-2 text-3xl font-bold text-[#33251c] md:text-4xl">
                Cinco livros focados em PEA, PHDA e neurodivergência
              </h2>
            </div>
            <p className="max-w-2xl text-base-content/70">
              Estes conceitos mostram caminhos possíveis com capas, excertos e amostras áudio. Não
              são testemunhos reais nem histórias públicas já publicadas.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {page.books.map((book) => (
              <article
                key={book.id}
                className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={book.imageSrc}
                    alt={book.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 20vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap gap-2">
                    {[book.contextLabel, book.styleLabel, book.ageLabel]
                      .filter(Boolean)
                      .map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                        >
                          {label}
                        </span>
                      ))}
                  </div>
                  <h3 className="font-display text-xl font-bold leading-tight text-[#33251c]">
                    {book.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-base-content/70">{book.synopsis}</p>
                  <blockquote className="border-l-4 border-accent/60 pl-3 text-sm italic text-base-content/65">
                    {book.excerpt}
                  </blockquote>
                  {book.audio && (
                    <div className="rounded-xl bg-base-200 p-3">
                      <p className="mb-2 text-sm font-semibold text-[#33251c]">
                        {book.audio.label}
                      </p>
                      <audio controls preload="none" className="w-full">
                        <source src={book.audio.src} type="audio/wav" />O seu navegador não suporta
                        áudio HTML5.
                      </audio>
                    </div>
                  )}
                  {book.sampleChapterHref && (
                    <Link
                      href={book.sampleChapterHref}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      Ler capítulo de amostra
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="my-16 grid gap-6 lg:grid-cols-2">
          <ProcessPanel title={page.process.title} items={page.process.steps} />
          <FormatPanel title={page.formats.title} items={page.formats.items} />
        </section>

        {page.forProfessionals && (
          <section className="my-16 rounded-2xl border border-secondary/30 bg-secondary/10 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <HeartHandshake className="h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
              <div>
                <h2 className="font-display text-2xl font-bold text-[#33251c] md:text-3xl">
                  {page.forProfessionals.title}
                </h2>
                <div className="mt-3 space-y-4 leading-relaxed text-base-content/75">
                  {page.forProfessionals.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="mt-6">
                  <Link href={professionalHref} className="btn btn-secondary gap-2">
                    {page.forProfessionals.ctaLabel}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {page.glossary && (
          <section className="my-16">
            <h2 className="font-display mb-8 text-3xl font-bold text-[#33251c] md:text-4xl">
              {page.glossary.title}
            </h2>
            <dl className="grid gap-4 md:grid-cols-2">
              {page.glossary.terms.map((term) => (
                <div
                  key={term.term}
                  className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
                >
                  <dt className="font-display text-lg font-bold text-[#33251c]">{term.term}</dt>
                  <dd className="mt-2 leading-relaxed text-base-content/75">{term.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="my-16">
          <h2 className="font-display mb-8 text-3xl font-bold text-[#33251c] md:text-4xl">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {page.faq.map((item) => (
              <details
                key={item.question}
                className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
              >
                <summary className="cursor-pointer font-display text-xl font-bold text-[#33251c]">
                  {item.question}
                </summary>
                <p className="mt-3 leading-relaxed text-base-content/75">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="my-16 rounded-2xl border border-warning/30 bg-warning/10 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <ShieldCheck className="h-8 w-8 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h2 className="font-display text-2xl font-bold text-[#33251c]">
                {page.safetyNote.title}
              </h2>
              <p className="mt-3 leading-relaxed text-base-content/75">{page.safetyNote.body}</p>
            </div>
          </div>
        </section>

        <section className="my-16 rounded-[1.5rem] bg-[#33251c] p-8 text-center text-white shadow-xl md:p-12">
          <h2 className="font-display text-3xl font-bold md:text-5xl">{page.finalCta.title}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-white/80">
            {page.finalCta.body}
          </p>
          <div className="mt-8">
            <Link href={createHref} className="btn btn-secondary btn-lg gap-2">
              {page.primaryCta}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function TwoColumnSection({
  leftTitle,
  leftBody,
  rightTitle,
  rightBody,
}: {
  leftTitle: string;
  leftBody: string[];
  rightTitle: string;
  rightBody: string[];
}) {
  return (
    <section className="my-16 grid gap-6 lg:grid-cols-2">
      {[
        { title: leftTitle, body: leftBody },
        { title: rightTitle, body: rightBody },
      ].map((section) => (
        <div
          key={section.title}
          className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm md:p-8"
        >
          <h2 className="font-display text-3xl font-bold text-[#33251c]">{section.title}</h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-base-content/75">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProcessPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm md:p-8">
      <h2 className="font-display text-3xl font-bold text-[#33251c]">{title}</h2>
      <ol className="mt-6 space-y-4">
        {items.map((item, index) => (
          <li key={item} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content">
              {index + 1}
            </span>
            <span className="pt-1 text-lg leading-relaxed text-base-content/75">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FormatPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm md:p-8">
      <h2 className="font-display text-3xl font-bold text-[#33251c]">{title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map((item, index) => {
          const Icon = formatIcons[index] ?? BookOpen;

          return (
            <div key={item} className="rounded-xl bg-base-200 p-4">
              <Icon className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
              <p className="leading-relaxed text-base-content/75">{item}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatUpdatedAt(value: string, locale: string): string | null {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function buildStructuredData(page: LandingPageContent) {
  const base = 'https://mythoria.pt';
  const pageUrl = `${base}/${page.locale}/lp/${page.slug}`;
  const imageUrl = `${base}${page.ogImageSrc ?? page.hero.imageSrc}`;
  const breadcrumbName = page.breadcrumbLabel ?? page.title;

  const publisher = {
    '@type': 'Organization',
    name: 'Mythoria',
    url: base,
    logo: {
      '@type': 'ImageObject',
      url: `${base}/assets/logo.svg`,
    },
  };

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Mythoria',
          item: `${base}/${page.locale}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: breadcrumbName,
          item: pageUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.metaTitle,
      description: page.metaDescription,
      url: pageUrl,
      inLanguage: page.locale,
      dateModified: page.updatedAt,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Mythoria',
        url: base,
      },
      publisher,
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: imageUrl,
      },
      about: [
        { '@type': 'Thing', name: 'Perturbação do Espectro do Autismo (PEA)' },
        { '@type': 'Thing', name: 'Perturbação de Hiperatividade e Défice de Atenção (PHDA)' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Livros personalizados Mythoria para crianças com PEA e PHDA',
      serviceType: 'Livros e histórias personalizadas',
      description: page.metaDescription,
      provider: {
        '@type': 'Organization',
        name: 'Mythoria',
        url: base,
      },
      areaServed: 'PT',
      inLanguage: page.locale,
      url: pageUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: page.process.title,
      step: page.process.steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step,
        text: step,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ];
}
