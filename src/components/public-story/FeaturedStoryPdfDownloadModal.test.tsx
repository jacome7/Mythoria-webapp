/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { FeaturedStoryPdfDownloadModal } from './FeaturedStoryPdfDownloadModal';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    key === 'description' ? `Veja os ficheiros finais de ${values?.title}` : key,
}));

describe('FeaturedStoryPdfDownloadModal', () => {
  it('offers both final PDFs and closes through the supported controls', () => {
    const onClose = jest.fn();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();

    const { unmount } = render(
      <FeaturedStoryPdfDownloadModal
        isOpen
        slug="historia-de-exemplo"
        storyTitle="História de Exemplo"
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('link', { name: /cover\.label/i })).toHaveAttribute(
      'href',
      '/api/p/historia-de-exemplo/pdf/cover',
    );
    expect(screen.getByRole('link', { name: /interior\.label/i })).toHaveAttribute(
      'href',
      '/api/p/historia-de-exemplo/pdf/interior',
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
