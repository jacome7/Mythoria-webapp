import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { SeoSampleBook } from '@/content/sample-books/seo';
import type { SampleBook } from '@/types/sample-book';

interface SampleBookDetailPageProps {
  book: SampleBook;
  chapter: string | null;
  locale: string;
  seo?: SeoSampleBook;
  createSimilar?: { href: string; label: string };
}

export default function SampleBookDetailPage({
  book,
  chapter,
  locale,
  seo,
  createSimilar,
}: SampleBookDetailPageProps) {
  const t = useTranslations('SampleBookDetail');
  const tFacts = useTranslations('GetInspiredPage');
  const factValue = (category: string, value?: string) =>
    value && tFacts.has(`${category}.${value}`) ? tFacts(`${category}.${value}`) : value;
  const isMythoriaCreatedExample = book.publicProvenance === 'mythoria_created_example';
  const isFictionalBook = Boolean(book.fictionalUserContext) && !isMythoriaCreatedExample;
  const title = { title: book.title };
  const coverAlt = isMythoriaCreatedExample
    ? 'coverMythoria'
    : isFictionalBook
      ? 'coverFictional'
      : 'cover';
  const sceneAlt = isMythoriaCreatedExample
    ? 'sceneMythoria'
    : isFictionalBook
      ? 'sceneFictional'
      : 'scene';
  const facts = [
    [t('intent'), t(`intents.${book.intent}`)],
    [t('audience'), book.readerAgeBand ?? factValue('targetAudience', book.targetAudience)],
    [t('recipient'), book.recipientType],
    [t('literaryStyle'), factValue('novelStyle', book.novelStyle)],
    [
      t('visualStyle'),
      book.graphicalStyle === 'euro_comic_book'
        ? t('comicAdventure')
        : factValue('graphicalStyle', book.graphicalStyle),
    ],
    [t('language'), factValue('storyLanguage', book.locale)],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <main className="bg-base-200 py-8 sm:py-12">
      <article className="mx-auto max-w-5xl px-4">
        <nav aria-label={t('breadcrumb')} className="mb-6 text-sm text-base-content/65">
          <Link href={`/${locale}`} className="font-semibold text-primary hover:underline">
            Mythoria
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          {seo ? (
            <>
              <Link href={seo.hubHref} className="font-semibold text-primary hover:underline">
                {t('guides')}
              </Link>{' '}
              <span aria-hidden="true">/</span>{' '}
            </>
          ) : null}
          <span>{book.title}</span>
        </nav>

        <div className="overflow-hidden rounded-3xl bg-base-100 shadow-xl">
          <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-base-200 shadow-lg">
              <Image
                src={book.coverSrc}
                alt={t(coverAlt, title)}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className={isMythoriaCreatedExample ? 'object-contain' : 'object-cover'}
              />
            </div>

            <header>
              {isMythoriaCreatedExample ? (
                <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                  {t('mythoriaExample')}
                </p>
              ) : isFictionalBook ? (
                <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                  {t('fictionalExample')}
                </p>
              ) : null}
              <h1
                className={`${isFictionalBook || isMythoriaCreatedExample ? 'mt-2' : ''} font-display text-4xl leading-tight text-primary`}
              >
                {book.title}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-base-content/80">{book.synopsis}</p>
              {createSimilar ? (
                <Link href={createSimilar.href} className="btn btn-primary mt-5">
                  {createSimilar.label}
                </Link>
              ) : null}

              {book.shortExcerpt ? (
                <blockquote className="mt-6 border-l-4 border-secondary pl-4 text-lg italic text-base-content/80">
                  “{book.shortExcerpt}”
                </blockquote>
              ) : null}

              <dl className="mt-7 grid gap-3 sm:grid-cols-2">
                {facts.map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-base-200 p-3">
                    <dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">
                      {label}
                    </dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              {book.tags.length > 0 ? (
                <div className="mt-6">
                  <h2 className="font-semibold">{t('topics')}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {book.tags.map((tag) => (
                      <span key={tag} className="badge badge-primary badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {book.audioSampleSrc ? (
                <section className="mt-7 rounded-2xl bg-primary/10 p-4">
                  <h2 className="font-display text-xl text-primary">{t('audio')}</h2>
                  <p className="mt-1 text-sm text-base-content/70">
                    {t(
                      isMythoriaCreatedExample
                        ? 'audioMythoria'
                        : isFictionalBook
                          ? 'audioFictional'
                          : 'audioBook',
                    )}
                  </p>
                  <audio controls preload="metadata" className="mt-3 w-full">
                    <source src={book.audioSampleSrc} type="audio/mpeg" />
                  </audio>
                </section>
              ) : null}
            </header>
          </div>

          {book.featureSrc || book.chapterImageSrc ? (
            <section
              aria-label={t('illustrations')}
              className="grid gap-5 border-t border-base-300 p-5 sm:p-8 md:grid-cols-2"
            >
              {[book.featureSrc, book.chapterImageSrc]
                .filter((src): src is string => Boolean(src))
                .map((src) => (
                  <figure
                    key={src}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-base-200"
                  >
                    <Image
                      src={src}
                      alt={t(src === book.featureSrc ? sceneAlt : 'chapterImage', title)}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </figure>
                ))}
            </section>
          ) : null}

          {book.storyIntent ? (
            <section className="border-t border-base-300 p-5 sm:p-8">
              <h2 className="font-display text-2xl text-primary">{t('editorialIntent')}</h2>
              <p className="mt-3 leading-relaxed">{book.storyIntent}</p>
            </section>
          ) : null}

          {chapter ? (
            <section className="border-t border-base-300 p-5 sm:p-8">
              <h2 className="font-display text-2xl text-primary">{t('chapter')}</h2>
              <div className="mt-4 space-y-4 leading-8 text-base-content/85">
                {chapter.split(/\n{2,}/).map((block) => {
                  const text = block.trim();
                  if (text.startsWith('# ')) {
                    return (
                      <h3 key={text} className="font-display text-xl font-bold text-primary">
                        {text.slice(2)}
                      </h3>
                    );
                  }
                  return <p key={text}>{text}</p>;
                })}
              </div>
            </section>
          ) : null}

          {!isMythoriaCreatedExample &&
          (book.fictionalUserContext || (book.safetyNotes?.length ?? 0) > 0) ? (
            <section className="border-t border-base-300 bg-base-200/60 p-5 sm:p-8">
              {book.fictionalUserContext ? (
                <>
                  <h2 className="font-display text-2xl text-primary">{t('fictionalContext')}</h2>
                  <p className="mt-3 leading-relaxed">{book.fictionalUserContext}</p>
                </>
              ) : null}
              {book.safetyNotes && book.safetyNotes.length > 0 ? (
                <>
                  <h2 className="mt-6 font-display text-2xl text-primary">{t('editorialNotes')}</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-base-content/75">
                    {book.safetyNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}

          {seo ? (
            <aside className="border-t border-base-300 p-5 sm:p-8">
              <h2 className="font-display text-2xl text-primary">{t('learnMore')}</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-base-content/75">
                {t(
                  isMythoriaCreatedExample
                    ? 'learnMythoria'
                    : isFictionalBook
                      ? 'learnFictional'
                      : 'learnBook',
                )}{' '}
                {t('learnHelp')}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link className="font-semibold text-primary hover:underline" href={seo.guideHref}>
                  {t('guideLink', { title: seo.guideLabel })}
                </Link>
                <Link className="font-semibold text-primary hover:underline" href={seo.landingHref}>
                  {t('themeLink', { title: seo.landingLabel })}
                </Link>
                <Link className="font-semibold text-primary hover:underline" href={seo.hubHref}>
                  {t('allGuides')}
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </article>
    </main>
  );
}
