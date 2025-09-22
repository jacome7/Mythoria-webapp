import { triggerWelcomeEmailSafe } from './welcome-email';

jest.mock('@/lib/notification-client', () => ({ notificationFetch: jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('ok') })) }));
jest.mock('@/db/services/pricing', () => ({ pricingService: { getInitialAuthorCredits: jest.fn(() => Promise.resolve(7)) } }));

describe('triggerWelcomeEmailSafe', () => {
  it('sends expected payload to notification engine', async () => {
    const { notificationFetch } = await import('@/lib/notification-client');
    await triggerWelcomeEmailSafe({
      authorId: '11111111-1111-1111-1111-111111111111',
      email: 'user@example.com',
      name: 'Test User',
      locale: 'en-US'
    });
    expect(notificationFetch).toHaveBeenCalledTimes(1);
    const call = (notificationFetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('/email/template');
    const body = JSON.parse(call[1].body);
    expect(body.templateId).toBe('welcome');
  expect(body.authorId).toBe('11111111-1111-1111-1111-111111111111');
  expect(body.entityId).toBe('11111111-1111-1111-1111-111111111111');
    expect(body.recipients[0].email).toBe('user@example.com');
  expect(body.variables.storyCredits).toBe(7);
  expect(body.variables.userName).toBe('Test User');
  });
});
