/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import SampleBookDetailPage from './SampleBookDetailPage';
import type { SampleBook } from '@/types/sample-book';

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
  it('keeps the Mythoria-created label without rendering the creation-provenance section', () => {
    render(<SampleBookDetailPage book={book} chapter="O primeiro parágrafo." locale="pt-PT" />);

    expect(screen.getByText('Livro criado com a Mythoria')).toBeInTheDocument();
    expect(screen.queryByText('Como este livro foi criado')).not.toBeInTheDocument();
    expect(screen.queryByText(/não é uma história de cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contexto ficcional interno/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/personagens ficcionais/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exemplo de livro inteiramente ficcional/i)).not.toBeInTheDocument();
  });
});
