import { render, screen } from '@testing-library/react';
import { WizardNavigation, usePreviousWizardPath } from './WizardNavigation';

let mockPath = '/tell-your-story/step-2';
jest.mock('@/i18n/routing', () => ({ usePathname: () => mockPath }));

function PreviousPath() {
  return <p>{usePreviousWizardPath() ?? 'fresh visit'}</p>;
}

it('tracks navigation inside the wizard and forgets it on a fresh visit', () => {
  const renderVisit = () => (
    <WizardNavigation>
      <PreviousPath />
    </WizardNavigation>
  );
  const view = render(renderVisit());
  expect(screen.getByText('fresh visit')).toBeVisible();
  mockPath = '/tell-your-story/step-3';
  view.rerender(renderVisit());
  expect(screen.getByText('/tell-your-story/step-2')).toBeVisible();
  mockPath = '/tell-your-story/step-2';
  view.rerender(renderVisit());
  expect(screen.getByText('/tell-your-story/step-3')).toBeVisible();
  view.unmount();
  render(renderVisit());
  expect(screen.getByText('fresh visit')).toBeVisible();
});
