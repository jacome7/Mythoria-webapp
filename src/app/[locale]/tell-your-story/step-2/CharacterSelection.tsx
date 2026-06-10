'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import styles from './CharacterSelection.module.css';

interface Character {
  characterId: string;
  name: string;
  type?: string;
  role?: string;
  photoUrl?: string | null;
}

interface Props {
  onChange: (ids: string[]) => void;
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
    return '/CharacterIcons/other.png';
  }

  return `/CharacterIcons/${normalizedType}.png`;
};

export default function CharacterSelection({ onChange }: Props) {
  const t = useTranslations('StorySteps.step2');
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const suppressNextOpenRef = useRef(false);

  useEffect(() => {
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
  }, []);

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
    onChange(selectedIds);
  }, [selectedIds, onChange]);

  if (isLoading || existingCharacters.length === 0) {
    return null;
  }

  return (
    <>
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
          <span className={styles.closedTitle}>
            {t('characterSelection.includeCharactersTitle')}
          </span>
          {selectedIds.length > 0 && (
            <span className={styles.closedStatus}>
              {t('characterSelection.selectedCount', { count: selectedIds.length })}
            </span>
          )}
        </span>
      </button>

      {isModalOpen &&
        createPortal(
          <div
            className={`modal modal-open ${styles.modalBackdrop}`}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalBox}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {t('characterSelection.includeCharactersTitle')}
                </h3>
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
                {existingCharacters.map((character) => (
                  <button
                    type="button"
                    key={character.characterId}
                    className={`${styles.characterOption} ${
                      selectedIds.includes(character.characterId)
                        ? styles.characterOptionSelected
                        : ''
                    }`}
                    onClick={() => toggle(character.characterId)}
                    aria-pressed={selectedIds.includes(character.characterId)}
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
                  onClick={(event) => {
                    event.stopPropagation();
                    closeModal();
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
