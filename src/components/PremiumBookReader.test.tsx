import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { premiumBookManifestSchema } from '@/lib/premium-children-book/contract';
import { toPremiumBookReaderData } from '@/lib/premium-children-book/reader';
import manifest from '@/lib/premium-children-book/worker-manifest.fixture.json';
import PremiumBookReader from './PremiumBookReader';
import { frozenPublicationDetails } from '@/test-utils/premium-publication';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
    values ? [key, ...Object.values(values)].join(' ') : key,
}));

jest.mock('motion/react', () => ({
  ...jest.requireActual('motion/react'),
  useReducedMotion: () => true,
}));

const mockStandardImageJob = jest.fn();
jest.mock('./ai-image-editor/useImageEditJob', () => ({
  useImageEditJob: () => ({
    requestJob: mockStandardImageJob,
    CreditConfirmation: null,
    JobProgress: null,
  }),
}));

const legacy = toPremiumBookReaderData(premiumBookManifestSchema.parse(manifest), { owned: true });

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
    expect(within(page).getByText(words)).toHaveClass('sr-only');
    expect(screen.queryByText('pageText', { selector: 'summary' })).toBeNull();
    fireEvent.error(within(page).getByRole('presentation'));
    expect(within(page).getByText(words)).not.toHaveClass('sr-only');
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
  it('renders selectable typeset text and keeps the silent facing illustration accessible', () => {
    const text = 'Primeiro parágrafo.\n\nSegundo parágrafo.';
    const pages = legacy.pages.map((page) =>
      page.number === 6
        ? {
            ...page,
            text,
            textEdit: { value: text, maxLength: 420 },
            image: undefined,
            renderMode: 'typeset' as const,
            composition: 'illustration_facing_text' as const,
          }
        : page.number === 7
          ? {
              ...page,
              text: '',
              textEdit: undefined,
              renderMode: 'illustration' as const,
              composition: 'illustration_facing_text' as const,
              imageDescription: 'Uma raposa observa as estrelas.',
            }
          : page,
    );
    const book = { ...legacy, audience: 'children_3-6' as const, pages };
    const onEditionChanged = jest.fn();
    const { rerender } = render(
      <PremiumBookReader book={book} editableStoryId="story" onEditionChanged={onEditionChanged} />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '6' } });
    const article = screen.getByRole('article');
    expect(within(article).getByText('Primeiro parágrafo. Segundo parágrafo.').textContent).toBe(
      text,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /^editText/ })).toBeNull();
    rerender(
      <PremiumBookReader
        book={book}
        editableStoryId="story"
        onEditionChanged={onEditionChanged}
        isEditing
      />,
    );
    expect(screen.getByRole('button', { name: 'editText pageNumber 6' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^editIllustration/ })).toBeNull();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } });
    expect(
      within(screen.getByRole('article')).getByRole('img', {
        name: 'Uma raposa observa as estrelas.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'editIllustration pageNumber 7' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^editText/ })).toBeNull();
  });
});

describe('premium edition editing', () => {
  const updateFetch = jest.fn();
  const previousFetch = global.fetch;

  beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = true;
        },
      },
      close: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = false;
        },
      },
    });
    global.fetch = updateFetch;
  });

  afterEach(() => {
    updateFetch.mockReset();
    global.fetch = previousFetch;
    window.sessionStorage.clear();
  });

  it.each(['premium_stage_busy', 'edit_unavailable'])(
    'retries the same quoted premium correction after %s',
    async (error) => {
      updateFetch
        .mockResolvedValueOnce(Response.json({ canEdit: true, requiredCredits: 2 }))
        .mockResolvedValueOnce(Response.json({ error }, { status: 503 }))
        .mockResolvedValueOnce(Response.json({ revision: 'new-revision' }));
      const onEditionChanged = jest.fn().mockResolvedValue(undefined);
      render(
        <PremiumBookReader
          book={legacy}
          editableStoryId="story"
          onEditionChanged={onEditionChanged}
          isEditing
        />,
      );
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } });
      fireEvent.click(screen.getByRole('button', { name: 'editIllustration pagePair 6 7' }));
      const modal = within(screen.getByRole('dialog', { name: 'title pagePair 6 7' }));
      expect(modal.queryByRole('tab')).toBeNull();
      expect(await modal.findByText('editCost 2')).toBeInTheDocument();
      fireEvent.change(modal.getByRole('textbox'), { target: { value: 'Make the moon brighter' } });
      fireEvent.click(modal.getByRole('button', { name: 'editApply' }));
      expect(await modal.findByRole('alert')).toHaveTextContent('editRetryLater');
      expect(modal.getByRole('textbox')).toHaveValue('Make the moon brighter');
      expect(onEditionChanged).not.toHaveBeenCalled();
      fireEvent.click(modal.getByRole('button', { name: 'editApply' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(updateFetch.mock.calls[1][0]).toBe('/api/stories/story/premium/corrections');
      expect(updateFetch.mock.calls[2]).toEqual(updateFetch.mock.calls[1]);
      expect(JSON.parse(updateFetch.mock.calls[1][1].body)).toMatchObject({
        expectedRevision: legacy.revision,
        correctionId: expect.any(String),
        maximumCredits: 2,
        spreadId: 'spread-1',
        artworkInstructions: 'Make the moon brighter',
      });
      expect(onEditionChanged).toHaveBeenCalledTimes(1);
      expect(mockStandardImageJob).not.toHaveBeenCalled();
      expect(screen.getByRole('combobox')).toHaveValue('7');
    },
  );

  it('saves dedication text through the manual edit route and keeps the current page', async () => {
    updateFetch.mockResolvedValueOnce(Response.json({ revision: 'new-revision' }));
    const onEditionChanged = jest.fn().mockResolvedValue(undefined);
    render(
      <PremiumBookReader
        book={legacy}
        editableStoryId="story"
        onEditionChanged={onEditionChanged}
        isEditing
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'editText pageNumber 3' }));
    const modal = within(screen.getByRole('dialog', { name: 'editText pageNumber 3' }));
    const dedication = modal.getByRole('textbox', { name: 'dedicationMessage' });
    expect(dedication).toHaveValue(manifest.opening.dedication);
    fireEvent.change(dedication, { target: { value: 'For our young reader.' } });
    fireEvent.click(modal.getByRole('button', { name: 'saveButton' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(updateFetch.mock.calls[0][0]).toBe('/api/stories/story/premium/text-edits');
    expect(JSON.parse(updateFetch.mock.calls[0][1].body)).toMatchObject({
      expectedRevision: legacy.revision,
      correctionId: expect.any(String),
      pageNumber: 3,
      text: 'For our young reader.',
    });
    expect(onEditionChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox')).toHaveValue('3');
  });
});
