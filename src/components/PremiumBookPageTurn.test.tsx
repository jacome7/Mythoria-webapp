import { fireEvent, render, screen } from '@testing-library/react';
import Image from 'next/image';
import Link from 'next/link';
import PremiumBookPageTurn, { PremiumBookPageFace } from './PremiumBookPageTurn';

function renderPage() {
  const onTurn = jest.fn();
  render(
    <PremiumBookPageTurn
      direction={1}
      facing={false}
      firstPage={1}
      placement="center"
      onTurn={onTurn}
    >
      <PremiumBookPageFace direction={1} side="single">
        <article>
          <Image src="/cover.png" alt="Cover artwork" width={100} height={100} draggable={false} />
          <p>Selectable text</p>
          <Link href="/invitation" prefetch={false}>
            Open invitation
          </Link>
        </article>
      </PremiumBookPageFace>
    </PremiumBookPageTurn>,
  );

  const surface = screen.getByRole('article').closest('[data-premium-page-surface]')!;
  jest.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ left: 20, width: 300 } as DOMRect);
  return { artwork: screen.getByRole('img'), onTurn };
}

function press(
  target: HTMLElement,
  pointerType: 'mouse' | 'touch' | 'pen',
  x: number,
  endX = x,
  endY = 40,
) {
  const pointer = { isPrimary: true, pointerId: 1, pointerType, button: 0 };
  fireEvent.pointerDown(target, { ...pointer, clientX: x, clientY: 40 });
  fireEvent.pointerUp(target, { ...pointer, clientX: endX, clientY: endY });
}

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
});

it('turns backward in the first third of the visible page and forward in the rest', () => {
  const { artwork, onTurn } = renderPage();
  press(artwork, 'mouse', 119);
  press(artwork, 'touch', 120);
  press(artwork, 'mouse', 305);

  expect(onTurn.mock.calls).toEqual([[-1], [1], [1]]);
});

it('turns once per horizontal artwork swipe and preserves vertical scroll and text selection', () => {
  const { artwork, onTurn } = renderPage();
  press(artwork, 'touch', 250, 65);
  press(artwork, 'mouse', 60, 195);
  press(artwork, 'pen', 250, 65);
  press(artwork, 'touch', 230, 160, 170);
  press(screen.getByText('Selectable text'), 'mouse', 180, 65);
  press(screen.getByRole('link', { name: 'Open invitation' }), 'touch', 220);

  expect(onTurn.mock.calls).toEqual([[1], [-1], [1]]);
});
