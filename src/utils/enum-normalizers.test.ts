import {
  normalizeTargetAudience,
  normalizeNovelStyle,
  normalizeGraphicalStyle,
  normalizeStoryEnums,
} from '@/utils/enum-normalizers';
import { TargetAudience, NovelStyle, GraphicalStyle } from '@/types/story-enums';

describe('normalizeTargetAudience', () => {
  it('maps common synonyms to enum values', () => {
    expect(normalizeTargetAudience('toddlers')).toBe(TargetAudience.CHILDREN_0_2);
    expect(normalizeTargetAudience('tweens')).toBe(TargetAudience.CHILDREN_11_14);
    expect(normalizeTargetAudience('teenagers')).toBe(TargetAudience.YOUNG_ADULT_15_17);
    expect(normalizeTargetAudience('adults')).toBe(TargetAudience.ADULT_18_PLUS);
  });

  it('infers audience from age numbers', () => {
    expect(normalizeTargetAudience('for 5 year olds')).toBe(TargetAudience.CHILDREN_3_6);
    expect(normalizeTargetAudience('for 8 year olds')).toBe(TargetAudience.CHILDREN_7_10);
  });

  it('defaults to children_3-6 when unknown', () => {
    expect(normalizeTargetAudience('unknown group')).toBe(TargetAudience.CHILDREN_3_6);
  });
});

describe('normalizeNovelStyle', () => {
  it('maps style synonyms', () => {
    expect(normalizeNovelStyle('sci-fi')).toBe(NovelStyle.SCIENCE_FICTION);
    expect(normalizeNovelStyle('fairy tale')).toBe(NovelStyle.FAIRY_TALE);
    expect(normalizeNovelStyle('memoir')).toBe(NovelStyle.BIOGRAPHY);
    expect(normalizeNovelStyle('funny')).toBe(NovelStyle.COMEDY);
  });

  it('defaults to adventure when unknown', () => {
    expect(normalizeNovelStyle('unknown style')).toBe(NovelStyle.ADVENTURE);
  });
});

describe('normalizeGraphicalStyle', () => {
  it('maps graphical style synonyms', () => {
    expect(normalizeGraphicalStyle('comic')).toBe(GraphicalStyle.COMIC_BOOK);
    expect(normalizeGraphicalStyle('pixar style')).toBe(GraphicalStyle.PIXAR_STYLE);
    expect(normalizeGraphicalStyle('watercolour')).toBe(GraphicalStyle.WATERCOLOR);
    expect(normalizeGraphicalStyle('hand-drawn')).toBe(GraphicalStyle.HAND_DRAWN);
  });

  it('defaults to cartoon when unknown', () => {
    expect(normalizeGraphicalStyle('unknown style')).toBe(GraphicalStyle.CARTOON);
  });
});

describe('normalizeStoryEnums', () => {
  it('normalizes all enum fields in an object', () => {
    const input = {
      targetAudience: 'teens',
      novelStyle: 'sci-fi',
      graphicalStyle: 'comic',
      other: 'keep',
    };

    const result = normalizeStoryEnums(input);

    expect(result).toEqual({
      targetAudience: TargetAudience.YOUNG_ADULT_15_17,
      novelStyle: NovelStyle.SCIENCE_FICTION,
      graphicalStyle: GraphicalStyle.COMIC_BOOK,
      other: 'keep',
    });
  });
});
