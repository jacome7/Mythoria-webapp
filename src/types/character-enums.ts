// Centralized character enums to maintain consistency across the application
// This is the single source of truth for character types and roles

export const CHARACTER_TYPES = [
  "Boy", 
  "Girl", 
  "Baby", 
  "Man", 
  "Woman", 
  "Dog", 
  "Dragon", 
  "Fantasy Creature", 
  "Animal", 
  "Other"
] as const;

export const CHARACTER_ROLES = [
  "protagonist",
  "antagonist", 
  "supporting",
  "mentor",
  "comic_relief",
  "love_interest",
  "sidekick",
  "narrator",
  "other"
] as const;

// TypeScript types derived from the arrays
export type CharacterType = typeof CHARACTER_TYPES[number];
export type CharacterRole = typeof CHARACTER_ROLES[number];

// Validation functions
export function isValidCharacterType(type: string): type is CharacterType {
  return CHARACTER_TYPES.includes(type as CharacterType);
}

export function isValidCharacterRole(role: string): role is CharacterRole {
  return CHARACTER_ROLES.includes(role as CharacterRole);
}

// Normalization function for AI outputs and external data
export function normalizeCharacterType(type: string | undefined): CharacterType {
  if (!type || typeof type !== 'string') return 'Other';
  
  const trimmedType = type.trim();
  
  // Direct match (case-sensitive)
  if (isValidCharacterType(trimmedType)) {
    return trimmedType;
  }
  
  // Handle common variations
  const typeMap: Record<string, CharacterType> = {
    // Handle "Human" variants - map to appropriate specific types or Other
    'human': 'Other',
    'Human': 'Other', 
    'HUMAN': 'Other',
    'person': 'Other',
    'people': 'Other',
    'child': 'Other',
    'adult': 'Other',
    
    // Specific mappings
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
    
    // Animal/creature variations
    'animal': 'Animal',
    'ANIMAL': 'Animal',
    'animals': 'Animal',
    'pet': 'Animal',
    'beast': 'Animal',
    'creature': 'Animal',
    'cat': 'Animal',
    'bird': 'Animal',
    'horse': 'Animal',
    'rabbit': 'Animal',
    
    'dog': 'Dog',
    'DOG': 'Dog',
    'puppy': 'Dog',
    'canine': 'Dog',
    
    'dragon': 'Dragon',
    'DRAGON': 'Dragon',
    'dragons': 'Dragon',
    
    'fantasy creature': 'Fantasy Creature',
    'FANTASY CREATURE': 'Fantasy Creature',
    'fantasy_creature': 'Fantasy Creature',
    'magical creature': 'Fantasy Creature',
    'mythical creature': 'Fantasy Creature',
    'mythical_being': 'Fantasy Creature',
    'unicorn': 'Fantasy Creature',
    'fairy': 'Fantasy Creature',
    'elf': 'Fantasy Creature',
    'dwarf': 'Fantasy Creature',
    'wizard': 'Fantasy Creature',
    'witch': 'Fantasy Creature',
    
    // Other category
    'other': 'Other',
    'OTHER': 'Other',
    'robot': 'Other',
    'robots': 'Other',
    'android': 'Other',
    'cyborg': 'Other',
    'machine': 'Other',
    'alien': 'Other',
    'aliens': 'Other',
    'extraterrestrial': 'Other',
    'et': 'Other',
    'god': 'Other',
    'goddess': 'Other',
    'deity': 'Other',
    'spirit': 'Other',
    'ghost': 'Other',
    'object': 'Other',
    'objects': 'Other',
    'item': 'Other',
    'thing': 'Other',
    'inanimate': 'Other'
  };
  
  const normalizedType = typeMap[trimmedType];
  if (normalizedType) {
    return normalizedType;
  }
  
  // If no match found, default to 'Other'
  return 'Other';
}

// Helper functions for UI options
export function getCharacterTypeOptions(t: (key: string) => string) {
  return CHARACTER_TYPES.map(type => ({
    value: type,
    label: t(`types.${type.toLowerCase().replace(/\s+/g, '_')}`)
  }));
}

export function getCharacterRoleOptions(t: (key: string) => string) {
  return CHARACTER_ROLES.map(role => ({
    value: role,
    label: t(`roles.${role}`)
  }));
}
