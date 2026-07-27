import Image from 'next/image';
import Link from 'next/link';
import type { SeoSampleBook } from '@/content/sample-books/seo';
import type { SampleBook } from '@/types/sample-book';

interface SampleBookDetailPageProps {
  book: SampleBook;
  chapter: string | null;
  locale: string;
  seo?: SeoSampleBook;
}

export default function SampleBookDetailPage({
  book,
  chapter,
  locale,
  seo,
}: SampleBookDetailPageProps) {
  const facts = [
    ['Intenção', book.intent],
    ['Público', book.readerAgeBand ?? book.targetAudience],
    ['Destinatário', book.recipientType],
    ['Estilo literário', book.novelStyle],
    ['Estilo visual', book.graphicalStyle],
    ['Idioma', book.locale],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <main className="bg-base-200 py-8 sm:py-12">
      <article className="mx-auto max-w-5xl px-4">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-base-content/65">
          <Link href={`/${locale}`} className="font-semibold text-primary hover:underline">
            Mythoria
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          {seo ? (
            <>
              <Link href={seo.hubHref} className="font-semibold text-primary hover:underline">
                Guias
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
                alt={`Capa do exemplo ficcional “${book.title}”`}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>

            <header>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                Exemplo de livro inteiramente ficcional
              </p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-primary">
                {book.title}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-base-content/80">{book.synopsis}</p>

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
                  <h2 className="font-semibold">Temas deste exemplo</h2>
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
                  <h2 className="font-display text-xl text-primary">Excerto em áudio</h2>
                  <p className="mt-1 text-sm text-base-content/70">
                    Ouça um breve trecho narrado deste exemplo ficcional.
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
              aria-label="Ilustrações do livro de exemplo"
              className="grid gap-5 border-t border-base-300 p-5 sm:p-8 md:grid-cols-2"
            >
              {[book.featureSrc, book.chapterImageSrc]
                .filter((src): src is string => Boolean(src))
                .map((src, index) => (
                  <figure
                    key={src}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-base-200"
                  >
                    <Image
                      src={src}
                      alt={
                        index === 0
                          ? `Cena ilustrada do exemplo ficcional “${book.title}”`
                          : `Ilustração do capítulo de amostra de “${book.title}”`
                      }
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
              <h2 className="font-display text-2xl text-primary">Intenção editorial da história</h2>
              <p className="mt-3 leading-relaxed">{book.storyIntent}</p>
            </section>
          ) : null}

          {chapter ? (
            <section className="border-t border-base-300 p-5 sm:p-8">
              <h2 className="font-display text-2xl text-primary">Capítulo de amostra</h2>
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

          {book.fictionalUserContext || (book.safetyNotes?.length ?? 0) > 0 ? (
            <section className="border-t border-base-300 bg-base-200/60 p-5 sm:p-8">
              {book.fictionalUserContext ? (
                <>
                  <h2 className="font-display text-2xl text-primary">Contexto ficcional</h2>
                  <p className="mt-3 leading-relaxed">{book.fictionalUserContext}</p>
                </>
              ) : null}
              {book.safetyNotes && book.safetyNotes.length > 0 ? (
                <>
                  <h2 className="mt-6 font-display text-2xl text-primary">
                    Notas de segurança editorial
                  </h2>
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
              <h2 className="font-display text-2xl text-primary">Continue a explorar este tema</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-base-content/75">
                Este exemplo mostra uma possibilidade narrativa, não uma história de cliente.
                Consulte o guia para preparar o conteúdo e a página do tema para conhecer formas de
                personalização.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link className="font-semibold text-primary hover:underline" href={seo.guideHref}>
                  Ler o guia “{seo.guideLabel}”
                </Link>
                <Link className="font-semibold text-primary hover:underline" href={seo.landingHref}>
                  Explorar {seo.landingLabel}
                </Link>
                <Link className="font-semibold text-primary hover:underline" href={seo.hubHref}>
                  Ver todos os guias para livros personalizados
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </article>
    </main>
  );
}
