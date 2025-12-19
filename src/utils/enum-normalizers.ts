// Comprehensive enum normalization utilities for GenAI outputs
// Handles common variations and synonyms to ensure compatibility with UI dropdowns

import {
  TargetAudience,
  NovelStyle,
  GraphicalStyle,
  getAllTargetAudiences,
  getAllNovelStyles,
  getAllGraphicalStyles,
} from '@/types/story-enums';

// =============================================================================
// TARGET AUDIENCE NORMALIZER
// =============================================================================

/**
 * Normalizes GenAI output for target audience to match enum values
 */
export function normalizeTargetAudience(audience: string | undefined): TargetAudience {
  if (!audience || typeof audience !== 'string') return TargetAudience.CHILDREN_3_6;

  const trimmed = audience.trim().toLowerCase();

  // Direct match (case-insensitive)
  const directMatch = getAllTargetAudiences().find((value) => value.toLowerCase() === trimmed);
  if (directMatch) return directMatch;

  // Common variations and synonyms
  const audienceMap: Record<string, TargetAudience> = {
    // Babies & Toddlers (0-2)
    babies: TargetAudience.CHILDREN_0_2,
    baby: TargetAudience.CHILDREN_0_2,
    toddlers: TargetAudience.CHILDREN_0_2,
    toddler: TargetAudience.CHILDREN_0_2,
    infants: TargetAudience.CHILDREN_0_2,
    infant: TargetAudience.CHILDREN_0_2,
    'very young children': TargetAudience.CHILDREN_0_2,
    '0-2': TargetAudience.CHILDREN_0_2,
    '0-2 years': TargetAudience.CHILDREN_0_2,

    // Preschoolers (3-6)
    preschoolers: TargetAudience.CHILDREN_3_6,
    preschool: TargetAudience.CHILDREN_3_6,
    'young children': TargetAudience.CHILDREN_3_6,
    'little kids': TargetAudience.CHILDREN_3_6,
    kindergarten: TargetAudience.CHILDREN_3_6,
    '3-6': TargetAudience.CHILDREN_3_6,
    '3-6 years': TargetAudience.CHILDREN_3_6,
    'early childhood': TargetAudience.CHILDREN_3_6,

    // Early Elementary (7-10)
    elementary: TargetAudience.CHILDREN_7_10,
    'early elementary': TargetAudience.CHILDREN_7_10,
    'primary school': TargetAudience.CHILDREN_7_10,
    'school age': TargetAudience.CHILDREN_7_10,
    children: TargetAudience.CHILDREN_7_10, // Default "children"
    kids: TargetAudience.CHILDREN_7_10,
    '7-10': TargetAudience.CHILDREN_7_10,
    '7-10 years': TargetAudience.CHILDREN_7_10,

    // Middle Grade (11-14)
    'middle grade': TargetAudience.CHILDREN_11_14,
    'middle school': TargetAudience.CHILDREN_11_14,
    tweens: TargetAudience.CHILDREN_11_14,
    tween: TargetAudience.CHILDREN_11_14,
    'pre-teens': TargetAudience.CHILDREN_11_14,
    preteen: TargetAudience.CHILDREN_11_14,
    '11-14': TargetAudience.CHILDREN_11_14,
    '11-14 years': TargetAudience.CHILDREN_11_14,

    // Young Adult (15-17)
    'young adult': TargetAudience.YOUNG_ADULT_15_17,
    ya: TargetAudience.YOUNG_ADULT_15_17,
    teens: TargetAudience.YOUNG_ADULT_15_17,
    teenagers: TargetAudience.YOUNG_ADULT_15_17,
    teen: TargetAudience.YOUNG_ADULT_15_17,
    teenager: TargetAudience.YOUNG_ADULT_15_17,
    'high school': TargetAudience.YOUNG_ADULT_15_17,
    adolescents: TargetAudience.YOUNG_ADULT_15_17,
    '15-17': TargetAudience.YOUNG_ADULT_15_17,
    '15-17 years': TargetAudience.YOUNG_ADULT_15_17,

    // Adults (18+)
    adults: TargetAudience.ADULT_18_PLUS,
    adult: TargetAudience.ADULT_18_PLUS,
    'grown-ups': TargetAudience.ADULT_18_PLUS,
    grownups: TargetAudience.ADULT_18_PLUS,
    mature: TargetAudience.ADULT_18_PLUS,
    '18+': TargetAudience.ADULT_18_PLUS,
    '18 and up': TargetAudience.ADULT_18_PLUS,
    'older readers': TargetAudience.ADULT_18_PLUS,

    // All Ages
    'all ages': TargetAudience.ALL_AGES,
    everyone: TargetAudience.ALL_AGES,
    family: TargetAudience.ALL_AGES,
    universal: TargetAudience.ALL_AGES,
    'general audience': TargetAudience.ALL_AGES,
    'any age': TargetAudience.ALL_AGES,
  };

  const normalized = audienceMap[trimmed];
  if (normalized) return normalized;

  // Age-based detection from text
  if (
    trimmed.includes('baby') ||
    trimmed.includes('infant') ||
    trimmed.includes('0') ||
    trimmed.includes('1') ||
    trimmed.includes('2')
  ) {
    return TargetAudience.CHILDREN_0_2;
  }
  if (
    trimmed.includes('preschool') ||
    trimmed.includes('3') ||
    trimmed.includes('4') ||
    trimmed.includes('5') ||
    trimmed.includes('6')
  ) {
    return TargetAudience.CHILDREN_3_6;
  }
  if (
    trimmed.includes('elementary') ||
    trimmed.includes('7') ||
    trimmed.includes('8') ||
    trimmed.includes('9') ||
    trimmed.includes('10')
  ) {
    return TargetAudience.CHILDREN_7_10;
  }
  if (
    trimmed.includes('middle') ||
    trimmed.includes('tween') ||
    trimmed.includes('11') ||
    trimmed.includes('12') ||
    trimmed.includes('13') ||
    trimmed.includes('14')
  ) {
    return TargetAudience.CHILDREN_11_14;
  }
  if (
    trimmed.includes('teen') ||
    trimmed.includes('young adult') ||
    trimmed.includes('15') ||
    trimmed.includes('16') ||
    trimmed.includes('17')
  ) {
    return TargetAudience.YOUNG_ADULT_15_17;
  }
  if (trimmed.includes('adult') || trimmed.includes('18') || trimmed.includes('grown')) {
    return TargetAudience.ADULT_18_PLUS;
  }

  // Default fallback
  return TargetAudience.CHILDREN_3_6;
}

// =============================================================================
// NOVEL STYLE NORMALIZER
// =============================================================================

/**
 * Normalizes GenAI output for novel style to match enum values
 */
export function normalizeNovelStyle(style: string | undefined): NovelStyle {
  if (!style || typeof style !== 'string') return NovelStyle.ADVENTURE;

  const trimmed = style.trim().toLowerCase();

  // Direct match (case-insensitive)
  const directMatch = getAllNovelStyles().find((value) => value.toLowerCase() === trimmed);
  if (directMatch) return directMatch;

  // Common variations and synonyms
  const styleMap: Record<string, NovelStyle> = {
    // Adventure
    adventure: NovelStyle.ADVENTURE,
    adventures: NovelStyle.ADVENTURE,
    quest: NovelStyle.ADVENTURE,
    quests: NovelStyle.ADVENTURE,
    journey: NovelStyle.ADVENTURE,
    exploration: NovelStyle.ADVENTURE,
    'action adventure': NovelStyle.ADVENTURE,

    // Fantasy
    fantasy: NovelStyle.FANTASY,
    magical: NovelStyle.FANTASY,
    magic: NovelStyle.FANTASY,
    'fairy tale': NovelStyle.FAIRY_TALE,
    fairytale: NovelStyle.FAIRY_TALE,
    'fairy-tale': NovelStyle.FAIRY_TALE,
    mythical: NovelStyle.FANTASY,
    mythological: NovelStyle.FANTASY,
    dragons: NovelStyle.FANTASY,
    wizards: NovelStyle.FANTASY,
    enchanted: NovelStyle.FANTASY,
    'magical adventure': NovelStyle.FANTASY,

    // Mystery
    mystery: NovelStyle.MYSTERY,
    detective: NovelStyle.MYSTERY,
    puzzle: NovelStyle.MYSTERY,
    secrets: NovelStyle.MYSTERY,
    investigative: NovelStyle.MYSTERY,
    whodunit: NovelStyle.MYSTERY,

    // Romance
    romance: NovelStyle.ROMANCE,
    romantic: NovelStyle.ROMANCE,
    'love story': NovelStyle.ROMANCE,
    love: NovelStyle.ROMANCE,

    // Science Fiction
    'science fiction': NovelStyle.SCIENCE_FICTION,
    'sci-fi': NovelStyle.SCIENCE_FICTION,
    scifi: NovelStyle.SCIENCE_FICTION,
    space: NovelStyle.SCIENCE_FICTION,
    'space adventure': NovelStyle.SCIENCE_FICTION,
    futuristic: NovelStyle.SCIENCE_FICTION,
    robots: NovelStyle.SCIENCE_FICTION,
    aliens: NovelStyle.SCIENCE_FICTION,

    // Historical
    historical: NovelStyle.HISTORICAL,
    history: NovelStyle.HISTORICAL,
    period: NovelStyle.HISTORICAL,
    past: NovelStyle.HISTORICAL,
    ancient: NovelStyle.HISTORICAL,
    medieval: NovelStyle.HISTORICAL,

    // Contemporary
    contemporary: NovelStyle.CONTEMPORARY,
    modern: NovelStyle.CONTEMPORARY,
    'present day': NovelStyle.CONTEMPORARY,
    current: NovelStyle.CONTEMPORARY,
    realistic: NovelStyle.CONTEMPORARY,

    // Comedy
    comedy: NovelStyle.COMEDY,
    funny: NovelStyle.COMEDY,
    humorous: NovelStyle.COMEDY,
    humor: NovelStyle.COMEDY,
    comedic: NovelStyle.COMEDY,
    amusing: NovelStyle.COMEDY,

    // Drama
    drama: NovelStyle.DRAMA,
    dramatic: NovelStyle.DRAMA,
    emotional: NovelStyle.DRAMA,
    serious: NovelStyle.DRAMA,

    // Horror
    horror: NovelStyle.HORROR,
    scary: NovelStyle.HORROR,
    frightening: NovelStyle.HORROR,
    spooky: NovelStyle.HORROR,
    'scary story': NovelStyle.HORROR,

    // Thriller
    thriller: NovelStyle.THRILLER,
    suspense: NovelStyle.THRILLER,
    suspenseful: NovelStyle.THRILLER,
    tension: NovelStyle.THRILLER,

    // Biography
    biography: NovelStyle.BIOGRAPHY,
    biographical: NovelStyle.BIOGRAPHY,
    'life story': NovelStyle.BIOGRAPHY,
    memoir: NovelStyle.BIOGRAPHY,

    // Educational
    educational: NovelStyle.EDUCATIONAL,
    learning: NovelStyle.EDUCATIONAL,
    teaching: NovelStyle.EDUCATIONAL,
    informative: NovelStyle.EDUCATIONAL,

    // Poetry
    poetry: NovelStyle.POETRY,
    poems: NovelStyle.POETRY,
    verse: NovelStyle.POETRY,
    rhyming: NovelStyle.POETRY,

    // Sports Adventure
    sports: NovelStyle.SPORTS_ADVENTURE,
    'sports adventure': NovelStyle.SPORTS_ADVENTURE,
    athletic: NovelStyle.SPORTS_ADVENTURE,
    competition: NovelStyle.SPORTS_ADVENTURE,
  };

  const normalized = styleMap[trimmed];
  if (normalized) return normalized;

  // Keyword-based detection
  if (
    trimmed.includes('magic') ||
    trimmed.includes('fantasy') ||
    trimmed.includes('dragon') ||
    trimmed.includes('wizard')
  ) {
    return NovelStyle.FANTASY;
  }
  if (
    trimmed.includes('space') ||
    trimmed.includes('sci') ||
    trimmed.includes('future') ||
    trimmed.includes('robot') ||
    trimmed.includes('alien')
  ) {
    return NovelStyle.SCIENCE_FICTION;
  }
  if (
    trimmed.includes('scary') ||
    trimmed.includes('horror') ||
    trimmed.includes('frightening') ||
    trimmed.includes('spooky')
  ) {
    return NovelStyle.HORROR;
  }
  if (trimmed.includes('adventure') || trimmed.includes('quest') || trimmed.includes('journey')) {
    return NovelStyle.ADVENTURE;
  }
  if (trimmed.includes('funny') || trimmed.includes('humor') || trimmed.includes('comedy')) {
    return NovelStyle.COMEDY;
  }
  if (trimmed.includes('mystery') || trimmed.includes('detective') || trimmed.includes('secret')) {
    return NovelStyle.MYSTERY;
  }
  if (trimmed.includes('history') || trimmed.includes('historical') || trimmed.includes('past')) {
    return NovelStyle.HISTORICAL;
  }

  // Default fallback
  return NovelStyle.ADVENTURE;
}

// =============================================================================
// GRAPHICAL STYLE NORMALIZER
// =============================================================================

/**
 * Normalizes GenAI output for graphical style to match enum values
 */
export function normalizeGraphicalStyle(style: string | undefined): GraphicalStyle {
  if (!style || typeof style !== 'string') return GraphicalStyle.CARTOON;

  const trimmed = style.trim().toLowerCase();

  // Direct match (case-insensitive)
  const directMatch = getAllGraphicalStyles().find((value) => value.toLowerCase() === trimmed);
  if (directMatch) return directMatch;

  // Common variations and synonyms
  const styleMap: Record<string, GraphicalStyle> = {
    // Cartoon
    cartoon: GraphicalStyle.CARTOON,
    animated: GraphicalStyle.CARTOON,
    animation: GraphicalStyle.CARTOON,
    'cartoon style': GraphicalStyle.CARTOON,
    'animated style': GraphicalStyle.CARTOON,
    'bright cartoon': GraphicalStyle.CARTOON,
    'colorful cartoon': GraphicalStyle.CARTOON,

    // Realistic
    realistic: GraphicalStyle.REALISTIC,
    realism: GraphicalStyle.REALISTIC,
    photorealistic: GraphicalStyle.REALISTIC,
    lifelike: GraphicalStyle.REALISTIC,
    real: GraphicalStyle.REALISTIC,
    photography: GraphicalStyle.REALISTIC,

    // Watercolor
    watercolor: GraphicalStyle.WATERCOLOR,
    watercolour: GraphicalStyle.WATERCOLOR,
    'water color': GraphicalStyle.WATERCOLOR,
    painterly: GraphicalStyle.WATERCOLOR,
    'soft painting': GraphicalStyle.WATERCOLOR,
    'wet paint': GraphicalStyle.WATERCOLOR,

    // Digital Art
    'digital art': GraphicalStyle.DIGITAL_ART,
    digital: GraphicalStyle.DIGITAL_ART,
    'computer art': GraphicalStyle.DIGITAL_ART,
    'digital painting': GraphicalStyle.DIGITAL_ART,
    cgi: GraphicalStyle.DIGITAL_ART,

    // Hand Drawn
    'hand drawn': GraphicalStyle.HAND_DRAWN,
    'hand-drawn': GraphicalStyle.HAND_DRAWN,
    handdrawn: GraphicalStyle.HAND_DRAWN,
    'hand drawn style': GraphicalStyle.HAND_DRAWN,
    pencil: GraphicalStyle.HAND_DRAWN,
    sketchy: GraphicalStyle.HAND_DRAWN,

    // Minimalist
    minimalist: GraphicalStyle.MINIMALIST,
    minimal: GraphicalStyle.MINIMALIST,
    simple: GraphicalStyle.MINIMALIST,
    clean: GraphicalStyle.MINIMALIST,
    basic: GraphicalStyle.MINIMALIST,

    // Vintage
    vintage: GraphicalStyle.VINTAGE,
    retro: GraphicalStyle.VINTAGE,
    'old-fashioned': GraphicalStyle.VINTAGE,
    classic: GraphicalStyle.VINTAGE,
    nostalgic: GraphicalStyle.VINTAGE,

    // Comic Book
    'comic book': GraphicalStyle.COMIC_BOOK,
    comic: GraphicalStyle.COMIC_BOOK,
    comics: GraphicalStyle.COMIC_BOOK,
    'comic style': GraphicalStyle.COMIC_BOOK,
    superhero: GraphicalStyle.COMIC_BOOK,
    'graphic novel': GraphicalStyle.COMIC_BOOK,

    // Euro Comic Book / Ligne Claire
    'euro comic book': GraphicalStyle.EURO_COMIC_BOOK,
    eurocomic: GraphicalStyle.EURO_COMIC_BOOK,
    'european comic': GraphicalStyle.EURO_COMIC_BOOK,
    europeancomic: GraphicalStyle.EURO_COMIC_BOOK,
    'ligne claire': GraphicalStyle.EURO_COMIC_BOOK,
    'humorous adventure': GraphicalStyle.EURO_COMIC_BOOK,

    // Anime
    anime: GraphicalStyle.ANIME,
    manga: GraphicalStyle.ANIME,
    japanese: GraphicalStyle.ANIME,
    'anime style': GraphicalStyle.ANIME,

    // Pixar Style
    pixar: GraphicalStyle.PIXAR_STYLE,
    'pixar style': GraphicalStyle.PIXAR_STYLE,
    '3d animation': GraphicalStyle.PIXAR_STYLE,
    '3d animated': GraphicalStyle.PIXAR_STYLE,
    'computer animation': GraphicalStyle.PIXAR_STYLE,

    // Disney Style
    disney: GraphicalStyle.DISNEY_STYLE,
    'disney style': GraphicalStyle.DISNEY_STYLE,
    'traditional disney': GraphicalStyle.DISNEY_STYLE,

    // Sketch
    sketch: GraphicalStyle.SKETCH,
    sketched: GraphicalStyle.SKETCH,
    'pencil sketch': GraphicalStyle.SKETCH,
    'rough sketch': GraphicalStyle.SKETCH,
    drawing: GraphicalStyle.SKETCH,

    // Oil Painting
    'oil painting': GraphicalStyle.OIL_PAINTING,
    'oil paint': GraphicalStyle.OIL_PAINTING,
    'classical painting': GraphicalStyle.OIL_PAINTING,
    'traditional painting': GraphicalStyle.OIL_PAINTING,

    // Colored Pencil
    'colored pencil': GraphicalStyle.COLORED_PENCIL,
    'colored pencils': GraphicalStyle.COLORED_PENCIL,
    'coloured pencil': GraphicalStyle.COLORED_PENCIL,
    'pencil art': GraphicalStyle.COLORED_PENCIL,
  };

  const normalized = styleMap[trimmed];
  if (normalized) return normalized;

  // Keyword-based detection
  if (trimmed.includes('cartoon') || trimmed.includes('animated')) {
    return GraphicalStyle.CARTOON;
  }
  if (trimmed.includes('realistic') || trimmed.includes('photo') || trimmed.includes('real')) {
    return GraphicalStyle.REALISTIC;
  }
  if (trimmed.includes('watercolor') || trimmed.includes('painterly')) {
    return GraphicalStyle.WATERCOLOR;
  }
  if (trimmed.includes('digital') || trimmed.includes('computer')) {
    return GraphicalStyle.DIGITAL_ART;
  }
  if (trimmed.includes('hand') || trimmed.includes('drawn') || trimmed.includes('sketch')) {
    return GraphicalStyle.HAND_DRAWN;
  }
  if (trimmed.includes('pixar') || trimmed.includes('3d')) {
    return GraphicalStyle.PIXAR_STYLE;
  }
  if (trimmed.includes('disney')) {
    return GraphicalStyle.DISNEY_STYLE;
  }
  if (trimmed.includes('euro') || trimmed.includes('ligne claire') || trimmed.includes('franco')) {
    return GraphicalStyle.EURO_COMIC_BOOK;
  }

  // Default fallback
  return GraphicalStyle.CARTOON;
}

// =============================================================================
// COMPREHENSIVE STORY NORMALIZATION
// =============================================================================

/**
 * Normalizes all story enum fields in a structured result
 */
export function normalizeStoryEnums<T extends Record<string, unknown>>(story: T): T {
  const normalized: Record<string, unknown> = { ...story };

  if ('targetAudience' in normalized && typeof normalized.targetAudience === 'string') {
    normalized.targetAudience = normalizeTargetAudience(normalized.targetAudience);
  }

  if ('novelStyle' in normalized && typeof normalized.novelStyle === 'string') {
    normalized.novelStyle = normalizeNovelStyle(normalized.novelStyle);
  }

  if ('graphicalStyle' in normalized && typeof normalized.graphicalStyle === 'string') {
    normalized.graphicalStyle = normalizeGraphicalStyle(normalized.graphicalStyle);
  }

  return normalized as T;
}
