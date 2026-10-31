/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';

const mockRequestJob = jest.fn().mockResolvedValue(null);
let mockCompleteImageJob: ((result: { newImageUrl?: string }) => void) | undefined;

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { alt = '', ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...imageProps} />;
  },
}));

jest.mock('next-intl', () => ({
  useTranslations:
    (namespace: string) => (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        'Actions.close': 'Close',
        'AIImageEditor.cancelButton': 'Cancel',
        'AIImageEditor.currentImage': 'Current Image:',
        'AIImageEditor.generateButton': 'Generate',
        'AIImageEditor.generatedImageAlt': 'Generated Image',
        'AIImageEditor.helper.editUsesCredit': 'Uses 1 image credit',
        'AIImageEditor.labels.describeChanges': 'Describe the changes',
        'AIImageEditor.loading': 'Generating...',
        'AIImageEditor.modes.edit': 'Edit current image',
        'AIImageEditor.modes.upload': 'Use your photo',
        'AIImageEditor.newImageLabel': 'New Generated Image',
        'AIImageEditor.newImageSuccess': 'New image generated successfully!',
        'AIImageEditor.replaceButton': 'Replace Original',
        'AIImageEditor.radio.asIs': 'Use as-is',
        'AIImageEditor.radio.legend': 'How should we use your photo?',
        'AIImageEditor.warnings.coverTitleNotPrinted': 'Cover title will not be printed',
        'AIImageEditor.requestPlaceholder': 'Describe how you want to modify this image...',
      };

      if (namespace === 'AIImageEditor' && key === 'title') {
        return `AI Image Editor - ${values?.imageType}`;
      }
      if (namespace === 'AIImageEditor' && key === 'characterCount') {
        return `${values?.count}/${values?.max} characters`;
      }

      return messages[`${namespace}.${key}`] ?? key;
    },
}));

jest.mock('./ai-image-editor/Cropper', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./ai-image-editor/useImageEditJob', () => ({
  useImageEditJob: ({ onComplete }: { onComplete: (result: { newImageUrl?: string }) => void }) => {
    mockCompleteImageJob = onComplete;
    return {
      requestJob: mockRequestJob,
      CreditConfirmation: null,
      JobProgress: null,
    };
  },
}));

import AIImageEditor from './AIImageEditor';

const currentImageUrl =
  'https://storage.googleapis.com/mythoria-generated-stories/story/images/chapter_2_v001.jpg';
const generatedImageUrl =
  'https://storage.googleapis.com/mythoria-generated-stories/story/images/chapter_2_v002.jpg';

function renderEditor(imageType: 'cover' | 'backcover' | 'chapter' = 'chapter') {
  const onClose = jest.fn();
  const onImageEditSuccess = jest.fn();

  render(
    <AIImageEditor
      isOpen
      onClose={onClose}
      story={{
        storyId: 'story-id',
        title: 'A book title that should not be shown',
        graphicalStyle: 'colored_pencil',
      }}
      imageData={{
        imageUri: currentImageUrl,
        imageType,
        chapterNumber: imageType === 'chapter' ? 2 : undefined,
        title: 'Chapter 2',
      }}
      onImageEditSuccess={onImageEditSuccess}
    />,
  );

  return { onClose, onImageEditSuccess };
}

describe('AIImageEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteImageJob = undefined;
    global.fetch = jest.fn();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: true }),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('promotes a completed candidate into the primary preview and replaces with the raw URL', async () => {
    const { onClose, onImageEditSuccess } = renderEditor();

    expect(screen.getByRole('dialog', { name: 'AI Image Editor - Chapter 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByText('A book title that should not be shown')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Chapter 2' })).toHaveAttribute('src', currentImageUrl);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();

    act(() => {
      mockCompleteImageJob?.({ newImageUrl: generatedImageUrl });
    });

    const generatedImage = await screen.findByRole('img', { name: 'Generated Image' });
    expect(generatedImage.getAttribute('src')).toMatch(/chapter_2_v002\.jpg\?preview=\d+$/);
    expect(screen.getByText('New Generated Image')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, newImageUrl: generatedImageUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Replace Original' }));

    await waitFor(() => expect(onImageEditSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    const request = (global.fetch as jest.Mock).mock.calls[0];
    expect(request[0]).toBe('/api/image-replace');
    expect(JSON.parse(request[1].body)).toEqual(
      expect.objectContaining({ newImageUrl: generatedImageUrl }),
    );
  });

  it('keeps the generated candidate visible when replacement fails', async () => {
    const { onClose, onImageEditSuccess } = renderEditor();

    act(() => {
      mockCompleteImageJob?.({ newImageUrl: generatedImageUrl });
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: 'Replacement failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Replace Original' }));

    expect(await screen.findByText('Replacement failed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Generated Image' })).toBeInTheDocument();
    expect(onImageEditSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('cover title warning', () => {
    const warningText = 'Cover title will not be printed';

    async function openUploadWithPhoto(imageType: 'cover' | 'backcover' | 'chapter') {
      renderEditor(imageType);
      fireEvent.click(screen.getByRole('tab', { name: 'Use your photo' }));
      const input = document.getElementById('user-image-input') as HTMLInputElement;
      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      fireEvent.change(input, { target: { files: [file] } });
      await screen.findByRole('radio', { name: 'Use as-is' });
    }

    beforeEach(() => {
      URL.createObjectURL = jest.fn().mockReturnValue('blob:photo');
      URL.revokeObjectURL = jest.fn();
      class MockImage {
        width = 1024;
        height = 1536;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      Object.defineProperty(window, 'Image', { configurable: true, value: MockImage });
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
      jest
        .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
        .mockReturnValue('data:image/jpeg;base64,xx');
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, publicUrl: 'https://example.com/cover_v002.jpg' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    it('shows the warning for cover in upload mode with as-is selected', async () => {
      await openUploadWithPhoto('cover');
      expect(screen.getByRole('alert')).toHaveTextContent(warningText);
    });

    it('hides the warning after choosing convert', async () => {
      await openUploadWithPhoto('cover');
      fireEvent.click(screen.getAllByRole('radio')[1]);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('hides the warning for backcover', async () => {
      await openUploadWithPhoto('backcover');
      expect(screen.queryByText(warningText)).not.toBeInTheDocument();
    });

    it('hides the warning for chapter images', async () => {
      await openUploadWithPhoto('chapter');
      expect(screen.queryByText(warningText)).not.toBeInTheDocument();
    });

    it('hides the warning in edit mode', () => {
      renderEditor('cover');
      expect(screen.queryByText(warningText)).not.toBeInTheDocument();
    });
  });
});
