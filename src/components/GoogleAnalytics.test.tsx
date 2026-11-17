import { render } from '@testing-library/react';

jest.mock('next/script', () => ({
  __esModule: true,
  default: ({
    id,
    strategy,
    dangerouslySetInnerHTML,
    src,
  }: {
    id?: string;
    strategy?: string;
    dangerouslySetInnerHTML?: { __html: string };
    src?: string;
  }) => (
    <script
      data-testid={id || 'external-tag'}
      data-strategy={strategy}
      data-src={src}
      dangerouslySetInnerHTML={dangerouslySetInnerHTML}
    />
  ),
}));

import GoogleAnalytics from './GoogleAnalytics';

describe('GoogleAnalytics bootstrap', () => {
  it('removes private invitation fragments before any tag initialization', () => {
    const token = 'a'.repeat(43);
    window.history.replaceState(null, '', `/en-US/biographer/invite#${token}`);
    const state = window as unknown as Window & {
      __mythoriaBiographerFragment?: string;
      gtag?: jest.Mock;
    };
    const previous = state.gtag;
    state.gtag = jest.fn();
    const { container } = render(<GoogleAnalytics measurementId="G-TEST123" />);
    const source = container.querySelector('#gtag-init')?.textContent || '';
    new Function(source)();
    expect(window.location.hash).toBe('');
    expect(state.__mythoriaBiographerFragment).toBe(token);
    expect(state.gtag).not.toHaveBeenCalled();
    delete state.__mythoriaBiographerFragment;
    state.gtag = previous;
    window.history.replaceState(null, '', '/');
  });
  it('initializes consent and the queue before configuring tags without automatic page views', () => {
    const { container, getByTestId } = render(
      <GoogleAnalytics measurementId="G-TEST123" googleAdsId="AW-TEST" googleTagId="GT-TEST" />,
    );
    const initScript = container.querySelector('#gtag-init');
    expect(initScript).not.toBeNull();
    const source = initScript?.textContent || '';
    expect(() => new Function(source)).not.toThrow();
    expect(source.indexOf('window.history.replaceState')).toBeLessThan(
      source.indexOf("window.gtag('config'"),
    );
    expect(source).toContain('window.__mythoriaBiographerFragment');

    expect(source.indexOf("window.gtag('consent', 'default'")).toBeLessThan(
      source.indexOf('window.gtag(\'config\', "G-TEST123"'),
    );
    expect(source.indexOf("window.gtag('consent', 'update'")).toBeLessThan(
      source.indexOf('window.gtag(\'config\', "G-TEST123"'),
    );
    expect(source).toContain('window.gtag = window.gtag || function()');
    expect(source).toContain("ad_storage: 'denied'");
    expect(source).toContain("analytics_storage: 'denied'");
    expect(source).toContain('ad_storage: storedState.ad_storage');
    expect(source).not.toContain('ad_storage: consentState.ad_storage');
    expect(source).toContain('window.gtag(\'config\', "G-TEST123", { send_page_view: false');
    expect(source).toContain('window.gtag(\'config\', "AW-TEST", { send_page_view: false });');
    expect(source).toContain('window.gtag(\'config\', "GT-TEST", { send_page_view: false });');
    expect(getByTestId('external-tag')).toHaveAttribute(
      'data-src',
      'https://www.googletagmanager.com/gtag/js?id=GT-TEST',
    );
  });
});
