/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ManageCookiesButton from './ManageCookiesButton';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ManageCookiesButton', () => {
  afterEach(() => {
    delete window.oaiq;
    jest.restoreAllMocks();
  });

  it('withdraws OpenAI Pixel consent before resetting the cookie choice', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    window.gtag = jest.fn();
    global.fetch = jest.fn(async () => new Response('{}')) as unknown as typeof fetch;
    const oaiq = Object.assign(jest.fn(), { q: [] });
    window.oaiq = oaiq;

    render(<ManageCookiesButton />);
    fireEvent.click(screen.getByRole('button', { name: 'manageCookies' }));

    await waitFor(() => expect(oaiq).toHaveBeenCalledWith('consent', false));
  });
});
