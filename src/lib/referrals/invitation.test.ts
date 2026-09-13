/** @jest-environment node */
import { invitationVariables, sendReferralInvitation } from './invitation';
import { db } from '@/db';
import { notificationClient } from '@/lib/notifications/client';

jest.mock('@/db', () => ({ db: { select: jest.fn() } }));
jest.mock('@/lib/notifications/client', () => ({
  notificationClient: { sendTemplatedEmail: jest.fn() },
}));

const member = {
  membershipId: 'member-1',
  referralOwnerId: 'owner-1',
  emailNormalized: 'partner@example.test',
  status: 'invited',
};
const owner = {
  referralOwnerId: 'owner-1',
  status: 'active',
  displayName: 'Partner',
  preferredLocale: 'pt-PT',
};
const code = { code: 'PARTNER', active: true };
function rows(...results: unknown[][]) {
  for (const result of results) {
    const query = {
      where: jest.fn(),
      limit: jest.fn().mockResolvedValue(result),
      then: Promise.resolve(result).then.bind(Promise.resolve(result)),
    };
    query.where.mockReturnValue(query);
    jest.mocked(db.select).mockReturnValueOnce({ from: () => query } as never);
  }
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(notificationClient.sendTemplatedEmail).mockResolvedValue({ success: true } as never);
});

it.each(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'])(
  'formats real fractional terms in %s',
  (locale) => {
    const variables = invitationVariables({
      name: 'Partner',
      locale,
      code: 'PARTNER',
      rateBps: 1255,
      baseUrl: 'http://localhost:3000/',
    });
    expect(variables.portalUrl).toBe(`http://localhost:3000/${locale}/referrals`);
    expect(variables.welcome.referralUrl).toBe('http://localhost:3000/r/PARTNER');
    expect(variables.welcome.faqUrl).toBe(`${variables.portalUrl}#referral-faq`);
    expect(variables.welcome.rate).toBe(
      new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(0.1255),
    );
    expect(variables.welcome.exampleCommission).toBe(
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(12.55),
    );
    expect(variables.welcome.days).toBe(90);
    expect(variables.welcome.hold).toBe(30);
  },
);

it.each([0, 10000])('preserves the assigned rate %i without a default', (rateBps) => {
  expect(
    invitationVariables({
      name: 'P',
      locale: 'en-US',
      code: 'PARTNER',
      rateBps,
      baseUrl: 'https://mythoria.pt',
    }).welcome.exampleCommission,
  ).toBe(rateBps === 0 ? '€0.00' : '€100.00');
});

it('sends before first sign-in without consulting live feature flags', async () => {
  rows([member], [owner], [code], [{ commissionRateBps: 1255 }]);
  expect(await sendReferralInvitation('member-1', 'outbox-1')).toBe('completed');
  expect(notificationClient.sendTemplatedEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      templateId: 'referral-invitation',
      entityId: 'outbox-1:member-1',
      recipients: [{ email: member.emailNormalized, language: 'pt-PT' }],
      variables: expect.objectContaining({ welcome: expect.objectContaining({ code: 'PARTNER' }) }),
    }),
  );
});

it.each(['invited', 'active'])(
  'keeps delivery identity for retries/resends to %s members',
  async (status) => {
    rows([{ ...member, status }], [owner], [code], [{ commissionRateBps: 1000 }]);
    await sendReferralInvitation('member-1', 'outbox-1');
    rows([{ ...member, status }], [owner], [code], [{ commissionRateBps: 1000 }]);
    await sendReferralInvitation('member-1', 'outbox-1');
    expect(
      jest.mocked(notificationClient.sendTemplatedEmail).mock.calls.map(([call]) => call.entityId),
    ).toEqual(['outbox-1:member-1', 'outbox-1:member-1']);
  },
);

it('cancels a deleted invitation', async () => {
  rows([]);
  expect(await sendReferralInvitation('deleted', 'outbox')).toBe('cancelled');
  expect(notificationClient.sendTemplatedEmail).not.toHaveBeenCalled();
});
it('cancels closed owners', async () => {
  rows([member], [{ ...owner, status: 'closed' }]);
  expect(await sendReferralInvitation('member-1', 'outbox')).toBe('cancelled');
  expect(notificationClient.sendTemplatedEmail).not.toHaveBeenCalled();
});
it.each(['owner', 'member', 'code'])('defers reversible %s suspension', async (target) => {
  rows(
    [{ ...member, status: target === 'member' ? 'suspended' : 'invited' }],
    [{ ...owner, status: target === 'owner' ? 'suspended' : 'active' }],
    [{ ...code, active: target !== 'code' }],
  );
  expect(await sendReferralInvitation('member-1', 'outbox')).toBe('deferred');
  expect(notificationClient.sendTemplatedEmail).not.toHaveBeenCalled();
});
it.each(['code', 'terms'])('reports missing %s rather than inventing terms', async (missing) => {
  rows([member], [owner], missing === 'code' ? [] : [code], []);
  await expect(sendReferralInvitation('member-1', 'outbox')).rejects.toThrow(
    `missing_referral_${missing}`,
  );
  expect(notificationClient.sendTemplatedEmail).not.toHaveBeenCalled();
});
it('propagates delivery failure for durable retry', async () => {
  rows([member], [owner], [code], [{ commissionRateBps: 1000 }]);
  jest.mocked(notificationClient.sendTemplatedEmail).mockResolvedValue({ success: false } as never);
  await expect(sendReferralInvitation('member-1', 'outbox')).rejects.toThrow('notification_failed');
});
