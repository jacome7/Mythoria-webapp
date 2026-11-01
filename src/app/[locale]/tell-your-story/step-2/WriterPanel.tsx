'use client';
import { useRef, type ReactNode } from 'react';
import styles from './WritingModal.module.css';

export default function WriterPanel({
  label,
  closeLabel,
  children,
  onClose,
}: {
  label: string;
  closeLabel: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  const panel = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={styles.disclosure}
        aria-haspopup="dialog"
        onClick={() => panel.current?.showModal()}
      >
        {label}
        <span aria-hidden="true">›</span>
      </button>
      <dialog ref={panel} className={styles.sheet} aria-label={label} onClose={onClose}>
        <div className={styles.sheetHeader}>
          <h3>{label}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-circle shrink-0"
            aria-label={closeLabel}
            onClick={() => panel.current?.close()}
          >
            ✕
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
      </dialog>
    </>
  );
}
