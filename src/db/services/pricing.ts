import { db } from '@/db';
import { initialAuthorGrant } from '@/constants/pricing';
import {
  pricing,
  biographerBookVersions,
  stories,
  type Pricing,
  type NewPricing,
} from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// Pricing Service
// -----------------------------------------------------------------------------

export class PricingService {
  async getStoryProductProfile(storyId: string): Promise<'standard' | 'biographer'> {
    if (process.env.BIOGRAPHER_ENABLED !== 'true') {
      const [story] = await db
        .select({ additionalRequests: stories.additionalRequests })
        .from(stories)
        .where(eq(stories.storyId, storyId))
        .limit(1);
      return story?.additionalRequests?.includes('[MYTHORIA_BIOGRAPHER_V1]')
        ? 'biographer'
        : 'standard';
    }
    const [project] = await db
      .select({ id: biographerBookVersions.storyId })
      .from(biographerBookVersions)
      .where(eq(biographerBookVersions.storyId, storyId))
      .limit(1);
    return project ? 'biographer' : 'standard';
  }

  /**
   * Get all pricing entries (including inactive ones - for admin)
   */
  async getAllPricing(): Promise<Pricing[]> {
    return await db.select().from(pricing).orderBy(desc(pricing.createdAt));
  }

  /**
   * Get all active pricing entries
   */
  async getActivePricing(): Promise<Pricing[]> {
    return await db.select().from(pricing).where(eq(pricing.isActive, true));
  }

  /**
   * Get pricing by service code
   */
  async getPricingByServiceCode(serviceCode: string): Promise<Pricing | null> {
    const result = await db
      .select()
      .from(pricing)
      .where(and(eq(pricing.serviceCode, serviceCode), eq(pricing.isActive, true)))
      .limit(1);

    return result[0] || null;
  } /**
   * Get all pricing entries for specific service codes
   */
  async getPricingByServiceCodes(serviceCodes: string[]): Promise<Pricing[]> {
    if (serviceCodes.length === 0) return [];

    return await db
      .select()
      .from(pricing)
      .where(and(eq(pricing.isActive, true), inArray(pricing.serviceCode, serviceCodes)));
  }

  /**
   * Get pricing for delivery options (for compatibility with existing code)
   */
  async getDeliveryOptionsPricing(): Promise<{
    ebook: Pricing | null;
    printed: Pricing | null;
    audiobook: Pricing | null;
  }> {
    const serviceCodes = ['eBookGeneration', 'printOrder', 'audioBookGeneration'];
    const pricingEntries = await this.getPricingByServiceCodes(serviceCodes);

    const pricingMap = pricingEntries.reduce(
      (acc, entry) => {
        acc[entry.serviceCode] = entry;
        return acc;
      },
      {} as Record<string, Pricing>,
    );

    return {
      ebook: pricingMap['eBookGeneration'] || null,
      printed: pricingMap['printOrder'] || null,
      audiobook: pricingMap['audioBookGeneration'] || null,
    };
  }

  /**
   * Create a new pricing entry
   */
  async createPricing(data: NewPricing): Promise<Pricing> {
    const result = await db.insert(pricing).values(data).returning();

    return result[0];
  }

  /**
   * Update pricing entry
   */
  async updatePricing(id: string, data: Partial<NewPricing>): Promise<Pricing | null> {
    const result = await db
      .update(pricing)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(pricing.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Deactivate pricing entry
   */
  async deactivatePricing(id: string): Promise<Pricing | null> {
    return await this.updatePricing(id, { isActive: false });
  }

  /**
   * Calculate total credits for selected features
   */
  async calculateCreditsForFeatures(
    features: {
      ebook?: boolean;
      printed?: boolean;
      audiobook?: boolean;
    },
    profile: 'standard' | 'biographer' = 'standard',
  ): Promise<{ total: number; breakdown: Array<{ serviceCode: string; credits: number }> }> {
    const serviceCodes = [];
    if (features.ebook)
      serviceCodes.push(profile === 'biographer' ? 'biographerBookGeneration' : 'eBookGeneration');
    if (features.printed)
      serviceCodes.push(profile === 'biographer' ? 'biographerPrintOrder' : 'printOrder');
    if (features.audiobook)
      serviceCodes.push(
        profile === 'biographer' ? 'biographerAudioBookGeneration' : 'audioBookGeneration',
      );

    if (serviceCodes.length === 0) {
      return { total: 0, breakdown: [] };
    }

    const pricingEntries = await this.getPricingByServiceCodes(serviceCodes);
    if (
      profile === 'biographer' &&
      serviceCodes.some(
        (code) => !pricingEntries.some((entry) => entry.serviceCode === code && entry.credits > 0),
      )
    ) {
      throw new Error('Biographer pricing is not configured for every selected product');
    }
    const breakdown = pricingEntries.map((entry) => ({
      serviceCode: entry.serviceCode,
      credits: entry.credits,
    }));

    const total = breakdown.reduce((sum, item) => sum + item.credits, 0);

    return { total, breakdown };
  }

  /**
   * Get initial author credits amount from pricing table
   */
  async getInitialAuthorCredits(): Promise<number> {
    const pricing = await this.getPricingByServiceCode('initialAuthorCredits');
    return initialAuthorGrant(pricing?.credits);
  }
}

// Export singleton instance
export const pricingService = new PricingService();
