import { pgEnum } from "drizzle-orm/pg-core";

// -----------------------------------------------------------------------------
// Enumerated types
// -----------------------------------------------------------------------------
export const storyStatusEnum = pgEnum("story_status", ['draft', 'writing', 'published']);
export const addressTypeEnum = pgEnum("address_type", ['billing', 'delivery']);
export const paymentProviderEnum = pgEnum("payment_provider", ['stripe', 'paypal', 'revolut', 'other']);
export const creditEventTypeEnum = pgEnum("credit_event_type", [
  'initialCredit',
  'creditPurchase', 
  'eBookGeneration',
  'audioBookGeneration',
  'printOrder',
  'refund',
  'voucher',
  'promotion'
]);

// Sharing functionality enums
export const accessLevelEnum = pgEnum("access_level", ['view', 'edit']);
export const collaboratorRoleEnum = pgEnum("collaborator_role", ['editor', 'viewer']);

// Story generation workflow enums
export const runStatusEnum = pgEnum("run_status", [
  'queued',
  'running',
  'failed',
  'completed',
  'cancelled'
]);

export const stepStatusEnum = pgEnum("step_status", [
  'pending',
  'running',
  'failed',
  'completed'
]);

export const characterRole = pgEnum("character_role", [
  'protagonist',
  'antagonist', 
  'supporting',
  'mentor',
  'comic_relief',
  'love_interest',
  'sidekick',
  'narrator',
  'other'
]);

export const storyRatingEnum = pgEnum("story_rating", ['1', '2', '3', '4', '5']);

// Story attribute enums
export const targetAudienceEnum = pgEnum("target_audience", [
  'children_0-2',     // Babies/Toddlers
  'children_3-6',     // Preschoolers
  'children_7-10',    // Early Elementary
  'children_11-14',   // Middle Grade
  'young_adult_15-17', // Young Adult
  'adult_18+',        // Adults
  'all_ages'          // All Ages
]);

export const novelStyleEnum = pgEnum("novel_style", [
  'adventure',
  'fantasy',
  'mystery',
  'romance',
  'science_fiction',
  'historical',
  'contemporary',
  'fairy_tale',
  'comedy',
  'drama',
  'horror',
  'thriller',
  'biography',
  'educational',
  'poetry'
]);

export const graphicalStyleEnum = pgEnum("graphical_style", [
  'cartoon',
  'realistic',
  'watercolor',
  'digital_art',
  'hand_drawn',
  'minimalist',
  'vintage',
  'comic_book',
  'anime',
  'pixar_style',
  'disney_style',
  'sketch',
  'oil_painting',
  'colored_pencil'
]);

export const aiActionTypeEnum = pgEnum("ai_action_type", [
  'story_structure',
  'story_outline',
  'chapter_writing',
  'image_generation',
  'story_review',
  'character_generation',
  'story_enhancement',
  'audio_generation',
  'content_validation'
]);
