'use client';

import {
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import PremiumSpreadEditor from './PremiumSpreadEditor';
import './PremiumTypeset.css';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { PremiumBookReaderData } from '@/lib/premium-children-book/reader';
import {
  motifAccent,
  motifInk,
  openingInk,
  openingMotifPaths,
} from '@/lib/premium-children-book/opening-design';

const dualPageQuery = '(min-width: 768px)';

function subscribeToViewport(callback: () => void) {
  const query = window.matchMedia(dualPageQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

export function visiblePremiumPages(page: number, facing: boolean, pageCount: number): number[] {
  if (!facing || page <= 1 || page > pageCount) return [page];
  const left = page - (page % 2);
  return left === pageCount ? [left] : [left, left + 1];
}

export default function PremiumBookReader({
  book,
  editableStoryId,
}: {
  book: PremiumBookReaderData;
  editableStoryId?: string;
}) {
  const t = useTranslations('PremiumBook');
  const reducedMotion = useReducedMotion();
  const facing = useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(dualPageQuery).matches,
    () => false,
  );
  const [page, setPage] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const swipeOrigin = useRef<number | null>(null);
  const lastPage = book.pages.length + 1;
  const visible = visiblePremiumPages(page, facing, book.pages.length);
  const firstVisible = visible[0];
  const lastVisible = visible[visible.length - 1];
  const visibleText = visible.map((number) => book.pages[number - 1]).filter((item) => item?.text);
  const cover = page === 0 ? book.front : page === lastPage ? book.back : undefined;
  const coverLabel = page === 0 ? t('frontCover') : t('backCover');
  const pageLabel = (number: number) => t('pageNumber', { number });
  const step = (direction: -1 | 1) =>
    setPage(direction < 0 ? Math.max(0, firstVisible - 1) : Math.min(lastPage, lastVisible + 1));

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea')) {
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  };

  const renderIllustration = (image: string, description = '') =>
    failedImages.includes(image) ? (
      <p
        className="absolute inset-x-4 bottom-8 text-center text-sm text-base-content"
        role="status"
      >
        {t('imageUnavailable')}
      </p>
    ) : (
      <Image
        src={image}
        alt={description}
        fill
        unoptimized
        sizes="(min-width: 768px) 50vw, 100vw"
        className="select-none object-contain"
        draggable={false}
        onError={() => setFailedImages((previous) => [...previous, image])}
      />
    );

  return (
    <section
      className="mx-auto max-w-6xl px-3 py-6 sm:px-6"
      aria-label={t('readerLabel')}
      onKeyDown={handleKeyDown}
    >
      <h1 className="mb-5 text-center text-2xl font-semibold" lang={book.locale}>
        {book.title}
      </h1>
      <div
        className="[perspective:1400px] grid touch-pan-y grid-cols-1 items-start gap-0 md:grid-cols-2"
        onPointerDown={(event) => {
          if (event.pointerType === 'touch') swipeOrigin.current = event.clientX;
        }}
        onPointerCancel={() => {
          swipeOrigin.current = null;
        }}
        onPointerUp={(event) => {
          if (swipeOrigin.current === null) return;
          const distance = event.clientX - swipeOrigin.current;
          swipeOrigin.current = null;
          if (Math.abs(distance) >= 60) step(distance > 0 ? -1 : 1);
        }}
      >
        {cover ? (
          <div
            aria-label={coverLabel}
            role="group"
            className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-lg bg-base-200 shadow-md md:col-span-2 md:w-1/2"
          >
            {renderIllustration(cover)}
            <p
              lang={book.locale}
              className={`absolute inset-x-[12%] top-[12%] max-h-[62%] overflow-y-auto whitespace-pre-wrap break-words rounded bg-white/95 p-[3%] text-stone-950 ${page === 0 ? 'text-center text-xl font-semibold sm:text-2xl' : 'text-sm sm:text-base'}`}
            >
              {page === 0 ? book.title : book.synopsis}
            </p>
          </div>
        ) : (
          visible.map((number) => {
            const item = book.pages[number - 1];
            if (!item) return null;
            if (
              item.kind === 'copyright' &&
              book.editionLayout === 'embedded-lettering-v2' &&
              book.specification
            ) {
              const spec = book.specification;
              return (
                <motion.article
                  key={number}
                  initial={reducedMotion ? false : { rotateY: number % 2 === 0 ? 48 : -48 }}
                  animate={{ rotateY: 0, originX: number % 2 === 0 ? 1 : 0 }}
                  transition={{ duration: 0.26, ease: 'easeOut' }}
                  aria-label={pageLabel(number)}
                  lang={book.locale}
                  className="relative @container aspect-square w-full overflow-auto px-[10%] py-[7%] font-serif text-stone-950 shadow-md md:col-start-1"
                  style={{ backgroundColor: book.openingDesign?.background ?? '#fbf5e6' }}
                >
                  <p className="text-xs font-semibold">{spec.title.label}</p>
                  <h2 className="mb-[3cqw] break-words text-[clamp(1.25rem,5cqw,2rem)] leading-tight">
                    {spec.title.value}
                  </h2>
                  <dl className="grid grid-cols-2 gap-x-[4cqw] gap-y-[2cqw] border-y border-stone-400 py-[3cqw] text-[clamp(.75rem,2.5cqw,1rem)]">
                    {spec.details.map(({ label, value }) => (
                      <div key={label} className="min-w-0 break-words">
                        <dt className="font-semibold">{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-[3cqw] text-xs font-semibold">{spec.copyright}</p>
                  <p className="mt-1 text-xs">{spec.rights}</p>
                  <div className="mt-[3cqw] flex items-center justify-evenly gap-4 bg-[#fefbf6] p-[2cqw] text-center text-xs">
                    <Image
                      src="/images/logo/Logo_transparent_background_1024x683.png"
                      width={168}
                      height={112}
                      alt="Mythoria"
                      className="h-auto w-1/3"
                    />
                    <a href="https://mythoria.pt" className="max-w-1/2">
                      <Image
                        src="/images/logo/publication-qr.png"
                        width={72}
                        height={72}
                        alt=""
                        className="mx-auto mb-1 h-auto w-[12cqw]"
                      />
                      {spec.promotion}
                    </a>
                  </div>
                </motion.article>
              );
            }
            if (item.kind === 'invitation' && item.link) {
              const [heading, ...body] = item.text.split('\n\n');
              return (
                <motion.article
                  key={number}
                  initial={reducedMotion ? false : { rotateY: number % 2 === 0 ? 48 : -48 }}
                  animate={{ rotateY: 0, originX: number % 2 === 0 ? 1 : 0 }}
                  transition={{ duration: 0.26, ease: 'easeOut' }}
                  aria-label={pageLabel(number)}
                  lang={book.locale}
                  className="relative @container flex aspect-square w-full flex-col items-center justify-center overflow-auto bg-[#fefbf6] p-[9%] text-center text-stone-950 shadow-md md:col-start-2"
                >
                  <Image
                    src="/images/logo/Logo_transparent_background_1024x683.png"
                    alt=""
                    width={192}
                    height={128}
                    className="h-auto w-[26%]"
                  />
                  <h2 className="mb-[2cqw] text-[clamp(1rem,4.5cqw,1.75rem)] font-bold leading-tight">
                    {heading}
                  </h2>
                  <p className="whitespace-pre-wrap text-[clamp(0.75rem,3.3cqw,1.1rem)] leading-snug">
                    {body.join('\n\n')}
                  </p>
                  <Link href={item.link.href} className="btn btn-primary btn-sm mt-[4cqw]">
                    {item.link.label}
                  </Link>
                </motion.article>
              );
            }
            const openingDesign = number <= 4 ? book.openingDesign : undefined;
            const motif =
              openingDesign && (number === 1 || number === 3)
                ? openingMotifPaths[openingDesign.motif]
                : undefined;
            const generatedMotif =
              motif && book.motifImage && !failedImages.includes(book.motifImage)
                ? book.motifImage
                : undefined;
            const box = item.textBox;
            const letteringVisible =
              (item.renderMode === 'embedded_art' ||
                (!item.renderMode && book.editionLayout === 'embedded-lettering-v2')) &&
              item.image &&
              !failedImages.includes(item.image);
            const textStyle: CSSProperties | undefined = box && {
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              maxHeight: `${box.height * 100}%`,
            };
            return (
              <motion.article
                key={number}
                initial={reducedMotion ? false : { rotateY: number % 2 === 0 ? 48 : -48 }}
                animate={{ rotateY: 0, originX: number % 2 === 0 ? 1 : 0 }}
                transition={{ duration: 0.26, ease: 'easeOut' }}
                aria-label={pageLabel(number)}
                className={`relative @container flex aspect-square w-full flex-col items-center justify-center overflow-hidden bg-[#fff] text-stone-950 shadow-md ${number % 2 ? 'md:col-start-2' : 'md:col-start-1'}`}
                style={
                  openingDesign || item.renderMode === 'typeset'
                    ? {
                        backgroundColor:
                          openingDesign?.background ?? book.openingDesign?.background ?? '#fbf5e6',
                        color: item.renderMode === 'typeset' ? '#243735' : openingInk,
                      }
                    : undefined
                }
              >
                {item.image &&
                  renderIllustration(
                    item.image,
                    item.imageDescription ?? (item.text ? '' : pageLabel(number)),
                  )}
                {item.renderMode === 'typeset' && item.text && (
                  <div
                    className="absolute flex items-center overflow-auto"
                    style={{
                      left: number % 2 ? '12.745%' : '9.804%',
                      top: '10.784%',
                      width: '77.451%',
                      height: '78.431%',
                    }}
                  >
                    <p
                      lang={book.locale}
                      className="w-full whitespace-pre-wrap [overflow-wrap:anywhere]"
                      style={{
                        fontFamily: 'PremiumLiterata, serif',
                        fontSize: book.audience === 'children_0-2' ? '5.229cqw' : '4.739cqw',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.text}
                    </p>
                  </div>
                )}
                {item.text && item.renderMode !== 'typeset' && !letteringVisible && (
                  <p
                    lang={book.locale}
                    className={`whitespace-pre-wrap break-words font-medium leading-snug ${item.image ? 'absolute overflow-y-auto rounded bg-white/95 p-[1.7cqw] text-[clamp(0.625rem,3.2cqw,1.2rem)]' : 'max-h-[72%] w-full overflow-y-auto px-[12cqw] text-center text-[clamp(0.75rem,3.6cqw,1.25rem)]'}`}
                    style={textStyle}
                  >
                    {item.text}
                  </p>
                )}
                {generatedMotif ? (
                  <Image
                    src={generatedMotif}
                    alt=""
                    aria-hidden="true"
                    unoptimized
                    width={64}
                    height={64}
                    className="mt-[4cqw] h-auto w-[13%] shrink-0 object-contain"
                    onError={() => setFailedImages((previous) => [...previous, generatedMotif])}
                  />
                ) : (
                  motif && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 64 52"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-[4cqw] h-auto w-[13%] shrink-0"
                    >
                      <path d={motif[0]} stroke={motifInk} strokeWidth="1.65" />
                      <path d={motif[1]} stroke={motifAccent} strokeWidth="1.2" />
                    </svg>
                  )
                )}
              </motion.article>
            );
          })
        )}
      </div>

      {editableStoryId &&
        book.revision &&
        (cover || (page >= 5 && page <= 32)) &&
        (cover ? [page] : visible)
          .filter((number) => book.pages[number - 1]?.renderMode !== 'typeset')
          .map((number) => {
            const item = book.pages[number - 1];
            const side =
              item?.composition && item.composition !== 'panorama'
                ? number % 2
                  ? 'right'
                  : 'left'
                : undefined;
            if (!side && number !== firstVisible && !cover) return null;
            return (
              <PremiumSpreadEditor
                key={`${number}:${side ?? 'spread'}`}
                storyId={editableStoryId}
                revision={book.revision!}
                page={number}
                lastPage={lastPage}
                targetSide={side}
              />
            );
          })}

      <nav
        aria-label={t('pageNavigation')}
        className="mt-5 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          type="button"
          className="btn btn-outline"
          disabled={page === 0}
          onClick={() => step(-1)}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          <span>{t('previous')}</span>
        </button>
        <label>
          <span className="sr-only">{t('goToPage')}</span>
          <select
            className="select select-bordered"
            value={page}
            onChange={(event) => setPage(Number(event.target.value))}
          >
            <option value={0}>{t('frontCover')}</option>
            {book.pages.map(({ number }) => (
              <option key={number} value={number}>
                {pageLabel(number)}
              </option>
            ))}
            <option value={lastPage}>{t('backCover')}</option>
          </select>
        </label>
        <button
          type="button"
          className="btn btn-outline"
          disabled={page === lastPage}
          onClick={() => step(1)}
        >
          <span>{t('next')}</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>
        <p className="sr-only" aria-live="polite">
          {cover
            ? coverLabel
            : visible.length === 2
              ? t('pagePair', { first: firstVisible, last: lastVisible })
              : pageLabel(firstVisible)}
        </p>
      </nav>
      {!cover && visibleText.length > 0 && (
        <details className="mx-auto mt-5 max-w-prose">
          <summary className="cursor-pointer font-medium">{t('pageText')}</summary>
          {visibleText.map((item) => (
            <div key={item.number} className="my-3">
              <h2 className="mb-1 font-semibold">{pageLabel(item.number)}</h2>
              <p lang={book.locale} className="whitespace-pre-wrap leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
