// Centralized schema for story outline structure
// Used across all languages to maintain consistency
import { CHARACTER_ROLES, CHARACTER_AGES, CHARACTER_TRAITS, CHARACTER_TYPES } from '../types/character-enums';

export const structureStoryOutlineSchema = {
  type: "object",
  properties: {
    story: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "A captivating title for the story (e.g., 'The Dragon's Quest', 'Adventures in Wonderland')"
        },
        plotDescription: {
          type: "string",
          description: "Detailed plot summary describing the main events, conflicts, and resolution"
        },
        synopsis: {
          type: "string",
          description: "Brief 1-2 sentence summary highlighting the core premise"
        },
        place: {
          type: "string",
          description: "Setting/location where the story takes place (e.g., 'Magical Kingdom of Eldoria', 'Modern-day New York')"
        },
        additionalRequests: {
          type: "string",
          description: "Any special requirements or preferences mentioned by the user"
        },
        targetAudience: {
          type: "string",
          enum: ["children_0-2", "children_3-6", "children_7-10", "children_11-14", "young_adult_15-17", "adult_18+", "all_ages"],
          description: "Target age group for the story. Must be one of: children_0-2 (babies/toddlers), children_3-6 (preschoolers), children_7-10 (early elementary), children_11-14 (middle grade), young_adult_15-17 (teens), adult_18+ (adults), all_ages (family-friendly)"
        },
        novelStyle: {
          type: "string",
          enum: ["adventure", "fantasy", "mystery", "romance", "science_fiction", "historical", "contemporary", "fairy_tale", "comedy", "drama", "horror", "thriller", "biography", "educational", "poetry", "sports_adventure"],
          description: "Literary genre and style of the story. Must be one of: adventure, fantasy, mystery, romance, science_fiction, historical, contemporary, fairy_tale, comedy, drama, horror, thriller, biography, educational, poetry, sports_adventure"
        },
        graphicalStyle: {
          type: "string",
          enum: ["cartoon", "realistic", "watercolor", "digital_art", "hand_drawn", "minimalist", "vintage", "comic_book", "anime", "pixar_style", "disney_style", "sketch", "oil_painting", "colored_pencil"],
          description: "Visual art style for illustrations. Must be one of: cartoon, realistic, watercolor, digital_art, hand_drawn, minimalist, vintage, comic_book, anime, pixar_style, disney_style, sketch, oil_painting, colored_pencil"
        },
        storyLanguage: {
          type: "string",
          description: "Language code for the story (e.g., 'en-US', 'pt-PT')"
        }
      },
      required: ["title", "plotDescription"],
      propertyOrdering: ["title", "plotDescription", "synopsis", "place", "additionalRequests", "targetAudience", "novelStyle", "graphicalStyle", "storyLanguage"]
    },
    characters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          characterId: {
            type: "string",
            nullable: true,
            description: "UUID of existing character if reusing, or null for new characters. Must be null (not 'null' string) when creating new characters."
          },
          name: {
            type: "string",
            description: "Character's name (e.g., 'Princess Luna', 'Captain Jack')"
          },
          type: {
            type: "string",
            enum: CHARACTER_TYPES,
            description: "What type of being/entity the character is. Must be one of: boy, girl, man, woman, person (humans), dog, cat, bird, other_animal (animals), dragon, elf_fairy_mythical, robot_cyborg, alien_extraterrestrial, other_creature (fantasy), or other (anything else)"
          },
          age: {
            type: "string",
            enum: CHARACTER_AGES,
            description: "Character's age group. For human characters use: infant (1-12 months), toddler (1-3 years), preschool (3-5 years), school_age (6-11 years), teenage (12-17 years), emerging_adult (18-24 years), seasoned_adult (25-39 years), midlife_mentor (40-59 years), elder (60+ years). For non-human characters use: youngling (~0-2 years), adult (~2-7 years), senior (~7+ years)"
          },
          traits: {
            type: "array",
            maxItems: 5,
            items: {
              type: "string",
              enum: CHARACTER_TRAITS
            },
            description: "Character personality traits (up to 5). Choose from positive traits (adaptable, brave, compassionate, curious, decisive, empathetic, generous, honest, imaginative, loyal, optimistic, patient, practical, resourceful, self-disciplined, sincere, witty, kind, conscientious, energetic), negative traits (arrogant, callous, cowardly, cynical, deceitful, impulsive, jealous, lazy, manipulative, moody, reckless, selfish, vengeful), or neutral traits (aloof, blunt, cautious, methodical). Select traits that enhance character depth and story dynamics."
          },
          characteristics: {
            type: "string",
            description: "Character's broader characteristics including superpowers, passions, quirks, or unique traits (e.g., 'can fly and loves reading ancient books', 'always humming and has super strength', 'passionate about protecting nature')"
          },
          physicalDescription: {
            type: "string",
            description: "Appearance details (e.g., 'tall with golden hair and blue eyes', 'small purple dragon with silver wings')"
          },
          role: {
            type: "string",
            enum: CHARACTER_ROLES,
            description: "Character's narrative role in the story"
          }
        },
        required: ["name"],
        propertyOrdering: ["characterId", "name", "type", "age", "traits", "characteristics", "physicalDescription", "role"]
      }
    }
  },
  required: ["story", "characters"],
  propertyOrdering: ["story", "characters"]
};
