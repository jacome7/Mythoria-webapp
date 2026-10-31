import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import WizardActionBar from '@/components/WizardActionBar';
import { Link } from '@/i18n/routing';
import type { StoryTemplate } from '@/types/story-template';
import type { StoryTemplateJourney } from '@/lib/story-templates/journey';
import type { UploadedImage, UploadedAudio } from '@/hooks/useStep2Session';
import StoryTemplatePicker from '@/components/story-templates/StoryTemplatePicker';
import CharacterSelection from './CharacterSelection';
import styles from './Step2Page.module.css';

type Props = {
  journey: StoryTemplateJourney | null;
  templates: StoryTemplate[];
  catalogOpen: boolean;
  pendingTemplate: StoryTemplate | null;
  confirmFreeform: boolean;
  storyText: string;
  contribution: string;
  images: UploadedImage[];
  audio: UploadedAudio | null;
  selectedCharacterIds: string[];
  disabled: boolean;
  modalOpen: boolean;
  canContinue: boolean;
  onOpen: (type: 'text' | 'images' | 'audio') => void;
  onCharacters: (ids: string[]) => void;
  onCatalog: () => void;
  onBackCatalog: () => void;
  onChange: (journey: StoryTemplateJourney | null) => void;
  onPatch: (journey: StoryTemplateJourney | null) => void;
  onOwnIdea: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onConfirmOwn: () => void;
  onCancelOwn: () => void;
  onContinue: () => void;
  onPrevious: () => void;
};
export default function Step2Preview(p: Props) {
  const t = useTranslations('StorySteps.step2.guided');
  const [characterOpen, setCharacterOpen] = useState(false);
  const [confirmPendingAnswer, setConfirmPendingAnswer] = useState(false);
  const textLength = Array.from(p.storyText.trim()).length;
  const hasInput = !!p.storyText.trim() || p.images.length > 0 || !!p.audio;
  const durationSeconds = p.audio?.durationSeconds;
  const audioSummary =
    durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? t('status.audioSeconds', { seconds: Math.ceil(durationSeconds) })
      : t('status.audioAdded');
  type Status = { primary: string; secondary?: string };
  const mediaStatus = (type: 'images' | 'audio'): Status => {
    if (type === 'audio')
      return p.audio?.status === 'error'
        ? { primary: t('status.uploadFailed'), secondary: t('status.retryOrRemove') }
        : p.audio?.status === 'uploading'
          ? { primary: t('status.uploadingAudio') }
          : p.audio
            ? { primary: audioSummary, secondary: t('status.listenOrEdit') }
            : { primary: t('status.audioEmpty') };
    if (p.images.some((image) => image.status === 'error'))
      return { primary: t('status.imagesError'), secondary: t('status.retryOrRemove') };
    if (p.images.some((image) => image.status !== 'done'))
      return { primary: t('status.preparingImages') };
    return p.images.length
      ? {
          primary: t('status.imagesCount', { count: p.images.length }),
          secondary: t('status.viewOrEdit'),
        }
      : { primary: t('status.imagesEmpty') };
  };
  const textStatus = (): Status =>
    textLength === 0
      ? { primary: t('status.textEmpty') }
      : textLength < 500
        ? { primary: t('status.textShort'), secondary: t('status.addDetails') }
        : textLength < 1000
          ? { primary: t('status.textDeveloped'), secondary: t('status.edit') }
          : { primary: t('status.textDetailed'), secondary: t('status.edit') };
  const cards = [
    {
      type: 'text' as const,
      title: t('cards.write'),
      icon: 'Pencil.webp',
      hasContent: textLength > 0,
      description: textStatus(),
    },
    {
      type: 'images' as const,
      title: t('cards.addPhotos'),
      icon: 'camera.webp',
      hasContent: p.images.some((image) => image.status === 'done' && !!image.objectPath),
      description: mediaStatus('images'),
    },
    {
      type: 'audio' as const,
      title: t('cards.dictate'),
      icon: 'microphone.webp',
      hasContent: p.audio?.status === 'done' && !!p.audio.objectPath,
      description: mediaStatus('audio'),
    },
  ];
  const templateMode = !!p.journey?.templateId;
  const inputFields = (
    <>
      <div className={styles.previewRows}>
        {cards.map((card) => (
          <button
            type="button"
            key={card.type}
            className={`${styles.previewRow} ${card.hasContent ? styles.previewRowFilled : ''}`}
            disabled={p.disabled}
            onClick={() => p.onOpen(card.type)}
          >
            <Image src={`/Papercut_icons/${card.icon}`} alt="" width={72} height={72} />
            <span>
              <strong>{card.title}</strong>
              <span role="status">
                {card.hasContent ? (
                  <>
                    <b>{card.description.primary}</b>
                    {card.description.secondary && ` · ${card.description.secondary}`}
                  </>
                ) : (
                  [card.description.primary, card.description.secondary].filter(Boolean).join(' · ')
                )}
              </span>
            </span>
            <Image src="/Papercut_icons/select_button.webp" alt="" width={40} height={40} />
          </button>
        ))}
      </div>
      <div className={styles.previewCharacters}>
        <CharacterSelection
          initialSelectedIds={p.selectedCharacterIds}
          onChange={p.onCharacters}
          onModalChange={setCharacterOpen}
        />
      </div>
    </>
  );
  return (
    <section
      className={`${styles.preview} ${templateMode && !p.catalogOpen ? styles.templatePreview : ''}`}
    >
      <h1>
        {p.catalogOpen
          ? t('headings.chooseTemplate')
          : templateMode
            ? t('headings.personalize')
            : t('headings.howToStart')}
      </h1>
      {p.catalogOpen ? (
        <StoryTemplatePicker
          templates={p.templates}
          compactCatalog
          journey={null}
          onChange={p.onChange}
          onFreeform={p.onBackCatalog}
          contribution=""
          disabled={p.disabled}
        />
      ) : templateMode ? (
        <>
          <div className={styles.templateLayout}>
            <StoryTemplatePicker
              key={p.journey?.sessionId}
              templates={p.templates}
              journey={p.journey}
              onChange={p.onPatch}
              onFreeform={p.onOwnIdea}
              contribution={p.contribution}
              disabled={p.disabled}
              simplified
              needsMemoryContribution={!p.canContinue}
              externalImageCount={p.images.length}
            />
          </div>
          {(hasInput || p.selectedCharacterIds.length > 0) && (
            <details className={styles.existingContributions}>
              <summary>{t('existing.summary')}</summary>
              <p>{t('existing.body')}</p>
              {inputFields}
            </details>
          )}
        </>
      ) : (
        <>
          <h2>{t('ownIdea.title')}</h2>
          <p>{t('ownIdea.body')}</p>
          {inputFields}
          <p className={styles.previewDivider}>{t('ownIdea.divider')}</p>
          <button
            type="button"
            className={`${styles.previewRow} ${styles.templateEntry}`}
            onClick={p.onCatalog}
            disabled={p.disabled}
          >
            <Image src="/Papercut_icons/openBook.webp" alt="" width={72} height={72} />
            <span>
              <strong>{t('ownIdea.templateTitle')}</strong>
              <span>{t('ownIdea.templateBody')}</span>
            </span>
            <Image src="/Papercut_icons/select_button.webp" alt="" width={40} height={40} />
          </button>
        </>
      )}
      {p.pendingTemplate && (
        <ConfirmDialog label={t('confirmTemplate.title')} onCancel={p.onCancel}>
          <h2 id="replace-model-title">{t('confirmTemplate.title')}</h2>
          <p className={styles.confirmationModel}>
            <strong>«{p.pendingTemplate.title}»</strong>
          </p>
          <p>{t('confirmTemplate.body')}</p>
          <p className={styles.confirmationNote}>{t('confirmTemplate.note')}</p>
          <div className={styles.confirmationActions}>
            <button type="button" className="btn btn-outline" onClick={p.onCancel}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={p.disabled}
              onClick={p.onConfirm}
            >
              {t('confirmTemplate.confirm')}
            </button>
          </div>
        </ConfirmDialog>
      )}
      {p.confirmFreeform && (
        <ConfirmDialog label={t('confirmOwnIdea.title')} onCancel={p.onCancelOwn}>
          <h2 id="own-idea-title">{t('confirmOwnIdea.title')}</h2>
          <p>{t('confirmOwnIdea.body')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={p.onConfirmOwn}>
              {t('confirmOwnIdea.confirm')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={p.onCancelOwn}>
              {t('cancel')}
            </button>
          </div>
        </ConfirmDialog>
      )}
      {confirmPendingAnswer && (
        <ConfirmDialog
          label={t('pendingAnswer.title')}
          onCancel={() => setConfirmPendingAnswer(false)}
        >
          <h2>{t('pendingAnswer.title')}</h2>
          <p>{t('pendingAnswer.body')}</p>
          <div className={styles.confirmationActions}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setConfirmPendingAnswer(false)}
            >
              {t('pendingAnswer.back')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (p.journey) p.onPatch({ ...p.journey, answerDraft: undefined });
                setConfirmPendingAnswer(false);
                p.onContinue();
              }}
            >
              {t('pendingAnswer.continue')}
            </button>
          </div>
        </ConfirmDialog>
      )}
      {!p.modalOpen &&
        !characterOpen &&
        !p.pendingTemplate &&
        !p.confirmFreeform &&
        !confirmPendingAnswer && (
          <WizardActionBar preview>
            {p.catalogOpen ? (
              <button type="button" className="btn btn-primary" onClick={p.onBackCatalog}>
                {t('nav.previous')}
              </button>
            ) : templateMode ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={p.onOwnIdea}
                disabled={p.disabled}
              >
                {t('nav.previous')}
              </button>
            ) : (
              <Link
                className="btn btn-primary"
                href="/tell-your-story/step-1"
                onClick={p.onPrevious}
              >
                {t('nav.previous')}
              </Link>
            )}
            {(hasInput || templateMode) && !p.catalogOpen && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!p.canContinue}
                onClick={() => {
                  if (p.journey?.answerDraft?.photo || p.journey?.answerDraft?.text.trim())
                    setConfirmPendingAnswer(true);
                  else p.onContinue();
                }}
              >
                {t('nav.continue')}
              </button>
            )}
          </WizardActionBar>
        )}
    </section>
  );
}

export function ConfirmDialog({
  label,
  onCancel,
  children,
}: {
  label: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute('open', '');
    return () => {
      dialog?.close?.();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-label={label}
      className={styles.confirmDialog}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className={styles.confirmation}>{children}</div>
    </dialog>
  );
}
