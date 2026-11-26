'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save } from 'lucide-react';
import type { PremiumBookReaderData } from '@/lib/premium-children-book/reader';
import PremiumEditorDialog from './PremiumEditorDialog';
import StoryTextField from './StoryTextField';

export default function PremiumPageTextEditor({
  storyId,
  revision,
  pageNumber,
  pageKind,
  edit,
  bookLocale,
  onClose,
  onEditionChanged,
}: {
  storyId: string;
  revision: string;
  pageNumber: number;
  pageKind: PremiumBookReaderData['pages'][number]['kind'];
  edit: NonNullable<PremiumBookReaderData['pages'][number]['textEdit']>;
  bookLocale: string;
  onClose: () => void;
  onEditionChanged: () => Promise<void>;
}) {
  const t = useTranslations('PremiumBook');
  const tImage = useTranslations('AIImageEditor');
  const tStoryInfo = useTranslations('StoryInfoEditor');
  const [draft, setDraft] = useState(edit.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'editError' | 'editTextFit'>();
  const pending = useRef<{ id: string; text: string }>(null);
  const text = draft.trim();
  const canSave =
    text !== edit.value.trim() && text.length <= edit.maxLength && (edit.allowEmpty || text !== '');
  const title = t('editText', { page: t('pageNumber', { number: pageNumber }) });
  const label =
    pageKind === 'dedication'
      ? tStoryInfo('dedicationMessage')
      : pageKind === 'synopsis'
        ? tStoryInfo('synopsis')
        : t('editTextBody');

  async function save() {
    if (busy || !canSave) return;
    setBusy(true);
    setError(undefined);
    try {
      const correctionId =
        pending.current?.text === text ? pending.current.id : crypto.randomUUID();
      pending.current = { id: correctionId, text };
      const response = await fetch(`/api/stories/${storyId}/premium/text-edits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision, correctionId, pageNumber, text }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        setError(failure?.error === 'text_does_not_fit' ? 'editTextFit' : 'editError');
        return;
      }
      await onEditionChanged();
      onClose();
    } catch {
      setError('editError');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PremiumEditorDialog
      labelId="premium-text-editor-heading"
      onDismiss={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="mx-auto max-h-[calc(100dvh-1rem)] max-w-xl space-y-4 overflow-auto rounded-xl bg-base-100 p-4 text-base-content sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <h2 id="premium-text-editor-heading" className="text-lg font-semibold">
          {title}
        </h2>
        <StoryTextField
          label={label}
          aria-describedby="premium-text-editor-count"
          lang={bookLocale}
          rows={7}
          maxLength={edit.maxLength}
          value={draft}
          disabled={busy}
          onChange={setDraft}
        />
        <p id="premium-text-editor-count" className="text-sm text-base-content/70">
          {tImage('characterCount', { count: draft.length, max: edit.maxLength })}
        </p>
        {error && (
          <p className="text-sm text-error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            {tImage('cancelButton')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !canSave}>
            {busy ? (
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            {busy ? tStoryInfo('saving') : tStoryInfo('saveButton')}
          </button>
        </div>
      </form>
    </PremiumEditorDialog>
  );
}
