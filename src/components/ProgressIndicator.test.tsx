import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import ProgressIndicator from './ProgressIndicator';
import pt from '@/messages/pt-PT/StorySteps.json';
import en from '@/messages/en-US/StorySteps.json';
import de from '@/messages/de-DE/StorySteps.json';
import es from '@/messages/es-ES/StorySteps.json';
import fr from '@/messages/fr-FR/StorySteps.json';

let mockProgress = '';
jest.mock('next-intl', () => ({
  useTranslations: () => ({
    rich: (
      _key: string,
      values: { currentStep: number; totalSteps: number; current: (text: string) => ReactNode },
    ) => {
      const [before, rest] = mockProgress.split('<current>{currentStep}</current>');
      return (
        <>
          {before}
          {values.current(String(values.currentStep))}
          {rest.replace('{totalSteps}', String(values.totalSteps))}
        </>
      );
    },
  }),
}));
it.each([
  ['pt-PT', pt],
  ['en-US', en],
  ['de-DE', de],
  ['es-ES', es],
  ['fr-FR', fr],
] as const)('emphasizes only the current step in %s', (_locale, messages) => {
  mockProgress = messages.StorySteps.common.stepProgress;
  render(<ProgressIndicator currentStep={2} totalSteps={5} />);
  const current = screen.getByText('2', { selector: 'strong' });
  expect(current.parentElement).toHaveTextContent(/2.*5/);
  expect(current.parentElement?.querySelectorAll('strong')).toHaveLength(1);
});
