import { render, cleanup } from '@testing-library/react';
import ReferralFaq from './ReferralFaq';
import en from '@/messages/en-US/Referrals.json';
import pt from '@/messages/pt-PT/Referrals.json';
import es from '@/messages/es-ES/Referrals.json';
import fr from '@/messages/fr-FR/Referrals.json';
import de from '@/messages/de-DE/Referrals.json';
let mockLocale = 'en-US';
let mockMessages = en;
jest.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations:
    () =>
    (key: string, values: Record<string, string | number> = {}) => {
      const value = key
        .split('.')
        .reduce<unknown>((object, part) => (object as Record<string, unknown>)[part], mockMessages);
      if (typeof value !== 'string') throw new Error(`Missing message ${key}`);
      return value.replace(/\{(\w+)\}/g, (_, name: string) => {
        if (values[name] === undefined) throw new Error(`Missing value ${name} for ${key}`);
        return String(values[name]);
      });
    },
}));
describe('owner FAQ', () => {
  afterEach(cleanup);
  it.each([
    ['en-US', en],
    ['pt-PT', pt],
    ['es-ES', es],
    ['fr-FR', fr],
    ['de-DE', de],
  ] as const)('renders all answers and the negotiated rate in %s', (locale, messages) => {
    mockLocale = locale;
    mockMessages = messages;
    const { container } = render(<ReferralFaq rateBps={1250} />);
    expect(container.querySelectorAll('details')).toHaveLength(14);
    expect(container.querySelectorAll('summary')).toHaveLength(14);
    expect(container.textContent).toContain(
      new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(0.125),
    );
    expect(container.querySelectorAll('summary')[2]).toHaveTextContent('90');
    expect(container.textContent).not.toMatch(/MISSING_MESSAGE|undefined|\{\w+\}/);
  });
});
