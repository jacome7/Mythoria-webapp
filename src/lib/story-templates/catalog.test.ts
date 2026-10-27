import fs from 'node:fs';
import path from 'node:path';
import { GraphicalStyle, NovelStyle, TargetAudience } from '@/types/story-enums';
import {
  getStoryTemplate,
  getStoryTemplates,
  getTemplateForSample,
  rankStoryTemplates,
} from './catalog';
import { isStoryTemplateId, STORY_TEMPLATE_IDS } from './ids';

const locales = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

describe('story template catalog', () => {
  it.each(locales)('has complete localized recipes and ready artwork for %s', (locale) => {
    const templates = getStoryTemplates(locale);
    expect(templates.map(({ id }) => id)).toEqual([...STORY_TEMPLATE_IDS]);
    for (const template of templates) {
      expect(Object.values(TargetAudience)).toContain(template.targetAudience);
      expect(Object.values(NovelStyle)).toContain(template.novelStyle);
      expect(Object.values(GraphicalStyle)).toContain(template.graphicalStyle);
      expect(template.modes).toContain(template.defaultMode);
      expect(fs.existsSync(path.join(process.cwd(), 'public', template.image))).toBe(true);
      expect(template.title.trim()).not.toBe('');
      expect(template.premise.trim()).not.toBe('');
      expect(template.tone.trim()).not.toBe('');
      expect(template.fallbackQuestions).toHaveLength(3);
      expect(new Set(template.fallbackQuestions.map(({ id }) => id)).size).toBe(3);
      for (const question of template.fallbackQuestions) {
        expect(question.text.trim()).not.toBe('');
        expect(question.choices).toHaveLength(3);
        expect(question.choices.map(({ id }) => id)).toContain(question.suggestedChoiceId);
        expect(question.choices.every(({ label, value }) => label.trim() && value.trim())).toBe(
          true,
        );
      }
    }
    if (locale !== 'en-US') {
      expect(
        templates.every((template, i) => template.title !== getStoryTemplates('en-US')[i].title),
      ).toBe(true);
    }
  });

  it('uses presentation questions only for every memory-capable recipe', () => {
    const templates = getStoryTemplates('en-US');
    for (const template of templates.filter(({ modes }) => modes.includes('memory'))) {
      expect(template.fallbackQuestions.map(({ id }) => id)).toEqual(
        ['tone', 'presentation', 'focus'].map((key) => `${template.id}-${key}`),
      );
    }
    expect(getStoryTemplate('grandparent-memory', 'en-US')?.modes).toEqual(['memory']);
    expect(getStoryTemplate('little-love', 'en-US')?.modes).toEqual(['fiction', 'memory']);
    expect(getStoryTemplate('travel-memories', 'en-US')?.modes).toEqual(['fiction', 'memory']);
  });

  it('maps approved editorial samples and rejects arbitrary user stories', () => {
    expect(getTemplateForSample('duas-chavenas-uma-vida', 'pt-PT')?.id).toBe('little-love');
    expect(getTemplateForSample('customer-story-romance', 'en-US')).toBeUndefined();
    expect(getStoryTemplate('unknown', 'en-US')).toBeUndefined();
    expect(isStoryTemplateId('little-love')).toBe(true);
    expect(isStoryTemplateId('__proto__')).toBe(false);
    expect(isStoryTemplateId(null)).toBe(false);
    expect(isStoryTemplateId({ id: 'little-love' })).toBe(false);
  });

  it('ranks by intent without hiding other options or modifying the catalog', () => {
    const templates = getStoryTemplates('en-US');
    const before = templates.map(({ id }) => id);
    const ranked = rankStoryTemplates(templates, 'romance');
    expect(ranked[0].id).toBe('little-love');
    expect(ranked).toHaveLength(templates.length);
    expect(templates.map(({ id }) => id)).toEqual(before);
    expect(rankStoryTemplates(templates, 'remembrance').map(({ id }) => id)).toEqual(before);
  });

  it('returns independent mutable data and falls back to English for an unknown locale', () => {
    const first = getStoryTemplates('en-US');
    first[0].intents.length = 0;
    first[0].fallbackQuestions[0].choices[0].value = 'changed';
    expect(getStoryTemplates('en-US')[0].intents.length).toBeGreaterThan(0);
    expect(getStoryTemplates('en-US')[0].fallbackQuestions[0].choices[0].value).not.toBe('changed');
    expect(getStoryTemplates('unknown')).toEqual(getStoryTemplates('en-US'));
    expect(getStoryTemplates('__proto__')).toEqual(getStoryTemplates('en-US'));
  });
});
