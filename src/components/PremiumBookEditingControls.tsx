'use client';

import { useEffect, useRef, useState } from 'react';
import { Edit3, ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PremiumBookReaderData } from '@/lib/premium-children-book/reader';
import PremiumPageTextEditor from './PremiumPageTextEditor';
import PremiumSpreadEditor, { type PremiumImageEditTarget } from './PremiumSpreadEditor';

type ReaderPage = PremiumBookReaderData['pages'][number];
type TextTarget = Pick<ReaderPage, 'number' | 'kind'> & {
  textEdit: NonNullable<ReaderPage['textEdit']>;
};

type EditorTarget =
  { kind: 'image'; target: PremiumImageEditTarget } | { kind: 'text'; target: TextTarget };

export default function PremiumBookEditingControls({
  book,
  storyId,
  revision,
  visiblePages,
  onEditionChanged,
}: {
  book: PremiumBookReaderData;
  storyId: string;
  revision: string;
  visiblePages: number[];
  onEditionChanged: () => Promise<void>;
}) {
  const t = useTranslations('PremiumBook');
  const [openEditor, setOpenEditor] = useState<EditorTarget | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const lastPage = book.pages.length + 1;
  const pageLabel = (number: number) => t('pageNumber', { number });

  useEffect(() => {
    if (window.location.hash === '#illustration-editor') {
      panel.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, []);

  function imageTarget(page: number): PremiumImageEditTarget | undefined {
    if (page === 0 || page === lastPage) {
      const front = page === 0;
      const imageUri = front ? book.front : book.back;
      if (!imageUri) return;
      return {
        firstPage: page,
        spreadId: front ? 'front' : 'back',
        imageUri,
        title: t(front ? 'frontCover' : 'backCover'),
        imageType: front ? 'cover' : 'backcover',
      };
    }

    const item = book.pages[page - 1];
    if (!item?.image || item.renderMode === 'typeset') return;
    if (item.kind === 'opener' || item.kind === 'ending') {
      return {
        firstPage: page,
        spreadId: item.kind,
        imageUri: item.image,
        title: pageLabel(page),
        imageType: 'chapter',
      };
    }
    if (item.kind !== 'spread') return;

    const firstPage = page - (page % 2);
    const spreadId = `spread-${(firstPage - 6) / 2 + 1}`;
    if (item.composition && item.composition !== 'panorama') {
      return {
        firstPage,
        spreadId,
        side: page % 2 ? 'right' : 'left',
        imageUri: item.image,
        title: pageLabel(page),
        imageType: 'chapter',
      };
    }
    const left = book.pages[firstPage - 1]?.image;
    if (left && page !== firstPage && visiblePages.includes(firstPage)) return;
    return {
      firstPage,
      spreadId,
      imageUri: left ?? item.image,
      facingImageUri: left ? book.pages[firstPage]?.image : undefined,
      title: t('pagePair', { first: firstPage, last: firstPage + 1 }),
      imageType: 'chapter',
    };
  }

  const targets = visiblePages.flatMap((page) => {
    const result: EditorTarget[] = [];
    const image = imageTarget(page);
    if (image) result.push({ kind: 'image', target: image });
    const item = book.pages[page - 1];
    if (item?.textEdit) {
      result.push({
        kind: 'text',
        target: { number: item.number, kind: item.kind, textEdit: item.textEdit },
      });
    }
    return result;
  });

  return (
    <>
      {targets.length > 0 && (
        <div
          id="illustration-editor"
          ref={panel}
          className="mt-4 flex flex-wrap justify-center gap-2 px-3 sm:px-6"
        >
          {targets.map((item) => (
            <button
              type="button"
              key={
                item.kind === 'image'
                  ? `${item.target.spreadId}:${item.target.side ?? 'spread'}`
                  : `text:${item.target.number}`
              }
              className="btn btn-outline btn-sm"
              aria-haspopup="dialog"
              onClick={() => setOpenEditor(item)}
            >
              {item.kind === 'image' ? (
                <>
                  <ImageIcon size={16} aria-hidden="true" />
                  {t('editIllustration', { page: item.target.title })}
                </>
              ) : (
                <>
                  <Edit3 size={16} aria-hidden="true" />
                  {t('editText', { page: pageLabel(item.target.number) })}
                </>
              )}
            </button>
          ))}
        </div>
      )}
      {openEditor?.kind === 'image' && (
        <PremiumSpreadEditor
          storyId={storyId}
          revision={revision}
          bookTitle={book.title}
          target={openEditor.target}
          onClose={() => setOpenEditor(null)}
          onEditionChanged={onEditionChanged}
        />
      )}
      {openEditor?.kind === 'text' && (
        <PremiumPageTextEditor
          storyId={storyId}
          revision={revision}
          bookLocale={book.locale}
          pageNumber={openEditor.target.number}
          pageKind={openEditor.target.kind}
          edit={openEditor.target.textEdit}
          onClose={() => setOpenEditor(null)}
          onEditionChanged={onEditionChanged}
        />
      )}
    </>
  );
}
