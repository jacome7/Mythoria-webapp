import { db } from './index';
import {
  authors,
  stories,
  characters,
  storyCharacters,
  creditLedger,
  authorCreditBalances,
  storyRatings,
  aiEdits,
  chapters,
  promotionCodes,
  promotionCodeRedemptions,
} from './schema';
import { eq, and, count, desc, sql, asc, max } from 'drizzle-orm';
import { ClerkUserForSync } from '@/types/clerk';
import { pricingService } from './services/pricing';
import { CharacterRole, CharacterAge, isValidCharacterAge } from '../types/character-enums';
import { toAbsoluteImageUrl, toRelativeImagePath } from '../utils/image-url';
import { normalizeLocale, detectUserLocaleFromEmail } from '@/utils/locale-utils';

// Export payment service
export { paymentService } from './services/payment';
export { creditPackagesService } from './services/credit-packages';
export { blogService } from './services/blog';

// Author operations
export const authorService = {
  async createAuthor(authorData: {
    clerkUserId: string;
    email: string;
    displayName: string;
    preferredLocale?: string;
    mobilePhone?: string;
  }) {
    const normalizedLocale = normalizeLocale(authorData.preferredLocale);
    const [author] = await db
      .insert(authors)
      .values({
        clerkUserId: authorData.clerkUserId,
        email: authorData.email,
        displayName: authorData.displayName,
        preferredLocale: normalizedLocale,
        ...(authorData.mobilePhone && { mobilePhone: authorData.mobilePhone }),
      })
      .returning();

    // Initialize credits for new author with initial credits from pricing table
    const initialCredits = await pricingService.getInitialAuthorCredits();
    await creditService.initializeAuthorCredits(author.authorId, initialCredits);

    return author;
  },
  async syncUserOnSignIn(clerkUser: ClerkUserForSync) {
    const currentTime = new Date();

    // Debug logging to see what Clerk provides
    console.log('[syncUserOnSignIn] Clerk user data:', {
      userId: clerkUser.id,
      hasPhoneNumbers: !!clerkUser.phoneNumbers,
      phoneNumbersCount: clerkUser.phoneNumbers?.length || 0,
      primaryPhoneNumberId: clerkUser.primaryPhoneNumberId,
      phoneNumbers: clerkUser.phoneNumbers,
      emailAddresses: clerkUser.emailAddresses?.map((e) => ({ id: e.id, email: e.emailAddress })),
    });

    // Try to find existing user by clerkUserId first
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
      // User doesn't exist, try to create new user
      const primaryEmail = clerkUser.emailAddresses?.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      );

      // Try to get primary phone, or fall back to first phone if primary is not set
      const primaryPhone = clerkUser.primaryPhoneNumberId
        ? clerkUser.phoneNumbers?.find((phone) => phone.id === clerkUser.primaryPhoneNumberId)
        : clerkUser.phoneNumbers?.[0]; // Fallback to first phone

      console.log('[syncUserOnSignIn] Primary phone extraction:', {
        primaryPhoneNumberId: clerkUser.primaryPhoneNumberId,
        foundPrimaryPhone: !!primaryPhone,
        phoneNumber: primaryPhone?.phoneNumber,
        usedFallback: !clerkUser.primaryPhoneNumberId && !!primaryPhone,
      });

      const email = primaryEmail?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
      const detectedLocale = detectUserLocaleFromEmail(email);
      const newAuthorData = {
        clerkUserId: clerkUser.id,
        email,
        displayName: this.buildDisplayName(clerkUser),
        lastLoginAt: currentTime,
        createdAt: currentTime,
        preferredLocale: normalizeLocale(detectedLocale),
        ...(primaryPhone?.phoneNumber && { mobilePhone: primaryPhone.phoneNumber }),
      };

      console.log('[syncUserOnSignIn] Creating author with data:', {
        clerkUserId: clerkUser.id,
        email,
        hasMobilePhone: !!newAuthorData.mobilePhone,
        mobilePhone: newAuthorData.mobilePhone,
      });

      try {
        // Try to insert new user
        const [newAuthor] = await db.insert(authors).values(newAuthorData).returning();

        // Initialize credits for new author with initial credits from pricing table
        const initialCredits = await pricingService.getInitialAuthorCredits();
        await creditService.initializeAuthorCredits(newAuthor.authorId, initialCredits);
        console.log(
          'Created new user on sign-in:',
          newAuthor.clerkUserId,
          `with ${initialCredits} initial credits`,
          'mobilePhone:',
          newAuthor.mobilePhone,
        );
        return newAuthor;
      } catch (error: unknown) {
        // Type guard for error object
        const isDbError = (
          err: unknown,
        ): err is { cause?: { code?: string; constraint?: string }; message?: string } => {
          return typeof err === 'object' && err !== null;
        };

        if (isDbError(error)) {
          // Check if it's a duplicate email constraint violation
          const isDuplicateEmail =
            (error.cause?.code === '23505' && error.cause?.constraint === 'authors_email_unique') ||
            error.message?.includes(
              'duplicate key value violates unique constraint "authors_email_unique"',
            );
          if (isDuplicateEmail) {
            console.log(
              'Duplicate email detected in syncUserOnSignIn, updating existing user with new clerkUserId:',
              clerkUser.id,
            );

            try {
              // Update existing user with new clerkUserId (user signed in with different OAuth provider)
              const [updatedAuthor] = await db
                .update(authors)
                .set({
                  clerkUserId: clerkUser.id, // Update to new clerkId
                  displayName: this.buildDisplayName(clerkUser),
                  lastLoginAt: currentTime,
                  preferredLocale: normalizeLocale(detectedLocale),
                  ...(primaryPhone?.phoneNumber && { mobilePhone: primaryPhone.phoneNumber }),
                })
                .where(eq(authors.email, newAuthorData.email))
                .returning();

              console.log(
                'User updated (clerkUserId changed) in syncUserOnSignIn for email:',
                newAuthorData.email,
              );
              return updatedAuthor;
            } catch (updateError) {
              console.error(
                'Error updating user after duplicate email in syncUserOnSignIn:',
                updateError,
              );
              throw updateError;
            }
          } else {
            // Re-throw other errors
            console.error('Error creating user in syncUserOnSignIn:', error);
            throw error;
          }
        } else {
          // If error doesn't match expected structure, re-throw
          console.error('Unexpected error creating user in syncUserOnSignIn:', error);
          throw error;
        }
      }
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
    const primaryEmail = clerkUser.emailAddresses?.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );
    const email = primaryEmail?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;

    if (email) {
      return email.split('@')[0];
    }

    return '';
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
  },

  async getAuthorCreditBalance(authorId: string) {
    return await creditService.getAuthorCreditBalance(authorId);
  },
};

// Story operations
export const storyService = {
  async createStory(storyData: {
    title: string;
    authorId: string;
    plotDescription?: string;
    storyLanguage?: string;
    synopsis?: string;
    customAuthor?: string;
    dedicationMessage?: string;
    status?: 'temporary' | 'draft' | 'writing' | 'published';
  }) {
    const [story] = await db.insert(stories).values(storyData).returning();
    return story;
  },

  async getStoryById(storyId: string) {
    const [story] = await db.select().from(stories).where(eq(stories.storyId, storyId));
    if (!story) return story;

    return {
      ...story,
      featureImageUri: toAbsoluteImageUrl(story.featureImageUri),
    };
  },

  async getStoriesByAuthor(authorId: string) {
    const storyResults = await db.select().from(stories).where(eq(stories.authorId, authorId));

    return storyResults.map((story) => ({
      ...story,
      featureImageUri: toAbsoluteImageUrl(story.featureImageUri),
    }));
  },
  async getPublishedStories() {
    return await db.select().from(stories).where(eq(stories.status, 'published'));
  },
  async getFeaturedPublicStories(filters?: {
    targetAudience?: string;
    graphicalStyle?: string;
    storyLanguage?: string;
  }) {
    const conditions = [eq(stories.isPublic, true), eq(stories.isFeatured, true)];

    if (filters) {
      if (filters.targetAudience) {
        conditions.push(
          eq(
            stories.targetAudience,
            filters.targetAudience as
              | 'children_0-2'
              | 'children_3-6'
              | 'children_7-10'
              | 'children_11-14'
              | 'young_adult_15-17'
              | 'adult_18+'
              | 'all_ages',
          ),
        );
      }
      if (filters.graphicalStyle) {
        conditions.push(
          eq(
            stories.graphicalStyle,
            filters.graphicalStyle as
              | 'cartoon'
              | 'realistic'
              | 'watercolor'
              | 'digital_art'
              | 'hand_drawn'
              | 'minimalist'
              | 'vintage'
              | 'comic_book'
              | 'anime'
              | 'pixar_style'
              | 'disney_style'
              | 'sketch'
              | 'oil_painting'
              | 'colored_pencil',
          ),
        );
      }
      if (filters.storyLanguage) {
        conditions.push(eq(stories.storyLanguage, filters.storyLanguage));
      }
    }

    // First get the stories with their average ratings
    const ratingsSubquery = db
      .select({
        storyId: storyRatings.storyId,
        averageRating: sql<number>`ROUND(AVG(CAST(${storyRatings.rating}::text AS INTEGER)), 1)`.as(
          'average_rating',
        ),
        ratingCount: count(storyRatings.ratingId).as('rating_count'),
      })
      .from(storyRatings)
      .groupBy(storyRatings.storyId)
      .as('ratings_data');
    const result = await db
      .select({
        storyId: stories.storyId,
        title: stories.title,
        slug: stories.slug,
        featureImageUri: stories.featureImageUri,
        author: authors.displayName,
        createdAt: stories.createdAt,
        targetAudience: stories.targetAudience,
        graphicalStyle: stories.graphicalStyle,
        storyLanguage: stories.storyLanguage,
        averageRating: ratingsSubquery.averageRating,
        ratingCount: ratingsSubquery.ratingCount,
      })
      .from(stories)
      .innerJoin(authors, eq(stories.authorId, authors.authorId))
      .leftJoin(ratingsSubquery, eq(stories.storyId, ratingsSubquery.storyId))
      .where(and(...conditions))
      .orderBy(desc(stories.createdAt)); // Convert string rating to number and ensure proper types
    return result.map((story) => ({
      ...story,
      featureImageUri: toAbsoluteImageUrl(story.featureImageUri),
      averageRating: story.averageRating
        ? parseFloat(story.averageRating as unknown as string)
        : null,
      ratingCount: story.ratingCount || 0,
    }));
  },

  async getTotalStoriesCount() {
    const result = await db.select({ value: count() }).from(stories);
    return result[0]?.value || 0;
  },
  async updateStory(storyId: string, updates: Partial<typeof stories.$inferInsert>) {
    // Convert any image URLs to relative paths for storage
    const processedUpdates = {
      ...updates,
      ...(updates.featureImageUri !== undefined && {
        featureImageUri: toRelativeImagePath(updates.featureImageUri),
      }),
    };

    const [story] = await db
      .update(stories)
      .set(processedUpdates)
      .where(eq(stories.storyId, storyId))
      .returning();

    return {
      ...story,
      featureImageUri: toAbsoluteImageUrl(story.featureImageUri),
    };
  },

  async deleteStory(storyId: string) {
    await db.delete(stories).where(eq(stories.storyId, storyId));
  },
};

// Character operations
export const characterService = {
  async createCharacter(characterData: {
    name: string;
    authorId?: string;
    type?: string;
    role?: CharacterRole | null;
    age?: string | null;
    traits?: string[];
    characteristics?: string;
    physicalDescription?: string;
    photoUrl?: string;
  }) {
    // Only validate age, type is now free text
    const validatedData = {
      ...characterData,
      type: characterData.type || undefined, // Accept any string for type
      age:
        characterData.age && isValidCharacterAge(characterData.age)
          ? (characterData.age as CharacterAge)
          : undefined,
      photoUrl: toRelativeImagePath(characterData.photoUrl),
    };

    console.log('[characterService.createCharacter] Input type:', characterData.type);
    console.log('[characterService.createCharacter] Validated type:', validatedData.type);

    const [character] = await db.insert(characters).values(validatedData).returning();
    console.log('[characterService.createCharacter] Created character with type:', character.type);

    return {
      ...character,
      photoUrl: toAbsoluteImageUrl(character.photoUrl),
    };
  },

  async getCharactersByAuthor(authorId: string) {
    const characterResults = await db
      .select()
      .from(characters)
      .where(eq(characters.authorId, authorId));

    return characterResults.map((character) => ({
      ...character,
      photoUrl: toAbsoluteImageUrl(character.photoUrl),
    }));
  },

  async getCharacterById(characterId: string) {
    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.characterId, characterId));
    if (!character) return character;

    return {
      ...character,
      photoUrl: toAbsoluteImageUrl(character.photoUrl),
    };
  },
};

// Story-Character relationship operations
export const storyCharacterService = {
  async addCharacterToStory(
    storyId: string,
    characterId: string,
    role?:
      | 'protagonist'
      | 'antagonist'
      | 'supporting'
      | 'mentor'
      | 'comic_relief'
      | 'love_interest'
      | 'sidekick'
      | 'narrator'
      | 'other'
      | null,
  ) {
    const [relation] = await db
      .insert(storyCharacters)
      .values({
        storyId,
        characterId,
        role,
      })
      .returning();
    return relation;
  },

  async getCharactersByStory(storyId: string) {
    const results = await db
      .select({
        character: characters,
        role: storyCharacters.role,
      })
      .from(storyCharacters)
      .innerJoin(characters, eq(storyCharacters.characterId, characters.characterId))
      .where(eq(storyCharacters.storyId, storyId));

    return results.map((result) => ({
      ...result,
      character: {
        ...result.character,
        photoUrl: toAbsoluteImageUrl(result.character.photoUrl),
      },
    }));
  },

  async getStoriesByCharacter(characterId: string) {
    const results = await db
      .select({
        story: stories,
        role: storyCharacters.role,
      })
      .from(storyCharacters)
      .innerJoin(stories, eq(storyCharacters.storyId, stories.storyId))
      .where(eq(storyCharacters.characterId, characterId));

    return results.map((result) => ({
      ...result,
      story: {
        ...result.story,
        featureImageUri: toAbsoluteImageUrl(result.story.featureImageUri),
      },
    }));
  },
  async removeCharacterFromStory(storyId: string, characterId: string) {
    await db
      .delete(storyCharacters)
      .where(
        and(eq(storyCharacters.storyId, storyId), eq(storyCharacters.characterId, characterId)),
      );
  },
};

// Credit operations
export const creditService = {
  async addCreditEntry(
    authorId: string,
    amount: number,
    creditEventType:
      | 'initialCredit'
      | 'creditPurchase'
      | 'eBookGeneration'
      | 'audioBookGeneration'
      | 'printOrder'
      | 'selfPrinting'
      | 'refund'
      | 'voucher'
      | 'promotion'
      | 'textEdit'
      | 'imageEdit',
    storyId?: string,
    purchaseId?: string,
  ) {
    // Insert the credit ledger entry
    const [entry] = await db
      .insert(creditLedger)
      .values({
        authorId,
        amount,
        creditEventType,
        storyId,
        purchaseId,
      })
      .returning();

    // Update or insert the author's credit balance
    await db
      .insert(authorCreditBalances)
      .values({
        authorId,
        totalCredits: amount,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: authorCreditBalances.authorId,
        set: {
          totalCredits: sql`${authorCreditBalances.totalCredits} + ${amount}`,
          lastUpdated: new Date(),
        },
      });

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
        purchaseId: creditLedger.purchaseId,
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
    eventType:
      | 'eBookGeneration'
      | 'audioBookGeneration'
      | 'printOrder'
      | 'selfPrinting'
      | 'textEdit'
      | 'imageEdit',
    storyId?: string,
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
    eventType: 'creditPurchase' | 'refund' | 'voucher' | 'promotion',
    purchaseId?: string,
  ) {
    return await this.addCreditEntry(authorId, amount, eventType, undefined, purchaseId);
  },
};

// -----------------------------------------------------------------------------
// Promotion Code (Voucher) Service - Simple implementation
// -----------------------------------------------------------------------------
export const promotionCodeService = {
  async redeem(authorId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { ok: false, error: 'invalid_code' as const };
    }

    // UX Simplification (Phase 1): All failure reasons intentionally mapped to 'invalid_code'.
    // This keeps user messaging consistent and avoids leaking internal state such as
    // per-user/global limits or activation windows. Internally we could later add
    // logging/metrics with distinct reasons without changing the external contract.
    // Future (Referral Phase): If promo.type === 'REFERRAL', we would also credit the
    // referrerAuthorId here (when defined) and potentially use a different creditEventType.

    // Fetch code
    const [promo] = await db.select().from(promotionCodes).where(eq(promotionCodes.code, code));
    if (!promo || !promo.active) {
      return { ok: false, error: 'invalid_code' as const }; // unified generic per requirement 4
    }
    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) {
      return { ok: false, error: 'invalid_code' as const };
    }
    if (promo.validUntil && now > promo.validUntil) {
      return { ok: false, error: 'invalid_code' as const };
    }

    // Count existing redemptions (simple approach)
    // Previous implementation used db.execute() and assumed the return value was a plain array.
    // Depending on the driver (pg vs postgres-js) db.execute can return an object with a rows property,
    // which caused a runtime TypeError when destructuring. Use Drizzle's query builder + count() instead
    // which reliably returns an array with a single row containing the aggregate value.
    const userCountResult = await db
      .select({ count: count() })
      .from(promotionCodeRedemptions)
      .where(
        and(
          eq(promotionCodeRedemptions.promotionCodeId, promo.promotionCodeId),
          eq(promotionCodeRedemptions.authorId, authorId),
        ),
      );
    const userCount = userCountResult[0]?.count ?? 0;
    if (promo.maxRedemptionsPerUser && userCount >= promo.maxRedemptionsPerUser) {
      return { ok: false, error: 'invalid_code' as const };
    }
    if (promo.maxGlobalRedemptions) {
      const globalCountResult = await db
        .select({ count: count() })
        .from(promotionCodeRedemptions)
        .where(eq(promotionCodeRedemptions.promotionCodeId, promo.promotionCodeId));
      const globalCount = globalCountResult[0]?.count ?? 0;
      if (globalCount >= promo.maxGlobalRedemptions) {
        return { ok: false, error: 'invalid_code' as const };
      }
    }

    if (promo.creditAmount <= 0) {
      return { ok: false, error: 'invalid_code' as const };
    }

    // Grant credits (recorded as 'voucher'). For referral/other types we may branch here later.
    const ledger = await creditService.addCredits(authorId, promo.creditAmount, 'voucher');

    // Record redemption
    await db.insert(promotionCodeRedemptions).values({
      promotionCodeId: promo.promotionCodeId,
      authorId,
      creditsGranted: promo.creditAmount,
      creditLedgerEntryId: ledger.id,
    });

    const balance = await creditService.getAuthorCreditBalance(authorId);
    return { ok: true as const, code, creditsGranted: promo.creditAmount, balance };
  },
};

// AI Edit operations
export const aiEditService = {
  async getEditCount(authorId: string, action: 'textEdit' | 'imageEdit'): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(aiEdits)
      .where(and(eq(aiEdits.authorId, authorId), eq(aiEdits.action, action)));

    return result[0]?.count || 0;
  },

  async calculateRequiredCredits(
    authorId: string,
    action: 'textEdit' | 'imageEdit',
  ): Promise<number> {
    const editCount = await this.getEditCount(authorId, action);

    if (action === 'textEdit') {
      // First 5 edits are free, then charge every 5th edit (6th, 11th, 16th, etc.)
      if (editCount < 5) {
        return 0; // Still in free tier
      }

      // Check if we need to charge for this edit (every 5th edit after the free ones)
      const paidEdits = editCount - 4; // editCount 5 becomes paidEdits 1, etc.
      if (paidEdits % 5 === 0) {
        // Get pricing from database with fallback
        try {
          const pricing = await pricingService.getPricingByServiceCode('AiTextEditing');
          return pricing?.credits || 1; // Fallback to 1 credit
        } catch (error) {
          console.error('Error fetching AiTextEditing pricing:', error);
          return 1; // Fallback to 1 credit
        }
      }
      return 0;
    } else if (action === 'imageEdit') {
      // First image edit is free, then charge for every edit after
      if (editCount === 0) {
        return 0; // First edit is free
      }
      // Get pricing from database with fallback
      try {
        const pricing = await pricingService.getPricingByServiceCode('AiImageEditing');
        return pricing?.credits || 1; // Fallback to 1 credit
      } catch (error) {
        console.error('Error fetching AiImageEditing pricing:', error);
        return 1; // Fallback to 1 credit
      }
    }

    return 0;
  },

  async calculateMultipleEditCredits(
    authorId: string,
    action: 'textEdit' | 'imageEdit',
    editCount: number,
  ): Promise<{
    totalCredits: number;
    freeEdits: number;
    paidEdits: number;
    breakdown: Array<{ editNumber: number; credits: number; isFree: boolean }>;
  }> {
    const currentEditCount = await this.getEditCount(authorId, action);
    const breakdown: Array<{ editNumber: number; credits: number; isFree: boolean }> = [];
    let totalCredits = 0;
    let freeEdits = 0;
    let paidEdits = 0;

    for (let i = 0; i < editCount; i++) {
      const editNumber = currentEditCount + i + 1;
      let credits = 0;
      let isFree = true;

      if (action === 'textEdit') {
        if (editNumber <= 5) {
          credits = 0;
          isFree = true;
        } else {
          const paidEditNumber = editNumber - 5;
          if (paidEditNumber % 5 === 0) {
            try {
              const pricing = await pricingService.getPricingByServiceCode('AiTextEditing');
              credits = pricing?.credits || 1;
              isFree = false;
            } catch (error) {
              console.error('Error fetching AiTextEditing pricing:', error);
              credits = 1;
              isFree = false;
            }
          }
        }
      } else if (action === 'imageEdit') {
        if (editNumber === 1) {
          credits = 0;
          isFree = true;
        } else {
          try {
            const pricing = await pricingService.getPricingByServiceCode('AiImageEditing');
            credits = pricing?.credits || 1;
            isFree = false;
          } catch (error) {
            console.error('Error fetching AiImageEditing pricing:', error);
            credits = 1;
            isFree = false;
          }
        }
      }

      breakdown.push({ editNumber, credits, isFree });
      totalCredits += credits;

      if (isFree) {
        freeEdits++;
      } else {
        paidEdits++;
      }
    }

    return {
      totalCredits,
      freeEdits,
      paidEdits,
      breakdown,
    };
  },

  async checkEditPermission(
    authorId: string,
    action: 'textEdit' | 'imageEdit',
  ): Promise<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    message?: string;
    nextThreshold?: number;
    isFree?: boolean;
  }> {
    const requiredCredits = await this.calculateRequiredCredits(authorId, action);
    const currentBalance = await creditService.getAuthorCreditBalance(authorId);
    const editCount = await this.getEditCount(authorId, action);

    const canEdit = requiredCredits === 0 || currentBalance >= requiredCredits;

    let message;
    let nextThreshold;
    const isFree = requiredCredits === 0;

    if (action === 'textEdit') {
      if (editCount < 5) {
        const remaining = 5 - editCount;
        message = `${remaining} free edits remaining`;
        nextThreshold = 5;
      } else {
        const nextChargeAt = Math.ceil((editCount - 4) / 5) * 5 + 5;
        const editsUntilCharge = nextChargeAt - editCount;
        if (editsUntilCharge > 1) {
          message = `${editsUntilCharge - 1} free edits remaining`;
        } else if (requiredCredits > 0) {
          message = `Next edit will cost ${requiredCredits} credit(s)`;
        }
        nextThreshold = nextChargeAt;
      }
    } else if (action === 'imageEdit') {
      if (editCount === 0) {
        message = `1 free edit remaining`;
        nextThreshold = 1;
      } else if (requiredCredits > 0) {
        message = `Next edit will cost ${requiredCredits} credit(s)`;
      }
    }

    if (!canEdit && requiredCredits > 0) {
      message = `Insufficient credits. You need ${requiredCredits} credit(s) but have ${currentBalance}.`;
    }

    return {
      canEdit,
      requiredCredits,
      currentBalance,
      editCount,
      message,
      nextThreshold,
      isFree,
    };
  },

  async recordSuccessfulEdit(
    authorId: string,
    storyId: string,
    action: 'textEdit' | 'imageEdit',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Check if credits need to be deducted
    const requiredCredits = await this.calculateRequiredCredits(authorId, action);

    // Deduct credits if required
    if (requiredCredits > 0) {
      await creditService.deductCredits(authorId, requiredCredits, action, storyId);
    }

    // Record the edit action
    await db.insert(aiEdits).values({
      authorId,
      storyId,
      action,
      metadata,
    });
  },

  async getEditHistory(
    authorId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      id: string;
      storyId: string;
      action: 'textEdit' | 'imageEdit';
      requestedAt: Date;
      metadata: unknown;
    }>
  > {
    return await db
      .select({
        id: aiEdits.id,
        storyId: aiEdits.storyId,
        action: aiEdits.action,
        requestedAt: aiEdits.requestedAt,
        metadata: aiEdits.metadata,
      })
      .from(aiEdits)
      .where(eq(aiEdits.authorId, authorId))
      .orderBy(desc(aiEdits.requestedAt))
      .limit(limit);
  },
};

// Chapter operations
export const chapterService = {
  async createChapter(chapterData: {
    storyId: string;
    authorId: string;
    title: string;
    htmlContent: string;
    chapterNumber: number;
    version?: number;
    imageUri?: string;
    imageThumbnailUri?: string;
    audioUri?: string;
  }) {
    const [chapter] = await db
      .insert(chapters)
      .values({
        storyId: chapterData.storyId,
        authorId: chapterData.authorId,
        title: chapterData.title,
        htmlContent: chapterData.htmlContent,
        chapterNumber: chapterData.chapterNumber,
        version: chapterData.version || 1,
        imageUri: toRelativeImagePath(chapterData.imageUri),
        imageThumbnailUri: toRelativeImagePath(chapterData.imageThumbnailUri),
        audioUri: chapterData.audioUri,
      })
      .returning();

    // Convert relative paths back to absolute URLs for response
    return {
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    };
  },

  async getChapterById(chapterId: string) {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId));
    if (!chapter) return chapter;

    return {
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    };
  },

  async getChaptersByStory(storyId: string) {
    const chapterResults = await db
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber));

    return chapterResults.map((chapter) => ({
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    }));
  },

  async updateChapter(chapterId: string, updates: Partial<typeof chapters.$inferInsert>) {
    // Convert any image URLs to relative paths for storage
    const processedUpdates = {
      ...updates,
      ...(updates.imageUri !== undefined && { imageUri: toRelativeImagePath(updates.imageUri) }),
      ...(updates.imageThumbnailUri !== undefined && {
        imageThumbnailUri: toRelativeImagePath(updates.imageThumbnailUri),
      }),
    };

    const [chapter] = await db
      .update(chapters)
      .set(processedUpdates)
      .where(eq(chapters.id, chapterId))
      .returning();

    return {
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    };
  },

  async deleteChapter(chapterId: string) {
    await db.delete(chapters).where(eq(chapters.id, chapterId));
  },

  async getStoryChapters(storyId: string): Promise<
    Array<{
      id: string;
      chapterNumber: number;
      title: string;
      imageUri: string | null;
      imageThumbnailUri: string | null;
      htmlContent: string;
      audioUri: string | null;
      version: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    // Get the latest version for each chapter
    const latestVersionsSubquery = db
      .select({
        storyId: chapters.storyId,
        chapterNumber: chapters.chapterNumber,
        latestVersion: max(chapters.version).as('latest_version'),
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .groupBy(chapters.storyId, chapters.chapterNumber)
      .as('latest_versions');

    const chapterResults = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        imageUri: chapters.imageUri,
        imageThumbnailUri: chapters.imageThumbnailUri,
        htmlContent: chapters.htmlContent,
        audioUri: chapters.audioUri,
        version: chapters.version,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .innerJoin(
        latestVersionsSubquery,
        and(
          eq(chapters.storyId, latestVersionsSubquery.storyId),
          eq(chapters.chapterNumber, latestVersionsSubquery.chapterNumber),
          eq(chapters.version, latestVersionsSubquery.latestVersion),
        ),
      )
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber));

    return chapterResults.map((chapter) => ({
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    }));
  },

  async getStoryChapter(
    storyId: string,
    chapterNumber: number,
  ): Promise<{
    id: string;
    chapterNumber: number;
    title: string;
    imageUri: string | null;
    imageThumbnailUri: string | null;
    htmlContent: string;
    audioUri: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    // Get the latest version of the specific chapter
    const latestVersionResult = await db
      .select({ latestVersion: max(chapters.version) })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), eq(chapters.chapterNumber, chapterNumber)));

    const latestVersion = latestVersionResult[0]?.latestVersion;
    if (!latestVersion) return null;

    const [chapter] = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        imageUri: chapters.imageUri,
        imageThumbnailUri: chapters.imageThumbnailUri,
        htmlContent: chapters.htmlContent,
        audioUri: chapters.audioUri,
        version: chapters.version,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.chapterNumber, chapterNumber),
          eq(chapters.version, latestVersion),
        ),
      );

    if (!chapter) return null;

    return {
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    };
  },

  async getTotalChaptersCount(storyId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(chapters)
      .where(eq(chapters.storyId, storyId));

    return result[0]?.count || 0;
  },

  async getChapterTableOfContents(storyId: string): Promise<
    Array<{
      chapterNumber: number;
      title: string;
    }>
  > {
    // Get the latest version for each chapter for table of contents
    const latestVersionsSubquery = db
      .select({
        storyId: chapters.storyId,
        chapterNumber: chapters.chapterNumber,
        latestVersion: max(chapters.version).as('latest_version'),
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .groupBy(chapters.storyId, chapters.chapterNumber)
      .as('latest_versions');

    return await db
      .select({
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
      })
      .from(chapters)
      .innerJoin(
        latestVersionsSubquery,
        and(
          eq(chapters.storyId, latestVersionsSubquery.storyId),
          eq(chapters.chapterNumber, latestVersionsSubquery.chapterNumber),
          eq(chapters.version, latestVersionsSubquery.latestVersion),
        ),
      )
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber));
  },

  async updateChapterContent(
    storyId: string,
    chapterNumber: number,
    htmlContent: string,
  ): Promise<void> {
    // Find the maximum version number for this chapter
    const maxVersionResult = await db
      .select({
        maxVersion: max(chapters.version),
      })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), eq(chapters.chapterNumber, chapterNumber)));

    const maxVersion = maxVersionResult[0]?.maxVersion || 0;
    if (maxVersion === 0) {
      throw new Error(`Chapter ${chapterNumber} not found for story ${storyId}`);
    }

    // Get the full chapter details for the latest version
    const [chapterToUpdate] = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.chapterNumber, chapterNumber),
          eq(chapters.version, maxVersion),
        ),
      );

    if (!chapterToUpdate) {
      throw new Error(`Chapter ${chapterNumber} not found for story ${storyId}`);
    }

    // Create a new version with updated content
    const newVersion = maxVersion + 1;
    await db.insert(chapters).values({
      storyId: chapterToUpdate.storyId,
      authorId: chapterToUpdate.authorId,
      title: chapterToUpdate.title,
      htmlContent: htmlContent,
      chapterNumber: chapterToUpdate.chapterNumber,
      version: newVersion,
      imageUri: chapterToUpdate.imageUri,
      imageThumbnailUri: chapterToUpdate.imageThumbnailUri,
      audioUri: chapterToUpdate.audioUri,
    });
  },

  async updateChapterImage(
    storyId: string,
    chapterNumber: number,
    imageUri: string,
  ): Promise<void> {
    // Find the maximum version number for this chapter
    const maxVersionResult = await db
      .select({
        maxVersion: max(chapters.version),
      })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), eq(chapters.chapterNumber, chapterNumber)));

    const maxVersion = maxVersionResult[0]?.maxVersion || 0;
    if (maxVersion === 0) {
      throw new Error(`Chapter ${chapterNumber} not found for story ${storyId}`);
    }

    // Get the full chapter details for the latest version
    const [chapterToUpdate] = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.chapterNumber, chapterNumber),
          eq(chapters.version, maxVersion),
        ),
      );

    if (!chapterToUpdate) {
      throw new Error(`Chapter ${chapterNumber} not found for story ${storyId}`);
    }

    // Create a new version with updated image
    const newVersion = maxVersion + 1;
    await db.insert(chapters).values({
      storyId: chapterToUpdate.storyId,
      authorId: chapterToUpdate.authorId,
      title: chapterToUpdate.title,
      htmlContent: chapterToUpdate.htmlContent,
      chapterNumber: chapterToUpdate.chapterNumber,
      version: newVersion,
      imageUri: imageUri,
      imageThumbnailUri: chapterToUpdate.imageThumbnailUri,
      audioUri: chapterToUpdate.audioUri,
    });
  },
};

// Export pricing service
export { pricingService } from './services/pricing';
