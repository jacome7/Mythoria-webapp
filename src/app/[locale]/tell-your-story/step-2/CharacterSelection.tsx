'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import styles from './CharacterSelection.module.css';

interface Character {
  characterId?: string;
  name: string;
  type: string;
  role?: string;
  photoUrl?: string;
}

interface Props {
  onChange?: (ids: string[]) => void;
  characters?: Character[];
  isLoading?: boolean;
  triggerLabel?: string;
  triggerVariant?: 'card' | 'button';
  title?: string;
  clearSelectionOnDone?: boolean;
  onDone?: (ids: string[], characters: Character[]) => void | Promise<void>;
}

const CHARACTER_ICON_TYPES = [
  'boy',
  'girl',
  'man',
  'woman',
  'person',
  'dog',
  'cat',
  'bird',
  'other_animal',
  'elf_fairy_mythical',
  'robot_cyborg',
  'alien_extraterrestrial',
  'other_creature',
  'other',
];

const getCharacterIconPath = (type: string | undefined): string => {
  const normalizedType = type?.trim().toLowerCase();
  if (!normalizedType || !CHARACTER_ICON_TYPES.includes(normalizedType)) {
    return '/CharacterIcons/other.webp';
  }

  return `/CharacterIcons/${normalizedType}.webp`;
};

export default function CharacterSelection({
  onChange,
  characters,
  isLoading: controlledIsLoading,
  triggerLabel,
  triggerVariant = 'card',
  title,
  clearSelectionOnDone = false,
  onDone,
}: Props) {
  const t = useTranslations('StorySteps.step2');
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const suppressNextOpenRef = useRef(false);
  const displayCharacters = characters ?? existingCharacters;
  const modalTitle = title ?? t('characterSelection.includeCharactersTitle');
  const isSelected = (character: Character) =>
    Boolean(character.characterId && selectedIds.includes(character.characterId));

  useEffect(() => {
    if (characters) return;

    const fetchCharacters = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/characters');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.characters) {
            setExistingCharacters(data.characters);
          }
        }
      } catch (error) {
        console.error('Error fetching existing characters:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCharacters();
  }, [characters]);

  const toggle = (id: string) => {
    // Do not call onChange inside the state updater (runs during render) – causes React warning
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openModal = () => {
    if (suppressNextOpenRef.current) return;
    setIsModalOpen(true);
  };

  const closeModal = () => {
    suppressNextOpenRef.current = true;
    setIsModalOpen(false);
    window.setTimeout(() => {
      suppressNextOpenRef.current = false;
    }, 0);
  };

  // Notify parent of selection changes after render commit (safe side-effect phase)
  useEffect(() => {
    onChange?.(selectedIds);
  }, [selectedIds, onChange]);

  const handleDone = async () => {
    try {
      setIsSubmitting(true);
      await onDone?.(
        selectedIds,
        displayCharacters.filter(
          (character) => character.characterId && selectedIds.includes(character.characterId),
        ),
      );
      closeModal();
      if (clearSelectionOnDone) {
        setSelectedIds([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (controlledIsLoading || isLoading || displayCharacters.length === 0) {
    return null;
  }

  return (
    <>
      {triggerVariant === 'card' ? (
        <button type="button" className={styles.closedCard} onClick={openModal}>
          <span className={styles.closedIconWrap} aria-hidden="true">
            <Image
              src="/Papercut_icons/characters.webp"
              alt=""
              width={120}
              height={96}
              className={styles.closedIcon}
            />
          </span>
          <span className={styles.closedCopy}>
            <span className={styles.closedTitle}>{triggerLabel ?? modalTitle}</span>
            {selectedIds.length > 0 && (
              <span className={styles.closedStatus}>
                {t('characterSelection.selectedCount', { count: selectedIds.length })}
              </span>
            )}
          </span>
        </button>
      ) : (
        <button type="button" className="btn btn-outline btn-lg w-full" onClick={openModal}>
          {triggerLabel ?? modalTitle}
        </button>
      )}

      {isModalOpen &&
        createPortal(
          <div
            className={`modal modal-open ${styles.modalBackdrop}`}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalBox}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>{modalTitle}</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeModal();
                  }}
                  aria-label="Close"
                >
                  X
                </button>
              </div>

              <div className={styles.characterGrid}>
                {displayCharacters.map((character) => (
                  <button
                    type="button"
                    key={character.characterId ?? character.name}
                    className={`${styles.characterOption} ${
                      isSelected(character) ? styles.characterOptionSelected : ''
                    }`}
                    onClick={() => {
                      if (character.characterId) toggle(character.characterId);
                    }}
                    aria-pressed={isSelected(character)}
                  >
                    <span className={styles.characterAvatar}>
                      <Image
                        src={character.photoUrl || getCharacterIconPath(character.type)}
                        alt=""
                        width={72}
                        height={72}
                        className={
                          character.photoUrl ? styles.characterPhoto : styles.characterFallback
                        }
                      />
                    </span>
                    <span className={styles.characterName}>{character.name}</span>
                  </button>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  onClick={async (event) => {
                    event.stopPropagation();
                    await handleDone();
                  }}
                >
                  {t('actions.done')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
