/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const trackEventMock = jest.fn();
const trackOpenAiAdsEventMock = jest.fn();

jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string) => key,
}));
jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => trackOpenAiAdsEventMock(...args),
}));

import ShareModal from './ShareModal';

describe('ShareModal', () => {
  const storyRef = 'a1b2c3d4e5f6';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, storyRef }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    window.open = jest.fn(() => ({}) as Window);
  });

  function renderPublicModal() {
    return render(
      <ShareModal
        isOpen
        onClose={jest.fn()}
        storyId="00000000-0000-4000-8000-000000000001"
        storyTitle="A private title that must not be tracked"
        isPublic
        slug="safe-public-slug"
      />,
    );
  }

  it('records copy only after clipboard success and uses the opaque public campaign URL', async () => {
    renderPublicModal();
    const copy = await screen.findByRole('button', { name: 'copy' });
    await waitFor(() => expect(copy).toBeEnabled());
    fireEvent.click(copy);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('utm_source=copy_link'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining(storyRef));
    expect(trackEventMock).toHaveBeenCalledWith(
      'share',
      expect.objectContaining({
        method: 'copy_link',
        item_id: storyRef,
        story_share_scope: 'public',
      }),
    );
    expect(JSON.stringify(trackEventMock.mock.calls)).not.toContain(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(JSON.stringify(trackEventMock.mock.calls)).not.toContain('A private title');
  });

  it.each(['whatsapp', 'facebook', 'email'] as const)(
    'records an explicit %s launch',
    async (method) => {
      renderPublicModal();
      const button = await screen.findByRole('button', { name: method });
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);

      expect(window.open).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(
        'share',
        expect.objectContaining({ method, item_id: storyRef }),
      );
    },
  );

  it('records native sharing only when the browser handoff resolves', async () => {
    const nativeShare = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
    renderPublicModal();
    const button = await screen.findByRole('button', { name: 'more' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(nativeShare).toHaveBeenCalledTimes(1));
    expect(trackEventMock).toHaveBeenCalledWith(
      'share',
      expect.objectContaining({ method: 'native_share', item_id: storyRef }),
    );
  });

  it('tags a generated private edit link with its private scope', async () => {
    global.fetch = jest.fn((_, init?: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            init?.method === 'POST'
              ? {
                  success: true,
                  linkType: 'private',
                  url: '/s/00000000-0000-4000-8000-000000000001/edit',
                  storyRef,
                  accessLevel: 'edit',
                  message: 'Created',
                }
              : { success: true, storyRef },
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    render(
      <ShareModal
        isOpen
        onClose={jest.fn()}
        storyId="00000000-0000-4000-8000-000000000001"
        storyTitle="Private story"
      />,
    );
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'generateLink' }));

    const whatsapp = await screen.findByRole('button', { name: 'whatsapp' });
    await waitFor(() => expect(whatsapp).toBeEnabled());
    fireEvent.click(whatsapp);

    expect(decodeURIComponent(String((window.open as jest.Mock).mock.calls[0]?.[0]))).toContain(
      'utm_content=private_edit',
    );
    expect(trackEventMock).toHaveBeenCalledWith(
      'share',
      expect.objectContaining({ method: 'whatsapp', story_share_scope: 'private_edit' }),
    );
  });

  it('does not record a cancelled native share or a failed clipboard write', async () => {
    const cancelledShare = jest.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    Object.defineProperty(navigator, 'share', { configurable: true, value: cancelledShare });
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('blocked'));
    renderPublicModal();
    const more = await screen.findByRole('button', { name: 'more' });
    const copy = await screen.findByRole('button', { name: 'copy' });
    await waitFor(() => expect(more).toBeEnabled());
    fireEvent.click(more);
    fireEvent.click(copy);

    await waitFor(() => expect(cancelledShare).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    expect(trackEventMock).not.toHaveBeenCalled();
  });
  describe('OpenAI Ads story_shared', () => {
    const storyId = '00000000-0000-4000-8000-000000000001';

    function mockSharePost(postBody: Record<string, unknown>) {
      global.fetch = jest.fn((_, init?: RequestInit) =>
        Promise.resolve(
          new Response(
            JSON.stringify(init?.method === 'POST' ? postBody : { success: true, storyRef }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      );
    }

    function renderPrivateModal(isPublic = false) {
      return render(
        <ShareModal
          isOpen
          onClose={jest.fn()}
          storyId={storyId}
          storyTitle="Story"
          isPublic={isPublic}
          slug={isPublic ? 'safe-public-slug' : undefined}
        />,
      );
    }

    it('fires story_shared with the server event id for a new private link', async () => {
      mockSharePost({
        success: true,
        linkType: 'private',
        url: '/s/link-123',
        token: 'link-123',
        accessLevel: 'view',
        storyRef,
        message: 'Created',
        adEventId: 'share_link-123',
      });
      renderPrivateModal();
      fireEvent.click(screen.getByRole('button', { name: 'generateLink' }));

      await waitFor(() => expect(trackOpenAiAdsEventMock).toHaveBeenCalledTimes(1));
      expect(trackOpenAiAdsEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'custom',
          customEventName: 'story_shared',
          eventId: 'share_link-123',
          data: expect.objectContaining({
            contents: [expect.objectContaining({ id: 'story_share_private_view' })],
          }),
        }),
      );
    });

    it('fires story_shared with the public scope when the story is published', async () => {
      mockSharePost({
        success: true,
        linkType: 'public',
        url: '/p/slug',
        storyRef,
        message: 'Public',
        adEventId: `share_${storyId}-public`,
      });
      renderPrivateModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      fireEvent.click(screen.getByRole('button', { name: 'generateLink' }));

      await waitFor(() =>
        expect(trackOpenAiAdsEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            customEventName: 'story_shared',
            eventId: `share_${storyId}-public`,
            data: expect.objectContaining({
              contents: [expect.objectContaining({ id: 'story_share_public' })],
            }),
          }),
        ),
      );
    });

    it('does not fire without a server event id', async () => {
      mockSharePost({
        success: true,
        linkType: 'private',
        url: '/s/link-123',
        token: 'link-123',
        accessLevel: 'view',
        storyRef,
        message: 'Created',
      });
      renderPrivateModal();
      fireEvent.click(screen.getByRole('button', { name: 'generateLink' }));

      await screen.findByText('Created');
      expect(trackOpenAiAdsEventMock).not.toHaveBeenCalled();
    });

    it('does not fire when a public story is made private', async () => {
      mockSharePost({
        success: true,
        linkType: 'private',
        url: '',
        storyRef,
        message: 'Now private',
        adEventId: 'share_should-not-fire',
      });
      renderPrivateModal(true);
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: 'makePrivate' }));

      await waitFor(() =>
        expect(
          (global.fetch as jest.Mock).mock.calls.some(([, init]) => init?.method === 'POST'),
        ).toBe(true),
      );
      await screen.findByText('Now private');
      expect(trackOpenAiAdsEventMock).not.toHaveBeenCalled();
    });
  });
});
