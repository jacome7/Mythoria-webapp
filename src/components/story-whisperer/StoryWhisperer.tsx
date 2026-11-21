'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { LuCheck, LuImage, LuMic, LuMessageCircle, LuSend, LuX } from 'react-icons/lu';
import { useBiographerLive, type LiveEvent } from '@/hooks/biographer/useBiographerLive';
import { forgetWhispererDraft, rememberWhispererDraft } from '@/lib/story-whisperer/draft-pointer';
import { essentials, type WhispererChoicesMode } from '@/lib/story-whisperer/types';
import { clearPending } from '@/utils/biographer/pending';
import { answerDraft, appendAnswerDictation, saveAnswerDraft } from '@/utils/biographer/drafts';
import { useScreenAwake } from '@/hooks/biographer/useScreenAwake';
import { useBiographerDictation } from '@/hooks/biographer/useBiographerDictation';
import {
  jsonRequest,
  readInterview,
  whispererPath,
  whispererProjectHeader,
  type WhispererContext,
  type WhispererDraft,
  type WhispererInterview,
} from './api';

type Props = {
  draftId: string;
  owner: string;
  interview: WhispererInterview | null;
  onInterview: (interview: WhispererInterview | null) => void;
  onClose: () => void;
  onOtherInputs: () => void;
  onContinue: (draft: WhispererDraft) => void;
  availablePhotos: number;
  inputsBlocked: boolean;
  inputContext?: WhispererContext;
};

type LiveLine = { role: 'user' | 'assistant'; text: string };

export default function StoryWhisperer(props: Props) {
  const t = useTranslations('StoryWhisperer');
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [consent, setConsent] = useState(false);
  const [includeExisting, setIncludeExisting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resumeScreen, setResumeScreen] = useState(props.interview ? 'choose' : null);
  const [inFlight, setInFlight] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    const viewport = window.visualViewport;
    const resize = () => {
      element.style.height = `${viewport?.height ?? window.innerHeight}px`;
      element.style.top = `${viewport?.offsetTop ?? 0}px`;
    };
    document.body.style.overflow = 'hidden';
    resize();
    element.showModal();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
    };
  }, []);

  async function start() {
    if (!consent || starting) return;
    setStarting(true);
    setFailed(false);
    try {
      rememberWhispererDraft(props.owner, props.draftId);
      const interview = await readInterview(
        props.draftId,
        jsonRequest('POST', {
          locale,
          consent: true,
          ...(includeExisting ? props.inputContext : {}),
        }),
      );
      if (!interview) throw new Error('Interview unavailable');
      props.onInterview(interview);
      if (includeExisting && props.inputContext) {
        const response = await fetch(`${whispererPath(props.draftId)}/readiness`, {
          method: 'POST',
          headers: whispererProjectHeader(interview.projectId),
        });
        if (response.ok) props.onInterview(await readInterview(props.draftId));
      }
    } catch {
      setFailed(true);
    } finally {
      setStarting(false);
    }
  }

  async function resetSavedInterview() {
    const projectId = props.interview?.projectId;
    if (!projectId || starting) return;
    setStarting(true);
    setFailed(false);
    try {
      const response = await fetch(`${whispererPath(props.draftId)}?projectId=${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error();
      await Promise.allSettled([
        clearPending(props.owner, projectId),
        clearPending(props.owner, projectId, 'dictation'),
        saveAnswerDraft(props.owner, projectId, null),
      ]);
      forgetWhispererDraft(props.owner, props.draftId);
      props.onInterview(null);
      setResumeScreen(null);
    } catch {
      setFailed(true);
    } finally {
      setStarting(false);
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby="story-whisperer-title"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-[#fff7e7] p-0 text-[#193b54]"
      onCancel={(event) => {
        event.preventDefault();
        if (starting || inFlight) return;
        if (resumeScreen === 'confirm') setResumeScreen('choose');
        else props.onClose();
      }}
    >
      <div className="mx-auto grid h-full w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex items-start gap-3 border-b border-[#193b54]/15 px-4 py-4 sm:px-7">
          <div className="min-w-0 flex-1">
            <h1 id="story-whisperer-title" className="text-2xl font-bold sm:text-3xl">
              {t('title')}
            </h1>
            <p className="mt-1 text-sm sm:text-base">{t('subtitle')}</p>
          </div>
          <button
            className="btn btn-circle btn-ghost"
            type="button"
            aria-label={t('close')}
            onClick={props.onClose}
            disabled={starting || inFlight}
          >
            <LuX aria-hidden size={22} />
          </button>
        </header>
        {props.interview && resumeScreen ? (
          <div className="grid place-content-center gap-4 overflow-auto p-6">
            <p className="max-w-md">
              {t(resumeScreen === 'confirm' ? 'resetConfirm' : 'resumePrompt')}
            </p>
            <div className="flex flex-wrap gap-2">
              {resumeScreen === 'confirm' ? (
                <>
                  <button
                    className="btn btn-error"
                    type="button"
                    disabled={starting}
                    onClick={() => void resetSavedInterview()}
                  >
                    {t('reset')}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={starting}
                    onClick={() => setResumeScreen('choose')}
                  >
                    {t('cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => setResumeScreen(null)}
                  >
                    {t('resumeChat')}
                  </button>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => setResumeScreen('confirm')}
                  >
                    {t('reset')}
                  </button>
                </>
              )}
            </div>
            {failed && <p role="alert">{t('error')}</p>}
          </div>
        ) : props.interview ? (
          <Conversation
            key={props.interview.projectId}
            {...props}
            interview={props.interview}
            onBusy={setInFlight}
          />
        ) : (
          <div className="grid place-content-center gap-4 overflow-auto p-6">
            <LuMessageCircle aria-hidden size={36} />
            <p className="max-w-md">{t('welcome')}</p>
            <label className="flex max-w-md items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              {t('consent')}
            </label>
            {props.inputContext && (
              <label className="flex max-w-md items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={includeExisting}
                  onChange={(event) => setIncludeExisting(event.target.checked)}
                />
                {t('useExisting')}
              </label>
            )}
            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!consent || starting}
                onClick={() => void start()}
              >
                {starting ? t('working') : t('start')}
              </button>
            </div>
            {failed && <p role="alert">{t('error')}</p>}
          </div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}

function Conversation({
  draftId,
  owner,
  interview,
  onInterview,
  onOtherInputs,
  onContinue,
  onBusy,
  availablePhotos,
  inputsBlocked,
  inputContext,
}: Props & { interview: WhispererInterview; onBusy: (busy: boolean) => void }) {
  const t = useTranslations('StoryWhisperer');
  const locale = useLocale();
  const { projectId, turns, assets, readiness } = interview;
  const api = whispererPath(draftId);
  const project = `/api/biographer/projects/${projectId}`;
  const photos = `${project}/photos`;
  const [text, setText] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [liveSaveStarted, setLiveSaveStarted] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'local' | 'saving' | 'saved' | 'error'>();
  const draftVersion = useRef(0);
  const draftWriteFailed = useRef(false);
  const draftWrite = useRef(Promise.resolve());
  const [busy, setBusy] = useState(false);
  const actionInFlight = useRef(false);
  const [error, setError] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [edit, setEdit] = useState<{ id: string; text: string }>();
  const [confirmDiscardVoice, setConfirmDiscardVoice] = useState(false);
  const [interim, setInterim] = useState<Record<string, LiveLine>>({});
  const [photoOpen, setPhotoOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [choices, setChoices] = useState<{
    choices?: string[];
    choicesMode?: WhispererChoicesMode;
  }>();
  const turnRequest = useRef<{ id: string; text: string } | undefined>(undefined);
  const thread = useRef<HTMLDivElement>(null);
  const refreshed = useRef(0);
  const refresh = useCallback(async () => {
    const sequence = ++refreshed.current;
    const latest = await readInterview(draftId);
    if (!latest || latest.projectId !== projectId) throw new Error('Interview unavailable');
    if (sequence === refreshed.current) onInterview(latest);
    return latest;
  }, [draftId, onInterview, projectId]);
  const liveReadinessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(liveReadinessTimer.current), [projectId]);
  const onLiveEvent = useCallback(
    (event: LiveEvent) => {
      if (event.type !== 'transcript' || !event.text || !event.turnId) return;
      const { turnId, text } = event;
      setChoices(undefined);
      setInterim((lines) => ({ ...lines, [turnId]: { role: event.role ?? 'user', text } }));
      if (event.final) {
        void refresh().catch(() => setError(true));
        clearTimeout(liveReadinessTimer.current);
        liveReadinessTimer.current = setTimeout(() => {
          void fetch(`${api}/readiness`, {
            method: 'POST',
            headers: whispererProjectHeader(projectId),
          })
            .then((response) => (response.ok ? refresh() : undefined))
            .catch(() => undefined);
        }, 500);
      }
    },
    [api, projectId, refresh],
  );
  const live = useBiographerLive(projectId, owner, onLiveEvent);
  useEffect(() => {
    if (live.saving !== 'saved') setLiveSaveStarted(true);
  }, [live.saving]);
  const dictation = useBiographerDictation(
    draftId,
    projectId,
    owner,
    async (transcript, segmentId) => {
      await draftWrite.current;
      if (draftWriteFailed.current && turnRequest.current) {
        await saveAnswerDraft(owner, projectId, { id: turnRequest.current.id, text });
        draftWriteFailed.current = false;
      }
      const saved = await appendAnswerDictation(
        owner,
        projectId,
        segmentId,
        transcript,
        crypto.randomUUID(),
      );
      if (!saved) throw new Error('Draft not saved');
      turnRequest.current = { id: saved.id, text: saved.text.trim() };
      setText(saved.text);
      setDraftStatus(saved.text.trim() ? 'local' : undefined);
    },
  );
  const activeVoice = live.state !== 'paused';
  useScreenAwake(activeVoice, true);
  const recordedTurns = turns.filter((turn) => turn.included && turn.text.trim());
  const incomplete = turns.filter(
    (turn) =>
      turn.included &&
      turn.role === 'user' &&
      (!turn.final || !turn.text.trim() || turn.interrupted),
  );
  const pendingLines = Object.entries(interim).filter(
    ([id]) => !turns.some((turn) => turn.id === id),
  );
  const lastTurn = recordedTurns.at(-1);
  const suggestions = choices ?? (lastTurn?.role === 'assistant' ? lastTurn : undefined);
  const visiblePhotos = assets.filter((asset) => asset.included);
  const blocked =
    busy ||
    activeVoice ||
    dictation.state !== 'idle' ||
    confirmReset ||
    confirmDiscardVoice ||
    !!edit;
  const canAttach = visiblePhotos.length < availablePhotos;

  useEffect(() => {
    let current = true;
    void answerDraft(owner, projectId)
      .then((draft) => {
        if (!current || !draft?.text.trim()) return;
        turnRequest.current = { id: draft.id, text: draft.text.trim() };
        setText(draft.text);
        setDraftStatus('local');
      })
      .catch(() => undefined)
      .finally(() => {
        if (current) setDraftLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [owner, projectId]);

  const writeDraft = (value: string) => {
    const version = ++draftVersion.current;
    const trimmed = value.trim();
    const id = turnRequest.current?.text === trimmed ? turnRequest.current.id : crypto.randomUUID();
    turnRequest.current = { id, text: trimmed };
    setText(value);
    setDraftStatus('saving');
    draftWrite.current = draftWrite.current
      .then(() => saveAnswerDraft(owner, projectId, { id, text: value }))
      .then(() => {
        if (draftVersion.current === version) {
          draftWriteFailed.current = false;
          setDraftStatus(trimmed ? 'local' : undefined);
        }
      })
      .catch(() => {
        if (draftVersion.current === version) {
          draftWriteFailed.current = true;
          setDraftStatus('error');
        }
      });
  };

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [turns, interim, assets]);

  async function run(task: () => Promise<void>) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError(false);
    try {
      await task();
    } catch {
      setError(true);
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      onBusy(false);
    }
  }

  const send = (value: string) => {
    const answer = value.trim();
    if (!answer || answer.length > 40000 || blocked) return;
    void run(async () => {
      const request =
        turnRequest.current?.text === answer
          ? turnRequest.current
          : { id: crypto.randomUUID(), text: answer };
      turnRequest.current = request;
      await draftWrite.current;
      setDraftStatus('saving');
      const response = await fetch(
        `${api}/interview`,
        jsonRequest('POST', { ...request, role: 'user', final: true }, projectId),
      ).catch(() => undefined);
      if (!response?.ok) {
        const local = await answerDraft(owner, projectId).catch(() => undefined);
        setDraftStatus(local?.text.trim() === answer ? 'local' : 'error');
        throw new Error();
      }
      setDraftStatus('saved');
      const result = (await response.json()) as {
        choices?: string[];
        choicesMode?: WhispererChoicesMode;
      };
      await refresh();
      await saveAnswerDraft(owner, projectId, { id: request.id, text: '' }).catch(() => undefined);
      setText('');
      setChoices(result);
      turnRequest.current = undefined;
    });
  };

  const assess = async () => {
    const response = await fetch(`${api}/readiness`, {
      method: 'POST',
      headers: whispererProjectHeader(projectId),
    });
    if (!response.ok) throw new Error();
    return refresh();
  };

  const updateTurn = async (id: string, patch: { text: string } | { included: false }) => {
    const response = await fetch(`${project}/turns/${id}`, jsonRequest('PATCH', patch));
    if (!response.ok) throw new Error();
    setEdit(undefined);
    await refresh();
    await assess();
  };

  const submitPhoto = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !canAttach || blocked) return;
    void run(async () => {
      const form = new FormData();
      form.set('file', file);
      form.set('caption', caption.trim());
      const response = await fetch(photos, { method: 'POST', body: form });
      if (!response.ok) throw new Error();
      setFile(null);
      setCaption('');
      setPhotoOpen(false);
      await refresh();
      await assess();
    });
  };

  const leave = () => {
    live.pause();
    onOtherInputs();
  };

  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#193b54]/15 px-4 py-3 sm:px-7">
        <ul className="flex flex-1 flex-wrap gap-1 sm:gap-2" aria-label={t('progress')}>
          {essentials.map((element) => {
            const status = readiness.areas[element];
            return (
              <li
                key={element}
                className={`badge gap-1 ${status === 'ready' ? 'badge-success' : status === 'developing' ? 'badge-warning' : 'badge-outline'}`}
              >
                {status === 'ready' && <LuCheck size={14} aria-hidden />}
                {t(element)}
                <span className="sr-only"> {t(status)}</span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={
            blocked ||
            !readiness.ready ||
            !!incomplete.length ||
            dictation.hasPending ||
            !draftLoaded ||
            live.saving !== 'saved' ||
            inputsBlocked ||
            visiblePhotos.length > availablePhotos ||
            !!text.trim()
          }
          onClick={() =>
            void run(async () => {
              const latest = await assess();
              if (latest.readiness.ready)
                onContinue({ draftId, projectId: latest.projectId, revision: latest.revision });
            })
          }
        >
          {t('continue')}
        </button>
        {readiness.hint && (
          <p className="w-full text-sm" role="status">
            {readiness.hint}
          </p>
        )}
      </div>

      <div
        ref={thread}
        className="overflow-y-auto overscroll-contain px-4 py-5 sm:px-7"
        role="log"
        aria-label={t('conversation')}
      >
        <div className="chat chat-start">
          <div className="chat-bubble max-w-[90%] bg-white text-[#193b54]">{t('opening')}</div>
        </div>
        {recordedTurns.map((turn) => (
          <Bubble key={turn.id} role={turn.role} text={turn.text}>
            {turn.role === 'user' && !incomplete.some(({ id }) => id === turn.id) && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={blocked}
                onClick={() => setEdit({ id: turn.id, text: turn.text })}
              >
                {t('editReply')}
              </button>
            )}
          </Bubble>
        ))}
        {incomplete.map((turn) => (
          <div key={turn.id} className="my-2 rounded-xl border border-[#193b54]/15 bg-white p-3">
            <p>{t('unfinished')}</p>
            <div className="flex flex-wrap gap-2">
              {turn.recoverableAudio && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={blocked || live.saving !== 'saved'}
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch(`${project}/turns/${turn.id}/transcribe`, {
                        method: 'POST',
                      });
                      if (!response.ok) throw new Error();
                      const result = (await response.json()) as { turn: { text: string } };
                      setEdit({ id: turn.id, text: result.turn.text });
                      await refresh();
                    })
                  }
                >
                  {t('recoverDictation')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={blocked}
                onClick={() =>
                  setEdit({ id: turn.id, text: turn.text || interim[turn.id]?.text || '' })
                }
              >
                {t('editReply')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked}
                onClick={() =>
                  void run(async () => {
                    await updateTurn(turn.id, { included: false });
                  })
                }
              >
                {t('discardDictation')}
              </button>
            </div>
          </div>
        ))}
        {pendingLines.map(([id, line]) => (
          <Bubble key={id} {...line} />
        ))}
        {!!visiblePhotos.length && (
          <ul className="my-3 flex flex-wrap justify-end gap-2" aria-label={t('photos')}>
            {visiblePhotos.map((asset) => (
              <li
                key={asset.id}
                className="w-36 overflow-hidden rounded-xl border border-[#193b54]/15 bg-white"
              >
                {/* Private image; its normal request includes the customer's session. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="aspect-square w-full object-cover"
                  src={`${photos}/${asset.id}`}
                  alt={asset.caption || t('photo')}
                />
                {asset.caption && <p className="break-words p-2 text-sm">{asset.caption}</p>}
                <button
                  type="button"
                  disabled={blocked}
                  className="btn btn-ghost btn-xs m-1"
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch(
                        `${photos}/${asset.id}`,
                        jsonRequest('PATCH', { included: false }),
                      );
                      if (!response.ok) throw new Error();
                      await refresh();
                      await assess();
                    })
                  }
                >
                  {t('removePhoto')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!!suggestions?.choices?.length && !activeVoice && (
          <SuggestedReplies
            key={JSON.stringify([lastTurn?.id, suggestions.choices])}
            choices={suggestions.choices}
            mode={suggestions.choicesMode ?? 'button'}
            disabled={blocked || !!text.trim() || !draftLoaded}
            send={send}
          />
        )}
      </div>

      <div className="space-y-2 border-t border-[#193b54]/15 bg-[#fffaf2] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7">
        {busy && (
          <p role="status" className="text-sm">
            {t('working')}
          </p>
        )}
        {(error || live.error || dictation.error) && (
          <p role="alert" className="text-sm text-error">
            {t('error')}
          </p>
        )}
        {draftStatus && (
          <p role="status" className="text-sm">
            {t(draftStatus === 'error' ? 'draftSaveFailed' : `saveStatus.${draftStatus}`)}
          </p>
        )}
        {(liveSaveStarted || live.saving !== 'saved') && (
          <p role="status" className="text-sm">
            {t(`saveStatus.${live.saving}`)}{' '}
            {live.saving !== 'saved' && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={blocked}
                  onClick={() =>
                    void run(async () => {
                      await live.sync();
                      await assess();
                    })
                  }
                >
                  {t('retry')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={blocked}
                  onClick={() => setConfirmDiscardVoice(true)}
                >
                  {t('discardDictation')}
                </button>
              </>
            )}
          </p>
        )}
        {edit ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (edit.text.trim()) void run(() => updateTurn(edit.id, { text: edit.text.trim() }));
            }}
          >
            <label className="block text-sm">
              {t('editReply')}
              <textarea
                className="textarea textarea-bordered mt-1 w-full text-base"
                rows={3}
                value={edit.text}
                onChange={(event) => setEdit({ ...edit, text: event.target.value })}
                maxLength={40000}
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={busy || !edit.text.trim()}
            >
              {t('saveReply')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => setEdit(undefined)}
            >
              {t('cancel')}
            </button>
          </form>
        ) : confirmDiscardVoice ? (
          <div role="alert">
            <p>{t('discardVoiceConfirm')}</p>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await live.reset();
                  setConfirmDiscardVoice(false);
                  await refresh();
                  await assess();
                })
              }
            >
              {t('discardDictation')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => setConfirmDiscardVoice(false)}
            >
              {t('cancel')}
            </button>
          </div>
        ) : confirmReset ? (
          <div className="space-y-2" role="alert">
            <p>{t('resetConfirm')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-error btn-sm"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const response = await fetch(`${api}?projectId=${projectId}`, {
                      method: 'DELETE',
                    });
                    if (!response.ok) throw new Error();
                    await draftWrite.current;
                    await Promise.allSettled([
                      live.reset(),
                      dictation.cancel(),
                      saveAnswerDraft(owner, projectId, null),
                    ]);
                    forgetWhispererDraft(owner, draftId);
                    onInterview(null);
                  })
                }
              >
                {t('reset')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => setConfirmReset(false)}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : photoOpen ? (
          <form className="space-y-2" onSubmit={submitPhoto}>
            <label className="block text-sm">
              {t('photo')}
              <input
                type="file"
                className="file-input file-input-sm mt-1 w-full"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={blocked}
                required
              />
            </label>
            <label className="block text-sm">
              {t('caption')}
              <input
                type="text"
                className="input input-sm mt-1 w-full"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2000}
                disabled={blocked}
              />
            </label>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!file || blocked}>
              {t('attach')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => {
                setPhotoOpen(false);
                setCaption('');
                setFile(null);
              }}
            >
              {t('cancel')}
            </button>
          </form>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send(text);
            }}
          >
            {text.length > 40000 && (
              <output className="basis-full text-sm" role="status">
                {text.length.toLocaleString(locale)} / {Number(40000).toLocaleString(locale)}
              </output>
            )}
            <textarea
              rows={2}
              aria-label={t('reply')}
              placeholder={t('reply')}
              value={text}
              onChange={(event) => writeDraft(event.target.value)}
              maxLength={40000}
              disabled={blocked || !draftLoaded}
              className="textarea textarea-bordered min-w-0 flex-1 resize-none text-base"
            />
            <button
              type="submit"
              className="btn btn-primary"
              aria-label={t('send')}
              disabled={blocked || !draftLoaded || !text.trim() || text.trim().length > 40000}
            >
              <LuSend aria-hidden size={17} />
              <span className="hidden sm:inline">{t('send')}</span>
            </button>
          </form>
        )}
        {!confirmReset && !photoOpen && !confirmDiscardVoice && !edit && (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked || !canAttach}
                onClick={() => setPhotoOpen(true)}
              >
                <LuImage aria-hidden />
                {t('attach')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={
                  busy ||
                  activeVoice ||
                  dictation.state === 'starting' ||
                  dictation.state === 'transcribing' ||
                  (dictation.hasPending && dictation.state !== 'recording') ||
                  !draftLoaded
                }
                onClick={() =>
                  void (dictation.state === 'recording' ? dictation.stop() : dictation.start())
                }
              >
                <LuMic aria-hidden />
                {dictation.state === 'recording' ? t('stopDictation') : t('dictate')}
              </button>
              {dictation.state === 'transcribing' && (
                <p role="status" className="text-sm">
                  {t('working')}
                </p>
              )}
              {dictation.hasPending && dictation.state === 'idle' && (
                <>
                  <p role="status" className="text-sm">
                    {t('saveStatus.local')}
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy || activeVoice}
                    onClick={() => void dictation.retry()}
                  >
                    {t('recoverDictation')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy || activeVoice}
                    onClick={() => void run(dictation.cancel)}
                  >
                    {t('discardDictation')}
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy || dictation.state !== 'idle'}
                onClick={() => {
                  if (activeVoice) {
                    live.pause();
                    void run(async () => {
                      await live.sync();
                      await assess();
                    });
                  } else void live.start();
                }}
              >
                <LuMessageCircle aria-hidden />
                {activeVoice ? t('pauseVoice') : t('liveVoice')}
              </button>
              {activeVoice && (
                <p className="text-sm" role="status">
                  {t(live.state)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked}
                onClick={leave}
              >
                {t('otherInputs')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked}
                onClick={() => setConfirmReset(true)}
              >
                {t('reset')}
              </button>
              {inputContext && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={blocked}
                  onClick={() =>
                    void run(async () => {
                      const updated = await readInterview(
                        draftId,
                        jsonRequest('POST', { locale, consent: true, ...inputContext }, projectId),
                      );
                      if (!updated) throw new Error();
                      onInterview(updated);
                      await assess();
                    })
                  }
                >
                  {t('useExisting')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked}
                onClick={() =>
                  void run(async () => {
                    await assess();
                  })
                }
              >
                {t('checkProgress')}
              </button>
            </div>
            {(inputsBlocked || visiblePhotos.length > availablePhotos) && (
              <p className="text-sm">{t('reviewInputs')}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Bubble({ role, text, children }: LiveLine & { children?: React.ReactNode }) {
  const t = useTranslations('StoryWhisperer');
  return (
    <div className={`chat ${role === 'user' ? 'chat-end' : 'chat-start'}`}>
      <div className="chat-header mb-1 text-xs">{role === 'user' ? t('you') : t('title')}</div>
      <div
        className={`chat-bubble max-w-[90%] whitespace-pre-wrap break-words ${role === 'user' ? 'bg-[#193b54] text-white' : 'bg-white text-[#193b54]'}`}
      >
        {text}
      </div>
      {children && <div className="chat-footer">{children}</div>}
    </div>
  );
}

function SuggestedReplies({
  choices,
  mode,
  disabled,
  send,
}: {
  choices: string[];
  mode: WhispererChoicesMode;
  disabled: boolean;
  send: (reply: string) => void;
}) {
  const t = useTranslations('StoryWhisperer');
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <fieldset className="my-3 flex flex-wrap items-center gap-2" disabled={disabled}>
      <legend className="sr-only">{t('suggestions')}</legend>
      {choices.map((choice) =>
        mode === 'button' ? (
          <button
            type="button"
            key={choice}
            className="btn btn-outline btn-sm text-wrap"
            onClick={() => send(choice)}
          >
            {choice}
          </button>
        ) : (
          <label
            key={choice}
            className="flex items-center gap-2 rounded-lg border border-[#193b54]/20 px-2 py-1 text-sm"
          >
            <input
              type={mode === 'single' ? 'radio' : 'checkbox'}
              name="whisperer-suggestions"
              checked={selected.includes(choice)}
              onChange={(event) =>
                setSelected((current) =>
                  mode === 'single'
                    ? [choice]
                    : event.target.checked
                      ? [...current, choice]
                      : current.filter((value) => value !== choice),
                )
              }
            />
            {choice}
          </label>
        ),
      )}
      {mode !== 'button' && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!selected.length}
          onClick={() => send(selected.join(', '))}
        >
          {t('send')}
        </button>
      )}
    </fieldset>
  );
}
