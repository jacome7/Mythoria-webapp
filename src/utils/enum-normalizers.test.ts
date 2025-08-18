import {
  normalizeTargetAudience,
  normalizeNovelStyle,
  normalizeGraphicalStyle,
  normalizeStoryEnums,
} from '@/utils/enum-normalizers';
import {
  TargetAudience,
  NovelStyle,
  GraphicalStyle,
} from '@/types/story-enums';

describe('normalizeTargetAudience', () => {
  it('maps common synonyms', () => {
    expect(normalizeTargetAudience('teens')).toBe(TargetAudience.YOUNG_ADULT_15_17);
  });

  it('detects age mentions in text', () => {
    expect(normalizeTargetAudience('for 5 year olds')).toBe(TargetAudience.CHILDREN_3_6);
  });

  it('falls back to default for unknown values', () => {
    expect(normalizeTargetAudience(undefined)).toBe(TargetAudience.CHILDREN_3_6);
  });
});

describe('normalizeNovelStyle', () => {
  it('handles mapped phrases', () => {
    expect(normalizeNovelStyle('magical adventure')).toBe(NovelStyle.FANTASY);
  });

  it('uses keyword detection', () => {
    expect(normalizeNovelStyle('funny story')).toBe(NovelStyle.COMEDY);
  });

  it('falls back to default', () => {
    expect(normalizeNovelStyle(undefined)).toBe(NovelStyle.ADVENTURE);
  });
});

describe('normalizeGraphicalStyle', () => {
  it('normalizes common variations', () => {
    expect(normalizeGraphicalStyle('hand-drawn')).toBe(GraphicalStyle.HAND_DRAWN);
  });

  it('is case-insensitive', () => {
    expect(normalizeGraphicalStyle('CGI')).toBe(GraphicalStyle.DIGITAL_ART);
  });

  it('falls back to default', () => {
    expect(normalizeGraphicalStyle(undefined)).toBe(GraphicalStyle.CARTOON);
  });
});

describe('normalizeStoryEnums', () => {
  it('normalizes all story enum fields', () => {
    const story = normalizeStoryEnums({
      targetAudience: 'teenagers',
      novelStyle: 'space adventure',
      graphicalStyle: 'hand drawn',
      title: 'Test',
    });

    expect(story).toEqual({
      targetAudience: TargetAudience.YOUNG_ADULT_15_17,
      novelStyle: NovelStyle.SCIENCE_FICTION,
      graphicalStyle: GraphicalStyle.HAND_DRAWN,
      title: 'Test',
    });
  });
});

