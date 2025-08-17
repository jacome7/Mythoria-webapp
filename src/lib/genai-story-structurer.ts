import { GoogleGenAI } from "@google/genai";
import { getLanguageSpecificPrompt, getLanguageSpecificSchema } from "./prompt-loader";
import { normalizeCharacterType } from "@/types/character-enums";
import { normalizeStoryEnums } from "@/utils/enum-normalizers";

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
  age?: string;
  traits?: string[];
  characteristics?: string;
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
  storyLanguage?: string;
}

export interface StructuredStoryResult {
  story: StructuredStory;
  characters: StructuredCharacter[];
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
  authorName?: string,
): Promise<StructuredStoryResult> {
  // Load language-specific prompt and schema
  const promptConfig = await getLanguageSpecificPrompt();
  const responseSchema = await getLanguageSpecificSchema();

  // Build the system prompt from template
  const systemPrompt = promptConfig.template
    .replace("{{userDescription}}", userDescription)
    .replace("{{existingCharacters}}", JSON.stringify(existingCharacters))
    .replace("{{authorName}}", authorName || "");

  // According to Google Cloud docs, these models support structured output
  const modelName = process.env.MODEL_ID || "gemini-2.5-flash";

  const generationConfig = {
    maxOutputTokens: 16384,
    temperature: 0.8,
    topP: 0.8,
    responseMimeType: "application/json",
    responseSchema: responseSchema,
  } as const;

  // Prepare content based on whether we have image data, audio data, or both
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contents: any[];

  if (imageData || audioData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: systemPrompt }];

    // Add image if present
    if (imageData) {
      try {
        const base64Data = imageData.split(",")[1];
        const mimeType = imageData.split(";")[0].split(":")[1];
        if (!base64Data || !mimeType) {
          throw new Error("Invalid image format");
        }
        parts.push({ inlineData: { mimeType, data: base64Data } });
      } catch {
        throw new Error("Failed to process image input");
      }
    }

    // Add audio if present
    if (audioData) {
      try {
        const base64Data = audioData.split(",")[1];
        const mimeType = audioData.split(";")[0].split(":")[1];
        if (!base64Data || !mimeType) {
          throw new Error("Invalid audio format");
        }
        parts.push({ inlineData: { mimeType, data: base64Data } });
      } catch {
        throw new Error("Failed to process audio input");
      }
    }

    contents = [{ role: "user", parts }];
  } else {
    contents = [{ role: "user", parts: [{ text: systemPrompt }] }];
  }

  // Prepare the request with structured output schema
  const req = {
    model: modelName,
    contents,
    generationConfig,
  } as const;

  // Generate content
  const result = await ai.models.generateContent(req);
  const text = result.text;
  if (!text) {
    throw new Error("No response text from AI model");
  }

  // Clean the response text to handle potential markdown wrapping and extra text
  let cleanedText = text.trim();

  // Try to extract JSON block
  let jsonStartIndex = -1;
  let jsonEndIndex = -1;
  const jsonStartPatterns = ["{", "```json", "```"];
  for (const pattern of jsonStartPatterns) {
    const index = cleanedText.indexOf(pattern);
    if (index !== -1) {
      jsonStartIndex = pattern.startsWith("`") ? index + pattern.length : index;
      break;
    }
  }

  if (jsonStartIndex !== -1) {
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    for (let i = jsonStartIndex; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") braceCount++;
        else if (char === "}") {
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

  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  cleanedText = cleanedText.trim();

  // Parse JSON
  let parsedResult: StructuredStoryResult;
  try {
    parsedResult = JSON.parse(cleanedText);
  } catch {
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Invalid JSON format in AI response");
      }
    } else {
      throw new Error("Invalid JSON format in AI response");
    }
  }

  // Validate the structure
  if (!parsedResult.story || !Array.isArray(parsedResult.characters)) {
    const fallbackResult: StructuredStoryResult = {
      story: { plotDescription: userDescription, title: "Generated Story" },
      characters: [],
    };
    return fallbackResult;
  }

  // Normalize
  if (parsedResult.characters && Array.isArray(parsedResult.characters)) {
    parsedResult.characters = parsedResult.characters.map((character) => ({
      ...character,
      type: normalizeCharacterType(character.type),
    }));
  }

  if (parsedResult.story) {
    const normalized = normalizeStoryEnums(parsedResult.story as Record<string, unknown>);
    parsedResult.story = normalized as StructuredStory;
  }

  return parsedResult;
}

export default generateStructuredStory;
