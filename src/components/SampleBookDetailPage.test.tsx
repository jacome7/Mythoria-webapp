/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import SampleBookDetailPage from './SampleBookDetailPage';
import spanishFacts from '@/messages/es-ES/GetInspiredPage.json';
import spanishDetail from '@/messages/es-ES/SampleBookDetail.json';
import portugueseFacts from '@/messages/pt-PT/GetInspiredPage.json';
import portugueseDetail from '@/messages/pt-PT/SampleBookDetail.json';
import type { SampleBook } from '@/types/sample-book';

let mockMessages: Record<string, unknown>;

jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const lookup = (key: string): unknown =>
      key.split('.').reduce<unknown>((entry, segment) => {
        if (!entry || typeof entry !== 'object') return undefined;
        return (entry as Record<string, unknown>)[segment];
      }, mockMessages[namespace]);
    return Object.assign(
      (key: string, values: Record<string, string> = {}) => {
        const message = lookup(key);
        if (typeof message !== 'string')
          throw new Error(`Missing test translation ${namespace}.${key}`);
        return message.replace(/\{(\w+)\}/g, (_, name: string) => values[name]);
      },
      { has: (key: string) => typeof lookup(key) === 'string' },
    );
  },
}));

const book: SampleBook = {
  id: 'children-book-01',
  slug: 'mia-e-a-pastelaria-da-lua',
  title: 'Mia e a Pastelaria da Lua',
  synopsis: 'Mia encontra uma pastelaria lunar.',
  shortExcerpt: 'Cheirava a estrelas quentes.',
  locale: 'pt-PT',
  intent: 'kids_bedtime',
  recipients: ['criança'],
  tags: ['livro-personalizado-crianca'],
  style: 'claymation',
  fictionalUserContext: 'Contexto ficcional interno que não deve aparecer ao público.',
  publicProvenance: 'mythoria_created_example',
  safetyNotes: ['Personagens ficcionais.'],
  coverSrc: '/sample-books/mia/assets/cover.jpeg',
  featureSrc: '/sample-books/mia/assets/feature.jpeg',
  chapterImageSrc: '/sample-books/mia/assets/chapter-01.jpeg',
  audioSampleSrc: '/sample-books/mia/assets/audio-teaser.mp3',
  source: 'sample-pack',
};

describe('SampleBookDetailPage Mythoria-created provenance', () => {
  beforeEach(() => {
    mockMessages = { ...portugueseDetail, ...portugueseFacts };
  });

  it('renders an optional server-approved creation link without sample story text in the URL', () => {
    render(
      <SampleBookDetailPage
        book={book}
        chapter={null}
        locale="pt-PT"
        createSimilar={{
          href: '/pt-PT/tell-your-story/step-1?templateId=moonlight-adventure',
          label: 'Create a similar story',
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Create a similar story' })).toHaveAttribute(
      'href',
      '/pt-PT/tell-your-story/step-1?templateId=moonlight-adventure',
    );
  });

  it('keeps the Mythoria-created label without rendering the creation-provenance section', () => {
    render(<SampleBookDetailPage book={book} chapter="O primeiro parágrafo." locale="pt-PT" />);

    expect(screen.getByText('Livro criado com a Mythoria')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create a similar story' })).not.toBeInTheDocument();
    expect(screen.queryByText('Como este livro foi criado')).not.toBeInTheDocument();
    expect(screen.queryByText(/não é uma história de cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contexto ficcional interno/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/personagens ficcionais/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exemplo de livro inteiramente ficcional/i)).not.toBeInTheDocument();
  });

  it('localizes the sample chapter, audio, fiction label, facts and alt text in Spanish', () => {
    mockMessages = { ...spanishDetail, ...spanishFacts };
    const spanishBook: SampleBook = {
      ...book,
      title: 'La noticia a medias',
      locale: 'es-ES',
      intent: 'school_projects',
      novelStyle: 'mystery',
      graphicalStyle: 'euro_comic_book',
      featureSrc: undefined,
    };

    render(
      <SampleBookDetailPage
        book={spanishBook}
        chapter="El periódico cerraba a mediodía."
        locale="es-ES"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Capítulo de muestra' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fragmento en audio' })).toBeInTheDocument();
    expect(screen.getByText('Libro creado con Mythoria')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Cómic')).toBeInTheDocument();
    expect(screen.getByText('Misterio')).toBeInTheDocument();
    expect(screen.getByText('Proyectos escolares')).toBeInTheDocument();
    expect(
      screen.getByAltText('Ilustración del capítulo de muestra de «La noticia a medias»'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Capítulo de amostra')).not.toBeInTheDocument();
  });
});
