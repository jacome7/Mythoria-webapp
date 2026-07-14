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
  it('initializes consent and the queue before configuring tags without automatic page views', () => {
    const { container, getByTestId } = render(
      <GoogleAnalytics measurementId="G-TEST123" googleAdsId="AW-TEST" googleTagId="GT-TEST" />,
    );
    const initScript = container.querySelector('#gtag-init');
    expect(initScript).not.toBeNull();
    const source = initScript?.textContent || '';

    expect(source.indexOf("window.gtag('consent', 'default'")).toBeLessThan(
      source.indexOf('window.gtag(\'config\', "G-TEST123"'),
    );
    expect(source).toContain('window.gtag = window.gtag || function()');
    expect(source).toContain('window.gtag(\'config\', "G-TEST123", { send_page_view: false');
    expect(source).toContain('window.gtag(\'config\', "AW-TEST", { send_page_view: false });');
    expect(getByTestId('external-tag')).toHaveAttribute(
      'data-src',
      'https://www.googletagmanager.com/gtag/js?id=GT-TEST',
    );
  });
});
