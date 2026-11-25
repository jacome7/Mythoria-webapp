import { fireEvent, render, screen, within } from '@testing-library/react';
import { premiumBookManifestSchema } from '@/lib/premium-children-book/contract';
import { toPremiumBookReaderData } from '@/lib/premium-children-book/reader';
import manifest from '@/lib/premium-children-book/worker-manifest.fixture.json';
import PremiumBookReader from './PremiumBookReader';
import { frozenPublicationDetails } from '@/test-utils/premium-publication';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const legacy = toPremiumBookReaderData(premiumBookManifestSchema.parse(manifest));

describe('premium edition lettering', () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  it('shows integrated art with an accessible transcript and displays the words if the image fails', () => {
    render(
      <PremiumBookReader
        book={{
          ...legacy,
          editionLayout: 'embedded-lettering-v2',
          specification: frozenPublicationDetails,
        }}
      />,
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '5' } });
    const page = screen.getByRole('article');
    const words = manifest.pages[4].text;
    expect(within(page).queryByText(words)).toBeNull();
    expect(screen.getByText(words).closest('details')).not.toBeNull();
    fireEvent.error(within(page).getByRole('presentation'));
    expect(within(page).getByText(words)).toBeInTheDocument();
    fireEvent.change(select, { target: { value: '2' } });
    const spec = within(screen.getByRole('article'));
    expect(spec.getByRole('heading')).toHaveTextContent(legacy.title);
    expect(spec.getByText(frozenPublicationDetails.rights)).toBeVisible();
    expect(spec.getByRole('img', { name: 'Mythoria' })).toBeVisible();
    expect(spec.getByRole('link')).toHaveAttribute('href', 'https://mythoria.pt');
  });

  it('keeps the printed-on-top text for previously published artwork', () => {
    render(<PremiumBookReader book={legacy} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
    expect(
      within(screen.getByRole('article')).getByText(manifest.pages[4].text),
    ).toBeInTheDocument();
  });
});
