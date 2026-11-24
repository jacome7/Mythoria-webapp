/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import LandingPageBookShowcase from './LandingPageBookShowcase';
import type { LandingPageBook } from '@/content/landing-pages';

const trackEventMock = jest.fn();

const trackOpenAiAdsEventMock = jest.fn();

jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => trackOpenAiAdsEventMock(...args),
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
  audioSampleSrc: '/test/audio.mp3',
  audioSampleTranscript: 'A chuva chegou primeiro e os dois ficaram debaixo do toldo.',
  audioTranscriptLabel: 'Ler transcrição',
  sampleChapter: {
    title: 'Três Minutos de Chuva',
    imageSrc: '/test/chapter.jpeg',
    imageAlt: 'Cena à chuva',
    paragraphs: ['Primeiro parágrafo.', 'Segundo parágrafo.'],
  },
};

describe('LandingPageBookShowcase analytics', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    trackOpenAiAdsEventMock.mockClear();
  });

  it('opens a full PDF directly and tracks a book read without reporting a chapter preview', () => {
    const pdf = { href: '/seasonal-books/ines/pt-PT/leitura.pdf', label: 'Ler o livro completo' };
    render(
      <LandingPageBookShowcase
        books={[{ ...book, sampleChapter: undefined, fullBookPdf: pdf }]}
        landingSlug="prendas-de-natal-para-criancas"
        locale="pt-PT"
        primaryIntent="kids_adventures"
        labels={{
          chapters: 'Capítulos',
          listen: 'Ouvir',
          readWithImage: 'Ler e ver imagem',
          readSample: 'Ler capítulo de amostra',
          sampleChapter: 'Capítulo de amostra',
          closeSample: 'Fechar',
        }}
      />,
    );
    const link = screen.getByRole('link', { name: pdf.label });
    expect(link).toHaveAttribute('href', pdf.href);
    expect(link).toHaveAttribute('data-cta-placement', 'full_book_pdf');
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link);
    expect(trackEventMock.mock.calls.map(([name]) => name)).toEqual(['sample_book_open']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tracks chapter opening and one start/completion pair without personal story data', () => {
    const { container } = render(
      <LandingPageBookShowcase
        books={[book]}
        landingSlug="livro-personalizado-para-casais"
        locale="pt-PT"
        primaryIntent="romance"
        labels={{
          chapters: 'Capítulos',
          listen: 'Ouvir excerto áudio',
          readWithImage: 'Ler capítulo e ver imagem',
          readSample: 'Ler capítulo de amostra',
          sampleChapter: 'Capítulo de amostra',
          closeSample: 'Fechar capítulo de amostra',
        }}
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
      sample_style_label: 'Aguarela',
    };
    expect(trackEventMock).toHaveBeenCalledWith('sample_book_open', safeContext);
    expect(trackEventMock).toHaveBeenCalledWith('sample_audio_start', safeContext);
    expect(trackEventMock).toHaveBeenCalledWith('sample_audio_complete', safeContext);
    expect(trackEventMock).toHaveBeenCalledWith('sample_chapter_open', safeContext);
    expect(
      trackEventMock.mock.calls.filter(([event]) => event === 'sample_audio_start'),
    ).toHaveLength(1);
    expect(
      trackEventMock.mock.calls.filter(([event]) => event === 'sample_book_open'),
    ).toHaveLength(1);
    expect(trackOpenAiAdsEventMock).toHaveBeenCalledTimes(1);
    expect(trackOpenAiAdsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'contents_viewed',
        eventId: expect.any(String),
        data: {
          type: 'contents',
          contents: [
            {
              id: 'ines-e-diogo-um-amor-inesperado',
              name: 'Inês & Diogo — Um Amor Inesperado',
              content_type: 'sample_book',
              quantity: 1,
            },
          ],
        },
      }),
    );
    expect(screen.getAllByText('Ler transcrição')).not.toHaveLength(0);
    expect(JSON.stringify(trackEventMock.mock.calls)).not.toContain(book.title);
  });
});
