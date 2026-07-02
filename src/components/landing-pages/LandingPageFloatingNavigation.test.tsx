import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LandingPageFloatingNavigation from './LandingPageFloatingNavigation';

const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
const scrollIntoViewMock = jest.fn();
const scrollToMock = jest.fn();

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
  });
}

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 0,
    x: 0,
    y: top,
    width: 0,
    height: bottom - top,
    toJSON: () => ({}),
  };
}

function buildLandingPageTargets() {
  document.body.innerHTML = `
    <main id="landing-page-top" tabindex="-1">
      <section id="landing-page-hero"></section>
      <section id="exemplos" tabindex="-1"></section>
    </main>
  `;

  const top = document.getElementById('landing-page-top');
  const hero = document.getElementById('landing-page-hero');
  const examples = document.getElementById('exemplos');

  if (!top || !hero || !examples) {
    throw new Error('Expected landing page test targets to exist.');
  }

  return { top, hero, examples };
}

function getExamplesJump() {
  const link = document.querySelector<HTMLAnchorElement>('a[href="#exemplos"]');

  if (!link) {
    throw new Error('Expected examples jump link to exist.');
  }

  return link;
}

function getBackToTopButton() {
  const button = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Voltar ao topo da página"]',
  );

  if (!button) {
    throw new Error('Expected back-to-top button to exist.');
  }

  return button;
}

describe('LandingPageFloatingNavigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
    });
    window.history.replaceState(null, '', '/pt-PT/lp/livro-personalizado-avos-netos');
    setScrollY(0);
    scrollIntoViewMock.mockClear();
    scrollToMock.mockClear();
  });

  afterEach(() => {
    if (originalScrollY) {
      Object.defineProperty(window, 'scrollY', originalScrollY);
    }
  });

  it('renders accessible quick navigation controls', () => {
    buildLandingPageTargets();

    render(<LandingPageFloatingNavigation />);

    expect(getExamplesJump()).toHaveTextContent('Ver exemplos');
    expect(getBackToTopButton()).toHaveTextContent('Topo');
  });

  it('shows controls after the hero and hides the examples jump while examples are visible', async () => {
    const { hero, examples } = buildLandingPageTargets();
    hero.getBoundingClientRect = jest.fn(() => rect(0, 900));
    examples.getBoundingClientRect = jest.fn(() => rect(1300, 2200));

    render(<LandingPageFloatingNavigation />);

    const examplesLink = getExamplesJump();
    const topButton = getBackToTopButton();

    expect(examplesLink).toHaveAttribute('aria-hidden', 'true');
    expect(topButton).toHaveAttribute('aria-hidden', 'true');

    hero.getBoundingClientRect = jest.fn(() => rect(-700, 100));
    setScrollY(900);
    fireEvent.scroll(window);

    await waitFor(() => expect(examplesLink).toHaveAttribute('aria-hidden', 'false'));
    expect(topButton).toHaveAttribute('aria-hidden', 'false');

    examples.getBoundingClientRect = jest.fn(() => rect(100, 900));
    fireEvent.scroll(window);

    await waitFor(() => expect(examplesLink).toHaveAttribute('aria-hidden', 'true'));
  });

  it('scrolls and focuses the examples section from the examples jump', async () => {
    const { hero, examples } = buildLandingPageTargets();
    hero.getBoundingClientRect = jest.fn(() => rect(-700, 100));
    examples.getBoundingClientRect = jest.fn(() => rect(1300, 2200));
    setScrollY(900);

    render(<LandingPageFloatingNavigation />);

    const examplesLink = screen.getByRole('link', { name: /ver exemplos de livros/i });
    await waitFor(() => expect(examplesLink).toHaveAttribute('aria-hidden', 'false'));

    fireEvent.click(examplesLink);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(document.activeElement).toBe(examples);
    expect(window.location.hash).toBe('#exemplos');
  });

  it('scrolls and focuses the page top from the top button', async () => {
    const { top, hero, examples } = buildLandingPageTargets();
    hero.getBoundingClientRect = jest.fn(() => rect(-700, 100));
    examples.getBoundingClientRect = jest.fn(() => rect(1300, 2200));
    setScrollY(900);
    window.history.replaceState(null, '', '/pt-PT/lp/livro-personalizado-avos-netos#exemplos');

    render(<LandingPageFloatingNavigation />);

    const topButton = screen.getByRole('button', { name: /voltar ao topo da página/i });
    await waitFor(() => expect(topButton).toHaveAttribute('aria-hidden', 'false'));

    fireEvent.click(topButton);

    expect(scrollToMock).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(top);
    expect(window.location.hash).toBe('');
  });
});
