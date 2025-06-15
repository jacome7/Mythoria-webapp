// Centralized schema for story outline structure
// Used across all languages to maintain consistency
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
        },        targetAudience: {
          type: "string",
          enum: ["children_0-2", "children_3-6", "children_7-10", "children_11-14", "young_adult_15-17", "adult_18+", "all_ages"],
          description: "Target age group for the story"
        },        novelStyle: {
          type: "string",
          enum: ["adventure", "fantasy", "mystery", "romance", "science_fiction", "historical", "contemporary", "fairy_tale", "comedy", "drama", "horror", "thriller", "biography", "educational", "poetry", "sports_adventure"],
          description: "Literary genre and style of the story"
        },graphicalStyle: {
          type: "string",
          enum: ["cartoon", "realistic", "watercolor", "digital_art", "hand_drawn", "minimalist", "vintage", "comic_book", "anime", "pixar_style", "disney_style", "sketch", "oil_painting", "colored_pencil"],
          description: "Visual art style for illustrations"
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
            description: "UUID of existing character if reusing, or null for new characters"
          },
          name: {
            type: "string",
            description: "Character's name (e.g., 'Princess Luna', 'Captain Jack')"
          },
          type: {
            type: "string",
            enum: ["human", "animal", "fantasy_creature", "robot", "alien", "mythical_being", "object", "other"],
            description: "What type of being/entity the character is"
          },
          passions: {
            type: "string",
            description: "What the character loves or is passionate about (e.g., 'reading ancient books', 'protecting nature')"
          },
          superpowers: {
            type: "string",
            description: "Special abilities or powers (e.g., 'can fly', 'telepathy', 'super strength', 'none' for regular characters)"
          },
          physicalDescription: {
            type: "string",
            description: "Appearance details (e.g., 'tall with golden hair and blue eyes', 'small purple dragon with silver wings')"
          },
          photoUrl: {
            type: "string",
            nullable: true,
            description: "URL to character image (usually null for new characters)"
          },
          role: {
            type: "string",
            enum: ["protagonist", "antagonist", "supporting", "mentor", "comic_relief", "love_interest", "sidekick", "narrator", "other"],
            description: "Character's narrative role in the story"
          }
        },
        required: ["name"],
        propertyOrdering: ["characterId", "name", "type", "passions", "superpowers", "physicalDescription", "photoUrl", "role"]
      }
    }
  },
  required: ["story", "characters"],
  propertyOrdering: ["story", "characters"]
};
