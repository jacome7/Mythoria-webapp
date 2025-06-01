import { SchemaType } from "@google-cloud/vertexai";

export const structureStoryOutlineSchema = {
  type: SchemaType.OBJECT,
  properties: {
    story: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "A captivating title for the story (e.g., 'The Dragon's Quest', 'Adventures in Wonderland')"
        },
        plotDescription: {
          type: SchemaType.STRING,
          description: "Detailed plot summary describing the main events, conflicts, and resolution"
        },
        synopsis: {
          type: SchemaType.STRING,
          description: "Brief 1-2 sentence summary highlighting the core premise"
        },
        place: {
          type: SchemaType.STRING,
          description: "Setting/location where the story takes place (e.g., 'Magical Kingdom of Eldoria', 'Modern-day New York')"
        },
        additionalRequests: {
          type: SchemaType.STRING,
          description: "Any special requirements or preferences mentioned by the user"
        },
        targetAudience: {
          type: SchemaType.STRING,
          enum: ["children_3-6", "children_7-10", "children_11-14", "young_adult", "adult", "all_ages"],
          description: "Target age group for the story"
        },
        novelStyle: {
          type: SchemaType.STRING,
          enum: ["adventure", "fantasy", "mystery", "romance", "science_fiction", "historical", "contemporary", "fairy_tale", "comedy", "drama"],
          description: "Literary genre and style of the story"
        },
        graphicalStyle: {
          type: SchemaType.STRING,
          enum: ["cartoon", "realistic", "watercolor", "digital_art", "hand_drawn", "minimalist", "vintage", "comic_book", "anime"],
          description: "Visual art style for illustrations"
        }
      },
      required: ["plotDescription"]
    },
    characters: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          characterId: {
            type: SchemaType.STRING,
            nullable: true,
            description: "UUID of existing character if reusing, or null for new characters"
          },
          name: {
            type: SchemaType.STRING,
            description: "Character's name (e.g., 'Princess Luna', 'Captain Jack')"
          },
          type: {
            type: SchemaType.STRING,
            enum: ["human", "animal", "fantasy_creature", "robot", "alien", "mythical_being", "object", "other"],
            description: "What type of being/entity the character is"
          },
          passions: {
            type: SchemaType.STRING,
            description: "What the character loves or is passionate about (e.g., 'reading ancient books', 'protecting nature')"
          },
          superpowers: {
            type: SchemaType.STRING,
            description: "Special abilities or powers (e.g., 'can fly', 'telepathy', 'super strength', 'none' for regular characters)"
          },
          physicalDescription: {
            type: SchemaType.STRING,
            description: "Appearance details (e.g., 'tall with golden hair and blue eyes', 'small purple dragon with silver wings')"
          },
          photoUrl: {
            type: SchemaType.STRING,
            nullable: true,
            description: "URL to character image (usually null for new characters)"
          },
          role: {
            type: SchemaType.STRING,
            enum: ["protagonist", "antagonist", "supporting", "mentor", "comic_relief", "love_interest", "sidekick", "narrator", "other"],
            description: "Character's narrative role in the story"
          }
        },
        required: ["name"]
      }
    }
  },
  required: ["story", "characters"]
};