/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const trackEventMock = jest.fn();

jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string) => key,
}));
jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
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
});
