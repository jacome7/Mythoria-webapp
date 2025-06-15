import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

console.log("🌱 Database seeding is disabled per user configuration.");
console.log("✅ Seeding process completed (no-op).");
console.log("ℹ️  Note: Database schema has been updated with character_role enum and role columns.");

// Export for potential future use
export async function seedDatabase() {
  console.log("🌱 Database seeding is disabled per configuration.");
  console.log("✅ Seeding process completed (no-op).");
}

// Only run if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .catch((err) => {
      console.error("❌ Error during database seeding:", err);
      process.exit(1);
    })
    .finally(async () => {
      console.log("🌱 Seeding script finished.");
    });
}
