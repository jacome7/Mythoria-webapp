import { act, fireEvent, render, screen } from '@testing-library/react';
import StoryInfoEditor from './StoryInfoEditor';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    (
      ({
        saveButton: 'Save Changes',
        saving: 'Saving',
        storyTitle: 'Story Title',
        titlePlaceholder: 'Enter story title',
        synopsis: 'Synopsis',
        synopsisPlaceholder: 'Enter synopsis',
        dedicationMessage: 'Dedication',
        dedicationPlaceholder: 'Enter dedication',
        authorName: 'Author Name',
        authorPlaceholder: 'Enter author name',
        targetAudience: 'Target Audience',
        targetAudiencePlaceholder: 'Choose target audience',
        'targetAudienceOptions.children_0-2': 'Children 0-2',
        'targetAudienceOptions.children_3-6': 'Children 3-6',
        'targetAudienceOptions.children_7-10': 'Children 7-10',
        'targetAudienceOptions.children_11-14': 'Children 11-14',
        'targetAudienceOptions.young_adult_15-17': 'Young adult 15-17',
        'targetAudienceOptions.adult_18+': 'Adult 18+',
        'targetAudienceOptions.all_ages': 'All ages',
        title: 'Story Info',
        frontCover: 'Front Cover',
        backCover: 'Back Cover',
        noCoverImage: 'No cover image',
        noBackCover: 'No back cover',
        addCover: 'Add cover',
        addBackCover: 'Add back cover',
        storyDetails: 'Story Details',
        language: 'Language',
        translate: 'Translate',
        graphicalStyleLabel: 'Graphical style',
        notSpecified: 'Not specified',
        created: 'Created',
        lastUpdated: 'Last updated',
        'logging.errorSavingStoryInfo': 'Error saving story info',
      }) satisfies Record<string, string>
    )[key] ?? key,
}));

jest.mock('../utils/image-url', () => ({
  toAbsoluteImageUrl: (value?: string) => value,
}));

const baseStory = {
  storyId: 'story-1',
  title: 'Old Story Title',
  synopsis: '',
  dedicationMessage: '',
  customAuthor: '',
  targetAudience: '',
  storyLanguage: 'en-US',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('StoryInfoEditor', () => {
  it('keeps the edited title in the input after save until fresh story props arrive', async () => {
    let resolveSave!: () => void;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <StoryInfoEditor
        story={baseStory}
        onSave={onSave}
        onEditCover={jest.fn()}
        onEditBackcover={jest.fn()}
      />,
    );

    const titleInput = screen.getByPlaceholderText('Enter story title');
    fireEvent.change(titleInput, { target: { value: 'New Story Title' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Story Title',
      }),
    );

    await act(async () => {
      resolveSave();
    });

    expect(titleInput).toHaveValue('New Story Title');
  });

  it('syncs the form when the parent story data changes', () => {
    const { rerender } = render(
      <StoryInfoEditor
        story={baseStory}
        onSave={jest.fn()}
        onEditCover={jest.fn()}
        onEditBackcover={jest.fn()}
      />,
    );

    const titleInput = screen.getByPlaceholderText('Enter story title');

    rerender(
      <StoryInfoEditor
        story={{
          ...baseStory,
          title: 'Updated Story Title',
          updatedAt: '2026-05-02T00:00:00.000Z',
        }}
        onSave={jest.fn()}
        onEditCover={jest.fn()}
        onEditBackcover={jest.fn()}
      />,
    );

    expect(titleInput).toHaveValue('Updated Story Title');
  });
});
