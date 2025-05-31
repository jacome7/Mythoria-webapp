import { db } from "./index";
import {
  authors,
  stories,
  characters,
  storyCharacters,
  paymentMethods,
  addresses,
  creditLedger,
  NewAuthor,
  NewStory,
  NewCharacter,
  NewStoryCharacter,
  NewPaymentMethod,
  NewAddress,
  storyStatusEnum,
  paymentProviderEnum,
} from "./schema";
import { creditService } from "./services";
import { eq } from "drizzle-orm";

// Helper to get a random element from an array
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate a random date
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Sample data arrays
const sampleDisplayNames = ["StoryWeaver", "MythMaker", "TaleSpinner", "WordSmith", "InkSlinger"];
const sampleStoryTitles = [
  "The Dragon's Prophecy",
  "Whispers of the Ancient Forest",
  "Chronicles of the Starlight City",
  "The Last Spellbinder",
  "Journey to the Crystal Caves",
];
const sampleCharacterNames = ["Aria", "Kael", "Lyra", "Ronan", "Elara", "Jax", "Seraphina"];
const sampleCharacterTypes = ["sorceress", "warrior", "bard", "rogue", "healer", "inventor", "guardian"];
const sampleCountries = ["US", "CA", "GB", "AU", "DE", "FR"];
const sampleCities = ["New York", "Toronto", "London", "Sydney", "Berlin", "Paris"];
const sampleStreetLines = ["123 Main St", "456 Oak Ave", "789 Pine Ln", "101 Maple Dr", "202 Birch Rd"];

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data (optional, be careful in production)
  // console.log("🗑️ Clearing existing data...");
  // await db.delete(storyCharacters);
  // await db.delete(stories);
  // await db.delete(characters);
  // await db.delete(paymentMethods);
  // await db.delete(addresses);
  // await db.delete(authors);
  // console.log("🗑️ Data cleared.");
  // 1. Create Authors
  console.log("👤 Creating authors...");
  const createdAuthors: NewAuthor[] = [];
  for (let i = 0; i < 10; i++) {
    createdAuthors.push({
      clerkUserId: `clerk_test_user_${i + 1}`,
      displayName: `${getRandomElement(sampleDisplayNames)}${i + 1}`,
      email: `author${i + 1}@mythoria.com`,
      fiscalNumber: `FN${Math.random().toString().slice(2, 12)}`,
      mobilePhone: `+1${Math.random().toString().slice(2, 12)}`,
      lastLoginAt: getRandomDate(new Date(2024, 0, 1), new Date()),
      preferredLocale: getRandomElement(["en", "es", "fr"]),
    });
  }
  const insertedAuthors = await db.insert(authors).values(createdAuthors).returning();
  console.log(`👤 ${insertedAuthors.length} authors created.`);

  // 2. Create Payment Methods and Addresses for Authors
  console.log("💳 Creating payment methods and addresses...");
  for (const author of insertedAuthors) {
    if (!author.authorId) continue;

    // Create a payment method
    const newPaymentMethod: NewPaymentMethod = {
      authorId: author.authorId,
      provider: getRandomElement(paymentProviderEnum.enumValues),
      providerRef: `pm_ref_${Math.random().toString(36).substring(2, 15)}`,
      brand: getRandomElement(["Visa", "Mastercard", "Amex", "PayPal"]),
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      expMonth: Math.floor(1 + Math.random() * 12),
      expYear: new Date().getFullYear() + Math.floor(Math.random() * 5) + 1,
      isDefault: true,
      billingDetails: { name: author.displayName, email: author.email }
    };
    await db.insert(paymentMethods).values(newPaymentMethod);

    // Create a billing address
    const newBillingAddress: NewAddress = {
      authorId: author.authorId,
      type: "billing",
      line1: getRandomElement(sampleStreetLines),
      city: getRandomElement(sampleCities),
      postalCode: Math.random().toString().slice(2, 8),
      country: getRandomElement(sampleCountries),
      phone: author.mobilePhone,
    };
    await db.insert(addresses).values(newBillingAddress);

    // Create a delivery address (optional)
    if (Math.random() > 0.5) {
      const newDeliveryAddress: NewAddress = {
        authorId: author.authorId,
        type: "delivery",
        line1: getRandomElement(sampleStreetLines),
        city: getRandomElement(sampleCities),
        postalCode: Math.random().toString().slice(2, 8),
        country: getRandomElement(sampleCountries),
        phone: `+1${Math.random().toString().slice(2, 12)}`,
      };
      await db.insert(addresses).values(newDeliveryAddress);
    }
  }
  console.log("💳 Payment methods and addresses created.");


  // 3. Create Characters
  console.log("🧑‍🎨 Creating characters...");
  const createdCharacters: NewCharacter[] = [];
  for (let i = 0; i < 30; i++) {
    const isAuthorSpecific = Math.random() > 0.3; // 70% chance character is tied to an author
    createdCharacters.push({
      authorId: isAuthorSpecific ? getRandomElement(insertedAuthors).authorId : null,
      name: `${getRandomElement(sampleCharacterNames)} ${i + 1}`,
      type: getRandomElement(sampleCharacterTypes),
      passions: `Loves ${getRandomElement(["adventures", "magic", "technology", "nature"])}.`,
      superpowers: `Can ${getRandomElement(["fly", "control elements", "talk to animals", "become invisible"])}.`,
      physicalDescription: `A ${getRandomElement(["tall", "short", "mysterious", "agile"])} figure.`,
      photoUrl: `https://picsum.photos/seed/${Math.random()}/200/300`,
    });
  }
  const insertedCharacters = await db.insert(characters).values(createdCharacters).returning();
  console.log(`🧑‍🎨 ${insertedCharacters.length} characters created.`);

  // 4. Create Stories
  console.log("📚 Creating stories...");
  const createdStories: NewStory[] = [];
  for (let i = 0; i < 20; i++) {
    const author = getRandomElement(insertedAuthors);
    createdStories.push({
      authorId: author.authorId!,
      title: `${getRandomElement(sampleStoryTitles)} #${i + 1}`,
      plotDescription: `An epic tale of ${getRandomElement(["courage", "mystery", "discovery", "friendship"])}.`,
      synopsis: `Follow the journey of our heroes as they face ${getRandomElement(["ancient evils", "unknown lands", "powerful artifacts"])}.`,
      targetAudience: getRandomElement(["Young Adults", "Children", "Adults", "Teens"]),
      novelStyle: getRandomElement(["Fantasy", "Sci-Fi", "Adventure", "Mystery", "Kids Book"]),
      graphicalStyle: getRandomElement(["Anime", "Cartoonish", "Realistic", "Abstract", "Pixel Art"]),
      status: getRandomElement(storyStatusEnum.enumValues),
      features: { ebook: Math.random() > 0.5, printed: Math.random() > 0.3, audio: Math.random() > 0.2 },
      mediaLinks: { cover: `https://picsum.photos/seed/storycover${i}/400/600` },
    });
  }
  const insertedStories = await db.insert(stories).values(createdStories).returning();
  console.log(`📚 ${insertedStories.length} stories created.`);

  // 5. Link Stories and Characters (StoryCharacters)
  console.log("🔗 Linking stories and characters...");
  const createdStoryCharacters: NewStoryCharacter[] = [];
  for (const story of insertedStories) {
    if (!story.storyId) continue;
    const numCharactersInStory = Math.floor(1 + Math.random() * 4); // 1 to 4 characters per story
    const availableCharacters = [...insertedCharacters]; // Avoid duplicate characters in the same story for this seeding

    for (let i = 0; i < numCharactersInStory; i++) {
      if (availableCharacters.length === 0) break;
      const charIndex = Math.floor(Math.random() * availableCharacters.length);
      const character = availableCharacters.splice(charIndex, 1)[0]; // Pick and remove

      if (character && character.characterId) {
        createdStoryCharacters.push({
          storyId: story.storyId,
          characterId: character.characterId,
          role: getRandomElement(["Protagonist", "Antagonist", "Supporting Character", "Mentor", "Sidekick"]),
        });
      }
    }
  }
  if (createdStoryCharacters.length > 0) {
    await db.insert(storyCharacters).values(createdStoryCharacters);
    console.log(`🔗 ${createdStoryCharacters.length} story-character links created.`);
  } else {
    console.log("🔗 No story-character links to create.");
  }

  // Initialize credits for existing authors who don't have credit entries yet
  console.log("💰 Initializing credits for existing authors...");
  const existingAuthors = await db.select({ authorId: authors.authorId }).from(authors);
  
  for (const author of existingAuthors) {
    // Check if author already has credit entries
    const existingCredits = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.authorId, author.authorId))
      .limit(1);
    
    if (existingCredits.length === 0) {
      // Initialize with some starter credits (e.g., 10 credits)
      await creditService.initializeAuthorCredits(author.authorId, 10);
      console.log(`💰 Initialized 10 credits for author ${author.authorId}`);
    }
  }

  console.log("✅ Database seeding completed successfully!");
}

seedDatabase()
  .catch((err) => {
    console.error("❌ Error during database seeding:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Optionally close the database connection if your db instance needs it
    // await db.end(); // Or whatever your db client's close method is
    console.log("🌱 Seeding script finished.");
  });
