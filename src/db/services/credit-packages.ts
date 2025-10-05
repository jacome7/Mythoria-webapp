import { db } from '@/db';
import { creditPackages, type CreditPackage, type NewCreditPackage } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// Credit Packages Service
// -----------------------------------------------------------------------------

export class CreditPackagesService {
  /**
   * Get all active credit packages ordered by price ascending
   */
  async getActiveCreditPackages(): Promise<CreditPackage[]> {
    return await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.isActive, true))
      .orderBy(asc(creditPackages.price));
  }

  /**
   * Get all credit packages (including inactive ones - for admin) ordered by price ascending
   */
  async getAllCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages).orderBy(asc(creditPackages.price));
  }

  /**
   * Get credit package by ID
   */
  async getCreditPackageById(id: string): Promise<CreditPackage | null> {
    const result = await db.select().from(creditPackages).where(eq(creditPackages.id, id)).limit(1);

    return result[0] || null;
  }

  /**
   * Get credit package by key
   */
  async getCreditPackageByKey(key: string): Promise<CreditPackage | null> {
    const result = await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.key, key))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new credit package
   */
  async createCreditPackage(data: NewCreditPackage): Promise<CreditPackage> {
    const result = await db.insert(creditPackages).values(data).returning();

    return result[0];
  }

  /**
   * Update credit package
   */
  async updateCreditPackage(
    id: string,
    data: Partial<NewCreditPackage>,
  ): Promise<CreditPackage | null> {
    const result = await db
      .update(creditPackages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(creditPackages.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Deactivate credit package
   */
  async deactivateCreditPackage(id: string): Promise<CreditPackage | null> {
    return await this.updateCreditPackage(id, { isActive: false });
  }

  /**
   * Seed initial credit packages (used during migration/setup)
   */
  async seedInitialCreditPackages(): Promise<void> {
    const initialPackages: NewCreditPackage[] = [
      {
        credits: 5,
        price: '5.00',
        popular: false,
        bestValue: false,
        icon: 'FaShoppingCart',
        key: 'credits5',
      },
      {
        credits: 10,
        price: '9.00',
        popular: false,
        bestValue: false,
        icon: 'FaShoppingCart',
        key: 'credits10',
      },
      {
        credits: 30,
        price: '25.00',
        popular: false,
        bestValue: false,
        icon: 'FaShoppingCart',
        key: 'credits30',
      },
      {
        credits: 100,
        price: '79.00',
        popular: false,
        bestValue: false,
        icon: 'FaShoppingCart',
        key: 'credits100',
      },
    ];

    // Insert each package, but skip if key already exists
    for (const packageData of initialPackages) {
      try {
        await this.createCreditPackage(packageData);
        console.log(`✅ Created credit package: ${packageData.key}`);
      } catch (error: unknown) {
        if ((error as { code?: string })?.code === '23505') {
          // Unique constraint violation
          console.log(`ℹ️  Credit package already exists: ${packageData.key}`);
        } else {
          console.error(`❌ Error creating credit package ${packageData.key}:`, error);
          throw error;
        }
      }
    }
  }
}

// Export singleton instance
export const creditPackagesService = new CreditPackagesService();
