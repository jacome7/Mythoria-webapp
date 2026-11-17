'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { readGuestIntent, guestIntentHeaders, type GuestIntent } from '@/utils/biographer/guest';
import {
  reportAvatarVideo,
  useBiographerLive,
  type LiveEvent,
} from '@/hooks/biographer/useBiographerLive';
import { useScreenAwake } from '@/hooks/biographer/useScreenAwake';
import { answerDraft, saveAnswerDraft } from '@/utils/biographer/drafts';
import { concatenate, wav } from '@/utils/biographer/audio';
import type { BiographerProjectDetail } from '@/types/biographer';

export default function GuestStudio() {
  const [intent] = useState<GuestIntent | null>(() =>
    typeof window === 'undefined' ? null : readGuestIntent(),
  );
  const t = useTranslations('Biographer');
  const g = useTranslations('Biographer.guest');
  const [detail, setDetail] = useState<BiographerProjectDetail>();
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [draftId, setDraftId] = useState('');
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState('');
  const [pendingPhotoQuestion, setPendingPhotoQuestion] = useState<{ id: string; text: string }>();
  const [awake, setAwake] = useState(true);
  const [review, setReview] = useState(false);
  const [interim, setInterim] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState('');
  const [editText, setEditText] = useState('');
  const [playback, setPlayback] = useState('');
  const draftQueue = useRef(Promise.resolve());
  const video = useRef<HTMLVideoElement>(null);
  const scopedFetch = useCallback(
    (url: string, init: RequestInit = {}) => {
      if (!intent) return Promise.reject(new Error('guest-access-changed'));
      const headers = new Headers(init.headers);
      for (const [key, value] of Object.entries(guestIntentHeaders(intent)))
        headers.set(key, value);
      return fetch(url, { ...init, headers }).then(async (response) => {
        if (
          response.status === 401 ||
          (response.status === 409 &&
            String(
              (
                await response
                  .clone()
                  .json()
                  .catch(() => ({}))
              ).error || '',
            ).includes('session changed'))
        )
          throw new Error('guest-access-changed');
        return response;
      });
    },
    [intent],
  );
  const load = useCallback(async () => {
    const response = await scopedFetch('/api/biographer/contribution', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    setDetail(await response.json());
  }, [scopedFetch]);
  useEffect(() => {
    void load().catch((error) =>
      setError(
        error instanceof Error && error.message === 'guest-access-changed'
          ? g('accessChanged')
          : g('invalid'),
      ),
    );
  }, [load, g]);
  useEffect(() => {
    if (!detail) return;
    void answerDraft(detail.participant.id, detail.project.id)
      .then((draft) => {
        if (draft) {
          setText(draft.text);
          setDraftId(draft.id);
        }
      })
      .catch(() => setError(t('failed')));
  }, [detail?.participant.id, detail?.project.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const onEvent = useCallback(
    (event: LiveEvent) => {
      if (event.type !== 'transcript' || !event.turnId || !event.text) return;
      const id = event.turnId;
      setInterim((old) => ({ ...old, [id]: event.text! }));
      if (event.final)
        void load()
          .then(() =>
            setInterim((old) => {
              const next = { ...old };
              delete next[id];
              return next;
            }),
          )
          .catch(() => setError(t('failed')));
    },
    [load, t],
  );
  const live = useBiographerLive(
    detail?.project.id || '',
    detail?.participant.id || '',
    onEvent,
    true,
  );
  const pause = live.pause;
  const held = useScreenAwake(live.state !== 'paused', awake);
  useEffect(() => {
    if (live.videoUrl && video.current)
      void video.current.play().catch(() => {
        setError(t('playback'));
        pause();
      });
  }, [live.videoUrl, pause, t]);
  useEffect(
    () => () => {
      if (playback) URL.revokeObjectURL(playback);
    },
    [playback],
  );
  const action = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (error) {
      setError(
        error instanceof Error && error.message === 'guest-access-changed'
          ? g('accessChanged')
          : t('failed'),
      );
    } finally {
      setBusy(false);
    }
  };
  const updateText = (value: string) => {
    if (!detail) return;
    const id = draftId || crypto.randomUUID();
    setDraftId(id);
    setText(value);
    const participantId = detail.participant.id;
    const projectId = detail.project.id;
    draftQueue.current = draftQueue.current
      .then(() => saveAnswerDraft(participantId, projectId, { id, text: value }))
      .catch(() => setError(t('failed')));
  };
  const send = () =>
    action(async () => {
      if (!detail) return;
      const id = draftId || crypto.randomUUID();
      const response = await scopedFetch('/api/biographer/contribution/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text, role: 'user', final: true }),
      });
      if (!response.ok) throw new Error();
      await draftQueue.current;
      await saveAnswerDraft(detail.participant.id, detail.project.id, null);
      setText('');
      setDraftId('');
      await load();
    });
  const correction = (id: string, update: { text?: string; included?: boolean }) =>
    action(async () => {
      const r = await scopedFetch(`/api/biographer/contribution/turns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!r.ok) throw new Error();
      setEditing('');
      await load();
    });
  const askAboutPhoto = async (pending: { id: string; text: string }) => {
    const response = await scopedFetch('/api/biographer/contribution/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pending.id, role: 'user', text: pending.text, final: true }),
    });
    if (!response.ok) throw new Error();
    setPendingPhotoQuestion(undefined);
    await load();
  };
  const upload = (file: File) =>
    action(async () => {
      pause();
      const form = new FormData();
      form.set('file', file);
      form.set('caption', caption);
      const r = await scopedFetch('/api/biographer/contribution/photos', {
        method: 'POST',
        body: form,
      });
      if (!r.ok) throw new Error();
      const pending = {
        id: crypto.randomUUID(),
        text: [t('photoAdded'), caption.trim()].filter(Boolean).join(' '),
      };
      setPendingPhotoQuestion(pending);
      setCaption('');
      await load();
      try {
        await askAboutPhoto(pending);
      } catch {
        setError(t('photoQuestionPending'));
      }
    });
  const listen = (id: string) =>
    action(async () => {
      const segments =
        detail?.segments.filter((s) => s.turnId === id).sort((a, b) => a.sequence - b.sequence) ||
        [];
      const chunks = await Promise.all(
        segments.map(async (s) => {
          const r = await scopedFetch(`/api/biographer/contribution/segments/${s.id}`);
          if (!r.ok) throw new Error();
          return r.arrayBuffer();
        }),
      );
      if (chunks.length) setPlayback(URL.createObjectURL(wav(concatenate(chunks))));
    });
  const transcribe = (id: string) =>
    action(async () => {
      const r = await scopedFetch(`/api/biographer/contribution/turns/${id}/transcribe`, {
        method: 'POST',
      });
      if (!r.ok) throw new Error();
      await load();
    });
  const setStatus = (status: 'finished' | 'in_progress') =>
    action(async () => {
      pause();
      const r = await scopedFetch('/api/biographer/contribution/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      await load();
    });
  return (
    <main className="container mx-auto max-w-4xl p-4 space-y-5">
      <h1 className="text-2xl font-bold">{detail?.project.title || g('yourMemories')}</h1>
      <p>{g('disclosure')}</p>
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
        <p className="alert alert-warning" role="alert">
          {error || t('connectionLost')}
        </p>
      )}
      {!detail && !error && <p>{g('loading')}</p>}
      {detail && (
        <>
          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              onClick={() => {
                setReview(false);
              }}
            >
              {t('talk')}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                pause();
                setReview(true);
                void load();
              }}
            >
              {t('memories')}
            </button>
          </div>
          {detail.participant.followUp && (
            <p className="alert alert-info">
              {g('suggestedTopic')}: {detail.participant.followUp}
            </p>
          )}
          {detail.participant.status === 'closed' && (
            <p className="alert alert-warning">{g('closed')}</p>
          )}
          {detail.participant.status === 'finished' && (
            <p className="alert alert-info">{g('finished')}</p>
          )}
          {!review ? (
            <section className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-3">
                <div className="aspect-[3/4] bg-base-200 rounded-xl overflow-hidden flex items-center justify-center">
                  {live.videoUrl ? (
                    <video
                      ref={video}
                      src={live.videoUrl}
                      onWaiting={reportAvatarVideo}
                      onPlaying={reportAvatarVideo}
                      onError={reportAvatarVideo}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                      aria-label={t('avatar')}
                    />
                  ) : (
                    <p>{t('avatarIntro')}</p>
                  )}
                </div>
                <p role="status">{t(`states.${live.state}`)}</p>
                {live.state === 'paused' ? (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={busy || detail.participant.status === 'closed'}
                      onClick={() => void live.start()}
                    >
                      {t('startTalking')}
                    </button>
                    <button
                      className="btn btn-outline"
                      disabled={busy || detail.participant.status === 'closed'}
                      onClick={() => void live.startLocalRecording()}
                    >
                      {t('recordLocally')}
                    </button>
                  </>
                ) : (
                  <button className="btn btn-outline" onClick={pause}>
                    {t('pause')}
                  </button>
                )}
                {live.state === 'recording' && <p>{t('localRecordingHelp')}</p>}
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={awake}
                    onChange={(e) => setAwake(e.target.checked)}
                  />
                  {t('keepAwake')}
                </label>
                <small>{held ? t('awake') : t('awakeHelp')}</small>
              </div>
              <div className="space-y-3">
                <div
                  className="max-h-[50vh] overflow-y-auto space-y-3"
                  aria-label={t('transcript')}
                >
                  {detail.turns.map((turn) => (
                    <article
                      key={turn.id}
                      className={`chat ${turn.role === 'user' ? 'chat-end' : 'chat-start'}`}
                    >
                      <div className="chat-header">
                        {turn.role === 'user' ? t('you') : t('biographer')}
                      </div>
                      <p className="chat-bubble whitespace-pre-wrap">
                        {turn.text || t('transcriptionPending')}
                      </p>
                    </article>
                  ))}
                  {Object.entries(interim).map(([id, text]) => (
                    <p key={id} className="opacity-70 whitespace-pre-wrap">
                      {text}
                    </p>
                  ))}
                </div>
                <p role="status">{t(`save.${live.saving}`)}</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                  className="space-y-2"
                >
                  <label htmlFor="guest-answer">{t('write')}</label>
                  <textarea
                    id="guest-answer"
                    className="textarea textarea-bordered w-full"
                    value={text}
                    onChange={(e) => updateText(e.target.value)}
                    disabled={live.state !== 'paused' || detail.participant.status === 'closed'}
                    maxLength={40000}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={
                      busy ||
                      !text.trim() ||
                      live.state !== 'paused' ||
                      detail.participant.status === 'closed'
                    }
                  >
                    {t('send')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy || detail.participant.status === 'closed'}
                    onClick={() => {
                      pause();
                      updateText(t('skipText'));
                    }}
                  >
                    {t('skip')}
                  </button>
                </form>
                <input
                  className="input input-bordered w-full"
                  aria-label={t('photoCaption')}
                  placeholder={t('photoCaption')}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <label className="btn btn-outline">
                  {t('addPhoto')}
                  <input
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy || detail.participant.status === 'closed'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <p>{t('reviewHelp')}</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {detail.assets.map((asset) => (
                  <figure key={asset.id}>
                    <GuestPhoto
                      id={asset.id}
                      caption={asset.caption || t('photoSaved')}
                      scopedFetch={scopedFetch}
                    />
                    <figcaption>{asset.caption}</figcaption>
                  </figure>
                ))}
              </div>
              {playback && <audio controls src={playback} />}
              {detail.turns
                .filter((turn) => turn.role === 'user')
                .map((turn) => (
                  <article key={turn.id} className="card border p-4 gap-3">
                    {editing === turn.id ? (
                      <>
                        <textarea
                          className="textarea textarea-bordered"
                          aria-label={t('correct')}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <button
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() => void correction(turn.id, { text: editText })}
                        >
                          {t('saveCorrection')}
                        </button>
                      </>
                    ) : (
                      <p>{turn.text || t('transcriptionPending')}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="btn btn-sm"
                        disabled={detail.participant.status === 'closed'}
                        onClick={() => {
                          setEditing(turn.id);
                          setEditText(turn.text);
                        }}
                      >
                        {t('correct')}
                      </button>
                      {detail.segments.some((segment) => segment.turnId === turn.id) && (
                        <button className="btn btn-sm" onClick={() => void listen(turn.id)}>
                          {t('listen')}
                        </button>
                      )}
                      {!turn.text &&
                        detail.segments.some((segment) => segment.turnId === turn.id) && (
                          <button
                            className="btn btn-sm"
                            disabled={busy || live.saving !== 'saved'}
                            onClick={() => void transcribe(turn.id)}
                          >
                            {t('transcribe')}
                          </button>
                        )}
                    </div>
                  </article>
                ))}
            </section>
          )}
          {detail.participant.status === 'finished' ? (
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => void setStatus('in_progress')}
            >
              {g('continueSharing')}
            </button>
          ) : (
            <button
              className="btn btn-outline"
              disabled={busy || live.saving !== 'saved' || detail.participant.status === 'closed'}
              onClick={() => void setStatus('finished')}
            >
              {g('finish')}
            </button>
          )}
          <p>{g('resumeLater')}</p>
        </>
      )}
    </main>
  );
}

function GuestPhoto({
  id,
  caption,
  scopedFetch,
}: {
  id: string;
  caption: string;
  scopedFetch: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;
    void scopedFetch(`/api/biographer/contribution/photos/${id}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, scopedFetch]);
  return url ? <Image unoptimized width={400} height={300} src={url} alt={caption} /> : null;
}
