import { getStoryTemplate } from './catalog';
import {
  canContinueTemplate,
  compileStoryBrief,
  createTemplateJourney,
  fallbackQuestion,
  guideQuestionSchema,
  guideAnswerSchema,
  parseTemplateJourney,
} from './journey';
import { GraphicalStyle, NovelStyle, TargetAudience } from '@/types/story-enums';

beforeAll(() => {
  if (!crypto.randomUUID) {
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: () => '00000000-0000-4000-8000-000000000001',
    });
  }
});

describe('template journey boundaries', () => {
  it('counts only confirmed authored answers as memory input and keeps provenance client-side', () => {
    const memory = createTemplateJourney(getStoryTemplate('grandparent-memory', 'en-US'));
    const answer = {
      questionId: 'memory',
      question: 'What do you remember?',
      answer: 'She taught me to bake bread.',
    };
    memory.answers = [{ ...answer, isAuthorContribution: false }];
    expect(canContinueTemplate(memory, '', false)).toBe(false);
    memory.answers = [answer];
    expect(canContinueTemplate(memory, '', false)).toBe(false);
    memory.answers = [{ ...answer, isAuthorContribution: true }];
    expect(canContinueTemplate(memory, '', false)).toBe(true);
    expect(parseTemplateJourney(memory)?.answers[0].isAuthorContribution).toBe(true);
    expect(guideAnswerSchema.parse(memory.answers[0])).toEqual(answer);
    memory.answers[0].answer = '   ';
    expect(canContinueTemplate(memory, '', false)).toBe(false);
  });
  it('allows a complete fiction premise without author text and requires real input for memories', () => {
    const fiction = createTemplateJourney(getStoryTemplate('drawing-adventure', 'en-US'));
    const memory = createTemplateJourney(getStoryTemplate('grandparent-memory', 'en-US'));
    expect(canContinueTemplate(fiction, '', false)).toBe(true);
    expect(canContinueTemplate(memory, '   ', false)).toBe(false);
    expect(canContinueTemplate(memory, 'Grandma taught me to make bread.', false)).toBe(true);
    expect(canContinueTemplate(memory, '', true)).toBe(true);
    expect(canContinueTemplate({ ...fiction, premise: '  ' }, 'some text', false)).toBe(false);
  });

  it('includes confirmed answers and contribution but never a pending suggested choice', () => {
    const template = getStoryTemplate('drawing-adventure', 'en-US')!;
    const journey = createTemplateJourney(template);
    journey.question = template.fallbackQuestions[0];
    journey.answers = [
      { questionId: 'confirmed', question: 'Who helps?', answer: 'A tiny sparrow' },
    ];
    const brief = compileStoryBrief(journey, '  A red notebook matters.  ');
    expect(brief).toContain(template.premise);
    expect(brief).toContain('A tiny sparrow');
    expect(brief).toContain('A red notebook matters.');
    expect(brief).not.toContain(journey.question.text);
    expect(brief).not.toContain(journey.question.choices[0].value);
    expect(compileStoryBrief(null, '  My idea  ')).toBe('My idea');
  });

  it('preserves the factual boundary in memory briefs and does not pretend style answers are facts', () => {
    const journey = createTemplateJourney(getStoryTemplate('grandparent-memory', 'en-US'));
    journey.answers = [{ questionId: 'tone', question: 'Tone?', answer: 'Warm and gentle' }];
    expect(compileStoryBrief(journey, '')).toContain('Do not invent biographical events');
    expect(canContinueTemplate(journey, '', false)).toBe(false);
  });

  it('never repeats fallback questions and removes preselection for factual journeys', () => {
    const template = getStoryTemplate('grandparent-memory', 'pt-PT')!;
    const previous: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const question = fallbackQuestion(template, previous, true)!;
      expect(question.suggestedChoiceId).toBeNull();
      expect(previous).not.toContain(question.text);
      previous.push(question.text);
    }
    expect(fallbackQuestion(template, previous, true)).toBeNull();
    expect(template.fallbackQuestions[0].suggestedChoiceId).toBe('first');
  });

  it('rejects corrupt persisted data and invalid suggested choices', () => {
    const journey = createTemplateJourney(getStoryTemplate('pet-mission', 'en-US'));
    expect(parseTemplateJourney(journey)).toEqual(journey);
    expect(parseTemplateJourney({ ...journey, version: 2 })).toBeNull();
    expect(parseTemplateJourney({ ...journey, requests: 10 })).toBeNull();
    expect(
      parseTemplateJourney({ ...journey, preferences: { targetAudience: 'not-an-audience' } }),
    ).toBeNull();
    const question = getStoryTemplate('pet-mission', 'en-US')!.fallbackQuestions[0];
    expect(
      guideQuestionSchema.safeParse({ ...question, suggestedChoiceId: 'missing' }).success,
    ).toBe(false);
    expect(
      guideQuestionSchema.safeParse({
        ...question,
        choices: [question.choices[0], question.choices[0], question.choices[0]],
      }).success,
    ).toBe(false);
  });

  it.each(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'])(
    'provides translated labels for every preference enum in %s',
    async (locale) => {
      const inspired = (await import(`../../messages/${locale}/GetInspiredPage.json`)).default
        .GetInspiredPage;
      const graphics = (await import(`../../messages/${locale}/GraphicalStyles.json`)).default
        .GraphicalStyles;
      for (const value of Object.values(TargetAudience))
        expect(inspired.targetAudience[value]).toEqual(expect.any(String));
      for (const value of Object.values(NovelStyle))
        expect(inspired.novelStyle[value]).toEqual(expect.any(String));
      for (const value of Object.values(GraphicalStyle))
        expect(graphics[value]).toEqual(expect.any(String));
    },
  );
});
