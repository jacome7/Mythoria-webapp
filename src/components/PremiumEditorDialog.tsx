'use client';

import { useCallback, type ReactNode } from 'react';

export default function PremiumEditorDialog({
  children,
  labelId,
  onDismiss,
}: {
  children: ReactNode;
  labelId: string;
  onDismiss: () => void;
}) {
  const openDialog = useCallback((dialog: HTMLDialogElement | null) => {
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={openDialog}
      aria-labelledby={labelId}
      className="m-auto max-h-none w-[calc(100%-1rem)] max-w-4xl overflow-visible rounded-xl bg-transparent p-0 backdrop:bg-black/50 sm:w-[calc(100%-2rem)]"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      {children}
    </dialog>
  );
}
