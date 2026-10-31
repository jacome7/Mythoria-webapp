'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createDocumentWorker } from '@/lib/story-templates/create-document-worker';

export default function DocumentImport({
  value,
  onChange,
  fits,
}: {
  value: string;
  onChange: (value: string) => void;
  fits: (value: string) => boolean;
}) {
  const t = useTranslations('StorySteps.step2.documentImport');
  const [review, setReview] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pdfWarning, setPdfWarning] = useState(false);
  const [undo, setUndo] = useState<{ before: string; after: string } | null>(null);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const select = (file: File | undefined) => {
    cancel();
    setReview(null);
    setError('');
    setPdfWarning(false);
    if (!file) return;
    setFilename(file.name);
    if (file.size > 5 * 1024 * 1024) {
      setError(t('tooLarge'));
      return;
    }
    if (!/\.(txt|docx|pdf)$/i.test(file.name)) {
      setError(t('unsupported'));
      return;
    }
    try {
      const current = createDocumentWorker();
      worker.current = current;
      setBusy(true);
      timer.current = setTimeout(() => {
        cancel();
        setError(t('timeout'));
      }, 30_000);
      current.onmessage = (
        event: MessageEvent<{ kind?: string; text?: string; warning?: boolean; error?: string }>,
      ) => {
        if (worker.current !== current || event.data.kind !== 'result') return;
        cancel();
        if (event.data.error) {
          const key = event.data.error;
          setError(
            key === 'tooLarge'
              ? t('tooLarge')
              : key === 'empty'
                ? t('empty')
                : key === 'password'
                  ? t('password')
                  : key === 'unsupported'
                    ? t('unsupported')
                    : t('unreadable'),
          );
        } else {
          setReview(event.data.text ?? '');
          setPdfWarning(!!event.data.warning);
        }
      };
      current.onerror = () => {
        if (worker.current === current) {
          cancel();
          setError(t('unreadable'));
        }
      };
      current.postMessage({ file });
    } catch {
      setError(t('unreadable'));
    }
  };
  const combined = (append: boolean) =>
    append && value.trim() ? `${value}\n\n${review ?? ''}` : (review ?? '');
  const apply = (append: boolean) => {
    const next = combined(append);
    if (!next || !fits(next)) return;
    setUndo({ before: value, after: next });
    onChange(next);
    setReview(null);
    setError('');
  };
  return (
    <section className="shrink-0 space-y-2 pb-3" aria-label={t('title')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{t('title')}</span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => input.current?.click()}
        >
          {t('button')}
        </button>
        <input
          ref={input}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            select(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <span className="text-sm">{t('formats')}</span>
      </div>
      <p className="text-sm">{t('formatHelp')}</p>
      <div aria-live="polite">
        {busy && (
          <p>
            {t('loading')}{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>
              {t('cancel')}
            </button>
          </p>
        )}
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
      </div>
      {review !== null && (
        <div className="space-y-2 rounded border p-2">
          <p className="font-semibold">
            {t('review')}: {filename}
          </p>
          <p className="text-sm">
            {t('words', { count: review.trim() ? review.trim().split(/\s+/u).length : 0 })}
          </p>
          {pdfWarning && <p className="text-sm">{t('pdfWarning')}</p>}
          <label className="block">
            <span className="sr-only">{t('review')}</span>
            <textarea
              className="textarea textarea-bordered w-full h-32 text-base"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </label>
          {!fits(combined(false)) && (
            <p role="alert" className="text-error text-sm">
              {t('overLimit')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {value.trim() ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!review.trim() || !fits(combined(true))}
                  onClick={() => apply(true)}
                >
                  {t('append')}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={!review.trim() || !fits(combined(false))}
                  onClick={() => apply(false)}
                >
                  {t('replace')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!review.trim() || !fits(combined(false))}
                onClick={() => apply(false)}
              >
                {t('use')}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReview(null)}>
              {t('cancel')}
            </button>
          </div>
          {value.trim() && !fits(combined(true)) && (
            <p className="text-error text-sm">{t('appendLimit')}</p>
          )}
        </div>
      )}
      {undo !== null && undo.after === value && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onChange(undo.before);
            setUndo(null);
          }}
        >
          {t('undo')}
        </button>
      )}
    </section>
  );
}
