'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface ModalPortalProps {
  children: ReactNode;
}

/**
 * Renders full-screen overlays (modals, dialogs) directly under `document.body`.
 *
 * The locale layout wraps page content in an isolated `<main>` stacking context that is
 * painted *before* the footer (and below the sticky header). A `fixed z-50` modal rendered
 * inline therefore ends up underneath those siblings. Portaling to `document.body` makes the
 * modal's `z-index` compete in the root stacking context, so it always sits above the
 * header, footer and page content.
 */
export default function ModalPortal({ children }: ModalPortalProps) {
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!isClient) {
    return null;
  }

  return createPortal(children, document.body);
}
