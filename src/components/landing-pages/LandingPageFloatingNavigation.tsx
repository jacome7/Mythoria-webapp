'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, BookOpen } from 'lucide-react';

const TOP_TARGET_ID = 'landing-page-top';
const HERO_TARGET_ID = 'landing-page-hero';
const EXAMPLES_TARGET_ID = 'exemplos';

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function focusTarget(target: HTMLElement) {
  target.focus({ preventScroll: true });
}

function scrollToTarget(target: HTMLElement) {
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
  focusTarget(target);
}

function scrollToPageTop(target: HTMLElement) {
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
  focusTarget(target);
}

function isSectionInView(target: HTMLElement | null) {
  if (!target) {
    return false;
  }

  const rect = target.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;

  return rect.top < viewportHeight * 0.72 && rect.bottom > viewportHeight * 0.18;
}

export default function LandingPageFloatingNavigation() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [showExamplesJump, setShowExamplesJump] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const updateVisibility = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const hero = document.getElementById(HERO_TARGET_ID);
      const examples = document.getElementById(EXAMPLES_TARGET_ID);
      const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;
      const heroIsNoLongerPrimary = heroBottom < viewportHeight * 0.72;

      setShowExamplesJump(heroIsNoLongerPrimary && !isSectionInView(examples));
      setShowBackToTop(scrollTop > viewportHeight);
    };

    const onScrollOrResize = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  const handleExamplesClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(EXAMPLES_TARGET_ID);

    if (!target) {
      return;
    }

    event.preventDefault();
    window.history.pushState(null, '', `#${EXAMPLES_TARGET_ID}`);
    scrollToTarget(target);
  };

  const handleBackToTopClick = () => {
    const target = document.getElementById(TOP_TARGET_ID);

    if (!target) {
      return;
    }

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    scrollToPageTop(target);
  };

  const controls = (
    <>
      <a
        href={`#${EXAMPLES_TARGET_ID}`}
        aria-label="Ver exemplos de livros"
        aria-hidden={!showExamplesJump}
        tabIndex={showExamplesJump ? undefined : -1}
        onClick={handleExamplesClick}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] right-3 z-[49] inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-primary/20 bg-white/95 px-4 py-2.5 text-sm font-bold text-[#33251c] shadow-lg shadow-primary/10 backdrop-blur transition duration-200 ease-out hover:border-primary/40 hover:bg-[#fff8ea] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff8ea] md:bottom-auto md:right-6 md:top-1/2 md:-translate-y-1/2 ${
          showExamplesJump
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-4 opacity-0 md:translate-x-6'
        }`}
      >
        <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>Ver exemplos</span>
      </a>

      <button
        type="button"
        aria-label="Voltar ao topo da página"
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? undefined : -1}
        onClick={handleBackToTopClick}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-3 z-[49] inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/20 bg-[#33251c] px-3.5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/15 transition duration-200 ease-out hover:bg-[#463628] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff8ea] md:right-6 ${
          showBackToTop
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <ArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Topo</span>
      </button>
    </>
  );

  return portalRoot ? createPortal(controls, portalRoot) : null;
}
