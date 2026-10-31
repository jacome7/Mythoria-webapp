import { act, render, screen, waitFor } from '@testing-library/react';
import WizardActionBar from './WizardActionBar';

it('portals one mobile action bar, reserves space, and hides it for an open modal', async () => {
  const previous = window.matchMedia;
  window.matchMedia = jest.fn().mockReturnValue({
    matches: true,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
  const { container, unmount } = render(
    <WizardActionBar>
      <button>Continue</button>
    </WizardActionBar>,
  );
  expect(container.querySelector('button')).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Continue' })).toHaveLength(1);
  expect(container.firstElementChild).toHaveStyle({ height: '72px' });
  const modal = document.createElement('dialog');
  modal.setAttribute('open', '');
  modal.getClientRects = jest.fn().mockReturnValue([{}]);
  act(() => {
    document.body.append(modal);
  });
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument(),
  );
  act(() => {
    modal.remove();
  });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeVisible());
  unmount();
  window.matchMedia = previous;
});

it('keeps actions above the visual viewport keyboard area', () => {
  const previous = window.matchMedia;
  const descriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  window.matchMedia = jest.fn().mockReturnValue({
    matches: true,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
  const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  const { unmount } = render(
    <WizardActionBar>
      <button>Continue</button>
    </WizardActionBar>,
  );
  viewport.height -= 280;
  act(() => {
    viewport.dispatchEvent(new Event('resize'));
  });
  expect(screen.getByRole('button').parentElement).toHaveStyle({ bottom: '280px' });
  viewport.height = window.innerHeight;
  act(() => {
    viewport.dispatchEvent(new Event('resize'));
  });
  expect(screen.getByRole('button').parentElement).toHaveStyle({ bottom: '0px' });
  unmount();
  window.matchMedia = previous;
  if (descriptor) Object.defineProperty(window, 'visualViewport', descriptor);
  else Reflect.deleteProperty(window, 'visualViewport');
});
