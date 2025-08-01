#!/usr/bin/env tsx
import { config } from 'dotenv';
import { db } from '../src/db';
import { pricing } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables from .env.local (development)
config({ path: '.env.local' });

// -----------------------------------------------------------------------------
// Initialize Pricing Data
// 
// This script initializes the pricing table with the current pricing structure
// from the pricing.json config file, but stores only the essential data:
// - Service codes (matching credit event types)
// - Credit costs
// - Configuration flags (mandatory, default, active)
// -----------------------------------------------------------------------------

const PRICING_DATA = [
  {
    serviceCode: 'eBookGeneration',
    credits: 5,
    isActive: true,
  },
  {
    serviceCode: 'printOrder',
    credits: 15,
    isActive: true,
  },
  {
    serviceCode: 'audioBookGeneration',
    credits: 3,
    isActive: true,
  },
  {
    serviceCode: 'AiTextEditing',
    credits: 1,
    isActive: true,
  },
  {
    serviceCode: 'AiImageEditing',
    credits: 1,
    isActive: true,
  },
];

async function initializePricing() {
  console.log('🔄 Initializing pricing data...');

  try {
    for (const pricingEntry of PRICING_DATA) {
      // Check if pricing entry already exists
      const existing = await db
        .select()
        .from(pricing)
        .where(eq(pricing.serviceCode, pricingEntry.serviceCode))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⚠️  Pricing for '${pricingEntry.serviceCode}' already exists, skipping...`);
        continue;
      }

      // Insert new pricing entry
      const [inserted] = await db
        .insert(pricing)
        .values(pricingEntry)
        .returning();

      console.log(`✅ Created pricing for '${inserted.serviceCode}': ${inserted.credits} credits`);
    }

    console.log('🎉 Pricing initialization completed successfully!');

  } catch (error) {
    console.error('❌ Error initializing pricing:', error);
    throw error;
  }
}

async function updateExistingPricing() {
  console.log('🔄 Updating existing pricing data to match current config...');

  try {
    for (const pricingEntry of PRICING_DATA) {
      const [updated] = await db
        .update(pricing)
        .set({
          credits: pricingEntry.credits,
          isActive: pricingEntry.isActive,
          updatedAt: new Date(),
        })
        .where(eq(pricing.serviceCode, pricingEntry.serviceCode))
        .returning();

      if (updated) {
        console.log(`✅ Updated pricing for '${updated.serviceCode}': ${updated.credits} credits`);
      } else {
        console.log(`⚠️  No pricing found for '${pricingEntry.serviceCode}', creating new entry...`);
        const [inserted] = await db
          .insert(pricing)
          .values(pricingEntry)
          .returning();
        console.log(`✅ Created pricing for '${inserted.serviceCode}': ${inserted.credits} credits`);
      }
    }

    console.log('🎉 Pricing update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating pricing:', error);
    throw error;
  }
}

async function listCurrentPricing() {
  console.log('📋 Current pricing in database:');

  try {
    const allPricing = await db
      .select()
      .from(pricing)
      .orderBy(pricing.serviceCode);

    if (allPricing.length === 0) {
      console.log('  No pricing data found.');
      return;
    }

    console.table(allPricing.map(p => ({
      serviceCode: p.serviceCode,
      credits: p.credits,
      isActive: p.isActive,
    })));

  } catch (error) {
    console.error('❌ Error listing pricing:', error);
    throw error;
  }
}

// Script execution
async function main() {
  console.log('🚀 Starting pricing initialization script...');
  
  const command = process.argv[2];
  console.log(`Command: ${command || 'none'}`);

  try {
    switch (command) {
      case 'init':
        await initializePricing();
        break;
      case 'update':
        await updateExistingPricing();
        break;
      case 'list':
        await listCurrentPricing();
        break;
      default:
        console.log('Usage: npx tsx scripts/init-pricing.ts [init|update|list]');
        console.log('');
        console.log('Commands:');
        console.log('  init   - Initialize pricing data (skips existing entries)');
        console.log('  update - Update all pricing entries to match config');
        console.log('  list   - List current pricing data');
        break;
    }
  } catch (error) {
    console.error('❌ Script execution failed:', error);
    throw error;
  }

  console.log('✅ Script completed successfully');
}

// Run the script
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
