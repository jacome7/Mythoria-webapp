'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LuCamera } from 'react-icons/lu';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import type { QuestionPhoto } from '@/lib/story-templates/journey';

interface Props {
  value?: QuestionPhoto;
  onChange: (photo: QuestionPhoto | undefined) => void;
  unavailable?: boolean;
  disabled?: boolean;
}

export default function QuestionPhotoAnswer({ value, onChange, unavailable, disabled }: Props) {
  const t = useTranslations('StoryTemplates');
  const locale = useLocale();
  const { uploadInput, analyzeImage } = useMediaUpload();
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef({ value, onChange, disabled });
  useLayoutEffect(() => {
    latest.current = { value, onChange, disabled };
  });
  const operation = useRef(0);
  useEffect(
    () => () => {
      operation.current += 1;
    },
    [],
  );
  const busy = value?.status === 'uploading' || value?.status === 'analyzing';
  const update = (photo: QuestionPhoto | undefined) => {
    latest.current = { ...latest.current, value: photo };
    latest.current.onChange(photo);
  };
  const analyze = async (photo: QuestionPhoto, token: number) => {
    const current = () => operation.current === token && latest.current.value?.id === photo.id;
    try {
      photo = { ...photo, attempts: (photo.attempts ?? 0) + 1 };
      update(photo);
      const metadata = await analyzeImage(photo.objectPath!, locale);
      if (!current()) return;
      const subjects = metadata.overallImageContent === 'photo' ? (metadata.characters ?? []) : [];
      update({
        ...photo,
        status: subjects.length ? 'done' : 'error',
        metadata: {
          overallImageContent: metadata.overallImageContent,
          characters: subjects.slice(0, 50),
        },
        sourceCharacterIndex: subjects.length === 1 ? 0 : undefined,
      });
    } catch {
      if (current()) update({ ...photo, status: 'error' });
    }
  };
  const upload = async (file: File) => {
    if (disabled || unavailable) return;
    const token = ++operation.current;
    const photo: QuestionPhoto = { id: crypto.randomUUID(), status: 'uploading' };
    update(photo);
    try {
      const result = await uploadInput('image', file);
      if (operation.current !== token || latest.current.value?.id !== photo.id) return;
      const next: QuestionPhoto = { ...photo, ...result, status: 'analyzing' };
      update(next);
      await analyze(next, token);
    } catch {
      if (operation.current === token && latest.current.value?.id === photo.id)
        update({ ...photo, status: 'error' });
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 p-3">
      <input
        ref={input}
        className="hidden"
        type="file"
        accept="image/*"
        aria-label={t('photoAnswerLabel')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      <p className="text-sm">{t('photoReferenceHelp')}</p>
      {value?.publicUrl && (
        <Image
          src={value.publicUrl}
          alt={t('photoPreview')}
          width={280}
          height={180}
          unoptimized
          className="h-auto max-h-48 w-auto max-w-full rounded-lg object-contain"
        />
      )}
      {busy && (
        <p role="status" className="flex items-center gap-2">
          <span className="loading loading-spinner loading-sm" />
          {t('photoPreparing')}
        </p>
      )}
      {value?.status === 'error' && (
        <p role="alert">{value.metadata ? t('photoNoSubject') : t('photoError')}</p>
      )}
      {value?.status === 'done' && (value.metadata?.characters?.length ?? 0) > 1 && (
        <fieldset className="space-y-2">
          <legend className="font-semibold">{t('photoChooseSubject')}</legend>
          {value.metadata!.characters!.map((subject, index) => (
            <label
              key={index}
              className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-base-300 p-2 text-sm"
            >
              <input
                type="radio"
                className="radio radio-sm mt-1"
                name={`photo-subject-${value.id}`}
                checked={value.sourceCharacterIndex === index}
                disabled={disabled}
                onChange={() => update({ ...value, sourceCharacterIndex: index })}
              />
              <span>
                {index + 1}.{' '}
                {subject.physicalDescription?.slice(0, 180) || subject.label || t('photoSubject')}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm min-h-11"
          disabled={disabled || busy || (unavailable && !value)}
          onClick={() => input.current?.click()}
        >
          <LuCamera aria-hidden="true" />
          {value ? t('photoReplace') : t('photoAnswerLabel')}
        </button>
        {value?.status === 'error' &&
          value.objectPath &&
          !value.metadata &&
          (value.attempts ?? 0) < 3 && (
            <button
              type="button"
              className="btn btn-outline btn-sm min-h-11"
              disabled={disabled}
              onClick={() => {
                const next: QuestionPhoto = { ...value, status: 'analyzing' };
                update(next);
                void analyze(next, ++operation.current);
              }}
            >
              {t('photoRetry')}
            </button>
          )}
        {value && (
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-11"
            disabled={disabled}
            onClick={() => {
              operation.current += 1;
              update(undefined);
            }}
          >
            {t('photoRemove')}
          </button>
        )}
      </div>
      {unavailable && !value && (
        <p className="text-sm" role="status">
          {t('photoLimit')}
        </p>
      )}
    </div>
  );
}
