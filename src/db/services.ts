import { db } from "./index";
import { authors, stories, characters, storyCharacters, creditLedger, authorCreditBalances, leads, storyRatings, aiEdits, chapters } from "./schema";
import { eq, and, count, desc, sql, like, asc, max } from "drizzle-orm";
import { ClerkUserForSync } from "@/types/clerk";
import { pricingService } from "./services/pricing";
import { CharacterRole, CharacterAge, isValidCharacterAge } from "../types/character-enums";
import { toAbsoluteImageUrl, toRelativeImagePath } from "../utils/image-url";

// Export payment service
export { paymentService } from "./services/payment";
export { creditPackagesService } from "./services/credit-packages";

// Author operations
export const authorService = {  async createAuthor(authorData: { clerkUserId: string; email: string; displayName: string }) {
    const [author] = await db.insert(authors).values(authorData).returning();
    
    // Initialize credits for new author with initial credits from pricing table
    const initialCredits = await pricingService.getInitialAuthorCredits();
    await creditService.initializeAuthorCredits(author.authorId, initialCredits);
    
    return author;
  },
  async syncUserOnSignIn(clerkUser: ClerkUserForSync) {
    const currentTime = new Date();
    
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
      const primaryEmail = clerkUser.emailAddresses?.find((email) => email.id === clerkUser.primaryEmailAddressId);
      const primaryPhone = clerkUser.phoneNumbers?.find((phone) => phone.id === clerkUser.primaryPhoneNumberId);

      const newAuthorData = {
        clerkUserId: clerkUser.id,
        email: primaryEmail?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '',
        displayName: this.buildDisplayName(clerkUser),
        lastLoginAt: currentTime,
        createdAt: currentTime,
        ...(primaryPhone?.phoneNumber && { mobilePhone: primaryPhone.phoneNumber })
      };

      try {
        // Try to insert new user
        const [newAuthor] = await db.insert(authors).values(newAuthorData).returning();
        
        // Initialize credits for new author with initial credits from pricing table
        const initialCredits = await pricingService.getInitialAuthorCredits();
        await creditService.initializeAuthorCredits(newAuthor.authorId, initialCredits);
          console.log('Created new user on sign-in:', newAuthor.clerkUserId, `with ${initialCredits} initial credits`);
        return newAuthor;
      } catch (error: unknown) {
        // Type guard for error object
        const isDbError = (err: unknown): err is { cause?: { code?: string; constraint?: string }; message?: string } => {
          return typeof err === 'object' && err !== null;
        };

        if (isDbError(error)) {
          // Check if it's a duplicate email constraint violation
          const isDuplicateEmail = (
            error.cause?.code === '23505' && error.cause?.constraint === 'authors_email_unique'
          ) || (
            error.message?.includes('duplicate key value violates unique constraint "authors_email_unique"')
          );          if (isDuplicateEmail) {
            console.log('Duplicate email detected in syncUserOnSignIn, updating existing user with new clerkUserId:', clerkUser.id);
            
            try {
              // Update existing user with new clerkUserId (user signed in with different OAuth provider)
              const [updatedAuthor] = await db
                .update(authors)
                .set({
                  clerkUserId: clerkUser.id, // Update to new clerkId
                  displayName: this.buildDisplayName(clerkUser),
                  lastLoginAt: currentTime,
                  ...(primaryPhone?.phoneNumber && { mobilePhone: primaryPhone.phoneNumber })
                })
                .where(eq(authors.email, newAuthorData.email))
                .returning();

              console.log('User updated (clerkUserId changed) in syncUserOnSignIn for email:', newAuthorData.email);
              return updatedAuthor;
            } catch (updateError) {
              console.error('Error updating user after duplicate email in syncUserOnSignIn:', updateError);
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
export const storyService = {  async createStory(storyData: { 
    title: string; 
    authorId: string; 
    plotDescription?: string; 
    storyLanguage?: string; 
    synopsis?: string;
    customAuthor?: string;
    dedicationMessage?: string;
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
    
    return storyResults.map(story => ({
      ...story,
      featureImageUri: toAbsoluteImageUrl(story.featureImageUri),
    }));
  },
  async getPublishedStories() {
    return await db.select().from(stories).where(eq(stories.status, 'published'));
  },  async getFeaturedPublicStories(filters?: {
    targetAudience?: string;
    graphicalStyle?: string;
    storyLanguage?: string;
  }) {
    const conditions = [eq(stories.isPublic, true), eq(stories.isFeatured, true)];
    
    if (filters) {
      if (filters.targetAudience) {
        conditions.push(eq(stories.targetAudience, filters.targetAudience as 'children_0-2' | 'children_3-6' | 'children_7-10' | 'children_11-14' | 'young_adult_15-17' | 'adult_18+' | 'all_ages'));
      }      if (filters.graphicalStyle) {
        conditions.push(eq(stories.graphicalStyle, filters.graphicalStyle as 'cartoon' | 'realistic' | 'watercolor' | 'digital_art' | 'hand_drawn' | 'minimalist' | 'vintage' | 'comic_book' | 'anime' | 'pixar_style' | 'disney_style' | 'sketch' | 'oil_painting' | 'colored_pencil'));
      }
      if (filters.storyLanguage) {
        conditions.push(eq(stories.storyLanguage, filters.storyLanguage));
      }    }

    // First get the stories with their average ratings
    const ratingsSubquery = db
      .select({
        storyId: storyRatings.storyId,
        averageRating: sql<number>`ROUND(AVG(CAST(${storyRatings.rating}::text AS INTEGER)), 1)`.as('average_rating'),
        ratingCount: count(storyRatings.ratingId).as('rating_count')
      })
      .from(storyRatings)
      .groupBy(storyRatings.storyId)
      .as('ratings_data');    const result = await db
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
        ratingCount: ratingsSubquery.ratingCount
      })
      .from(stories)
      .innerJoin(authors, eq(stories.authorId, authors.authorId))
      .leftJoin(ratingsSubquery, eq(stories.storyId, ratingsSubquery.storyId))
      .where(and(...conditions))
      .orderBy(desc(stories.createdAt));    // Convert string rating to number and ensure proper types
    return result.map(story => ({
      ...story,
      featureImageUri: toAbsoluteImageUrl(story.featureImageUri),
      averageRating: story.averageRating ? parseFloat(story.averageRating as unknown as string) : null,
      ratingCount: story.ratingCount || 0
    }));
  },

  async getTotalStoriesCount() {
    const result = await db.select({ value: count() }).from(stories);
    return result[0]?.value || 0;
  },  async updateStory(storyId: string, updates: Partial<typeof stories.$inferInsert>) {
    // Convert any image URLs to relative paths for storage
    const processedUpdates = {
      ...updates,
      ...(updates.featureImageUri !== undefined && { featureImageUri: toRelativeImagePath(updates.featureImageUri) }),
    };
    
    const [story] = await db.update(stories).set(processedUpdates).where(eq(stories.storyId, storyId)).returning();
    
    return {
      ...story,
      featureImageUri: toAbsoluteImageUrl(story.featureImageUri),
    };
  },

  async deleteStory(storyId: string) {
    await db.delete(stories).where(eq(stories.storyId, storyId));
  }
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
    photoUrl?: string 
  }) {
    // Only validate age, type is now free text
    const validatedData = {
      ...characterData,
      type: characterData.type || undefined, // Accept any string for type
      age: characterData.age && isValidCharacterAge(characterData.age)
        ? characterData.age as CharacterAge
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
    const characterResults = await db.select().from(characters).where(eq(characters.authorId, authorId));
    
    return characterResults.map(character => ({
      ...character,
      photoUrl: toAbsoluteImageUrl(character.photoUrl),
    }));
  },

  async getCharacterById(characterId: string) {
    const [character] = await db.select().from(characters).where(eq(characters.characterId, characterId));
    if (!character) return character;
    
    return {
      ...character,
      photoUrl: toAbsoluteImageUrl(character.photoUrl),
    };
  }
};

// Story-Character relationship operations
export const storyCharacterService = {
  async addCharacterToStory(
    storyId: string, 
    characterId: string, 
    role?: 'protagonist' | 'antagonist' | 'supporting' | 'mentor' | 'comic_relief' | 'love_interest' | 'sidekick' | 'narrator' | 'other' | null
  ) {
    const [relation] = await db.insert(storyCharacters).values({
      storyId,
      characterId,
      role
    }).returning();
    return relation;
  },

  async getCharactersByStory(storyId: string) {
    const results = await db
      .select({
        character: characters,
        role: storyCharacters.role
      })
      .from(storyCharacters)
      .innerJoin(characters, eq(storyCharacters.characterId, characters.characterId))
      .where(eq(storyCharacters.storyId, storyId));

    return results.map(result => ({
      ...result,
      character: {
        ...result.character,
        photoUrl: toAbsoluteImageUrl(result.character.photoUrl),
      }
    }));
  },

  async getStoriesByCharacter(characterId: string) {
    const results = await db
      .select({
        story: stories,
        role: storyCharacters.role
      })
      .from(storyCharacters)
      .innerJoin(stories, eq(storyCharacters.storyId, stories.storyId))
      .where(eq(storyCharacters.characterId, characterId));

    return results.map(result => ({
      ...result,
      story: {
        ...result.story,
        featureImageUri: toAbsoluteImageUrl(result.story.featureImageUri),
      }
    }));
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
    creditEventType: 'initialCredit' | 'creditPurchase' | 'eBookGeneration' | 'audioBookGeneration' | 'printOrder' | 'refund' | 'voucher' | 'promotion' | 'textEdit' | 'imageEdit',
    storyId?: string,
    purchaseId?: string
  ) {
    // Insert the credit ledger entry
    const [entry] = await db.insert(creditLedger).values({
      authorId,
      amount,
      creditEventType,
      storyId,
      purchaseId
    }).returning();

    // Update or insert the author's credit balance
    await db
      .insert(authorCreditBalances)
      .values({
        authorId,
        totalCredits: amount,
        lastUpdated: new Date()
      })
      .onConflictDoUpdate({
        target: authorCreditBalances.authorId,
        set: {
          totalCredits: sql`${authorCreditBalances.totalCredits} + ${amount}`,
          lastUpdated: new Date()
        }
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
    eventType: 'eBookGeneration' | 'audioBookGeneration' | 'printOrder' | 'textEdit' | 'imageEdit',
    storyId?: string
  ) {
    const canAfford = await this.canAfford(authorId, amount);
    if (!canAfford) {
      throw new Error('Insufficient credits');
    }
    
    return await this.addCreditEntry(authorId, -amount, eventType, storyId);
  },  async addCredits(
    authorId: string, 
    amount: number, 
    eventType: 'creditPurchase' | 'refund' | 'voucher' | 'promotion',
    purchaseId?: string
  ) {
    return await this.addCreditEntry(authorId, amount, eventType, undefined, purchaseId);
  }
};

// Lead operations
export const leadService = {
  async getTotalLeadsCount() {
    const result = await db.select({ value: count() }).from(leads);
    return result[0]?.value || 0;
  },
  async getLeads(
    page: number = 1,
    limit: number = 100,
    searchTerm?: string,
    sortBy: 'email' | 'createdAt' | 'notifiedAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const offset = (page - 1) * limit;
    
    // Build search condition
    let whereCondition = undefined;
    if (searchTerm && searchTerm.trim()) {
      const searchPattern = `%${searchTerm.trim().toLowerCase()}%`;
      whereCondition = like(leads.email, searchPattern);
    }
    
    // Get total count with search
    const countQuery = db.select({ value: count() }).from(leads);
    if (whereCondition) {
      countQuery.where(whereCondition);
    }
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0]?.value || 0;
    
    // Get leads with pagination, search, and sorting
    const leadsQuery = db.select().from(leads);
    
    if (whereCondition) {
      leadsQuery.where(whereCondition);
    }
    
    // Build sort condition
    let orderBy;
    switch (sortBy) {
      case 'email':
        orderBy = sortOrder === 'asc' ? asc(leads.email) : desc(leads.email);
        break;
      case 'notifiedAt':
        orderBy = sortOrder === 'asc' ? asc(leads.notifiedAt) : desc(leads.notifiedAt);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(leads.createdAt) : desc(leads.createdAt);
    }
    
    const leadsList = await leadsQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      leads: leadsList,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    };
  }
};

// AI Edit operations
export const aiEditService = {
  async getEditCount(authorId: string, action: 'textEdit' | 'imageEdit'): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(aiEdits)
      .where(and(
        eq(aiEdits.authorId, authorId),
        eq(aiEdits.action, action)
      ));
    
    return result[0]?.count || 0;
  },

  async calculateRequiredCredits(authorId: string, action: 'textEdit' | 'imageEdit'): Promise<number> {
    const editCount = await this.getEditCount(authorId, action);
    
    if (action === 'textEdit') {
      // First 5 edits are free, then 1 credit per 5 edits
      if (editCount < 5) {
        return 0; // Still in free tier
      }
      
      // Check if we need to charge for this edit (every 5th edit after the free ones)
      const paidEdits = editCount - 4; // editCount 5 becomes paidEdits 1, etc.
      return paidEdits % 5 === 0 ? 1 : 0;
    } else if (action === 'imageEdit') {
      // First image edit is free, then 1 credit per edit
      return editCount === 0 ? 0 : 1;
    }
    
    return 0;
  },

  async checkEditPermission(authorId: string, action: 'textEdit' | 'imageEdit'): Promise<{
    canEdit: boolean;
    requiredCredits: number;
    currentBalance: number;
    editCount: number;
    message?: string;
  }> {
    const requiredCredits = await this.calculateRequiredCredits(authorId, action);
    const currentBalance = await creditService.getAuthorCreditBalance(authorId);
    const editCount = await this.getEditCount(authorId, action);

    const canEdit = requiredCredits === 0 || currentBalance >= requiredCredits;
    
    let message;
    if (!canEdit) {
      message = `Insufficient credits. You need ${requiredCredits} credit(s) but have ${currentBalance}.`;
    } else if (requiredCredits > 0) {
      message = `This edit will cost ${requiredCredits} credit(s). Your balance: ${currentBalance}.`;
    }

    return {
      canEdit,
      requiredCredits,
      currentBalance,
      editCount,
      message
    };
  },

  async recordSuccessfulEdit(
    authorId: string, 
    storyId: string, 
    action: 'textEdit' | 'imageEdit',
    metadata?: Record<string, unknown>
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
      metadata
    });
  },

  async getEditHistory(authorId: string, limit: number = 50): Promise<Array<{
    id: string;
    storyId: string;
    action: 'textEdit' | 'imageEdit';
    requestedAt: Date;
    metadata: unknown;
  }>> {
    return await db
      .select({
        id: aiEdits.id,
        storyId: aiEdits.storyId,
        action: aiEdits.action,
        requestedAt: aiEdits.requestedAt,
        metadata: aiEdits.metadata
      })
      .from(aiEdits)
      .where(eq(aiEdits.authorId, authorId))
      .orderBy(desc(aiEdits.requestedAt))
      .limit(limit);
  }
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
    const [chapter] = await db.insert(chapters).values({
      storyId: chapterData.storyId,
      authorId: chapterData.authorId,
      title: chapterData.title,
      htmlContent: chapterData.htmlContent,
      chapterNumber: chapterData.chapterNumber,
      version: chapterData.version || 1,
      imageUri: toRelativeImagePath(chapterData.imageUri),
      imageThumbnailUri: toRelativeImagePath(chapterData.imageThumbnailUri),
      audioUri: chapterData.audioUri,
    }).returning();
    
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
    const chapterResults = await db.select().from(chapters).where(eq(chapters.storyId, storyId)).orderBy(asc(chapters.chapterNumber));
    
    return chapterResults.map(chapter => ({
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
      ...(updates.imageThumbnailUri !== undefined && { imageThumbnailUri: toRelativeImagePath(updates.imageThumbnailUri) }),
    };
    
    const [chapter] = await db.update(chapters).set(processedUpdates).where(eq(chapters.id, chapterId)).returning();
    
    return {
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    };
  },

  async deleteChapter(chapterId: string) {
    await db.delete(chapters).where(eq(chapters.id, chapterId));
  },

  async getStoryChapters(storyId: string): Promise<Array<{
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
  }>> {
    // Get the latest version for each chapter
    const latestVersionsSubquery = db
      .select({
        storyId: chapters.storyId,
        chapterNumber: chapters.chapterNumber,
        latestVersion: max(chapters.version).as('latest_version')
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
        updatedAt: chapters.updatedAt
      })
      .from(chapters)
      .innerJoin(latestVersionsSubquery, and(
        eq(chapters.storyId, latestVersionsSubquery.storyId),
        eq(chapters.chapterNumber, latestVersionsSubquery.chapterNumber),
        eq(chapters.version, latestVersionsSubquery.latestVersion)
      ))
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber));

    return chapterResults.map(chapter => ({
      ...chapter,
      imageUri: toAbsoluteImageUrl(chapter.imageUri),
      imageThumbnailUri: toAbsoluteImageUrl(chapter.imageThumbnailUri),
    }));
  },

  async getStoryChapter(storyId: string, chapterNumber: number): Promise<{
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
      .where(and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, chapterNumber)
      ));

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
        updatedAt: chapters.updatedAt
      })
      .from(chapters)
      .where(and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, chapterNumber),
        eq(chapters.version, latestVersion)
      ));

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

  async getChapterTableOfContents(storyId: string): Promise<Array<{
    chapterNumber: number;
    title: string;
  }>> {
    // Get the latest version for each chapter for table of contents
    const latestVersionsSubquery = db
      .select({
        storyId: chapters.storyId,
        chapterNumber: chapters.chapterNumber,
        latestVersion: max(chapters.version).as('latest_version')
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .groupBy(chapters.storyId, chapters.chapterNumber)
      .as('latest_versions');

    return await db
      .select({
        chapterNumber: chapters.chapterNumber,
        title: chapters.title
      })
      .from(chapters)
      .innerJoin(latestVersionsSubquery, and(
        eq(chapters.storyId, latestVersionsSubquery.storyId),
        eq(chapters.chapterNumber, latestVersionsSubquery.chapterNumber),
        eq(chapters.version, latestVersionsSubquery.latestVersion)
      ))
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber));
  },

  async updateChapterContent(storyId: string, chapterNumber: number, htmlContent: string): Promise<void> {
    // Find the maximum version number for this chapter
    const maxVersionResult = await db
      .select({ 
        maxVersion: max(chapters.version) 
      })
      .from(chapters)
      .where(and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, chapterNumber)
      ));

    const maxVersion = maxVersionResult[0]?.maxVersion || 0;
    if (maxVersion === 0) {
      throw new Error(`Chapter ${chapterNumber} not found for story ${storyId}`);
    }

    // Get the full chapter details for the latest version
    const [chapterToUpdate] = await db
      .select()
      .from(chapters)
      .where(and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, chapterNumber),
        eq(chapters.version, maxVersion)
      ));

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

  async updateChapterImage(storyId: string, chapterNumber: number, imageUri: string): Promise<void> {
    // Find the maximum version number for this chapter
    const maxVersionResult = await db
      .select({ 
        maxVersion: max(chapters.version) 
      })
      .from(chapters)
      .where(and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, chapterNumber)
      ));

    const maxVersion = maxVersionResult[0]?.maxVersion || 0;
    if (maxVersion === 0) {
      throw new Error(`Chapter ${chapterNumber} not found for story ${storyId}`);
    }

    // Get the full chapter details for the latest version
    const [chapterToUpdate] = await db
      .select()
      .from(chapters)
      .where(and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, chapterNumber),
        eq(chapters.version, maxVersion)
      ));

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
  }
};

// Export pricing service
export { pricingService } from './services/pricing';
