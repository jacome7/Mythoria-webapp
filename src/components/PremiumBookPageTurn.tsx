'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
  type Variants,
} from 'motion/react';

export type PageTurnDirection = -1 | 1;
type PageSide = 'left' | 'right' | 'single';
type Placement = 'spread' | 'left' | 'right' | 'center';

const placementClasses: Record<Placement, string> = {
  spread: 'md:grid-cols-2',
  left: 'md:w-1/2 md:justify-self-start',
  right: 'md:w-1/2 md:justify-self-end',
  center: 'md:w-1/2 md:justify-self-center',
};

const interactive =
  'a, button, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]';

function canTurnFrom(target: EventTarget): target is Element {
  return target instanceof Element && !target.closest(interactive);
}

function PageFrame({ children, placement }: { children: ReactNode; placement: Placement }) {
  const present = useIsPresent();

  return (
    <div
      aria-hidden={present ? undefined : true}
      inert={!present}
      data-premium-page-surface={present ? '' : undefined}
      className={`relative col-start-1 row-start-1 grid w-full grid-cols-1 items-start [transform-style:preserve-3d] ${placementClasses[placement]} ${present ? 'z-0' : 'pointer-events-none z-10'}`}
    >
      {children}
    </div>
  );
}

export function PremiumBookPageFace({
  children,
  direction,
  side,
}: {
  children: ReactNode;
  direction: PageTurnDirection;
  side: PageSide;
}) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <div>{children}</div>;

  const turns = (turn: PageTurnDirection, entering: boolean) =>
    side === 'single' || side === (turn === (entering ? 1 : -1) ? 'left' : 'right');
  const hinge = (turn: PageTurnDirection, entering: boolean) =>
    side === 'single' ? Number(turn === (entering ? 1 : -1)) : Number(side === 'left');
  const variants: Variants = {
    folded: (turn: PageTurnDirection) => ({
      rotateY: turns(turn, true) ? 87 * turn : 0,
      originX: hinge(turn, true),
      opacity: turns(turn, true) ? 0 : 0.8,
    }),
    open: (turn: PageTurnDirection) => ({
      rotateY: 0,
      opacity: 1,
      transition: {
        rotateY: { duration: 0.35, delay: 0.13, ease: [0.17, 0.68, 0.25, 1] },
        opacity: { duration: 0.16, delay: turns(turn, true) ? 0.13 : 0 },
      },
    }),
    closing: (turn: PageTurnDirection) => ({
      rotateY: turns(turn, false) ? -87 * turn : 0,
      originX: hinge(turn, false),
      opacity: 0,
      transition: {
        originX: { duration: 0 },
        rotateY: { duration: 0.27, ease: [0.51, 0.04, 0.83, 0.49] },
        opacity: { duration: 0.14, delay: turns(turn, false) ? 0.12 : 0 },
      },
    }),
  };
  const shadowVariants: Variants = {
    folded: (turn: PageTurnDirection) => ({ opacity: turns(turn, true) ? 0.66 : 0 }),
    open: { opacity: 0, transition: { delay: 0.13, duration: 0.35, ease: 'easeOut' } },
    closing: (turn: PageTurnDirection) => ({
      opacity: turns(turn, false) ? 0.66 : 0,
      transition: { duration: 0.27, ease: 'easeIn' },
    }),
  };

  return (
    <motion.div
      custom={direction}
      initial="folded"
      animate="open"
      exit="closing"
      variants={variants}
      className="relative [backface-visibility:hidden]"
    >
      {children}
      <motion.div
        aria-hidden="true"
        custom={direction}
        variants={shadowVariants}
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to ${side === 'left' ? 'left' : 'right'}, #302117a6, #30211722 65%, #fff4dc66)`,
        }}
      />
    </motion.div>
  );
}

export default function PremiumBookPageTurn({
  children,
  direction,
  facing,
  firstPage,
  placement,
  onTurn,
}: {
  children: ReactNode;
  direction: PageTurnDirection;
  facing: boolean;
  firstPage: number;
  placement: Placement;
  onTurn: (direction: PageTurnDirection) => void;
}) {
  const reducedMotion = useReducedMotion();
  const press = useRef<{
    id: number;
    x: number;
    y: number;
    surface: Element;
    canSwipe: boolean;
  } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    if (
      event.defaultPrevented ||
      !canTurnFrom(event.target) ||
      !event.currentTarget.contains(event.target)
    ) {
      press.current = null;
      return;
    }
    const surface = event.target.closest('[data-premium-page-surface]');
    press.current = surface
      ? {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          surface,
          canSwipe: event.pointerType === 'touch' || Boolean(event.target.closest('img')),
        }
      : null;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    press.current = null;
    if (
      event.defaultPrevented ||
      !canTurnFrom(event.target) ||
      window.getSelection()?.isCollapsed === false
    ) {
      return;
    }
    if (event.target.closest('[data-premium-page-surface]') !== start.surface) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (start.canSwipe && Math.abs(dx) >= 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
      onTurn(dx > 0 ? -1 : 1);
      return;
    }
    if (Math.hypot(dx, dy) > 10) return;
    const { left, width } = start.surface.getBoundingClientRect();
    if (width > 0) onTurn(event.clientX < left + width / 3 ? -1 : 1);
  };

  const frame = (
    <PageFrame key={firstPage} placement={placement}>
      {children}
    </PageFrame>
  );

  return (
    <div
      className="relative isolate mx-auto grid w-full touch-pan-y touch-pinch-zoom overflow-x-clip [perspective:1300px] md:max-w-[max(100rem,200svh)]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={(event) => {
        if (event.pointerId === press.current?.id) press.current = null;
      }}
    >
      {reducedMotion ? (
        frame
      ) : (
        <AnimatePresence key={Number(facing)} initial={false} custom={direction}>
          {frame}
        </AnimatePresence>
      )}
    </div>
  );
}
