import { db } from "./index";
import { authors, stories, characters, storyCharacters } from "./schema";
import { eq, and, count } from "drizzle-orm";

// Author operations
export const authorService = {
  async createAuthor(authorData: { clerkUserId: string; email: string; displayName: string }) {
    const [author] = await db.insert(authors).values(authorData).returning();
    return author;
  },

  async createAuthorFromClerk(authorData: { clerkUserId: string; email: string; displayName: string }) {
    const [author] = await db.insert(authors).values(authorData).returning();
    return author;
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
  },

  async updateStory(storyId: string, updates: Partial<{ title: string; plotDescription: string; synopsis: string; status: 'draft' | 'writing' | 'published' }>) {
    const [story] = await db.update(stories).set(updates).where(eq(stories.storyId, storyId)).returning();
    return story;
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
