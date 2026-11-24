import { PageFlip } from './page-flip.js';

const book = document.querySelector('#book');
const controls = document.querySelector('#page-controls');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const position = document.querySelector('#position');
const specification = document.querySelector('#specification');
const specificationLink = document.querySelector('#specification-link');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const flip = new PageFlip(book, {
  size: 'stretch',
  width: 540,
  height: 540,
  minWidth: 300,
  maxWidth: 540,
  minHeight: 1,
  maxHeight: 540,
  // The separate opening occupies one slot, so the even/odd story pages share a spread.
  showCover: true,
  startPage: 1,
  flippingTime: 580,
  useMouseEvents: !reducedMotion.matches,
  showPageCorners: !reducedMotion.matches,
  mobileScrollSupport: true,
  maxShadowOpacity: 0.25,
});

function updateControls(state = flip.getState()) {
  const page = flip.getCurrentPageIndex();
  const landscape = flip.getOrientation() === 'landscape';
  const firstPage = page === 0;
  const busy = state === 'flipping' || state === 'user_fold';
  position.textContent = landscape && !firstPage ? 'Páginas 6 e 7' : `Página ${[2, 6, 7][page]}`;
  previous.setAttribute('aria-disabled', String(busy || firstPage));
  next.setAttribute('aria-disabled', String(busy || (!firstPage && (landscape || page === 2))));
  const showSpecification = firstPage && !busy;
  specification.inert = !showSpecification;
  specification.setAttribute('aria-hidden', String(!showSpecification));
  specificationLink.hidden = !showSpecification;
}

function turn(forward) {
  const button = forward ? next : previous;
  if (button.getAttribute('aria-disabled') === 'true' || flip.getState() === 'flipping') return;
  if (reducedMotion.matches) {
    const page = flip.getCurrentPageIndex();
    flip.turnToPage(page + (forward ? 1 : -1));
  } else if (forward) {
    flip.flipNext();
  } else {
    flip.flipPrev();
  }
}

flip.on('init', () => {
  updateControls();
  controls.hidden = false;
});
flip.on('flip', () => updateControls());
flip.on('changeOrientation', () => updateControls());
flip.on('changeState', ({ data }) => updateControls(data));
flip.loadFromHTML(book.querySelectorAll('.leaf'));

previous.addEventListener('click', () => turn(false));
next.addEventListener('click', () => turn(true));
controls.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  turn(event.key === 'ArrowRight');
});
