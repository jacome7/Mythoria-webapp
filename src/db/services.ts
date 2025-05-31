import { db } from "./index";
import { authors, stories, characters, storyCharacters, creditLedger, authorCreditBalances } from "./schema";
import { eq, and, count, desc } from "drizzle-orm";
import { ClerkUserForSync } from "@/types/clerk";

// Author operations
export const authorService = {  async createAuthor(authorData: { clerkUserId: string; email: string; displayName: string }) {
    const [author] = await db.insert(authors).values(authorData).returning();
    
    // Initialize credits for new author
    await creditService.initializeAuthorCredits(author.authorId, 0);
    
    return author;
  },

  async syncUserOnSignIn(clerkUser: ClerkUserForSync) {
    const currentTime = new Date();
    
    // Try to find existing user
    const existingAuthor = await this.getAuthorByClerkId(clerkUser.id);
    
    if (existingAuthor) {
      // User exists, update lastLoginAt
      const [updatedAuthor] = await db
        .update(authors)
        .set({ lastLoginAt: currentTime })
        .where(eq(authors.clerkUserId, clerkUser.id))
        .returning();
      
      console.log('Updated existing user login time:', updatedAuthor.clerkUserId);
      return updatedAuthor;
    } else {
      // User doesn't exist, create new user
      const primaryEmail = clerkUser.emailAddresses?.find((email) => email.id === clerkUser.primaryEmailAddressId);
      const primaryPhone = clerkUser.phoneNumbers?.find((phone) => phone.id === clerkUser.primaryPhoneNumberId);      const newAuthorData = {
        clerkUserId: clerkUser.id,
        email: primaryEmail?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '',
        displayName: this.buildDisplayName(clerkUser),
        lastLoginAt: currentTime,
        ...(primaryPhone?.phoneNumber && { mobilePhone: primaryPhone.phoneNumber })
      };
        const [newAuthor] = await db.insert(authors).values(newAuthorData).returning();
      
      // Initialize credits for new author
      await creditService.initializeAuthorCredits(newAuthor.authorId, 0);
      
      console.log('Created new user on sign-in:', newAuthor.clerkUserId);
      return newAuthor;
    }
  },

  buildDisplayName(clerkUser: ClerkUserForSync) {
    // Try to build display name from available information
    if (clerkUser.firstName || clerkUser.lastName) {
      return `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
    }
    
    if (clerkUser.username) {
      return clerkUser.username;
    }
      // Fallback to email prefix
    const primaryEmail = clerkUser.emailAddresses?.find((email) => email.id === clerkUser.primaryEmailAddressId);
    const email = primaryEmail?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
    
    if (email) {
      return email.split('@')[0];
    }
    
    return 'Anonymous User';
  },

  async getAuthorById(authorId: string) {
    const [author] = await db.select().from(authors).where(eq(authors.authorId, authorId));
    return author;
  },

  async getAuthorByClerkId(clerkUserId: string) {
    const [author] = await db.select().from(authors).where(eq(authors.clerkUserId, clerkUserId));
    return author;
  },

  async getAuthorByEmail(email: string) {
    const [author] = await db.select().from(authors).where(eq(authors.email, email));
    return author;
  },
  async getAllAuthors() {
    return await db.select().from(authors);
  },

  async getTotalAuthorsCount() {
    const result = await db.select({ value: count() }).from(authors);
    return result[0]?.value || 0;
  }
};

// Story operations
export const storyService = {
  async createStory(storyData: { title: string; authorId: string; plotDescription?: string; synopsis?: string }) {
    const [story] = await db.insert(stories).values(storyData).returning();
    return story;
  },

  async getStoryById(storyId: string) {
    const [story] = await db.select().from(stories).where(eq(stories.storyId, storyId));
    return story;
  },

  async getStoriesByAuthor(authorId: string) {
    return await db.select().from(stories).where(eq(stories.authorId, authorId));
  },

  async getPublishedStories() {
    return await db.select().from(stories).where(eq(stories.status, 'published'));
  },

  async getTotalStoriesCount() {
    const result = await db.select({ value: count() }).from(stories);
    return result[0]?.value || 0;
  },  async updateStory(storyId: string, updates: Partial<{ 
    title: string; 
    plotDescription: string; 
    synopsis: string; 
    place: string;
    targetAudience: string;
    novelStyle: string;
    graphicalStyle: string;
    additionalRequests: string;
    status: 'draft' | 'writing' | 'published' 
  }>) {
    const [story] = await db.update(stories).set(updates).where(eq(stories.storyId, storyId)).returning();
    return story;
  },

  async deleteStory(storyId: string) {
    await db.delete(stories).where(eq(stories.storyId, storyId));
  }
};

// Character operations
export const characterService = {
  async createCharacter(characterData: { name: string; authorId?: string; type?: string; passions?: string; superpowers?: string; physicalDescription?: string; photoUrl?: string }) {
    const [character] = await db.insert(characters).values(characterData).returning();
    return character;
  },

  async getCharactersByAuthor(authorId: string) {
    return await db.select().from(characters).where(eq(characters.authorId, authorId));
  },

  async getCharacterById(characterId: string) {
    const [character] = await db.select().from(characters).where(eq(characters.characterId, characterId));
    return character;
  }
};

// Story-Character relationship operations
export const storyCharacterService = {
  async addCharacterToStory(storyId: string, characterId: string, role?: string) {
    const [relation] = await db.insert(storyCharacters).values({
      storyId,
      characterId,
      role
    }).returning();
    return relation;
  },

  async getCharactersByStory(storyId: string) {
    return await db
      .select({
        character: characters,
        role: storyCharacters.role
      })
      .from(storyCharacters)
      .innerJoin(characters, eq(storyCharacters.characterId, characters.characterId))
      .where(eq(storyCharacters.storyId, storyId));
  },

  async getStoriesByCharacter(characterId: string) {
    return await db
      .select({
        story: stories,
        role: storyCharacters.role
      })
      .from(storyCharacters)
      .innerJoin(stories, eq(storyCharacters.storyId, stories.storyId))
      .where(eq(storyCharacters.characterId, characterId));
  },
  async removeCharacterFromStory(storyId: string, characterId: string) {
    await db
      .delete(storyCharacters)
      .where(and(
        eq(storyCharacters.storyId, storyId),
        eq(storyCharacters.characterId, characterId)
      ));
  }
};

// Credit operations
export const creditService = {  async addCreditEntry(
    authorId: string, 
    amount: number, 
    creditEventType: 'initialCredit' | 'creditPurchase' | 'eBookGeneration' | 'audioBookGeneration' | 'printOrder' | 'refund',
    storyId?: string,
    purchaseId?: string
  ) {
    const [entry] = await db.insert(creditLedger).values({
      authorId,
      amount,
      creditEventType,
      storyId,
      purchaseId
    }).returning();
    return entry;
  },

  async getAuthorCreditBalance(authorId: string) {
    const [balance] = await db
      .select()
      .from(authorCreditBalances)
      .where(eq(authorCreditBalances.authorId, authorId));
    
    return balance?.totalCredits ?? 0;
  },

  async getCreditHistory(authorId: string, limit: number = 50) {
    return await db
      .select({
        id: creditLedger.id,
        amount: creditLedger.amount,
        creditEventType: creditLedger.creditEventType,
        createdAt: creditLedger.createdAt,
        storyId: creditLedger.storyId,
        purchaseId: creditLedger.purchaseId
      })
      .from(creditLedger)
      .where(eq(creditLedger.authorId, authorId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit);
  },
  async initializeAuthorCredits(authorId: string, initialAmount: number = 0) {
    // Add initial credit entry
    await this.addCreditEntry(authorId, initialAmount, 'initialCredit');
    return initialAmount;
  },

  async canAfford(authorId: string, amount: number) {
    const balance = await this.getAuthorCreditBalance(authorId);
    return balance >= amount;
  },

  async deductCredits(
    authorId: string, 
    amount: number, 
    eventType: 'eBookGeneration' | 'audioBookGeneration' | 'printOrder',
    storyId?: string
  ) {
    const canAfford = await this.canAfford(authorId, amount);
    if (!canAfford) {
      throw new Error('Insufficient credits');
    }
    
    return await this.addCreditEntry(authorId, -amount, eventType, storyId);
  },
  async addCredits(
    authorId: string, 
    amount: number, 
    eventType: 'creditPurchase' | 'refund',
    purchaseId?: string
  ) {
    return await this.addCreditEntry(authorId, amount, eventType, undefined, purchaseId);
  }
};
