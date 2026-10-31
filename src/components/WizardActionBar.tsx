'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './WizardActionBar.module.css';

const subscribe = (callback: () => void) => {
  if (!window.matchMedia) return () => {};
  const query = window.matchMedia('(max-width: 768px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const mobileSnapshot = () => !!window.matchMedia?.('(max-width: 768px)').matches;
const serverSnapshot = () => false;

/** A single set of actions, portaled on mobile to escape card stacking contexts. */
export default function WizardActionBar({
  children,
  preview = false,
}: {
  children: ReactNode;
  preview?: boolean;
}) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, serverSnapshot);
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(72);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!mobile) return;
    const check = () =>
      setModalOpen(
        Array.from(
          document.querySelectorAll('dialog[open], .modal-open, [aria-modal="true"]'),
        ).some(
          (element) =>
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== 'hidden',
        ),
      );
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open', 'class', 'hidden', 'aria-modal'],
    });
    return () => observer.disconnect();
  }, [mobile]);

  useEffect(() => {
    const bar = ref.current;
    if (!mobile || !bar) return;
    const update = () => {
      const viewport = window.visualViewport;
      bar.style.bottom = `${viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0}px`;
      const measured = bar.getBoundingClientRect().height;
      if (measured) setHeight(measured);
      const focused = document.activeElement;
      if (
        !modalOpen &&
        focused instanceof HTMLElement &&
        focused.matches('input, textarea, select')
      ) {
        const bounds = focused.getBoundingClientRect();
        if (bounds.bottom > bar.getBoundingClientRect().top || bounds.top < 60) {
          focused.scrollIntoView?.({ block: 'center', behavior: 'instant' });
        }
      }
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(bar);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    return () => {
      observer?.disconnect();
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
    };
  }, [mobile, modalOpen]);

  const bar = (
    <div
      ref={ref}
      data-wizard-actions
      className={`${styles.bar} ${preview ? styles.preview : ''}`}
      hidden={mobile && modalOpen}
    >
      {children}
    </div>
  );
  return mobile ? (
    <>
      <div aria-hidden="true" style={{ height }} />
      {createPortal(bar, document.body)}
    </>
  ) : (
    bar
  );
}
