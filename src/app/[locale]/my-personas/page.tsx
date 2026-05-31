'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { FaFeatherAlt, FaPen, FaPlus, FaTrash } from 'react-icons/fa';
import WritingPersonaForm from '@/components/WritingPersonaForm';
import {
  WRITING_PERSONA_MAX_SAVED,
  type SavedWritingPersona,
  type WritingPersonaSettings,
} from '@/types/writing-persona';

type FormPayload = {
  name?: string;
  settings: WritingPersonaSettings;
};

export default function MyPersonasPage() {
  const t = useTranslations('WritingPersonas');
  const locale = useLocale();
  const { isLoaded, isSignedIn } = useUser();
  const [personas, setPersonas] = useState<SavedWritingPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState<SavedWritingPersona | null>(null);
  const [deletingCodename, setDeletingCodename] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPersonas = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/writing-personas');

      if (!response.ok) {
        throw new Error('Failed to load writing personas');
      }

      const payload = (await response.json()) as { personas: SavedWritingPersona[] };
      setPersonas(payload.personas || []);
    } catch (err) {
      console.error(err);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, t]);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const persistPersona = async (payload: FormPayload, codename?: string) => {
    if (!payload.name) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const response = await fetch(
        codename ? `/api/writing-personas/${codename}` : '/api/writing-personas',
        {
          method: codename ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: payload.name, ...payload.settings }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to save writing persona');
      }

      const body = (await response.json()) as { persona: SavedWritingPersona };
      setPersonas((current) => {
        const withoutCurrent = current.filter(
          (persona) => persona.codename !== body.persona.codename,
        );
        return [body.persona, ...withoutCurrent].slice(0, WRITING_PERSONA_MAX_SAVED);
      });
      setShowCreateForm(false);
      setEditingPersona(null);
      setSuccess(t('success.saved'));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error && err.message ? err.message : t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const deletePersona = async (persona: SavedWritingPersona) => {
    try {
      setDeletingCodename(persona.codename);
      setError(null);
      const response = await fetch(`/api/writing-personas/${persona.codename}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete writing persona');
      }

      setPersonas((current) => current.filter((item) => item.codename !== persona.codename));
      setSuccess(t('success.deleted'));
    } catch (err) {
      console.error(err);
      setError(t('errors.deleteFailed'));
    } finally {
      setDeletingCodename(null);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold">{t('signedOut.title')}</h1>
        <p className="mx-auto mt-3 max-w-xl text-base-content/70">{t('signedOut.description')}</p>
        <Link href={`/${locale}/sign-in`} className="btn btn-primary mt-6">
          {t('signedOut.action')}
        </Link>
      </div>
    );
  }

  const canCreate = personas.length < WRITING_PERSONA_MAX_SAVED;

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {t('eyebrow')}
            </p>
            <h1 className="mt-2 text-4xl font-bold">{t('title')}</h1>
            <p className="mt-3 max-w-2xl text-base-content/70">{t('intro')}</p>
          </div>
          {!showCreateForm && !editingPersona && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
              disabled={!canCreate}
            >
              <FaPlus className="h-4 w-4" />
              {t('actions.create')}
            </button>
          )}
        </div>

        {error && <div className="alert alert-error mb-6">{error}</div>}
        {success && <div className="alert alert-success mb-6">{success}</div>}

        <div className="mb-6 rounded-lg border border-base-300 bg-base-100 p-4">
          <div className="flex items-start gap-3">
            <FaFeatherAlt className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">{t('guide.title')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-base-content/70">
                {t('guide.description')}
              </p>
              <Link
                href={`/${locale}/blog/literary-personas-fernando-pessoa-ai`}
                className="link link-primary mt-2 inline-block text-sm"
              >
                {t('guide.link')}
              </Link>
            </div>
          </div>
        </div>

        {(showCreateForm || editingPersona) && (
          <div className="card mb-8 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-primary">
                {editingPersona ? t('edit.title') : t('create.title')}
              </h2>
              <p className="text-sm text-base-content/70">
                {editingPersona ? t('edit.description') : t('create.description')}
              </p>
              <WritingPersonaForm
                key={editingPersona?.codename || 'create-writing-persona'}
                includeName
                initialName={editingPersona?.name || ''}
                initialSettings={editingPersona}
                submitLabel={editingPersona ? t('actions.save') : t('actions.create')}
                cancelLabel={t('actions.cancel')}
                isSubmitting={saving}
                onCancel={() => {
                  setShowCreateForm(false);
                  setEditingPersona(null);
                }}
                onSubmit={(payload) => persistPersona(payload, editingPersona?.codename)}
              />
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('list.title')}</h2>
          <span className="badge badge-outline">
            {t('list.count', { count: personas.length, max: WRITING_PERSONA_MAX_SAVED })}
          </span>
        </div>

        {personas.length === 0 && !showCreateForm ? (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-10 text-center">
            <FaFeatherAlt className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">{t('empty.title')}</h2>
            <p className="mx-auto mt-2 max-w-xl text-base-content/70">{t('empty.description')}</p>
            <button className="btn btn-primary mt-6" onClick={() => setShowCreateForm(true)}>
              <FaPlus className="h-4 w-4" />
              {t('actions.create')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {personas.map((persona) => (
              <div key={persona.codename} className="card bg-base-100 shadow">
                <div className="card-body gap-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="card-title">{persona.name}</h3>
                      <p className="mt-1 text-sm text-base-content/70">
                        {t('list.summary', {
                          pov: t(`form.pov.options.${persona.pov}`),
                          tone: persona.tone,
                          rhythm: persona.rhythm,
                          vocabulary: persona.vocabulary,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setEditingPersona(persona);
                          setShowCreateForm(false);
                        }}
                      >
                        <FaPen className="h-3.5 w-3.5" />
                        {t('actions.edit')}
                      </button>
                      <button
                        className="btn btn-error btn-outline btn-sm"
                        onClick={() => deletePersona(persona)}
                        disabled={deletingCodename === persona.codename}
                      >
                        {deletingCodename === persona.codename ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <FaTrash className="h-3.5 w-3.5" />
                        )}
                        {t('actions.delete')}
                      </button>
                    </div>
                  </div>

                  {persona.specialRequirements && (
                    <div className="rounded-lg bg-base-200 p-3 text-sm text-base-content/70">
                      {persona.specialRequirements}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
