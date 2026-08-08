/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import PublicStoryPageClient, { type PublicStoryData } from './PublicStoryPageClient';

jest.mock('./PublicStoryPageClient.module.css', () => ({}));
jest.mock('@clerk/nextjs', () => ({
  Show: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('next/navigation', () => ({ useParams: () => ({ slug: 'historia-de-exemplo' }) }));
jest.mock('next-intl', () => ({
  useLocale: () => 'pt-PT',
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
jest.mock(
  '@/components/StoryReader',
  () =>
    function MockStoryReader() {
      return <div>Story reader</div>;
    },
);
jest.mock(
  '@/components/PublicStoryRating',
  () =>
    function MockPublicStoryRating() {
      return <div>Story rating</div>;
    },
);
jest.mock('@/components/self-print/SelfPrintModal', () => ({
  SelfPrintModal: function MockSelfPrintModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div>Paid self-print modal</div> : null;
  },
}));
jest.mock('@/components/public-story/FeaturedStoryPdfDownloadModal', () => ({
  FeaturedStoryPdfDownloadModal: function MockFeaturedStoryPdfDownloadModal({
    isOpen,
  }: {
    isOpen: boolean;
  }) {
    return isOpen ? <div role="dialog">Free final PDFs</div> : null;
  },
}));

const initialData: PublicStoryData = {
  success: true,
  story: {
    storyId: 'story-id',
    title: 'História de Exemplo',
    authorName: 'Mythoria',
    createdAt: '2026-08-08T10:00:00.000Z',
    isPublic: true,
    hasFreePdfDownloads: true,
  },
  chapters: [],
  accessLevel: 'public',
};

describe('PublicStoryPageClient featured PDF downloads', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (String(args[0]).includes('Received `true` for a non-boolean attribute `jsx`')) return;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the free PDF modal from both download CTAs without the paid flow', () => {
    render(<PublicStoryPageClient initialData={initialData} />);

    const downloadButtons = screen.getAllByRole('button', {
      name: 'PublicStoryPage.actions.downloadPdf',
    });
    expect(downloadButtons).toHaveLength(2);

    fireEvent.click(downloadButtons[0]);
    expect(screen.getByRole('dialog')).toHaveTextContent('Free final PDFs');
    expect(screen.queryByText('Paid self-print modal')).not.toBeInTheDocument();

    fireEvent.click(downloadButtons[1]);
    expect(screen.getByRole('dialog')).toHaveTextContent('Free final PDFs');
  });
});
