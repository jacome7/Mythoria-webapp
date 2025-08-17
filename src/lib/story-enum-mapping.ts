import { 
  TargetAudience, 
  NovelStyle, 
  GraphicalStyle,
  TargetAudienceLabels,
  NovelStyleLabels,
  GraphicalStyleLabels 
} from '../types/story-enums';
import { CharacterAge } from '../types/character-enums';
// Removed server-side lib translations; using plain fallback text for unknowns

/**
 * Smart mapping functions to convert AI output or user input to proper enum values
 * These functions handle various input formats and find the best matching enum value
 */

// Mapping from common AI outputs to TargetAudience enum
const targetAudienceMap: Record<string, TargetAudience> = {
  // Direct enum matches
  'children_0-2': TargetAudience.CHILDREN_0_2,
  'children_3-6': TargetAudience.CHILDREN_3_6,
  'children_7-10': TargetAudience.CHILDREN_7_10,
  'children_11-14': TargetAudience.CHILDREN_11_14,
  'young_adult_15-17': TargetAudience.YOUNG_ADULT_15_17,
  'adult_18+': TargetAudience.ADULT_18_PLUS,
  'all_ages': TargetAudience.ALL_AGES,
  
  // Legacy UI values (backward compatibility)
  'toddlers': TargetAudience.CHILDREN_0_2,
  'young kids': TargetAudience.CHILDREN_3_6,
  'kids': TargetAudience.CHILDREN_7_10,
  'teenagers': TargetAudience.YOUNG_ADULT_15_17,
  'adults': TargetAudience.ADULT_18_PLUS,
  
  // Common AI variations
  'children': TargetAudience.CHILDREN_7_10,
  'young_adult': TargetAudience.YOUNG_ADULT_15_17,
  'adult': TargetAudience.ADULT_18_PLUS,
  'preschool': TargetAudience.CHILDREN_3_6,
  'elementary': TargetAudience.CHILDREN_7_10,
  'middle_grade': TargetAudience.CHILDREN_11_14,
  'teen': TargetAudience.YOUNG_ADULT_15_17,
  'ya': TargetAudience.YOUNG_ADULT_15_17,
};

// Mapping from common AI outputs to NovelStyle enum
const novelStyleMap: Record<string, NovelStyle> = {
  // Direct enum matches
  'adventure': NovelStyle.ADVENTURE,
  'fantasy': NovelStyle.FANTASY,
  'mystery': NovelStyle.MYSTERY,
  'romance': NovelStyle.ROMANCE,
  'science_fiction': NovelStyle.SCIENCE_FICTION,
  'historical': NovelStyle.HISTORICAL,
  'contemporary': NovelStyle.CONTEMPORARY,
  'fairy_tale': NovelStyle.FAIRY_TALE,
  'comedy': NovelStyle.COMEDY,
  'drama': NovelStyle.DRAMA,
  'horror': NovelStyle.HORROR,
  'thriller': NovelStyle.THRILLER,
  'biography': NovelStyle.BIOGRAPHY,
  'educational': NovelStyle.EDUCATIONAL,
  'poetry': NovelStyle.POETRY,
  
  // Common variations
  'sci-fi': NovelStyle.SCIENCE_FICTION,
  'scifi': NovelStyle.SCIENCE_FICTION,
  'fairy tale': NovelStyle.FAIRY_TALE,
  'fairytale': NovelStyle.FAIRY_TALE,
  'historic': NovelStyle.HISTORICAL,
  'modern': NovelStyle.CONTEMPORARY,
  'funny': NovelStyle.COMEDY,
  'humorous': NovelStyle.COMEDY,
  'dramatic': NovelStyle.DRAMA,
  'scary': NovelStyle.HORROR,
  'spooky': NovelStyle.HORROR,
  'suspense': NovelStyle.THRILLER,
  'bio': NovelStyle.BIOGRAPHY,
  'learn': NovelStyle.EDUCATIONAL,
  'learning': NovelStyle.EDUCATIONAL,
};

// Mapping from common AI outputs to GraphicalStyle enum
const graphicalStyleMap: Record<string, GraphicalStyle> = {
  // Direct enum matches
  'cartoon': GraphicalStyle.CARTOON,
  'realistic': GraphicalStyle.REALISTIC,
  'watercolor': GraphicalStyle.WATERCOLOR,
  'digital_art': GraphicalStyle.DIGITAL_ART,
  'hand_drawn': GraphicalStyle.HAND_DRAWN,
  'minimalist': GraphicalStyle.MINIMALIST,
  'vintage': GraphicalStyle.VINTAGE,
  'comic_book': GraphicalStyle.COMIC_BOOK,
  'anime': GraphicalStyle.ANIME,
  'pixar_style': GraphicalStyle.PIXAR_STYLE,
  'disney_style': GraphicalStyle.DISNEY_STYLE,
  'sketch': GraphicalStyle.SKETCH,
  'oil_painting': GraphicalStyle.OIL_PAINTING,
  'colored_pencil': GraphicalStyle.COLORED_PENCIL,
  
  // Legacy UI values and variations
  'colored book': GraphicalStyle.COLORED_PENCIL,
  'pixar animation': GraphicalStyle.PIXAR_STYLE,
  'disney': GraphicalStyle.DISNEY_STYLE,
  'comic': GraphicalStyle.COMIC_BOOK,
  'manga': GraphicalStyle.ANIME,
  'pencil': GraphicalStyle.SKETCH,
  'painting': GraphicalStyle.OIL_PAINTING,
  'watercolour': GraphicalStyle.WATERCOLOR,
  'digital': GraphicalStyle.DIGITAL_ART,
  'handdrawn': GraphicalStyle.HAND_DRAWN,
  'hand-drawn': GraphicalStyle.HAND_DRAWN,
  'minimalistic': GraphicalStyle.MINIMALIST,
  'simple': GraphicalStyle.MINIMALIST,
  'retro': GraphicalStyle.VINTAGE,
  'classic': GraphicalStyle.VINTAGE,
};

// Mapping from common AI outputs to CharacterAge enum
const characterAgeMap: Record<string, CharacterAge> = {
  // Direct enum matches - Human ages
  'infant': 'infant',
  'toddler': 'toddler',
  'preschool': 'preschool',
  'school_age': 'school_age',
  'teenage': 'teenage',
  'emerging_adult': 'emerging_adult',
  'seasoned_adult': 'seasoned_adult',
  'midlife_mentor': 'midlife_mentor',
  'elder': 'elder',
  
  // Direct enum matches - Non-human ages
  'youngling': 'youngling',
  'adult': 'adult',
  'senior': 'senior',
  
  // Common AI variations for human ages
  'baby': 'infant',
  'newborn': 'infant',
  'neonate': 'infant',
  'child': 'toddler',
  'preschooler': 'preschool',
  'kindergarten': 'preschool',
  'schoolage': 'school_age',
  'school-age': 'school_age',
  'elementary': 'school_age',
  'kid': 'school_age',
  'teen': 'teenage',
  'teenager': 'teenage',
  'adolescent': 'teenage',
  'young_adult': 'emerging_adult',
  'youngadult': 'emerging_adult',
  'young-adult': 'emerging_adult',
  'college': 'emerging_adult',
  'university': 'emerging_adult',
  'middle_aged': 'seasoned_adult',
  'middleaged': 'seasoned_adult',
  'middle-aged': 'seasoned_adult',
  'midlife': 'midlife_mentor',
  'middle-life': 'midlife_mentor',
  'elderly': 'elder',
  'senior_citizen': 'elder',
  
  // Common AI variations for non-human ages
  'young': 'youngling',
  'juvenile': 'youngling',
  'puppy': 'youngling',
  'kitten': 'youngling',
  'cub': 'youngling',
  'mature': 'adult',
  'grown': 'adult',
  'fully_grown': 'adult',
  'aged': 'senior',
};

/**
 * Maps AI output or user input to the correct TargetAudience enum value
 */
export function mapToTargetAudience(input: string | null | undefined): TargetAudience | null {
  if (!input) return null;
  
  const normalized = input.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  return targetAudienceMap[normalized] || null;
}

/**
 * Maps AI output or user input to the correct NovelStyle enum value
 */
export function mapToNovelStyle(input: string | null | undefined): NovelStyle | null {
  if (!input) return null;
  
  const normalized = input.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  return novelStyleMap[normalized] || null;
}

/**
 * Maps AI output or user input to the correct GraphicalStyle enum value
 */
export function mapToGraphicalStyle(input: string | null | undefined): GraphicalStyle | null {
  if (!input) return null;
  
  const normalized = input.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  return graphicalStyleMap[normalized] || null;
}

/**
 * Maps AI output or user input to the correct CharacterAge enum value
 */
export function mapToCharacterAge(input: string | null | undefined): CharacterAge | null {
  if (!input) return null;
  
  const normalized = input.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  return characterAgeMap[normalized] || null;
}

/**
 * Validates if a string is a valid TargetAudience enum value
 */
export function isValidTargetAudience(value: string): value is TargetAudience {
  return Object.values(TargetAudience).includes(value as TargetAudience);
}

/**
 * Validates if a string is a valid NovelStyle enum value
 */
export function isValidNovelStyle(value: string): value is NovelStyle {
  return Object.values(NovelStyle).includes(value as NovelStyle);
}

/**
 * Validates if a string is a valid GraphicalStyle enum value
 */
export function isValidGraphicalStyle(value: string): value is GraphicalStyle {
  return Object.values(GraphicalStyle).includes(value as GraphicalStyle);
}

/**
 * Validates if a string is a valid CharacterAge enum value
 */
export function isValidCharacterAge(value: string): value is CharacterAge {
  const ages: CharacterAge[] = [
    'infant', 'toddler', 'preschool', 'school_age', 'teenage', 
    'emerging_adult', 'seasoned_adult', 'midlife_mentor', 'elder',
    'youngling', 'adult', 'senior'
  ];
  return ages.includes(value as CharacterAge);
}

/**
 * Smart mapping function that handles AI output for story attributes
 * Used in the GenAI processing pipeline
 */
export function mapStoryAttributes(aiOutput: {
  targetAudience?: string;
  novelStyle?: string;
  graphicalStyle?: string;
}) {
  return {
    targetAudience: mapToTargetAudience(aiOutput.targetAudience),
    novelStyle: mapToNovelStyle(aiOutput.novelStyle),
    graphicalStyle: mapToGraphicalStyle(aiOutput.graphicalStyle)
  };
}

/**
 * Smart mapping function that handles AI output for character attributes
 * Used in the GenAI processing pipeline
 */
export function mapCharacterAttributes(aiOutput: {
  age?: string;
}) {
  return {
    age: mapToCharacterAge(aiOutput.age)
  };
}

/**
 * Gets human-readable label for enum value, with fallback for invalid values
 */
export async function getTargetAudienceLabelSafe(value: string | null | undefined, _locale?: string): Promise<string> {
  void _locale;
  if (!value) {
    return 'Unknown';
  }
  const targetAudience = mapToTargetAudience(value);
  return targetAudience ? TargetAudienceLabels[targetAudience] : value;
}

export async function getNovelStyleLabelSafe(value: string | null | undefined, _locale?: string): Promise<string> {
  void _locale;
  if (!value) {
    return 'Unknown';
  }
  const novelStyle = mapToNovelStyle(value);
  return novelStyle ? NovelStyleLabels[novelStyle] : value;
}

export async function getGraphicalStyleLabelSafe(value: string | null | undefined, _locale?: string): Promise<string> {
  void _locale;
  if (!value) {
    return 'Unknown';
  }
  const graphicalStyle = mapToGraphicalStyle(value);
  return graphicalStyle ? GraphicalStyleLabels[graphicalStyle] : value;
}

export async function getCharacterAgeLabelSafe(value: string | null | undefined, _locale?: string): Promise<string> {
  void _locale;
  if (!value) {
    return 'Unknown';
  }
  // Since we don't have labels for character ages, return formatted version
  const age = mapToCharacterAge(value);
  if (!age) return value;
  
  // Convert snake_case to Title Case
  return age
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
