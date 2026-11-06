import { validateSurveyDefinition } from '@/lib/surveys/validate-definition';
import { getVisibleQuestions } from '@/lib/surveys/engine';
import type { SurveyAnswers, SurveyDefinition } from '@/lib/surveys/definition-schema';
import { SURVEY_DEFINITIONS } from './index';
import { freeCreatorNoPurchaseV2 } from './free_creator_no_purchase.v2';
import { freeCreatorNoPurchaseV3 } from './free_creator_no_purchase.v3';

type Localized = Record<string, string>;
type Q = Record<string, unknown> & {
  id: string;
  type: string;
  label: Localized;
  help?: Localized;
  options?: Array<Record<string, unknown> & { id: string; label: Localized }>;
};

const LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];
const v2Questions = freeCreatorNoPurchaseV2.questions as unknown as Q[];
const v3Questions = freeCreatorNoPurchaseV3.questions as unknown as Q[];
const byId = (questions: Q[], id: string) => questions.find((q) => q.id === id)!;

/** Strips every user-facing text field so only structure remains. */
const structure = (q: Q) => {
  const { label: _label, help: _help, options, ...rest } = q;
  return {
    ...rest,
    options: (options ?? []).map(({ label: _optionLabel, ...option }) => option),
  };
};

/** Every user-facing localized string in a definition, as [path, localized] pairs. */
const collectTexts = (): Array<[string, Localized]> => {
  const texts: Array<[string, Localized]> = [
    ['title', freeCreatorNoPurchaseV3.title],
    ['description', freeCreatorNoPurchaseV3.description],
    ['intro', freeCreatorNoPurchaseV3.intro],
    ['completionMessage', freeCreatorNoPurchaseV3.completionMessage],
  ];
  for (const q of v3Questions) {
    texts.push([`${q.id}.label`, q.label]);
    if (q.help) texts.push([`${q.id}.help`, q.help]);
    for (const o of q.options ?? []) texts.push([`${q.id}.${o.id}`, o.label]);
  }
  return texts;
};

describe('free_creator_no_purchase v3', () => {
  it('is registered next to v1 and v2 and validates against the schema', () => {
    const versions = SURVEY_DEFINITIONS.filter((d) => d.id === 'free_creator_no_purchase').map(
      (d) => d.version,
    );
    expect(versions).toEqual([1, 2, 3]);
    expect(freeCreatorNoPurchaseV3.id).toBe('free_creator_no_purchase');
    expect(freeCreatorNoPurchaseV3.version).toBe(3);
    const result = validateSurveyDefinition(freeCreatorNoPurchaseV3);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('keeps the same question ids, types and order as v2', () => {
    expect(v3Questions.map((q) => [q.id, q.type])).toEqual(v2Questions.map((q) => [q.id, q.type]));
  });

  it('keeps the same option ids and order as v2', () => {
    for (const q2 of v2Questions) {
      const q3 = byId(v3Questions, q2.id);
      expect((q3.options ?? []).map((o) => o.id)).toEqual((q2.options ?? []).map((o) => o.id));
    }
  });

  it('only differs from v2 in label, help and description text', () => {
    for (const q2 of v2Questions) {
      expect(structure(byId(v3Questions, q2.id))).toEqual(structure(q2));
      expect(Boolean(byId(v3Questions, q2.id).help)).toBe(Boolean(q2.help));
    }
    const {
      version: _v2,
      questions: _q2,
      description: _d2,
      purpose: _p2,
      ...rest2
    } = freeCreatorNoPurchaseV2;
    const {
      version: _v3,
      questions: _q3,
      description: _d3,
      purpose: _p3,
      ...rest3
    } = freeCreatorNoPurchaseV3;
    expect(rest3).toEqual(rest2);
  });

  it('provides every user-facing text in all five locales', () => {
    for (const [path, text] of collectTexts()) {
      for (const locale of LOCALES) {
        expect({ path, locale, ok: Boolean(text[locale]?.trim()) }).toEqual({
          path,
          locale,
          ok: true,
        });
      }
    }
  });

  it('has no "first story" wording in en-US user-facing text', () => {
    for (const [path, text] of collectTexts()) {
      expect({ path, text: text['en-US'] }).toEqual({
        path,
        text: expect.not.stringMatching(/first story|your story\b/i),
      });
    }
  });

  it('uses the agreed en-US wording for single- and multi-story questions', () => {
    const en = (id: string) => byId(v3Questions, id).label['en-US'];
    expect(freeCreatorNoPurchaseV3.description['en-US']).toBe(
      "You've created stories with Mythoria. We'd love to hear how it went, what would make them more valuable, and what could inspire your next one.",
    );
    expect(en('B01')).toBe('What was your main reason for creating stories on Mythoria?');
    expect(en('B02')).toBe('Thinking of your latest story, did you read it after it was created?');
    expect(en('B03')).toBe('How well did your latest story meet your expectations?');
    expect(en('B04')).toContain('after creating your stories?');
    expect(en('B04N')).toBe('What has kept you from taking the next step with your stories?');
    expect(en('B04B')).toBe('What would you most like to improve about your stories?');
    expect(en('B05')).toBe('What best describes how you felt about your latest finished story?');
    expect(en('B06')).toBe(
      'If you could get one additional version of one of your stories, which would interest you most?',
    );
    const option = (q: string, o: string) =>
      byId(v3Questions, q).options!.find((x) => x.id === o)!.label['en-US'];
    expect(option('B04', 'improve_first')).toBe('I wanted to improve my stories before paying.');
    expect(option('B04N', 'no_time')).toBe("I haven't had time to read them yet.");
    expect(option('B04N', 'access_problem')).toBe('I had trouble opening or reading them.');
  });
});

describe('free_creator_no_purchase v3 branching', () => {
  const def = freeCreatorNoPurchaseV3 as unknown as SurveyDefinition;
  const pick = (...optionIds: string[]) => ({ kind: 'choice' as const, optionIds });
  const shown = (answers: SurveyAnswers) => getVisibleQuestions(def, answers).map((q) => q.id);

  it('behaves like v2 for readers and non-readers', () => {
    const readers = shown({ B02: pick('complete'), B03: pick('4'), B04: pick('online_enough') });
    expect(readers).toEqual(expect.arrayContaining(['B03', 'B04', 'B05']));
    expect(readers).not.toContain('B04N');
    const nonReaders = shown({ B02: pick('not_yet') });
    expect(nonReaders).toContain('B04N');
    expect(nonReaders).not.toContain('B04');
  });
});
