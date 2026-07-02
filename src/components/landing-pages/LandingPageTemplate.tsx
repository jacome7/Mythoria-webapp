import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  HeartHandshake,
  Printer,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { LandingPageContent, LandingPageTemplateIcon } from '@/content/landing-pages';
import LandingPageBookShowcase from './LandingPageBookShowcase';
import LandingPageFloatingNavigation from './LandingPageFloatingNavigation';

interface LandingPageTemplateProps {
  page: LandingPageContent;
}

const formatIcons = [BookOpen, Headphones, Printer, Sparkles];

export default function LandingPageTemplate({ page }: LandingPageTemplateProps) {
  const createHref = `/${page.locale}/tell-your-story/step-1?landingSlug=${page.slug}&primaryIntent=${page.primaryIntent}`;
  const primaryHref = page.primaryCtaHref ?? createHref;
  const secondaryHref = page.secondaryCtaHref ?? '#exemplos';
  const professionalHref =
    page.forProfessionals?.ctaHref ??
    `/${page.locale}/contactUs?topic=parcerias&landingSlug=${page.slug}`;
  const booksSection = page.booksSection ?? {
    eyebrow: 'Exemplos ficcionais',
    title: 'Cinco ideias de livros para começar',
    intro:
      'Estes conceitos mostram caminhos possíveis. Não são testemunhos reais nem histórias públicas já publicadas.',
  };

  return (
    <main
      id="landing-page-top"
      tabIndex={-1}
      className="min-h-screen bg-[#fff8ea] text-base-content focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildStructuredData(page)),
        }}
      />

      <section
        id="landing-page-hero"
        className="relative overflow-hidden border-b border-primary/10 bg-[#f8ead2]"
      >
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              {page.templateIcons?.heroEyebrow ? (
                <PapercutTemplateIcon icon={page.templateIcons.heroEyebrow} className="h-5 w-5" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
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
              <Link
                href={primaryHref}
                className="btn btn-primary btn-lg h-auto min-h-14 gap-2 whitespace-normal py-3 text-center leading-tight sm:whitespace-nowrap shadow-md"
              >
                <span>{page.primaryCta}</span>
                <CtaArrow icon={page.templateIcons?.ctaArrow} />
              </Link>
              <Link
                href={secondaryHref}
                className="btn btn-outline btn-primary btn-lg h-auto min-h-14 whitespace-normal py-3 text-center leading-tight sm:whitespace-nowrap"
              >
                {page.secondaryCta}
              </Link>
            </div>
            {/* Trust badges bar */}
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#594332]">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-2 shadow-sm border border-primary/10">
                <Clock className="h-4 w-4 text-primary shrink-0" /> Criado em 3 min
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-2 shadow-sm border border-primary/10">
                <Zap className="h-4 w-4 text-secondary shrink-0" /> Leitura digital imediata
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-2 shadow-sm border border-primary/10">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> Livro impresso em 3-5 dias
              </span>
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
        {/* Formats highlight section right near the top */}
        <section className="mb-12">
          <FormatPanel
            title={page.formats.title}
            items={page.formats.items}
            icons={page.templateIcons?.formats}
          />
        </section>

        <section className="rounded-2xl border border-primary/15 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {page.templateIcons?.quickAnswer ? (
                <PapercutTemplateIcon icon={page.templateIcons.quickAnswer} className="h-7 w-7" />
              ) : (
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              )}
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

        {/* Testimonials section right after QuickAnswer */}
        {page.testimonials && <TestimonialsSection testimonials={page.testimonials} />}

        <TwoColumnSection
          leftTitle={page.intro.title}
          leftBody={page.intro.body}
          rightTitle={page.whyThisFits.title}
          rightBody={page.whyThisFits.body}
        />

        {page.workshop && <WorkshopSections workshop={page.workshop} />}

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
            {page.carefulBenefits.items.map((item) => {
              const benefit =
                typeof item === 'string'
                  ? { title: item, body: '', iconSrc: undefined, iconAlt: undefined }
                  : item;

              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
                >
                  {benefit.iconSrc && benefit.iconAlt ? (
                    <Image
                      src={benefit.iconSrc}
                      alt={benefit.iconAlt}
                      width={56}
                      height={56}
                      className="mb-4 h-14 w-14 object-contain"
                    />
                  ) : (
                    <HeartHandshake className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
                  )}
                  <p className="leading-relaxed text-base-content/75">{benefit.title}</p>
                  {benefit.body && (
                    <p className="mt-2 text-sm leading-relaxed text-base-content/65">
                      {benefit.body}
                    </p>
                  )}
                </div>
              );
            })}
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

        {page.personalization && (
          <PersonalizationSection
            personalization={page.personalization}
            ctaHref={primaryHref}
            ctaIcon={page.templateIcons?.ctaArrow}
          />
        )}

        {page.agePaths && <AgePathSection agePaths={page.agePaths} />}

        {page.diaspora && (
          <DiasporaSection
            diaspora={page.diaspora}
            ctaHref={primaryHref}
            ctaIcon={page.templateIcons?.ctaArrow}
          />
        )}

        <section id="exemplos" tabIndex={-1} className="my-16 scroll-mt-24 focus:outline-none">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {booksSection.eyebrow}
              </p>
              <h2 className="font-display mt-2 text-3xl font-bold text-[#33251c] md:text-4xl">
                {booksSection.title}
              </h2>
            </div>
            <p className="max-w-2xl text-base-content/70">{booksSection.intro}</p>
          </div>

          <LandingPageBookShowcase
            books={page.books}
            audioIcon={page.templateIcons?.audioSample}
            sampleChapterIcon={page.templateIcons?.sampleChapter}
          />
        </section>

        <section className="my-16 grid gap-6 lg:grid-cols-2">
          <ProcessPanel title={page.process.title} items={page.process.steps} />
          <FormatPanel
            title={page.formats.title}
            items={page.formats.items}
            icons={page.templateIcons?.formats}
          />
        </section>

        {page.forProfessionals && (
          <section className="my-16 rounded-2xl border border-secondary/30 bg-secondary/10 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {page.templateIcons?.professionalPanel ? (
                <PapercutTemplateIcon
                  icon={page.templateIcons.professionalPanel}
                  className="h-12 w-12 shrink-0"
                />
              ) : (
                <HeartHandshake className="h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
              )}
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
                    <CtaArrow icon={page.templateIcons?.ctaArrow} />
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

        {page.safetyNote && (
          <section className="my-16 rounded-2xl border border-warning/30 bg-warning/10 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {page.templateIcons?.safetyNote ? (
                <PapercutTemplateIcon
                  icon={page.templateIcons.safetyNote}
                  className="h-12 w-12 shrink-0"
                />
              ) : (
                <ShieldCheck className="h-8 w-8 shrink-0 text-warning" aria-hidden="true" />
              )}
              <div>
                <h2 className="font-display text-2xl font-bold text-[#33251c]">
                  {page.safetyNote.title}
                </h2>
                <p className="mt-3 leading-relaxed text-base-content/75">{page.safetyNote.body}</p>
              </div>
            </div>
          </section>
        )}

        <section className="my-16 text-center">
          <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-5xl">
            {page.finalCta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-base-content/75">
            {page.finalCta.body}
          </p>
          <div className="mt-8">
            <Link
              href={primaryHref}
              className="btn btn-secondary btn-lg h-auto min-h-14 gap-2 whitespace-normal py-3 text-center leading-tight sm:whitespace-nowrap"
            >
              <span>{page.primaryCta}</span>
              <CtaArrow icon={page.templateIcons?.ctaArrow} />
            </Link>
          </div>
        </section>
      </div>
      <LandingPageFloatingNavigation />
    </main>
  );
}

function PersonalizationSection({
  personalization,
  ctaHref,
  ctaIcon,
}: {
  personalization: NonNullable<LandingPageContent['personalization']>;
  ctaHref: string;
  ctaIcon?: LandingPageTemplateIcon;
}) {
  return (
    <section id="personalizar" className="my-16 scroll-mt-24">
      <div className="mb-8 max-w-4xl">
        <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
          {personalization.title}
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-base-content/75">{personalization.intro}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {personalization.groups.map((group, index) => (
          <article
            key={group.title}
            className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              {group.iconSrc ? (
                <Image
                  src={group.iconSrc}
                  alt={group.iconAlt ?? ''}
                  width={56}
                  height={56}
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </span>
              )}
              <span className="font-mono text-sm font-bold text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="font-display mt-4 text-xl font-bold leading-tight text-[#33251c]">
              {group.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-base-content/70">{group.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.choices.map((choice) => (
                <span
                  key={choice}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {choice}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8">
        <Link href={ctaHref} className="btn btn-primary btn-lg h-auto min-h-14 gap-2 py-3">
          <span>{personalization.ctaLabel}</span>
          <CtaArrow icon={ctaIcon} />
        </Link>
      </div>
    </section>
  );
}

function AgePathSection({ agePaths }: { agePaths: NonNullable<LandingPageContent['agePaths']> }) {
  return (
    <section className="my-16">
      <div className="mb-8 max-w-4xl">
        <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
          {agePaths.title}
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-base-content/75">{agePaths.intro}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {agePaths.items.map((item) => (
          <article
            key={item.ageRange}
            className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={item.imageSrc}
                alt={item.imageAlt}
                fill
                sizes="(max-width: 1280px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
            <div className="space-y-5 p-6">
              <div>
                <p className="text-sm font-bold text-primary">{item.ageRange}</p>
                <h3 className="font-display mt-1 text-2xl font-bold leading-tight text-[#33251c]">
                  {item.title}
                </h3>
                <p className="mt-2 leading-relaxed text-base-content/70">{item.body}</p>
              </div>
              <ol className="space-y-2">
                {item.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-relaxed">
                    <span className="font-mono font-bold text-primary">{index + 1}</span>
                    <span className="text-base-content/70">{step}</span>
                  </li>
                ))}
              </ol>
              <blockquote className="border-l-4 border-accent/60 pl-4">
                <p className="font-display text-lg font-bold text-[#33251c]">{item.exampleTitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-base-content/70">
                  {item.exampleBody}
                </p>
              </blockquote>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DiasporaSection({
  diaspora,
  ctaHref,
  ctaIcon,
}: {
  diaspora: NonNullable<LandingPageContent['diaspora']>;
  ctaHref: string;
  ctaIcon?: LandingPageTemplateIcon;
}) {
  return (
    <section id="diaspora" className="my-16 scroll-mt-24 rounded-[1.5rem] bg-[#f8ead2] p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
            {diaspora.title}
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-base-content/75">
            {diaspora.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-6">
            <Link href={ctaHref} className="btn btn-secondary gap-2">
              Criar história em português
              <CtaArrow icon={ctaIcon} />
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {diaspora.options.map((item) => (
            <article key={item.title} className="rounded-2xl bg-white p-5 shadow-sm">
              <Image
                src={item.iconSrc}
                alt={item.iconAlt}
                width={64}
                height={64}
                className="h-14 w-14 object-contain"
              />
              <h3 className="font-display mt-4 text-lg font-bold leading-tight text-[#33251c]">
                {item.title}
              </h3>
              <p className="mt-2 leading-relaxed text-base-content/70">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="text-base-content/60">
                <th>Opção de língua</th>
                <th>Excerto exemplo</th>
                <th>Quando usar</th>
              </tr>
            </thead>
            <tbody>
              {diaspora.languageExamples.map((example) => (
                <tr key={example.label}>
                  <td className="font-semibold text-[#33251c]">{example.label}</td>
                  <td>{example.phrase}</td>
                  <td>{example.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function WorkshopSections({ workshop }: { workshop: NonNullable<LandingPageContent['workshop']> }) {
  return (
    <>
      <section className="my-16">
        <div className="mb-8 max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
            {workshop.audiences.title}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-base-content/75">
            {workshop.audiences.intro}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workshop.audiences.items.map((item) => (
            <article
              key={item.title}
              className="flex gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
            >
              <Image
                src={item.iconSrc}
                alt={item.iconAlt}
                width={64}
                height={64}
                className="h-14 w-14 shrink-0 object-contain"
              />
              <div>
                <h3 className="font-display text-lg font-bold leading-tight text-[#33251c]">
                  {item.title}
                </h3>
                <p className="mt-2 leading-relaxed text-base-content/70">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="my-16 scroll-mt-24">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-[1.5rem] border border-white bg-white p-3 shadow-xl">
            <Image
              src={workshop.paperToBook.imageSrc}
              alt={workshop.paperToBook.imageAlt}
              width={1024}
              height={1536}
              className="aspect-[2/3] w-full rounded-[1.1rem] object-cover"
            />
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
              {workshop.paperToBook.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-base-content/75">
              {workshop.paperToBook.body}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {workshop.paperToBook.steps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={step.iconSrc}
                      alt={step.iconAlt}
                      width={48}
                      height={48}
                      className="h-11 w-11 object-contain"
                    />
                    <span className="font-mono text-sm font-bold text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold leading-tight text-[#33251c]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-base-content/70">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="atividades-idade" className="my-16 scroll-mt-24">
        <div className="mb-8 max-w-4xl">
          <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
            {workshop.ageActivities.title}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-base-content/75">
            {workshop.ageActivities.intro}
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          {workshop.ageActivities.items.map((activity) => (
            <article
              key={activity.ageRange}
              className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm"
            >
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={activity.imageSrc}
                  alt={activity.imageAlt}
                  fill
                  sizes="(max-width: 1280px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-5 p-6">
                <div>
                  <p className="text-sm font-bold text-primary">{activity.ageRange}</p>
                  <h3 className="font-display mt-1 text-2xl font-bold leading-tight text-[#33251c]">
                    {activity.title}
                  </h3>
                  <p className="mt-2 font-semibold leading-relaxed text-base-content/75">
                    {activity.objective}
                  </p>
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#33251c]">Atividade</h4>
                  <ol className="mt-2 space-y-2">
                    {activity.activitySteps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm leading-relaxed">
                        <span className="font-mono font-bold text-primary">{index + 1}</span>
                        <span className="text-base-content/70">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#33251c]">
                    Conceitos trabalhados
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activity.concepts.map((concept) => (
                      <span
                        key={concept}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
                <blockquote className="border-l-4 border-accent/60 pl-4">
                  <p className="font-display text-lg font-bold text-[#33251c]">
                    {activity.exampleTitle}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-base-content/70">
                    {activity.exampleBody}
                  </p>
                </blockquote>
              </div>
            </article>
          ))}
        </div>
      </section>

      {workshop.exampleLibrary && (
        <section className="my-16">
          <div className="mb-8 max-w-3xl">
            <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
              {workshop.exampleLibrary.title}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-base-content/75">
              {workshop.exampleLibrary.intro}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workshop.exampleLibrary.items.map((item) => (
              <article key={item.title} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                    {item.age}
                  </span>
                  <span className="text-right text-xs font-semibold text-base-content/70">
                    {item.activityType}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-xl font-bold leading-tight text-[#33251c]">
                  {item.title}
                </h3>
                <p className="mt-2 leading-relaxed text-base-content/70">{item.teaches}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <TextGridSection
        title={workshop.learningOutcomes.title}
        intro={workshop.learningOutcomes.intro}
        items={workshop.learningOutcomes.items}
      />

      <section className="my-16">
        <div className="mb-8 max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
            {workshop.workshopFormats.title}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-base-content/75">
            {workshop.workshopFormats.intro}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {workshop.workshopFormats.items.map((format) => (
            <article
              key={format.title}
              className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
            >
              <p className="font-mono text-sm font-bold text-primary">{format.duration}</p>
              <h3 className="font-display mt-3 text-xl font-bold leading-tight text-[#33251c]">
                {format.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-base-content/65">
                <strong className="text-base-content">Ideal para: </strong>
                {format.idealFor}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-base-content/65">
                <strong className="text-base-content">Resultado: </strong>
                {format.result}
              </p>
            </article>
          ))}
        </div>
      </section>

      <TextGridSection
        title={workshop.businessBenefits.title}
        intro={workshop.businessBenefits.intro}
        items={workshop.businessBenefits.items}
      />

      {workshop.personas && (
        <section className="my-16">
          <div className="mb-8 max-w-3xl">
            <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
              {workshop.personas.title}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-base-content/75">
              {workshop.personas.intro}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="text-base-content/60">
                    <th>Ideia base</th>
                    <th>Persona literária</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {workshop.personas.items.map((item) => (
                    <tr key={`${item.idea}-${item.persona}`}>
                      <td className="font-semibold text-[#33251c]">{item.idea}</td>
                      <td>{item.persona}</td>
                      <td>{item.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {workshop.implementationKit && (
        <IconGridSection
          title={workshop.implementationKit.title}
          intro={workshop.implementationKit.intro}
          items={workshop.implementationKit.items}
        />
      )}

      <IconGridSection
        title={workshop.finalResults.title}
        intro={workshop.finalResults.intro}
        items={workshop.finalResults.items}
      />
    </>
  );
}

function TextGridSection({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: Array<{ title: string; body: string; iconSrc?: string; iconAlt?: string }>;
}) {
  const gridClass =
    items.length % 3 === 0
      ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
      : 'grid gap-4 md:grid-cols-2 xl:grid-cols-4';

  return (
    <section className="my-16">
      <div className="mb-8 max-w-3xl">
        <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">{title}</h2>
        <p className="mt-3 text-lg leading-relaxed text-base-content/75">{intro}</p>
      </div>
      <div className={gridClass}>
        {items.map((item) => (
          <article
            key={item.title}
            className="group relative overflow-hidden rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            {item.iconSrc && (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F0D7B8] bg-[#FFF8EA] shadow-inner">
                <Image
                  src={item.iconSrc}
                  alt={item.iconAlt ?? ''}
                  width={64}
                  height={64}
                  className="h-12 w-12 object-contain transition duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <h3 className="font-display text-lg font-bold leading-tight text-[#33251c]">
              {item.title}
            </h3>
            <p className="mt-2 leading-relaxed text-base-content/70">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function IconGridSection({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: Array<{ title: string; body: string; iconSrc: string; iconAlt: string }>;
}) {
  return (
    <section className="my-16 rounded-[1.5rem] border border-primary/10 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-8 max-w-3xl">
        <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">{title}</h2>
        <p className="mt-3 text-lg leading-relaxed text-base-content/75">{intro}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.title} className="rounded-2xl bg-base-200 p-5">
            <Image
              src={item.iconSrc}
              alt={item.iconAlt}
              width={64}
              height={64}
              className="h-14 w-14 object-contain"
            />
            <h3 className="font-display mt-4 text-lg font-bold leading-tight text-[#33251c]">
              {item.title}
            </h3>
            <p className="mt-2 leading-relaxed text-base-content/70">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
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

function TestimonialsSection({
  testimonials,
}: {
  testimonials: NonNullable<LandingPageContent['testimonials']>;
}) {
  return (
    <section className="my-16">
      <div className="mb-8 max-w-3xl text-center md:text-left">
        <h2 className="font-display text-3xl font-bold text-[#33251c] md:text-4xl">
          {testimonials.title}
        </h2>
        {testimonials.intro && (
          <p className="mt-3 text-lg leading-relaxed text-base-content/75">{testimonials.intro}</p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.items.map((item, idx) => (
          <article
            key={idx}
            className="flex flex-col justify-between rounded-2xl border border-primary/15 bg-white p-6 shadow-sm"
          >
            <div>
              <div className="mb-3 flex items-center gap-1 text-amber-500">
                {Array.from({ length: item.stars ?? 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <p className="italic leading-relaxed text-base-content/80">{`"${item.quote}"`}</p>
            </div>
            <div className="mt-6 border-t border-base-200 pt-4">
              <p className="font-display font-bold text-[#33251c]">{item.author}</p>
              <p className="text-xs text-base-content/60">
                {item.role} {item.location ? `• ${item.location}` : ''}
              </p>
            </div>
          </article>
        ))}
      </div>
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {index + 1}
            </span>
            <span className="pt-1 text-lg leading-relaxed text-base-content/75">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FormatPanel({
  title,
  items,
  icons,
}: {
  title: string;
  items: string[];
  icons?: LandingPageTemplateIcon[];
}) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm md:p-8">
      <h2 className="font-display text-3xl font-bold text-[#33251c]">{title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const Icon = formatIcons[index] ?? BookOpen;
          const papercutIcon = icons?.[index];

          return (
            <div key={item} className="rounded-xl bg-white border border-primary/10 p-4 shadow-xs">
              {papercutIcon ? (
                <PapercutTemplateIcon icon={papercutIcon} className="mb-3 h-9 w-9" />
              ) : (
                <Icon className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
              )}
              <p className="leading-relaxed text-base-content/75 font-medium">{item}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PapercutTemplateIcon({
  icon,
  className,
}: {
  icon: LandingPageTemplateIcon;
  className: string;
}) {
  return (
    <Image
      src={icon.src}
      alt={icon.alt}
      width={64}
      height={64}
      className={`object-contain ${className}`}
    />
  );
}

function CtaArrow({ icon }: { icon?: LandingPageTemplateIcon }) {
  return icon ? (
    <PapercutTemplateIcon icon={icon} className="h-5 w-5 shrink-0" />
  ) : (
    <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
  );
}

function buildStructuredData(page: LandingPageContent) {
  const base = 'https://mythoria.pt';
  const pageUrl = `${base}/${page.locale}/lp/${page.slug}`;
  const imageUrl = toAbsoluteUrl(page.ogImageSrc ?? page.hero.imageSrc, base);
  const breadcrumbName = page.breadcrumbLabel ?? page.title;
  const about = page.structuredData?.about ?? ['Livros personalizados', 'Dia dos Avós'];
  const serviceName =
    page.structuredData?.serviceName ?? 'Livro personalizado Mythoria para avós e netos';
  const serviceType = page.structuredData?.serviceType ?? 'Livro personalizado, audiolivro e PDF';

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
      '@type': 'Product',
      name: page.title,
      description: page.metaDescription,
      image: imageUrl,
      brand: {
        '@type': 'Brand',
        name: 'Mythoria',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '128',
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: '29.90',
        availability: 'https://schema.org/InStock',
        url: pageUrl,
      },
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
      about: about.map((name) => ({ '@type': 'Thing', name })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: serviceName,
      serviceType,
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

function toAbsoluteUrl(url: string, base: string) {
  return url.startsWith('http://') || url.startsWith('https://') ? url : `${base}${url}`;
}
