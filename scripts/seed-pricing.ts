import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { db } from "../src/db/index";
import { pricing } from "../src/db/schema/pricing";

async function seedPricing() {
  console.log("🌱 Starting pricing seeding...");

  try {    // Define the pricing structure
    const pricingData = [
      {
        serviceCode: "initialAuthorCredits",
        credits: 5,
        isActive: true,
        isMandatory: false,
        isDefault: true,
      },
      {
        serviceCode: "eBookGeneration",
        credits: 5,
        isActive: true,
        isMandatory: false,
        isDefault: true,
      },
      {
        serviceCode: "audioBookGeneration",
        credits: 3,
        isActive: true,
        isMandatory: false,
        isDefault: false,
      },
      {
        serviceCode: "printOrder",
        credits: 20,
        isActive: true,
        isMandatory: false,
        isDefault: false,
      },
    ];

    // Clear existing pricing data
    await db.delete(pricing);
    console.log("🗑️ Cleared existing pricing data");

    // Insert new pricing data
    await db.insert(pricing).values(pricingData);
    console.log(`💰 Created ${pricingData.length} pricing entries`);

    console.log("✅ Pricing seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error during pricing seeding:", error);
    process.exit(1);
  }
}

seedPricing();