jest.mock('@/db', () => ({ db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() } }));
import { pricingService } from './pricing';
import { db } from '@/db';
import type { Pricing, NewPricing } from '@/db/schema';

describe('pricingService.getPricingByServiceCode', () => {
  it('returns first result when found', async () => {
    const limit = jest.fn().mockResolvedValue([{ id: '1' }]);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    (db.select as jest.Mock).mockReturnValue({ from });

    const result = await pricingService.getPricingByServiceCode('code');
    expect(result).toEqual({ id: '1' });
  });

  it('returns null when not found', async () => {
    const limit = jest.fn().mockResolvedValue([]);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    (db.select as jest.Mock).mockReturnValue({ from });

    const result = await pricingService.getPricingByServiceCode('code');
    expect(result).toBeNull();
  });
});

describe('pricingService.createPricing', () => {
  it('inserts pricing entry', async () => {
    const returning = jest
      .fn()
      .mockResolvedValue([{ id: '1', serviceCode: 'S', credits: 5 } as Pricing]);
    const values = jest.fn().mockReturnValue({ returning });
    (db.insert as jest.Mock).mockReturnValue({ values });

    const result = await pricingService.createPricing(
      { serviceCode: 'S', credits: 5 } as NewPricing,
    );
    expect(result).toEqual({ id: '1', serviceCode: 'S', credits: 5 });
    expect(values).toHaveBeenCalledWith({ serviceCode: 'S', credits: 5 });
  });
});

describe('pricingService.updatePricing', () => {
  it('updates pricing entry', async () => {
    const returning = jest.fn().mockResolvedValue([{ id: '1', credits: 10 }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    (db.update as jest.Mock).mockReturnValue({ set });

    const result = await pricingService.updatePricing('1', { credits: 10 });
    expect(result).toEqual({ id: '1', credits: 10 });
    expect(set.mock.calls[0][0]).toMatchObject({ credits: 10, updatedAt: expect.any(Date) });
  });
});

describe('pricingService.deactivatePricing', () => {
  it('delegates to updatePricing', async () => {
    const updateSpy = jest
      .spyOn(pricingService, 'updatePricing')
      .mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof pricingService.updatePricing>>,
      );
    await pricingService.deactivatePricing('1');
    expect(updateSpy).toHaveBeenCalledWith('1', { isActive: false });
  });
});

describe('pricingService.calculateCreditsForFeatures', () => {
  it('sums credits for selected features', async () => {
    jest
      .spyOn(pricingService, 'getPricingByServiceCodes')
      .mockResolvedValue([
        { serviceCode: 'eBookGeneration', credits: 5 } as Pricing,
        { serviceCode: 'printOrder', credits: 10 } as Pricing,
      ]);
    const result = await pricingService.calculateCreditsForFeatures({ ebook: true, printed: true });
    expect(result.total).toBe(15);
    expect(result.breakdown).toHaveLength(2);
  });
});

describe('pricingService.getInitialAuthorCredits', () => {
  it('returns credits from pricing table', async () => {
    jest
      .spyOn(pricingService, 'getPricingByServiceCode')
      .mockResolvedValue({ credits: 7 } as Pricing);
    await expect(pricingService.getInitialAuthorCredits()).resolves.toBe(7);
  });

  it('falls back to 5 when missing', async () => {
    jest.spyOn(pricingService, 'getPricingByServiceCode').mockResolvedValue(null);
    await expect(pricingService.getInitialAuthorCredits()).resolves.toBe(5);
  });
});
