/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import LandingPageBookShowcase from './LandingPageBookShowcase';
import type { LandingPageBook } from '@/content/landing-pages';

const trackEventMock = jest.fn();

jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

const book: LandingPageBook = {
  id: 'romance-book-01',
  slug: 'ines-e-diogo-um-amor-inesperado',
  title: 'Inês & Diogo — Um Amor Inesperado',
  synopsis: 'Um encontro à chuva.',
  excerpt: 'A chuva chegou primeiro.',
  imageSrc: '/test/feature.jpeg',
  imageAlt: 'Livro de exemplo',
  styleLabel: 'Aguarela',
  contextLabel: 'Primeiro encontro',
  fictionalLabel: 'Exemplo ficcional',
  audioSampleSrc: '/test/audio.mp3',
  sampleChapter: {
    title: 'Três Minutos de Chuva',
    imageSrc: '/test/chapter.jpeg',
    imageAlt: 'Cena à chuva',
    paragraphs: ['Primeiro parágrafo.', 'Segundo parágrafo.'],
  },
};

describe('LandingPageBookShowcase analytics', () => {
  beforeEach(() => trackEventMock.mockClear());

  it('tracks chapter opening and one start/completion pair without personal story data', () => {
    const { container } = render(
      <LandingPageBookShowcase
        books={[book]}
        landingSlug="livro-personalizado-para-casais"
        locale="pt-PT"
        primaryIntent="romance"
      />,
    );

    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    fireEvent.play(audio as HTMLAudioElement);
    fireEvent.play(audio as HTMLAudioElement);
    fireEvent.ended(audio as HTMLAudioElement);

    fireEvent.click(screen.getByRole('button', { name: 'Ler capítulo e ver imagem' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const safeContext = {
      landing_slug: 'livro-personalizado-para-casais',
      sample_book_slug: 'ines-e-diogo-um-amor-inesperado',
      locale: 'pt-PT',
      primary_intent: 'romance',
    };
    expect(trackEventMock).toHaveBeenCalledWith('sample_audio_start', safeContext);
    expect(trackEventMock).toHaveBeenCalledWith('sample_audio_complete', safeContext);
    expect(trackEventMock).toHaveBeenCalledWith('sample_chapter_open', safeContext);
    expect(
      trackEventMock.mock.calls.filter(([event]) => event === 'sample_audio_start'),
    ).toHaveLength(1);
    expect(JSON.stringify(trackEventMock.mock.calls)).not.toContain(book.title);
  });
});
