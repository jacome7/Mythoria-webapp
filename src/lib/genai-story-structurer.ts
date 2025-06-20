import { GoogleGenAI } from "@google/genai";
import { getLanguageSpecificPrompt, getLanguageSpecificSchema } from "./prompt-loader";
import { calculateGenAICost, normalizeModelName } from "@/db/genai-cost-calculator";
import { tokenUsageService } from "@/db/services/token-usage-tracking";

// Define valid character type enum values that match the UI
const VALID_CHARACTER_TYPES = [
  "Boy", "Girl", "Baby", "Man", "Woman", "Human", 
  "Dog", "Dragon", "Fantasy Creature", "Animal", "Other"
] as const;

// Function to normalize character type to valid enum values that match the UI
function normalizeCharacterType(type: string | undefined): string | undefined {
  if (!type || typeof type !== 'string') return type;
  
  const trimmedType = type.trim();
    // Direct match with enum values (case-sensitive)
  if (VALID_CHARACTER_TYPES.includes(trimmedType as typeof VALID_CHARACTER_TYPES[number])) {
    return trimmedType;
  }
    // Handle common variations that AI might return and map to UI values
  const typeMap: Record<string, string> = {
    // Handle old enum values that might still be returned
    'human': 'Human',
    'animal': 'Animal',
    'fantasy_creature': 'Fantasy Creature',
    'robot': 'Other',
    'alien': 'Other',
    'mythical_being': 'Fantasy Creature',
    'object': 'Other',
    'other': 'Other',
    
    // Handle common variations (case insensitive mapping)
    'boy': 'Boy',
    'BOY': 'Boy',
    'girl': 'Girl',
    'GIRL': 'Girl',
    'baby': 'Baby',
    'BABY': 'Baby',
    'infant': 'Baby',
    'toddler': 'Baby',
    'man': 'Man',
    'MAN': 'Man',
    'adult male': 'Man',
    'male': 'Man',
    'woman': 'Woman',
    'WOMAN': 'Woman',
    'adult female': 'Woman',
    'female': 'Woman',
    'Human': 'Human',
    'HUMAN': 'Human',
    'person': 'Human',
    'people': 'Human',
    'child': 'Human',
    'adult': 'Human',
    
    'dog': 'Dog',
    'DOG': 'Dog',
    'puppy': 'Dog',
    'canine': 'Dog',
    
    'dragon': 'Dragon',
    'DRAGON': 'Dragon',
    'dragons': 'Dragon',
    
    'fantasy creature': 'Fantasy Creature',
    'FANTASY CREATURE': 'Fantasy Creature',
    'magical creature': 'Fantasy Creature',
    'mythical creature': 'Fantasy Creature',
    'unicorn': 'Fantasy Creature',
    'fairy': 'Fantasy Creature',
    'elf': 'Fantasy Creature',
    'dwarf': 'Fantasy Creature',
    'wizard': 'Fantasy Creature',
    'witch': 'Fantasy Creature',
    
    'Animal': 'Animal',
    'ANIMAL': 'Animal',
    'animals': 'Animal',
    'pet': 'Animal',
    'beast': 'Animal',
    'creature': 'Animal',
    'cat': 'Animal',
    'bird': 'Animal',
    'horse': 'Animal',
    'rabbit': 'Animal',
    
    'Other': 'Other',
    'OTHER': 'Other',
    'robots': 'Other',
    'android': 'Other',
    'cyborg': 'Other',
    'machine': 'Other',
    'aliens': 'Other',
    'extraterrestrial': 'Other',
    'et': 'Other',
    'god': 'Other',
    'goddess': 'Other',
    'deity': 'Other',
    'spirit': 'Other',
    'ghost': 'Other',
    'objects': 'Other',
    'item': 'Other',
    'thing': 'Other',
    'inanimate': 'Other'
  };
  
  // Check mapped values
  const normalizedType = typeMap[trimmedType];
  if (normalizedType) {
    return normalizedType;
  }
  
  // If no match found, default to 'Other'
  console.warn(`Unknown character type "${type}" normalized to "Other"`);
  return 'Other';
}

// Initialize GoogleGenAI client with Vertex AI configuration
const clientOptions = {
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || "oceanic-beach-460916-n5",
  location: process.env.GOOGLE_AI_LOCATION || "global",
};

const ai = new GoogleGenAI(clientOptions);

// Types for the structured output
export interface StructuredCharacter {
  characterId: string | null;
  name: string;
  type?: string;
  passions?: string;
  superpowers?: string;
  physicalDescription?: string;
  photoUrl?: string;
  role?: string;
}

export interface StructuredStory {
  title?: string;
  plotDescription?: string;
  synopsis?: string;
  place?: string;
  additionalRequests?: string;
  targetAudience?: string;
  novelStyle?: string;
  graphicalStyle?: string;
}

export interface StructuredStoryResult {
  story: StructuredStory;
  characters: StructuredCharacter[];
  costInfo?: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    modelUsed: string;
  };
}

export async function generateStructuredStory(
  userDescription: string, 
  existingCharacters: Array<{
    characterId: string;
    name: string;
    authorId: string | null;
    [key: string]: unknown;
  }> = [],
  imageData?: string | null,
  audioData?: string | null,
  userLanguage: string = 'en-US',
  authorId?: string,
  storyId?: string
): Promise<StructuredStoryResult> {
  try {
    // Load language-specific prompt and schema
    const promptConfig = await getLanguageSpecificPrompt(userLanguage);
    const responseSchema = await getLanguageSpecificSchema();

    // Build the system prompt from template
    const systemPrompt = promptConfig.template
      .replace('{{userDescription}}', userDescription)
      .replace('{{existingCharacters}}', JSON.stringify(existingCharacters));    // Get model name from environment - use the most reliable model for structured output
    // According to Google Cloud docs, these models support structured output:
    // gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite
    const modelName = process.env.MODEL_ID || "gemini-2.5-flash";    // Define generation configuration with structured output enforced
    // According to Google Cloud docs, these settings guarantee JSON schema compliance
    const generationConfig = {
      maxOutputTokens: 8192,
      temperature: 0.1, // Very low temperature for consistent JSON output
      topP: 0.8,
      responseMimeType: "application/json", // This forces JSON output
      responseSchema: responseSchema, // This enforces the exact schema structure
    };

    // Prepare content based on whether we have image data, audio data, or both
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contents: any[];

    if (imageData || audioData) {
      console.log('Processing request with media data - Image:', !!imageData, 'Audio:', !!audioData);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [{ text: systemPrompt }];
      
      // Add image if present
      if (imageData) {
        try {
          const base64Data = imageData.split(',')[1];
          const mimeType = imageData.split(';')[0].split(':')[1];
          
          if (!base64Data || !mimeType) {
            throw new Error('Invalid image data format');
          }
          
          console.log('Image MIME type:', mimeType);
          console.log('Base64 data length:', base64Data.length);
          
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        } catch (error) {
          console.error('Error processing image data:', error);
          throw new Error('Failed to process image data for AI analysis');
        }
      }
      
      // Add audio if present
      if (audioData) {
        try {
          const base64Data = audioData.split(',')[1];
          const mimeType = audioData.split(';')[0].split(':')[1];
          
          if (!base64Data || !mimeType) {
            throw new Error('Invalid audio data format');
          }
          
          console.log('Audio MIME type:', mimeType);
          console.log('Audio Base64 data length:', base64Data.length);
          
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        } catch (error) {
          console.error('Error processing audio data:', error);
          throw new Error('Failed to process audio data for AI analysis');
        }
      }
      
      contents = [
        {
          role: 'user',
          parts: parts
        }
      ];
    } else {
      console.log('Processing request with text only');
      contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ];
    }    // Prepare the request with structured output schema
    const req = {
      model: modelName,
      contents: contents,
      generationConfig: generationConfig,
    };    // Generate content
    console.log("Making GenAI request with:", {
      model: modelName,
      contentsLength: contents.length,
      hasResponseSchema: !!responseSchema,
      generationConfig
    });
      const result = await ai.models.generateContent(req);
    
    console.log("GenAI result candidates:", result.candidates?.length);
    
    // Extract token usage information from the response
    const inputTokens = result.usageMetadata?.promptTokenCount || 0;
    const outputTokens = result.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = result.usageMetadata?.totalTokenCount || 0;
    
    console.log("Token usage:", {
      inputTokens,
      outputTokens,
      totalTokens,
      model: modelName
    });
    
    // Calculate cost for this request
    const normalizedModelName = normalizeModelName(modelName);
    const imageCount = imageData ? 1 : 0; // Count images if present
    
    const costInfo = calculateGenAICost({
      provider: 'google',
      modelName: normalizedModelName,
      inputTokens,
      outputTokens,
      imageCount
    });
    
    console.log("Cost calculation:", costInfo);
    
    // Track token usage if we have the required IDs
    if (authorId && storyId && costInfo.modelFound) {
      try {
        await tokenUsageService.recordTokenUsage({
          authorId,
          storyId,
          action: 'story_structure',
          aiModel: modelName,
          inputTokens,
          outputTokens,
          estimatedCostInEuros: costInfo.totalCost,
          inputPromptJson: {
            userDescription,
            existingCharacters,
            hasImage: !!imageData,
            hasAudio: !!audioData,
            userLanguage,
            modelName,
            timestamp: new Date().toISOString()
          }
        });
        console.log("Token usage recorded successfully");
      } catch (trackingError) {
        console.error("Failed to record token usage:", trackingError);
        // Don't fail the main request if tracking fails
      }
    }
    
    // Get the text from the response
    const text = result.text;
    
    console.log("Raw AI response:", text);
    
    if (!text) {
      throw new Error("No response text generated from the model");
    }    // Clean the response text to handle potential markdown wrapping and extra text
    let cleanedText = text.trim();
    
    // Enhanced JSON extraction to handle responses with explanatory text
    // First, try to find JSON within the response
    let jsonStartIndex = -1;
    let jsonEndIndex = -1;
    
    // Look for JSON starting patterns
    const jsonStartPatterns = ['{', '```json', '```'];
    for (const pattern of jsonStartPatterns) {
      const index = cleanedText.indexOf(pattern);
      if (index !== -1) {
        if (pattern === '```json') {
          jsonStartIndex = index + pattern.length;
        } else if (pattern === '```') {
          jsonStartIndex = index + pattern.length;
        } else {
          jsonStartIndex = index;
        }
        break;
      }
    }
    
    if (jsonStartIndex !== -1) {
      // Find the end of JSON
      let braceCount = 0;
      let inString = false;
      let escaped = false;
      
      for (let i = jsonStartIndex; i < cleanedText.length; i++) {
        const char = cleanedText[i];
        
        if (escaped) {
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEndIndex = i + 1;
              break;
            }
          }
        }
      }
      
      if (jsonEndIndex !== -1) {
        cleanedText = cleanedText.substring(jsonStartIndex, jsonEndIndex);
      }
    }
    
    // Remove any remaining markdown formatting
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Final cleanup
    cleanedText = cleanedText.trim();    // Parse the JSON text returned by the model
    let parsedResult: StructuredStoryResult;
    try {
      parsedResult = JSON.parse(cleanedText);
      console.log("Parsed result structure:", JSON.stringify(parsedResult, null, 2));
      
      // Debug: Check characterId values specifically
      if (parsedResult.characters) {
        console.log("Character ID debugging:");
        parsedResult.characters.forEach((char, index) => {
          console.log(`Character ${index}: characterId=${JSON.stringify(char.characterId)}, type=${typeof char.characterId}`);
        });
      }} catch (parseError) {
      console.error("Failed to parse GenAI response as JSON:", cleanedText);
      console.error("Parse error:", parseError);
      
      // Try to extract JSON even if parsing failed - maybe there's text before/after
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
          console.log("Successfully extracted JSON from response");
        } catch (secondParseError) {
          console.error("Second JSON parse attempt also failed:", secondParseError);
          throw new Error("GenAI returned invalid JSON format");
        }
      } else {
        throw new Error("GenAI returned invalid JSON format");
      }
    }// Validate the structure
    console.log("Validating structure...");
    console.log("parsedResult.story:", parsedResult.story);
    console.log("parsedResult.characters:", parsedResult.characters);
    console.log("Is characters array?", Array.isArray(parsedResult.characters));
    
    if (!parsedResult.story || !Array.isArray(parsedResult.characters)) {
      console.error("Structure validation failed:");
      console.error("- Has story property:", !!parsedResult.story);
      console.error("- Has characters property:", !!parsedResult.characters);
      console.error("- Characters is array:", Array.isArray(parsedResult.characters));
      console.error("Full parsed result:", JSON.stringify(parsedResult, null, 2));        // Try to create a fallback structure if the response has some usable content
      const fallbackResult: StructuredStoryResult = {
        story: {
          plotDescription: userDescription,
          title: "Generated Story"
        },
        characters: [],
        costInfo: costInfo.modelFound ? {
          totalCost: costInfo.totalCost,
          inputTokens,
          outputTokens,
          modelUsed: modelName
        } : undefined
      };
      
      console.log("Using fallback structure:", JSON.stringify(fallbackResult, null, 2));
      return fallbackResult;
    }

    // Normalize character types to ensure they match the enum values
    if (Array.isArray(parsedResult.characters)) {
      parsedResult.characters = parsedResult.characters.map(char => {
        return {
          ...char,
          type: normalizeCharacterType(char.type)
        };
      });
    }    // Normalize character types to ensure they match the required enum values
    if (parsedResult.characters && Array.isArray(parsedResult.characters)) {
      parsedResult.characters = parsedResult.characters.map(character => ({
        ...character,
        type: normalizeCharacterType(character.type)
      }));
      
      console.log("Character types after normalization:", 
        parsedResult.characters.map(char => ({ name: char.name, type: char.type }))
      );
    }

    // Add cost information to the result
    const resultWithCost: StructuredStoryResult = {
      ...parsedResult,
      costInfo: costInfo.modelFound ? {
        totalCost: costInfo.totalCost,
        inputTokens,
        outputTokens,
        modelUsed: modelName
      } : undefined
    };

    return resultWithCost;
  } catch (error) {
    console.error("Error in generateStructuredStory:", error);
    throw new Error(`Failed to generate structured story: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default generateStructuredStory;
