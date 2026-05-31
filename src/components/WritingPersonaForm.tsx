'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_WRITING_PERSONA_SETTINGS,
  WRITING_PERSONA_POV_VALUES,
  WRITING_PERSONA_SPECIAL_REQUIREMENTS_MAX_LENGTH,
  WRITING_PERSONA_TECHNIQUE_VALUES,
  type WritingPersonaSettings,
  type WritingPersonaTechnique,
} from '@/types/writing-persona';

type WritingPersonaFormProps = {
  initialName?: string;
  initialSettings?: Partial<WritingPersonaSettings> | null;
  includeName?: boolean;
  submitLabel: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (payload: { name?: string; settings: WritingPersonaSettings }) => Promise<void> | void;
};

const TRAIT_KEYS = [
  'tone',
  'formality',
  'rhythm',
  'vocabulary',
  'fictionality',
  'dialogueDensity',
  'sensoriality',
  'subtextIrony',
] as const;

type TraitKey = (typeof TRAIT_KEYS)[number];

function mergeSettings(settings?: Partial<WritingPersonaSettings> | null): WritingPersonaSettings {
  return {
    ...DEFAULT_WRITING_PERSONA_SETTINGS,
    ...settings,
    techniques: settings?.techniques ?? DEFAULT_WRITING_PERSONA_SETTINGS.techniques,
    specialRequirements:
      settings?.specialRequirements ?? DEFAULT_WRITING_PERSONA_SETTINGS.specialRequirements,
  };
}

export default function WritingPersonaForm({
  initialName = '',
  initialSettings,
  includeName = false,
  submitLabel,
  cancelLabel,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: WritingPersonaFormProps) {
  const t = useTranslations('WritingPersonas.form');
  const [name, setName] = useState(initialName);
  const [settings, setSettings] = useState<WritingPersonaSettings>(() =>
    mergeSettings(initialSettings),
  );
  const trimmedName = name.trim();
  const canSubmit = !isSubmitting && (!includeName || trimmedName.length > 0);

  const selectedTechniques = useMemo(
    () => new Set<WritingPersonaTechnique>(settings.techniques),
    [settings.techniques],
  );

  const updateTrait = (key: TraitKey, value: string) => {
    setSettings((current) => ({
      ...current,
      [key]: Number(value),
    }));
  };

  const toggleTechnique = (technique: WritingPersonaTechnique) => {
    setSettings((current) => {
      const next = new Set(current.techniques);
      if (next.has(technique)) {
        next.delete(technique);
      } else {
        next.add(technique);
      }

      return {
        ...current,
        techniques: Array.from(next),
      };
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    await onSubmit({
      ...(includeName ? { name: trimmedName } : {}),
      settings: {
        ...settings,
        specialRequirements: settings.specialRequirements.trim(),
      },
    });
  };

  return (
    <div className="space-y-6">
      {includeName && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">{t('name.label')}</span>
          </label>
          <input
            className="input input-bordered w-full"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('name.placeholder')}
          />
          <label className="label">
            <span className="label-text-alt text-base-content/70">{t('name.help')}</span>
          </label>
        </div>
      )}

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">{t('pov.label')}</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={settings.pov}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              pov: event.target.value as WritingPersonaSettings['pov'],
            }))
          }
        >
          {WRITING_PERSONA_POV_VALUES.map((pov) => (
            <option key={pov} value={pov}>
              {t(`pov.options.${pov}`)}
            </option>
          ))}
        </select>
        <label className="label">
          <span className="label-text-alt text-base-content/70">{t('pov.help')}</span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TRAIT_KEYS.map((key) => (
          <div key={key} className="rounded-lg border border-base-300 bg-base-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="font-semibold text-sm" htmlFor={`writing-persona-${key}`}>
                {t(`traits.${key}.label`)}
              </label>
              <span className="badge badge-primary badge-outline">{settings[key]}/5</span>
            </div>
            <input
              id={`writing-persona-${key}`}
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings[key]}
              onChange={(event) => updateTrait(key, event.target.value)}
              className="range range-primary range-sm mt-3"
            />
            <div className="mt-1 flex justify-between text-[11px] uppercase tracking-wide text-base-content/50">
              <span>{t(`traits.${key}.low`)}</span>
              <span>{t(`traits.${key}.high`)}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-base-content/70">
              {t(`traits.${key}.help`)}
            </p>
          </div>
        ))}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">{t('techniques.label')}</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {WRITING_PERSONA_TECHNIQUE_VALUES.map((technique) => (
            <label
              key={technique}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 p-3 hover:border-primary/60"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm mt-1"
                checked={selectedTechniques.has(technique)}
                onChange={() => toggleTechnique(technique)}
              />
              <span>
                <span className="block text-sm font-semibold">{t(`techniques.${technique}`)}</span>
                <span className="block text-xs text-base-content/60">
                  {t(`techniqueHelp.${technique}`)}
                </span>
              </span>
            </label>
          ))}
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/70">{t('techniques.help')}</span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">{t('specialRequirements.label')}</span>
          <span className="label-text-alt">
            {settings.specialRequirements.length}/{WRITING_PERSONA_SPECIAL_REQUIREMENTS_MAX_LENGTH}
          </span>
        </label>
        <textarea
          className="textarea textarea-bordered min-h-28 w-full"
          maxLength={WRITING_PERSONA_SPECIAL_REQUIREMENTS_MAX_LENGTH}
          value={settings.specialRequirements}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              specialRequirements: event.target.value,
            }))
          }
          placeholder={t('specialRequirements.placeholder')}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            {t('specialRequirements.help')}
          </span>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && cancelLabel && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting && <span className="loading loading-spinner loading-sm" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
