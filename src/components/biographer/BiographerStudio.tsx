'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import PeopleMemories from './PeopleMemories';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { setCurrentStoryId, setStep1Data } from '@/lib/story-session';
import { LiteraryPersona } from '@/types/story-enums';
import { Link } from '@/i18n/routing';
import type { BiographerProjectDetail, BiographerTurn } from '@/types/biographer';
import { useBiographerLive, type LiveEvent } from '@/hooks/biographer/useBiographerLive';
import { useScreenAwake } from '@/hooks/biographer/useScreenAwake';
import { answerDraft, saveAnswerDraft } from '@/utils/biographer/drafts';
import { concatenate, wav } from '@/utils/biographer/audio';

export default function BiographerStudio({ projectId }: { projectId: string }) {
  const t = useTranslations('Biographer');
  const locale = useLocale();
  const router = useRouter();
  const tPersonas = useTranslations('StorySteps.step4');
  const [persona, setPersona] = useState('contextual-storyteller');
  const [place, setPlace] = useState('');
  const [period, setPeriod] = useState('');
  const [caption, setCaption] = useState('');
  const [pendingPhotoQuestion, setPendingPhotoQuestion] = useState<{ id: string; text: string }>();
  const [photoEdits, setPhotoEdits] = useState<Record<string, string>>({});
  const { userId } = useAuth();
  const [detail, setDetail] = useState<BiographerProjectDetail>();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [awake, setAwake] = useState(true);
  const [tab, setTab] = useState<'talk' | 'memories' | 'people' | 'book'>('talk');
  const [collaborationEnabled, setCollaborationEnabled] = useState(false);
  const [unfinishedContributors, setUnfinishedContributors] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/biographer/projects/${projectId}/contributors`, { signal: controller.signal })
      .then(async (r) => {
        if (controller.signal.aborted) return;
        setCollaborationEnabled(r.ok);
        if (r.ok) {
          const data = (await r.json()) as { contributors: Array<{ status: string }> };
          if (!controller.signal.aborted)
            setUnfinishedContributors(
              data.contributors.filter((p) => p.status !== 'finished' && p.status !== 'closed')
                .length,
            );
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [projectId]);
  const [draftId, setDraftId] = useState<string>();
  const draftQueue = useRef(Promise.resolve());
  useEffect(() => {
    if (!userId) return;
    void answerDraft(userId, projectId)
      .then((draft) => {
        if (draft) {
          setText(draft.text);
          setDraftId(draft.id);
        }
      })
      .catch(() => setError(t('failed')));
  }, [userId, projectId, t]);
  const updateText = (value: string) => {
    const id = draftId || crypto.randomUUID();
    setDraftId(id);
    setText(value);
    if (userId)
      draftQueue.current = draftQueue.current
        .then(() => saveAnswerDraft(userId, projectId, { id, text: value }))
        .catch(() => setError(t('failed')));
  };
  const [interim, setInterim] = useState<Record<string, { role: string; text: string }>>({});
  const [editing, setEditing] = useState<string>();
  const [editText, setEditText] = useState('');
  const [playback, setPlayback] = useState<string>();
  const [proposal, setProposal] = useState<Record<string, unknown>>();
  const [editingProposal, setEditingProposal] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/biographer/projects/${projectId}`, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    setDetail(await response.json());
  }, [projectId]);
  useEffect(() => {
    void load().catch(() => setError(t('unavailable')));
  }, [load, t]);
  const onEvent = useCallback(
    (event: LiveEvent) => {
      if (event.type === 'transcript' && event.turnId && event.text) {
        setInterim((old) => ({
          ...old,
          [event.turnId!]: { role: event.role || 'user', text: event.text! },
        }));
        if (event.final) {
          void load()
            .then(() =>
              setInterim((old) => {
                const next = { ...old };
                delete next[event.turnId!];
                return next;
              }),
            )
            .catch(() => setError(t('failed')));
        }
      }
    },
    [load, t],
  );
  const live = useBiographerLive(projectId, userId || '', onEvent);
  const pauseLive = live.pause;
  const held = useScreenAwake(live.state !== 'paused', awake);
  useEffect(() => {
    if (live.videoUrl && video.current)
      void video.current.play().catch(() => {
        setError(t('playback'));
        pauseLive();
      });
  }, [live.videoUrl, pauseLive, t]);
  useEffect(
    () => () => {
      if (playback) URL.revokeObjectURL(playback);
    },
    [playback],
  );
  const action = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };
  const send = () =>
    action(async () => {
      const id = draftId || crypto.randomUUID();
      setDraftId(id);
      const response = await fetch(`/api/biographer/projects/${projectId}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: 'user', text, final: true }),
      });
      if (!response.ok) throw new Error();
      await draftQueue.current;
      if (userId) await saveAnswerDraft(userId, projectId, null);
      setText('');
      setProposal(undefined);
      setDraftId(undefined);
      await load();
    });
  const change = (id: string, update: { text?: string; included?: boolean }) =>
    action(async () => {
      const response = await fetch(`/api/biographer/projects/${projectId}/turns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error();
      setEditing(undefined);
      setProposal(undefined);
      await load();
    });
  const replay = (item: BiographerTurn) =>
    action(async () => {
      const segments =
        detail?.segments
          .filter((segment) => segment.turnId === item.id)
          .sort((a, b) => a.sequence - b.sequence) || [];
      const buffers = await Promise.all(
        segments.map(async (segment) => {
          const response = await fetch(
            `/api/biographer/projects/${projectId}/segments/${segment.id}`,
          );
          if (!response.ok) throw new Error();
          return response.arrayBuffer();
        }),
      );
      if (buffers.length) setPlayback(URL.createObjectURL(wav(concatenate(buffers))));
    });
  const transcribe = (id: string) =>
    action(async () => {
      const response = await fetch(`/api/biographer/projects/${projectId}/turns/${id}/transcribe`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error();
      await load();
    });
  const makeProposal = () =>
    action(async () => {
      live.pause();
      const response = await fetch(`/api/biographer/projects/${projectId}/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          literaryPersona: persona,
          researchPlaces: place.trim() ? [{ place: place.trim(), period: period.trim() }] : [],
        }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setProposal(data.proposal);
      setSettingsDirty(false);
      await load();
    });
  const askAboutPhoto = async (pending: { id: string; text: string }) => {
    const response = await fetch(`/api/biographer/projects/${projectId}/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pending.id, role: 'user', text: pending.text, final: true }),
    });
    if (!response.ok) throw new Error();
    setPendingPhotoQuestion(undefined);
    await load();
  };
  const uploadPhoto = (file: File) =>
    action(async () => {
      live.pause();
      const form = new FormData();
      form.set('file', file);
      form.set('caption', caption);
      const response = await fetch(`/api/biographer/projects/${projectId}/photos`, {
        method: 'POST',
        body: form,
      });
      if (!response.ok) throw new Error();
      const pending = {
        id: crypto.randomUUID(),
        text: [t('photoAdded'), caption.trim()].filter(Boolean).join(' '),
      };
      setPendingPhotoQuestion(pending);
      setCaption('');
      setProposal(undefined);
      await load();
      try {
        await askAboutPhoto(pending);
      } catch {
        setError(t('photoQuestionPending'));
      }
    });
  const updatePhoto = (id: string, update: { caption?: string; included?: boolean }) =>
    action(async () => {
      const response = await fetch(`/api/biographer/projects/${projectId}/photos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error();
      setProposal(undefined);
      await load();
    });
  const saveProposal = () =>
    action(async () => {
      const current = proposal || detail?.project.proposal;
      if (!current) throw new Error();
      const response = await fetch(`/api/biographer/projects/${projectId}/proposal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: detail?.project.proposalRevision,
          title: current.title,
          synopsis: current.synopsis,
          chapters: current.chapters,
        }),
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setProposal(result.proposal);
      setEditingProposal(false);
      await load();
    });
  const approve = () =>
    action(async () => {
      const response = await fetch(`/api/biographer/projects/${projectId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: detail?.project.proposalRevision }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setCurrentStoryId(data.storyId);
      setStep1Data({ customAuthor: '', dedicationMessage: '' });
      router.push(`/${locale}/tell-your-story/step-5`);
    });
  const turns = detail?.turns || [];
  return (
    <main className="container mx-auto max-w-5xl p-4 sm:p-8 space-y-5">
      <header className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <Link href="/biographer" className="text-sm link">
            {t('projects')}
          </Link>
          <h1 className="text-2xl font-bold">{detail?.project.title || t('title')}</h1>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-outline">{t('private')}</span>
          {collaborationEnabled && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                live.pause();
                setTab('people');
              }}
            >
              {t('invitePeople')}
            </button>
          )}
        </div>
      </header>
      <div role="tablist" className="tabs tabs-border">
        {(
          [
            'talk',
            'memories',
            ...(collaborationEnabled ? ['people' as const] : []),
            'book',
          ] as const
        ).map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            className={`tab ${tab === name ? 'tab-active' : ''}`}
            onClick={() => {
              if (name !== 'talk') {
                live.pause();
                void load().catch(() => setError(t('failed')));
              }
              if (name === 'book' && collaborationEnabled)
                void fetch(`/api/biographer/projects/${projectId}/contributors`, {
                  cache: 'no-store',
                })
                  .then(async (r) => {
                    if (r.ok) {
                      const data = (await r.json()) as { contributors: Array<{ status: string }> };
                      setUnfinishedContributors(
                        data.contributors.filter(
                          (p) => p.status !== 'finished' && p.status !== 'closed',
                        ).length,
                      );
                    }
                  })
                  .catch(() => undefined);
              setTab(name);
            }}
          >
            {name === 'people' ? t('peopleTab') : t(name)}
          </button>
        ))}
      </div>
      {pendingPhotoQuestion && (
        <button
          className="btn btn-outline"
          disabled={busy}
          onClick={() => void action(() => askAboutPhoto(pendingPhotoQuestion))}
        >
          {t('retryPhotoQuestion')}
        </button>
      )}
      {(error || live.error) && (
        <p role="alert" className="alert alert-warning">
          {error || t('connectionLost')}
        </p>
      )}
      {tab === 'talk' && (
        <section className="grid gap-5 lg:grid-cols-[minmax(220px,1fr)_2fr]">
          <div className="space-y-4">
            <div className="aspect-[3/4] rounded-2xl bg-base-200 border border-base-300 overflow-hidden flex items-center justify-center">
              {live.videoUrl ? (
                <video
                  ref={video}
                  src={live.videoUrl}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  aria-label={t('avatar')}
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <span className="text-5xl" aria-hidden="true">
                    ✦
                  </span>
                  <p>{t('avatarIntro')}</p>
                </div>
              )}
            </div>
            <p role="status" aria-live="polite">
              {t(`states.${live.state}`)}
            </p>
            <div className="flex gap-2">
              {live.state === 'paused' ? (
                <button
                  className="btn btn-primary"
                  disabled={!detail || busy}
                  onClick={() => void live.start()}
                >
                  {t('startTalking')}
                </button>
              ) : (
                <button className="btn btn-outline" onClick={live.pause}>
                  {t('pause')}
                </button>
              )}
            </div>
            {live.state === 'paused' && (
              <button
                className="btn btn-outline btn-sm"
                disabled={!detail || busy}
                onClick={() => void live.startLocalRecording()}
              >
                {t('recordLocally')}
              </button>
            )}
            {live.state === 'recording' && <p className="text-sm">{t('localRecordingHelp')}</p>}
            <label className="flex gap-2 items-start text-sm">
              <input
                type="checkbox"
                checked={awake}
                onChange={(event) => setAwake(event.target.checked)}
                className="checkbox checkbox-sm"
              />
              {t('keepAwake')}
            </label>
            <p className="text-xs opacity-70">{held ? t('awake') : t('awakeHelp')}</p>
            <p className="text-xs">{t('privacy')}</p>
          </div>
          <div className="space-y-4">
            <div
              className="max-h-[55vh] overflow-y-auto space-y-4 rounded-xl bg-base-100 p-4 border border-base-300"
              aria-label={t('transcript')}
            >
              {!turns.length && <p>{t('firstQuestion')}</p>}
              {turns.map((item) => (
                <article
                  key={item.id}
                  className={`chat ${item.role === 'user' ? 'chat-end' : 'chat-start'}`}
                >
                  <div className="chat-header">
                    {item.role === 'user' ? t('you') : t('biographer')}
                  </div>
                  <p className="chat-bubble whitespace-pre-wrap">
                    {item.text || t('transcriptionPending')}
                  </p>
                </article>
              ))}
              {Object.entries(interim).map(([id, item]) => (
                <p key={id} className="opacity-70 whitespace-pre-wrap">
                  {item.text}
                </p>
              ))}
            </div>
            <p className="text-sm" role="status" aria-live="polite">
              {t(`save.${live.saving}`)}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
              className="space-y-3"
            >
              <label htmlFor="biographer-response" className="font-semibold">
                {t('write')}
              </label>
              <textarea
                id="biographer-response"
                className="textarea textarea-bordered w-full"
                rows={3}
                value={text}
                maxLength={40000}
                onChange={(event) => updateText(event.target.value)}
                disabled={live.state !== 'paused'}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  disabled={!text.trim() || busy || live.state !== 'paused'}
                >
                  {t('send')}
                </button>
                <input
                  aria-label={t('photoCaption')}
                  placeholder={t('photoCaption')}
                  className="input input-bordered w-full"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                />
                <label className="btn btn-outline">
                  {t('addPhoto')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadPhoto(file);
                      event.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    live.pause();
                    updateText(t('skipText'));
                  }}
                >
                  {t('skip')}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
      {tab === 'memories' && (
        <section className="space-y-4">
          <p>{t('reviewHelp')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {detail?.assets?.map((asset) => (
              <figure key={asset.id} className="card border border-base-300 p-3">
                {/* Private authenticated media endpoint. */}
                <Image
                  width={640}
                  height={480}
                  unoptimized
                  src={`/api/biographer/projects/${projectId}/photos/${asset.id}`}
                  alt={asset.caption || t('photoSaved')}
                  className="max-h-48 object-contain"
                />
                <figcaption className="space-y-2">
                  <input
                    className="input input-bordered w-full"
                    aria-label={t('photoCaption')}
                    value={photoEdits[asset.id] ?? asset.caption}
                    onChange={(event) =>
                      setPhotoEdits((old) => ({ ...old, [asset.id]: event.target.value }))
                    }
                  />
                  <button
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() =>
                      void updatePhoto(asset.id, { caption: photoEdits[asset.id] ?? asset.caption })
                    }
                  >
                    {t('saveCorrection')}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    disabled={busy}
                    onClick={() => void updatePhoto(asset.id, { included: !asset.included })}
                  >
                    {asset.included ? t('exclude') : t('include')}
                  </button>
                  {!asset.included && <p>{t('excluded')}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
          {playback && <audio src={playback} controls autoPlay className="w-full" />}
          {turns
            .filter((item) => item.role === 'user')
            .map((item) => (
              <article key={item.id} className="card border border-base-300">
                <div className="card-body gap-3">
                  <p className="text-xs opacity-70">
                    {new Date(item.createdAt).toLocaleString(locale)}
                  </p>
                  {editing === item.id ? (
                    <>
                      <textarea
                        className="textarea textarea-bordered w-full"
                        aria-label={t('correct')}
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                      />
                      <button
                        className="btn btn-primary btn-sm self-start"
                        disabled={busy}
                        onClick={() => void change(item.id, { text: editText })}
                      >
                        {t('saveCorrection')}
                      </button>
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{item.text || t('transcriptionPending')}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setEditing(item.id);
                        setEditText(item.text);
                      }}
                    >
                      {t('correct')}
                    </button>
                    {detail?.segments.some((segment) => segment.turnId === item.id) && (
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={busy}
                        onClick={() => void replay(item)}
                      >
                        {t('listen')}
                      </button>
                    )}
                    {!item.text &&
                      detail?.segments.some((segment) => segment.turnId === item.id) && (
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={busy || live.saving !== 'saved'}
                          onClick={() => void transcribe(item.id)}
                        >
                          {t('transcribe')}
                        </button>
                      )}
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={busy}
                      onClick={() => void change(item.id, { included: !item.included })}
                    >
                      {item.included ? t('exclude') : t('include')}
                    </button>
                  </div>
                  {!item.included && <p className="text-sm opacity-70">{t('excluded')}</p>}
                </div>
              </article>
            ))}
        </section>
      )}
      {tab === 'people' && <PeopleMemories projectId={projectId} />}
      {tab === 'book' && (
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">{t('bookHeading')}</h2>
          <p>{t('bookHelp')}</p>
          <label className="form-control">
            <span className="label-text">{t('persona')}</span>
            <select
              className="select select-bordered"
              value={persona}
              onChange={(event) => {
                setPersona(event.target.value);
                setSettingsDirty(true);
              }}
            >
              <option value="contextual-storyteller">{t('contextualPersona')}</option>
              {Object.values(LiteraryPersona)
                .filter((value) => value !== 'contextual-storyteller')
                .map((value) => (
                  <option key={value} value={value}>
                    {tPersonas(`literaryPersona.options.${value}.name`)}
                  </option>
                ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              {t('researchPlace')}
              <input
                className="input input-bordered w-full"
                value={place}
                onChange={(event) => {
                  setPlace(event.target.value);
                  setSettingsDirty(true);
                }}
                maxLength={200}
              />
            </label>
            <label>
              {t('researchPeriod')}
              <input
                className="input input-bordered w-full"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  setSettingsDirty(true);
                }}
                maxLength={100}
              />
            </label>
          </div>
          <p className="text-sm opacity-70">{t('researchHelp')}</p>
          <button
            className="btn btn-primary"
            disabled={busy || !turns.some((item) => item.role === 'user' && item.included)}
            onClick={() => void makeProposal()}
          >
            {t('propose')}
          </button>
          {(proposal || detail?.project.proposal) && (
            <div className="card border border-base-300 p-5 space-y-3">
              {editingProposal ? (
                <>
                  <label>
                    {t('bookTitle')}
                    <input
                      className="input input-bordered w-full"
                      value={String(proposal?.title ?? '')}
                      onChange={(event) =>
                        setProposal((old) => ({ ...old, title: event.target.value }))
                      }
                      maxLength={500}
                    />
                  </label>
                  <label>
                    {t('bookSynopsis')}
                    <textarea
                      className="textarea textarea-bordered w-full"
                      value={String(proposal?.synopsis ?? '')}
                      onChange={(event) =>
                        setProposal((old) => ({ ...old, synopsis: event.target.value }))
                      }
                      maxLength={8000}
                    />
                  </label>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold">
                    {String((proposal || detail?.project.proposal)?.title || '')}
                  </h3>
                  <p>{String((proposal || detail?.project.proposal)?.synopsis || '')}</p>
                </>
              )}
              <ol className="list-decimal pl-5">
                {Array.isArray((proposal || detail?.project.proposal)?.chapters) &&
                  (
                    (proposal || detail?.project.proposal)?.chapters as Array<{
                      title: string;
                      synopsis?: string;
                    }>
                  ).map((chapter, index) => (
                    <li key={index}>
                      {editingProposal ? (
                        <>
                          <input
                            aria-label={t('chapterTitle')}
                            className="input input-bordered w-full"
                            value={chapter.title}
                            maxLength={300}
                            onChange={(event) =>
                              setProposal((old) => ({
                                ...old,
                                chapters: (old?.chapters as Array<Record<string, unknown>>).map(
                                  (item, i) =>
                                    i === index ? { ...item, title: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                          <textarea
                            aria-label={t('chapterSynopsis')}
                            className="textarea textarea-bordered w-full"
                            value={chapter.synopsis || ''}
                            maxLength={4000}
                            onChange={(event) =>
                              setProposal((old) => ({
                                ...old,
                                chapters: (old?.chapters as Array<Record<string, unknown>>).map(
                                  (item, i) =>
                                    i === index ? { ...item, synopsis: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </>
                      ) : (
                        <>
                          <strong>{chapter.title}</strong>
                          <p>{chapter.synopsis}</p>
                        </>
                      )}
                    </li>
                  ))}
              </ol>
              {Array.isArray((proposal || detail?.project.proposal)?.omittedSources) &&
                (
                  (proposal || detail?.project.proposal)?.omittedSources as Array<{
                    id: string;
                    reason: string;
                  }>
                ).length > 0 && (
                  <div>
                    <h4 className="font-semibold">{t('omittedMemories')}</h4>
                    <ul className="list-disc pl-5">
                      {(
                        (proposal || detail?.project.proposal)?.omittedSources as Array<{
                          id: string;
                          reason: string;
                        }>
                      ).map((source) => (
                        <li key={source.id}>
                          {turns.find((turn) => turn.id === source.id)?.text}: {source.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {Array.isArray((proposal || detail?.project.proposal)?.research) && (
                <ul>
                  {(
                    (proposal || detail?.project.proposal)?.research as Array<{
                      url: string;
                      title: string;
                    }>
                  )
                    .filter((source) => /^https?:\/\//i.test(source.url))
                    .map((source) => (
                      <li key={source.url}>
                        <a
                          className="link"
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                </ul>
              )}
              <p>{t('proposalReview')}</p>
              {unfinishedContributors > 0 && (
                <p className="alert alert-info">
                  {t('unfinishedAuthors', { count: unfinishedContributors })}
                </p>
              )}
              {settingsDirty && <p className="text-warning">{t('refreshDirection')}</p>}
              {editingProposal ? (
                <button
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => void saveProposal()}
                >
                  {t('saveDirection')}
                </button>
              ) : (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setProposal(structuredClone(proposal || detail?.project.proposal || {}));
                    setEditingProposal(true);
                  }}
                >
                  {t('adjustDirection')}
                </button>
              )}
              <button
                className="btn btn-primary"
                disabled={busy || editingProposal || settingsDirty || live.saving !== 'saved'}
                onClick={() => void approve()}
              >
                {t('approve')}
              </button>
              <button className="btn btn-outline self-start" onClick={() => setTab('talk')}>
                {t('gatherMore')}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
