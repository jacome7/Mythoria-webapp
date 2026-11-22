'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import type { IconType } from 'react-icons';
import {
  LuAudioLines,
  LuCheck,
  LuCircle,
  LuMic,
  LuPaperclip,
  LuPause,
  LuRotateCcw,
  LuSend,
  LuSquare,
  LuX,
} from 'react-icons/lu';
import type { StoryIntent } from '@/constants/intents';
import { useBiographerLive, type LiveEvent } from '@/hooks/biographer/useBiographerLive';
import { forgetWhispererDraft, rememberWhispererDraft } from '@/lib/story-whisperer/draft-pointer';
import {
  essentials,
  whispererRubricVersion,
  type WhispererChoicesMode,
} from '@/lib/story-whisperer/types';
import { answerDraft, appendAnswerDictation, saveAnswerDraft } from '@/utils/biographer/drafts';
import { useScreenAwake } from '@/hooks/biographer/useScreenAwake';
import { useBiographerDictation } from '@/hooks/biographer/useBiographerDictation';
import {
  assessReadiness,
  jsonRequest,
  readInterview,
  whispererPath,
  type WhispererContext,
  type WhispererDraft,
  type WhispererInterview,
} from './api';
import { parseResetReply } from './reset-reply';

type Props = {
  draftId: string;
  owner: string;
  interview: WhispererInterview | null;
  primaryIntent?: StoryIntent;
  onInterview: (interview: WhispererInterview | null) => void;
  onClose: () => void;
  onContinue: (draft: WhispererDraft) => void;
  availablePhotos: number;
  inputsBlocked: boolean;
  inputContext?: WhispererContext;
};

function needsOpening(interview: WhispererInterview) {
  return !interview.opening && interview.turns.length === 0;
}

function isIncompleteAnswer(turn: WhispererInterview['turns'][number]) {
  return (
    turn.included && turn.role === 'user' && (!turn.final || !turn.text.trim() || turn.interrupted)
  );
}

type LiveLine = { role: 'user' | 'assistant'; text: string };

const replyShortcutQuery = '(hover: hover) and (pointer: fine)';
const supportsReplyShortcut = () => Boolean(window.matchMedia?.(replyShortcutQuery).matches);
const serverReplyShortcutSnapshot = () => false;

function subscribeToReplyShortcut(onChange: () => void) {
  const query = window.matchMedia?.(replyShortcutQuery);
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
}

export default function StoryWhisperer(props: Props) {
  const { draftId, owner, interview, onInterview, primaryIntent } = props;
  const t = useTranslations('StoryWhisperer');
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const focusNewConversation = useRef(false);
  const startStatus = useRef<'idle' | 'loading' | 'failed' | 'complete'>('idle');
  const [inFlight, setInFlight] = useState(false);
  const [failed, setFailed] = useState(false);
  const conversation = interview && !needsOpening(interview) ? interview : null;
  const projectId = conversation?.projectId;
  const projectNeedingOpening = interview && !conversation ? interview.projectId : undefined;
  const starting = !conversation && !failed;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const viewport = window.visualViewport;
    const resize = () => {
      element.style.height = `${viewport?.height ?? window.innerHeight}px`;
      element.style.top = `${viewport?.offsetTop ?? 0}px`;
    };
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    resize();
    element.showModal();
    element.querySelector('h1')?.focus();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => {
      element.close();
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
    };
  }, []);

  const start = useCallback(async () => {
    if (startStatus.current === 'loading') return;
    startStatus.current = 'loading';
    setFailed(false);
    try {
      rememberWhispererDraft(owner, draftId);
      const created = await readInterview(
        draftId,
        jsonRequest('POST', { locale, primaryIntent }, projectNeedingOpening),
      );
      if (
        !created ||
        (projectNeedingOpening &&
          (created.projectId !== projectNeedingOpening || needsOpening(created)))
      )
        throw new Error('Interview unavailable');
      startStatus.current = needsOpening(created) ? 'idle' : 'complete';
      onInterview(created);
    } catch {
      startStatus.current = 'failed';
      setFailed(true);
    }
  }, [draftId, locale, onInterview, owner, primaryIntent, projectNeedingOpening]);

  useEffect(() => {
    if (!conversation && startStatus.current === 'idle') void start();
  }, [conversation, start]);

  useLayoutEffect(() => {
    if (!projectId || !focusNewConversation.current) return;
    focusNewConversation.current = false;
    dialog.current?.querySelector('h1')?.focus();
  }, [projectId]);

  const updateInterview = useCallback(
    (next: WhispererInterview | null) => {
      if (!next) {
        startStatus.current = 'idle';
        focusNewConversation.current = true;
      }
      onInterview(next);
    },
    [onInterview],
  );

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby="story-whisperer-title"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-[#fff7e7] p-0 text-[#193b54]"
      onCancel={(event) => {
        event.preventDefault();
        if (!starting && !inFlight) props.onClose();
      }}
    >
      <div className="mx-auto h-full w-full max-w-3xl">
        {conversation ? (
          <Conversation
            key={conversation.projectId}
            {...props}
            interview={conversation}
            onInterview={updateInterview}
            onBusy={setInFlight}
          />
        ) : (
          <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
            <ConversationHeader onClose={props.onClose} closeDisabled={starting || inFlight} />
            <div
              className="relative space-y-4 overflow-y-auto px-4 py-6 sm:px-7"
              role="log"
              aria-label={t('conversation')}
            >
              {failed ? (
                <AssistantNotice>
                  <p role="alert">{t('error')}</p>
                  <button type="button" className="btn btn-primary" onClick={() => void start()}>
                    {t('retry')}
                  </button>
                </AssistantNotice>
              ) : (
                <AssistantStatus>{t('working')}</AssistantStatus>
              )}
            </div>
          </div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}

function ConversationHeader({
  onClose,
  closeDisabled,
  onReset,
  resetDisabled,
  resetButton,
}: {
  onClose: () => void;
  closeDisabled: boolean;
  onReset?: () => void;
  resetDisabled?: boolean;
  resetButton?: React.Ref<HTMLButtonElement>;
}) {
  const t = useTranslations('StoryWhisperer');

  return (
    <header className="flex items-center gap-3 border-b border-[#193b54]/15 px-4 py-2 sm:px-7 sm:py-3">
      <h1
        id="story-whisperer-title"
        tabIndex={-1}
        className="min-w-0 flex-1 text-2xl font-bold outline-none sm:text-3xl"
      >
        {t('title')}
      </h1>
      <div className="flex items-center gap-1">
        {onReset && (
          <button
            className="btn btn-circle btn-ghost size-11 min-h-0 px-0"
            type="button"
            aria-label={t('reset')}
            title={t('reset')}
            onClick={onReset}
            disabled={resetDisabled}
            ref={resetButton}
          >
            <LuRotateCcw aria-hidden size={20} />
          </button>
        )}
        <button
          className="btn btn-circle btn-ghost size-11 min-h-0 px-0"
          type="button"
          aria-label={t('close')}
          title={t('close')}
          onClick={onClose}
          disabled={closeDisabled}
        >
          <LuX aria-hidden size={22} />
        </button>
      </div>
    </header>
  );
}

function Conversation({
  draftId,
  owner,
  interview,
  onInterview,
  onClose,
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
  const [draftError, setDraftError] = useState(false);
  const [sendError, setSendError] = useState(false);
  const replyInput = useRef<HTMLTextAreaElement>(null);
  const focusReplyAfterVoice = useRef(false);
  const replyShortcutId = useId();
  const showReplyShortcut = useSyncExternalStore(
    subscribeToReplyShortcut,
    supportsReplyShortcut,
    serverReplyShortcutSnapshot,
  );
  const draftVersion = useRef(0);
  const draftWriteFailed = useRef(false);
  const draftWrite = useRef(Promise.resolve());
  const [busyAction, setBusyAction] = useState<'send' | 'other'>();
  const [pendingReply, setPendingReply] = useState<{ id: string; text: string }>();
  const busy = busyAction !== undefined;
  const actionInFlight = useRef(false);
  const [error, setError] = useState(false);
  const [advanceUnavailable, setAdvanceUnavailable] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetReply, setResetReply] = useState('');
  const [resetReplyUnclear, setResetReplyUnclear] = useState(false);
  const resetQuestionId = useId();
  const resetButton = useRef<HTMLButtonElement>(null);
  const resetNoButton = useRef<HTMLButtonElement>(null);
  const restoreResetFocus = useRef<'header' | 'reply' | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<{ id: string; text: string }>();
  const [confirmDiscardVoice, setConfirmDiscardVoice] = useState(false);
  const [interim, setInterim] = useState<Record<string, LiveLine>>({});
  const activeVoicePartials = useRef(new Set<string>());
  const [discardedVoiceTurns, setDiscardedVoiceTurns] = useState<Set<string>>(() => new Set());
  const voiceCancellation = useRef<Promise<void> | undefined>(undefined);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const turnRequest = useRef<{ id: string; text: string } | undefined>(undefined);
  const thread = useRef<HTMLDivElement>(null);
  const startsAtIntroduction = useRef(turns.length === 0 && assets.length === 0);
  const refreshed = useRef(0);
  const latestInterview = useRef(interview);
  const requestVoiceAdvance = useRef<(event: LiveEvent) => void>(() => undefined);
  const activeConversation = useRef(false);
  useLayoutEffect(() => {
    activeConversation.current = true;
    return () => {
      activeConversation.current = false;
      refreshed.current += 1;
    };
  }, []);
  useLayoutEffect(() => {
    if (interview.revision >= latestInterview.current.revision) latestInterview.current = interview;
  }, [interview]);
  const applyInterview = useCallback(
    (next: WhispererInterview) => {
      if (
        !activeConversation.current ||
        next.projectId !== projectId ||
        next.revision < latestInterview.current.revision ||
        (next.revision === latestInterview.current.revision &&
          next.readinessNeedsRefresh &&
          !latestInterview.current.readinessNeedsRefresh)
      )
        return;
      latestInterview.current = next;
      refreshed.current += 1;
      onInterview(next);
    },
    [onInterview, projectId],
  );
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const sequence = ++refreshed.current;
      const latest = await readInterview(draftId, signal ? { signal } : undefined);
      if (!latest || latest.projectId !== projectId) throw new Error('Interview unavailable');
      if (
        !signal?.aborted &&
        (sequence === refreshed.current || latest.revision > latestInterview.current.revision)
      ) {
        applyInterview(latest);
      }
      return latestInterview.current;
    },
    [applyInterview, draftId, projectId],
  );
  const liveReadinessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liveAssessment = useRef<Promise<unknown> | undefined>(undefined);
  const cancelLiveReadiness = useCallback(() => {
    clearTimeout(liveReadinessTimer.current);
    liveReadinessTimer.current = undefined;
  }, []);
  useEffect(() => cancelLiveReadiness, [cancelLiveReadiness]);
  const assessOnOpen = useEffectEvent((signal: AbortSignal) => {
    if (!interview.readinessNeedsRefresh) return;
    liveAssessment.current = (async () => {
      const assessed = await assessReadiness(draftId, projectId, signal);
      if (!assessed && !signal.aborted) await assessReadiness(draftId, projectId, signal);
      if (!signal.aborted) await refresh(signal);
    })()
      .catch(() => undefined)
      .finally(() => {
        liveAssessment.current = undefined;
      });
  });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => assessOnOpen(controller.signal), 0);
    const deadline = setTimeout(() => controller.abort(), 15_000);
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, []);
  const onLiveEvent = useCallback(
    (event: LiveEvent) => {
      if (event.type === 'advance_to_outline') {
        requestVoiceAdvance.current(event);
        return;
      }
      if (event.type !== 'transcript' || !event.text || !event.turnId) return;
      const { turnId, text } = event;
      if (event.final) activeVoicePartials.current.delete(turnId);
      else activeVoicePartials.current.add(turnId);
      setInterim((lines) => ({ ...lines, [turnId]: { role: event.role ?? 'user', text } }));
      if (event.final) {
        void refresh().catch(() => setError(true));
        cancelLiveReadiness();
        const timer = setTimeout(async () => {
          await liveAssessment.current;
          if (liveReadinessTimer.current !== timer) return;
          liveReadinessTimer.current = undefined;
          const signal = AbortSignal.timeout(15_000);
          liveAssessment.current = assessReadiness(draftId, projectId, signal)
            .then((assessed) => assessed || assessReadiness(draftId, projectId, signal))
            .then((assessed) => (assessed ? refresh(signal) : undefined))
            .catch(() => undefined)
            .finally(() => {
              liveAssessment.current = undefined;
            });
        }, 500);
        liveReadinessTimer.current = timer;
      }
    },
    [cancelLiveReadiness, draftId, projectId, refresh],
  );
  const live = useBiographerLive(projectId, owner, onLiveEvent, false, true);
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
      setDraftError(false);
      setSendError(false);
    },
  );
  const activeVoice = live.state !== 'paused';
  useScreenAwake(activeVoice, true);
  const visibleTurns = turns.filter(
    (turn) =>
      !discardedVoiceTurns.has(turn.id) || (turn.final && !turn.interrupted && turn.text.trim()),
  );
  const recordedTurns = visibleTurns.filter((turn) => turn.included && turn.text.trim());
  const incomplete = visibleTurns.filter(isIncompleteAnswer);
  const pendingLines = Object.entries(interim).filter(
    ([id]) => !turns.some((turn) => turn.id === id),
  );
  const lastTurn = recordedTurns.at(-1);
  const opening = interview.opening ?? { question: t('opening'), choices: [] };
  const suggestions =
    lastTurn?.role === 'assistant'
      ? lastTurn
      : turns.length === 0 && pendingLines.length === 0
        ? { choices: opening.choices, choicesMode: 'button' as const }
        : undefined;
  const openingIsRecorded =
    recordedTurns[0]?.role === 'assistant' && recordedTurns[0].text === opening.question;
  const visiblePhotos = assets.filter((asset) => asset.included);
  const inputBlocked =
    busy || activeVoice || dictation.state !== 'idle' || confirmDiscardVoice || !!recoveryDraft;
  const blocked = inputBlocked || confirmReset;
  const canAttach = visiblePhotos.length < availablePhotos;
  const composerText = confirmReset ? resetReply : pendingReply ? '' : text;
  const hasText = Boolean(composerText.trim());
  const replyOverLimit = composerText.length > 40000;
  const composerDisabled = inputBlocked || photoOpen || !draftLoaded;
  const sendDisabled = composerDisabled || !hasText || composerText.trim().length > 40000;
  const voiceSyncFailed = live.saving === 'attention' || live.saving === 'local';
  const advanceBlocked =
    busy ||
    confirmReset ||
    photoOpen ||
    !!recoveryDraft ||
    confirmDiscardVoice ||
    dictation.state !== 'idle' ||
    dictation.hasPending ||
    !draftLoaded ||
    voiceSyncFailed ||
    (!activeVoice && live.saving !== 'saved') ||
    inputsBlocked ||
    visiblePhotos.length > availablePhotos ||
    !!text.trim();
  const usesCurrentRubric = readiness.rubricVersion === whispererRubricVersion;
  const canCheckOutline =
    usesCurrentRubric &&
    (interview.readinessNeedsRefresh
      ? (activeVoice || discardedVoiceTurns.size > 0) &&
        essentials.every((area) => readiness.areas[area] === 'ready')
      : readiness.ready);
  const isRecoveringReply = Boolean(recoveryDraft);
  const composerOpen = !confirmDiscardVoice && !isRecoveringReply;
  const recording = dictation.state === 'recording';
  const voiceControlLabel = activeVoice ? t('pauseVoice') : t('liveVoice');

  useLayoutEffect(() => {
    if (!focusReplyAfterVoice.current || composerDisabled || !replyInput.current) return;
    focusReplyAfterVoice.current = false;
    replyInput.current.focus({ preventScroll: true });
  }, [composerDisabled]);

  useLayoutEffect(() => {
    const input = replyInput.current;
    if (!input || !composerOpen) return;
    const resize = () => {
      input.style.height = 'auto';
      input.style.height = `${input.scrollHeight}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [composerOpen, composerText]);

  useEffect(() => {
    let current = true;
    void answerDraft(owner, projectId)
      .then((draft) => {
        if (!current || !draft?.text.trim()) return;
        turnRequest.current = { id: draft.id, text: draft.text.trim() };
        setText(draft.text);
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
    setSendError(false);
    draftWrite.current = draftWrite.current
      .then(() => saveAnswerDraft(owner, projectId, { id, text: value }))
      .then(() => {
        if (draftVersion.current === version) {
          draftWriteFailed.current = false;
          setDraftError(false);
        }
      })
      .catch(() => {
        if (draftVersion.current === version) {
          draftWriteFailed.current = true;
          setDraftError(true);
        }
      });
  };

  useLayoutEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [
    turns,
    interim,
    assets,
    pendingReply,
    busyAction,
    error,
    advanceUnavailable,
    live.error,
    live.state,
    live.saving,
    dictation.error,
    dictation.state,
    dictation.hasPending,
    draftError,
    sendError,
    confirmReset,
    resetReplyUnclear,
    confirmDiscardVoice,
    isRecoveringReply,
    photoOpen,
    inputContext,
    inputsBlocked,
    replyOverLimit,
  ]);

  useLayoutEffect(() => {
    if (startsAtIntroduction.current && thread.current) thread.current.scrollTop = 0;
  }, []);

  useLayoutEffect(() => {
    if (confirmReset) {
      const focusTarget = supportsReplyShortcut() ? replyInput.current : resetNoButton.current;
      focusTarget?.focus({ preventScroll: true });
    }
    if (!confirmReset && restoreResetFocus.current) {
      const focusTarget =
        restoreResetFocus.current === 'header' ? resetButton.current : replyInput.current;
      restoreResetFocus.current = null;
      focusTarget?.focus({ preventScroll: true });
    }
  }, [confirmReset]);

  async function run(task: () => Promise<void>, action: 'send' | 'other' = 'other') {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusyAction(action);
    onBusy(true);
    setError(false);
    setAdvanceUnavailable(false);
    try {
      await task();
    } catch {
      setError(true);
    } finally {
      actionInFlight.current = false;
      setBusyAction(undefined);
      onBusy(false);
    }
  }

  const send = (value: string) => {
    const answer = value.trim();
    if (!answer || answer.length > 40000 || blocked || photoOpen || !draftLoaded) return;
    void run(async () => {
      const request =
        turnRequest.current?.text === answer
          ? turnRequest.current
          : { id: crypto.randomUUID(), text: answer };
      turnRequest.current = request;
      setPendingReply(request);
      setText(value);
      setSendError(false);
      await draftWrite.current;
      try {
        await saveAnswerDraft(owner, projectId, { id: request.id, text: value });
        draftWriteFailed.current = false;
        setDraftError(false);
      } catch {
        draftWriteFailed.current = true;
        setDraftError(true);
      }
      try {
        const response = await fetch(
          `${api}/interview`,
          jsonRequest('POST', { ...request, role: 'user', final: true }, projectId),
        );
        if (!response.ok) throw new Error();
        const result = (await response.json()) as {
          interview?: WhispererInterview;
        };
        if (result.interview) {
          if (result.interview.projectId !== projectId) throw new Error('Interview unavailable');
          applyInterview(result.interview);
        } else {
          await refresh();
        }
        setText('');
        setPendingReply(undefined);
        await saveAnswerDraft(owner, projectId, { id: request.id, text: '' }).catch(
          () => undefined,
        );
        draftWriteFailed.current = false;
        setDraftError(false);
        turnRequest.current = undefined;
      } catch {
        setSendError(true);
        setPendingReply(undefined);
      }
    }, 'send');
  };

  const answerReset = (answer: ReturnType<typeof parseResetReply>, restoreButtonFocus = false) => {
    if (!confirmReset || composerDisabled || actionInFlight.current) return;
    if (!answer) {
      setResetReplyUnclear(true);
      return;
    }
    setResetReplyUnclear(false);
    if (answer === 'no') {
      restoreResetFocus.current =
        restoreButtonFocus || !supportsReplyShortcut() ? 'header' : 'reply';
      setResetReply('');
      setConfirmReset(false);
      return;
    }
    void run(async () => {
      const response = await fetch(`${api}?projectId=${projectId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      await draftWrite.current;
      await Promise.allSettled([
        live.reset(),
        dictation.cancel(),
        saveAnswerDraft(owner, projectId, null),
      ]);
      activeConversation.current = false;
      refreshed.current += 1;
      forgetWhispererDraft(owner, draftId);
      onInterview(null);
    });
  };

  const assess = async () => {
    cancelLiveReadiness();
    const signal = AbortSignal.timeout(15_000);
    await liveAssessment.current;
    const assessed =
      (await assessReadiness(draftId, projectId, signal)) ||
      (await assessReadiness(draftId, projectId, signal));
    return { assessed, latest: await refresh(signal) };
  };

  const stopVoice = (focusReply: boolean) => {
    focusReplyAfterVoice.current = focusReply;
    cancelLiveReadiness();
    setError(false);
    setAdvanceUnavailable(false);
    const { turnId, cleanup } = live.cancel();
    const partialIds = new Set(activeVoicePartials.current);
    if (turnId) partialIds.add(turnId);
    activeVoicePartials.current.clear();
    setDiscardedVoiceTurns((previous) => new Set([...previous, ...partialIds]));
    setInterim((lines) =>
      Object.fromEntries(Object.entries(lines).filter(([id]) => !partialIds.has(id))),
    );
    const previousCancellation = voiceCancellation.current;
    const cancellation = Promise.all([previousCancellation, cleanup]).then(() => undefined);
    voiceCancellation.current = cancellation;
    void cancellation
      .then(async () => {
        if (voiceCancellation.current === cancellation) voiceCancellation.current = undefined;
        if (!activeConversation.current) return;
        const latest = await refresh();
        if (latest.readinessNeedsRefresh && !actionInFlight.current) await assess();
      })
      .catch(() => {
        if (voiceCancellation.current === cancellation) voiceCancellation.current = undefined;
        if (activeConversation.current) setError(true);
      });
  };

  const advance = (voice?: { callId: string; turnId: string }) => {
    if (actionInFlight.current || advanceBlocked) {
      if (voice) live.finishOutline(voice.callId, false);
      if (!actionInFlight.current) setAdvanceUnavailable(true);
      return;
    }
    void run(async () => {
      let accepted = false;
      try {
        await voiceCancellation.current;
        if ((activeVoice || voice) && !(await live.prepareOutline())) {
          setAdvanceUnavailable(true);
          return;
        }
        const { assessed, latest } = await assess();
        const savedVoiceAnswer =
          !voice ||
          latest.turns.some(
            (turn) =>
              turn.id === voice.turnId &&
              turn.role === 'user' &&
              turn.included &&
              turn.final &&
              !turn.interrupted &&
              turn.text.trim(),
          );
        if (
          !activeConversation.current ||
          !assessed ||
          latest.readinessNeedsRefresh ||
          latest.readiness.rubricVersion !== whispererRubricVersion ||
          !latest.readiness.ready ||
          latest.turns.some(isIncompleteAnswer) ||
          !savedVoiceAnswer ||
          (voice && !live.finishOutline(voice.callId, true))
        ) {
          setAdvanceUnavailable(true);
          return;
        }
        accepted = true;
        if (activeVoice || voice) await live.stop();
        onContinue({ draftId, projectId: latest.projectId, revision: latest.revision });
      } finally {
        if (!accepted) {
          live.resumeCapture();
          if (voice) live.finishOutline(voice.callId, false);
        }
      }
    });
  };

  useLayoutEffect(() => {
    requestVoiceAdvance.current = (event) => {
      if (!event.callId) return;
      if (!event.turnId) {
        live.finishOutline(event.callId, false);
        return;
      }
      advance({ callId: event.callId, turnId: event.turnId });
    };
  });

  const resolveIncompleteTurn = async (
    id: string,
    patch: { text: string } | { included: false },
  ) => {
    const response = await fetch(`${project}/turns/${id}`, jsonRequest('PATCH', patch));
    if (!response.ok) throw new Error();
    setRecoveryDraft(undefined);
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

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)_auto]">
      <ConversationHeader
        onClose={onClose}
        closeDisabled={busy}
        onReset={() => setConfirmReset(true)}
        resetDisabled={blocked || photoOpen || !draftLoaded}
        resetButton={resetButton}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-2 border-b border-[#193b54]/15 px-3 py-1 sm:gap-x-6 sm:px-7">
        <ul
          className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 sm:gap-x-4"
          aria-label={t('progress')}
        >
          {essentials.map((element) => {
            const status = usesCurrentRubric ? readiness.areas[element] : 'missing';
            return (
              <li
                key={element}
                className="flex items-center gap-1 text-xs font-medium sm:gap-1.5 sm:text-sm"
              >
                {status === 'ready' ? (
                  <LuCheck aria-hidden className="size-4 shrink-0 text-success" />
                ) : status === 'developing' ? (
                  <span aria-hidden className="relative size-4 shrink-0 text-[#965c00]">
                    <LuCircle className="size-full" />
                    <span className="absolute inset-y-[3px] left-[3px] w-[5px] rounded-l-full bg-current" />
                  </span>
                ) : (
                  <LuCircle aria-hidden className="size-4 shrink-0" />
                )}
                {t(element)}
                <span className="sr-only"> {t(status)}</span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn btn-primary btn-sm h-auto min-h-9 rounded-lg px-2 text-xs sm:px-3 sm:text-sm"
          disabled={advanceBlocked || !canCheckOutline || (!!incomplete.length && !activeVoice)}
          onClick={() => advance()}
        >
          {t('continue')}
        </button>
      </div>
      <div
        ref={thread}
        className="relative space-y-4 overflow-y-auto overscroll-contain px-4 py-6 sm:px-7"
        role="log"
        aria-label={t('conversation')}
      >
        <Bubble role="assistant" text={t('introQuestions')} />
        <Bubble role="assistant" text={t('introProgress')} />
        <Bubble
          role="assistant"
          text={t.rich('introInputs', {
            photo: (label) => <TipOption icon={LuPaperclip}>{label}</TipOption>,
            dictate: (label) => <TipOption icon={LuMic}>{label}</TipOption>,
            live: (label) => <TipOption icon={LuAudioLines}>{label}</TipOption>,
          })}
        />
        {!openingIsRecorded && <Bubble role="assistant" text={opening.question} />}
        {recordedTurns.map((turn) => (
          <Fragment key={turn.id}>
            <Bubble role={turn.role} text={turn.text} />
            {usesCurrentRubric &&
              readiness.firstReadyTurnId === turn.id &&
              essentials.every((area) => readiness.areas[area] === 'ready') && (
                <AssistantNotice>
                  <p>{t('readyNotice')}</p>
                </AssistantNotice>
              )}
          </Fragment>
        ))}
        {incomplete.map((turn) => (
          <div key={turn.id} className="my-2 rounded-xl border border-[#193b54]/15 bg-white p-3">
            <p>{t('unfinished')}</p>
            <div className="flex flex-wrap gap-2">
              {turn.recoverableAudio && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={blocked || photoOpen || live.saving !== 'saved'}
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch(`${project}/turns/${turn.id}/transcribe`, {
                        method: 'POST',
                      });
                      if (!response.ok) throw new Error();
                      await refresh();
                      await assess();
                    })
                  }
                >
                  {t('recoverDictation')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={blocked || photoOpen}
                onClick={() =>
                  setRecoveryDraft({ id: turn.id, text: turn.text || interim[turn.id]?.text || '' })
                }
              >
                {t('writeReply')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked || photoOpen}
                onClick={() =>
                  void run(async () => {
                    await resolveIncompleteTurn(turn.id, { included: false });
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
                  disabled={blocked || photoOpen}
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
        {pendingReply && (
          <>
            {!recordedTurns.some(({ id }) => id === pendingReply.id) && (
              <Bubble role="user" text={pendingReply.text} />
            )}
            <div className="flex justify-start">
              <div
                role="status"
                className="flex min-h-11 items-center rounded-2xl bg-white px-3.5 text-[#193b54]"
              >
                <span className="sr-only">{t('assistantResponding')}</span>
                <span aria-hidden className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                  <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse motion-safe:[animation-delay:150ms]" />
                  <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse motion-safe:[animation-delay:300ms]" />
                </span>
              </div>
            </div>
          </>
        )}
        {usesCurrentRubric &&
          readiness.hint &&
          lastTurn?.role === 'user' &&
          !activeVoice &&
          !pendingReply && (
            <AssistantNotice>
              <p role="status">{readiness.hint}</p>
            </AssistantNotice>
          )}
        {!!suggestions?.choices?.length && !activeVoice && !pendingReply && (
          <SuggestedReplies
            key={JSON.stringify([lastTurn?.id, suggestions.choices])}
            choices={suggestions.choices}
            mode={suggestions.choicesMode ?? 'button'}
            disabled={blocked || photoOpen || !!text.trim() || !draftLoaded}
            send={send}
          />
        )}
        {recoveryDraft && (
          <AssistantNotice>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (recoveryDraft.text.trim())
                  void run(() =>
                    resolveIncompleteTurn(recoveryDraft.id, { text: recoveryDraft.text.trim() }),
                  );
              }}
            >
              <label className="block text-sm">
                {t('writeReply')}
                <textarea
                  className="textarea textarea-bordered mt-1 w-full text-base"
                  rows={3}
                  value={recoveryDraft.text}
                  onChange={(event) =>
                    setRecoveryDraft({ ...recoveryDraft, text: event.target.value })
                  }
                  maxLength={40000}
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={busy || !recoveryDraft.text.trim()}
              >
                {t('saveReply')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => setRecoveryDraft(undefined)}
              >
                {t('cancel')}
              </button>
            </form>
          </AssistantNotice>
        )}
        {confirmDiscardVoice && (
          <AssistantNotice>
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
          </AssistantNotice>
        )}
        {photoOpen && (
          <AssistantNotice>
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
          </AssistantNotice>
        )}
        {confirmReset && (
          <AssistantNotice>
            <p id={resetQuestionId}>{t('resetConfirm')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-error btn-sm"
                disabled={composerDisabled}
                aria-describedby={resetQuestionId}
                onClick={() => answerReset('yes')}
              >
                {t('resetYes')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={composerDisabled}
                ref={resetNoButton}
                aria-describedby={resetQuestionId}
                onClick={() => answerReset('no', true)}
              >
                {t('resetNo')}
              </button>
            </div>
            {resetReplyUnclear && <p role="status">{t('resetClarify')}</p>}
          </AssistantNotice>
        )}
        {(busyAction === 'other' || dictation.state === 'transcribing') && (
          <AssistantStatus>{t('working')}</AssistantStatus>
        )}
        {activeVoice && (
          <AssistantStatus pulse={live.state !== 'speaking'}>{t(live.state)}</AssistantStatus>
        )}
        {recording && (
          <AssistantNotice>
            <p role="status">{t('recording')}</p>
          </AssistantNotice>
        )}
        {advanceUnavailable && (
          <AssistantNotice>
            <p role="status">{t('advanceUnavailable')}</p>
          </AssistantNotice>
        )}
        {(error || live.error || dictation.error) && (
          <AssistantNotice>
            <p role="alert" className="text-error">
              {t('error')}
            </p>
          </AssistantNotice>
        )}
        {draftError && !sendError && (
          <AssistantNotice>
            <p role="alert" className="text-error">
              {t('draftSaveFailed')}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={blocked || photoOpen}
              onClick={() => writeDraft(text)}
            >
              {t('retry')}
            </button>
          </AssistantNotice>
        )}
        {sendError && (
          <AssistantNotice>
            <p role="alert" className="text-error">
              {t('sendFailed')}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={blocked || photoOpen}
              onClick={() => send(text)}
            >
              {t('retry')}
            </button>
          </AssistantNotice>
        )}
        {voiceSyncFailed && (
          <AssistantNotice>
            <p role="status">{t(`saveStatus.${live.saving}`)}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked || photoOpen}
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
                className="btn btn-ghost btn-sm"
                disabled={blocked || photoOpen}
                onClick={() => setConfirmDiscardVoice(true)}
              >
                {t('discardDictation')}
              </button>
            </div>
          </AssistantNotice>
        )}
        {dictation.hasPending && dictation.state === 'idle' && (
          <AssistantNotice>
            <p role="status">{t('saveStatus.local')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={blocked || photoOpen}
                onClick={() => void dictation.retry()}
              >
                {t('recoverDictation')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={blocked || photoOpen}
                onClick={() => void run(dictation.cancel)}
              >
                {t('discardDictation')}
              </button>
            </div>
          </AssistantNotice>
        )}
        {composerOpen && !photoOpen && !confirmReset && inputContext && (
          <AssistantNotice>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={blocked}
              onClick={() =>
                void run(async () => {
                  const updated = await readInterview(
                    draftId,
                    jsonRequest('POST', { locale, ...inputContext }, projectId),
                  );
                  if (!updated || updated.projectId !== projectId) throw new Error();
                  applyInterview(updated);
                  await assess();
                })
              }
            >
              {t('useExisting')}
            </button>
          </AssistantNotice>
        )}
        {(inputsBlocked || visiblePhotos.length > availablePhotos) && (
          <AssistantNotice>
            <p>{t('reviewInputs')}</p>
          </AssistantNotice>
        )}
        {replyOverLimit && (
          <AssistantNotice>
            <output role="status">
              {composerText.length.toLocaleString(locale)} / {(40000).toLocaleString(locale)}
            </output>
          </AssistantNotice>
        )}
      </div>
      {composerOpen && (
        <div className="space-y-2 border-t border-[#193b54]/15 bg-[#fffaf2] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7">
          <form
            className="space-y-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (sendDisabled) return;
              if (confirmReset) {
                answerReset(parseResetReply(resetReply));
              } else {
                send(text);
              }
            }}
          >
            <div className="flex items-end gap-1.5 sm:gap-2">
              {!confirmReset && (
                <button
                  type="button"
                  className="btn btn-ghost size-11 min-h-0 shrink-0 rounded-xl px-0"
                  aria-label={t('attach')}
                  title={t('attach')}
                  disabled={blocked || photoOpen || !canAttach}
                  onClick={() => setPhotoOpen(true)}
                >
                  <LuPaperclip size={21} aria-hidden />
                </button>
              )}
              <div className="flex min-w-0 flex-1 items-end rounded-xl border border-[#193b54]/25 bg-white text-[#193b54] focus-within:border-[#193b54]">
                {activeVoice ? (
                  <button
                    type="button"
                    className="min-h-11 min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left text-base leading-[22px] disabled:opacity-50"
                    disabled={busy}
                    onClick={() => stopVoice(true)}
                  >
                    {t('switchToText')}
                  </button>
                ) : (
                  <textarea
                    ref={replyInput}
                    rows={1}
                    aria-label={t('reply')}
                    aria-describedby={confirmReset ? resetQuestionId : undefined}
                    placeholder={t('reply')}
                    value={composerText}
                    onChange={(event) => {
                      if (confirmReset) {
                        setResetReply(event.target.value);
                        setResetReplyUnclear(false);
                      } else {
                        writeDraft(event.target.value);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key !== 'Enter' ||
                        event.shiftKey ||
                        event.altKey ||
                        event.ctrlKey ||
                        event.metaKey ||
                        event.nativeEvent.isComposing ||
                        event.nativeEvent.keyCode === 229 ||
                        !supportsReplyShortcut()
                      ) {
                        return;
                      }
                      event.preventDefault();
                      if (!event.repeat && hasText && !sendDisabled) {
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={40000}
                    disabled={composerDisabled}
                    className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 pl-3 text-base leading-[22px] outline-none"
                  />
                )}
                {!confirmReset && (
                  <button
                    type="button"
                    className="btn btn-ghost size-11 min-h-0 shrink-0 rounded-xl px-0"
                    aria-label={recording ? t('stopDictation') : t('dictate')}
                    title={recording ? t('stopDictation') : t('dictate')}
                    disabled={
                      busy ||
                      photoOpen ||
                      activeVoice ||
                      dictation.state === 'starting' ||
                      dictation.state === 'transcribing' ||
                      (dictation.hasPending && !recording) ||
                      !draftLoaded
                    }
                    onClick={() => void (recording ? dictation.stop() : dictation.start())}
                  >
                    {recording ? (
                      <LuSquare size={18} aria-hidden />
                    ) : (
                      <LuMic size={21} aria-hidden />
                    )}
                  </button>
                )}
              </div>
              {!confirmReset && (
                <button
                  type="button"
                  className={`btn min-h-11 shrink-0 rounded-xl ${hasText ? 'btn-ghost size-11 px-0' : 'btn-primary gap-1.5 max-sm:size-11 max-sm:px-0 sm:px-3'} ${hasText && !activeVoice ? 'max-sm:hidden' : ''}`}
                  aria-label={voiceControlLabel}
                  title={voiceControlLabel}
                  disabled={busy || photoOpen || dictation.state !== 'idle'}
                  onClick={() => {
                    if (!activeVoice) {
                      activeVoicePartials.current.clear();
                      void live.start();
                      return;
                    }
                    stopVoice(false);
                  }}
                >
                  {activeVoice ? (
                    <LuPause size={20} aria-hidden />
                  ) : (
                    <LuAudioLines size={21} aria-hidden />
                  )}
                  {!hasText && (
                    <span className="hidden sm:inline">
                      {activeVoice ? t('pauseVoiceShort') : t('liveVoiceShort')}
                    </span>
                  )}
                </button>
              )}
              {(confirmReset || hasText) && (
                <div className={showReplyShortcut ? 'tooltip tooltip-top tooltip-end' : undefined}>
                  {showReplyShortcut && (
                    <div id={replyShortcutId} role="tooltip" className="tooltip-content">
                      {t('sendShortcut')}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary size-11 min-h-0 shrink-0 rounded-xl px-0"
                    aria-label={t('send')}
                    aria-describedby={showReplyShortcut ? replyShortcutId : undefined}
                    title={showReplyShortcut ? undefined : t('send')}
                    disabled={sendDisabled}
                  >
                    <LuSend aria-hidden size={18} />
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AssistantStatus({ children, pulse = true }: { children: string; pulse?: boolean }) {
  return (
    <AssistantNotice>
      <p role="status" className="flex items-center gap-2">
        {pulse && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-current motion-safe:animate-pulse"
          />
        )}
        {children}
      </p>
    </AssistantNotice>
  );
}

function AssistantNotice({ children }: { children: React.ReactNode }) {
  const t = useTranslations('StoryWhisperer');
  return (
    <div className="flex justify-start">
      <div className="min-w-0 max-w-[90%] space-y-2 rounded-2xl bg-white px-3.5 py-3 text-sm text-[#193b54] [overflow-wrap:anywhere]">
        <span className="sr-only">{t('title')}</span>
        {children}
      </div>
    </div>
  );
}

function TipOption({ icon: Icon, children }: { icon: IconType; children: React.ReactNode }) {
  return (
    <>
      <Icon className="inline size-4 align-text-bottom" aria-hidden />
      {'\u00a0'}
      {children}
    </>
  );
}

function Bubble({ role, text }: { role: LiveLine['role']; text: React.ReactNode }) {
  const t = useTranslations('StoryWhisperer');
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex min-w-0 max-w-[90%] items-center rounded-2xl ${role === 'user' ? 'bg-[#193b54] text-white' : 'bg-white text-[#193b54]'}`}
      >
        <span className="sr-only">{role === 'user' ? t('you') : t('title')}</span>
        <p className="min-w-0 px-3.5 py-3 whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</p>
      </div>
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
    <fieldset
      className="my-3 grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap"
      disabled={disabled}
    >
      <legend className="sr-only">{t('suggestions')}</legend>
      {choices.map((choice) =>
        mode === 'button' ? (
          <button
            type="button"
            key={choice}
            className="btn h-auto min-h-11 justify-start rounded-xl border-[#193b54]/25 bg-[#193b54]/[0.03] px-3 py-2 text-left font-medium whitespace-normal text-[#193b54] [overflow-wrap:anywhere] hover:bg-[#193b54]/10"
            onClick={() => send(choice)}
          >
            {choice}
          </button>
        ) : (
          <label
            key={choice}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-[#193b54]/25 px-3 py-2 text-sm [overflow-wrap:anywhere]"
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
