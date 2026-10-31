import { getStoryTemplate } from './catalog';
import {
  canContinueTemplate,
  compileStoryBrief,
  createTemplateJourney,
  fallbackQuestion,
  guideQuestionSchema,
  guideAnswerSchema,
  parseTemplateJourney,
  confirmedCharacterReferences,
  characterReferenceSchema,
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
  const photo = {
    id: 'e9428e21-4f9c-4d3e-8c3b-e49f9a528c21',
    status: 'done' as const,
    objectPath: 'author/inputs/protagonist.jpg',
    publicUrl: 'https://example.test/protagonist.jpg',
    sourceCharacterIndex: 1,
    metadata: {
      overallImageContent: 'photo' as const,
      characters: [
        { physicalDescription: 'OTHER_SUBJECT_OBSERVATION' },
        { physicalDescription: 'UNCONFIRMED_VISUAL_OBSERVATION' },
      ],
    },
  };
  const photoQuestion = {
    questionId: 'hero',
    question: 'Quem é o protagonista?',
    answer: '',
    photo,
    isAuthorContribution: true,
  };

  it.each(['', '   '])(
    'normalizes an emptied confirmed photo caption into a valid photo-only brief (%j)',
    (answer) => {
      const journey = createTemplateJourney(getStoryTemplate('pet-mission', 'pt-PT'));
      journey.answers = [{ ...photoQuestion, answer }];
      const references = confirmedCharacterReferences(journey);
      expect(references).toHaveLength(1);
      expect(characterReferenceSchema.safeParse(references[0]).success).toBe(true);
      expect(references[0]).toMatchObject({
        questionId: photoQuestion.questionId,
        question: photoQuestion.question,
        imageObjectPath: photo.objectPath,
        sourceCharacterIndex: photo.sourceCharacterIndex,
        targetRole: 'protagonist',
      });
      expect(references[0].answer).toContain('referência visual');
      expect(references[0].answer).toContain('sem inferir factos pessoais');
      const brief = compileStoryBrief(journey, '');
      expect(brief).toContain(`${photoQuestion.question}\n${references[0].answer}`);
      expect(brief).not.toContain('UNCONFIRMED_VISUAL_OBSERVATION');
      expect(brief).not.toContain(photo.objectPath);
    },
  );

  it('keeps an authored photo caption and excludes pending text and photos from generation inputs', () => {
    const journey = createTemplateJourney(getStoryTemplate('pet-mission', 'pt-PT'));
    journey.answers = [{ ...photoQuestion, answer: '  O cão chama-se Bento.  ' }];
    journey.answerDraft = {
      questionId: 'pending',
      text: 'PENDING_AUTHOR_FACT',
      photo: {
        ...photo,
        id: 'e9428e21-4f9c-4d3e-8c3b-e49f9a528c22',
        objectPath: 'author/inputs/pending.jpg',
      },
    };
    expect(confirmedCharacterReferences(journey)).toEqual([
      {
        questionId: photoQuestion.questionId,
        question: photoQuestion.question,
        answer: 'O cão chama-se Bento.',
        imageObjectPath: photo.objectPath,
        sourceCharacterIndex: photo.sourceCharacterIndex,
        targetRole: 'protagonist',
      },
    ]);
    expect(compileStoryBrief(journey, '')).toContain('O cão chama-se Bento.');
    expect(compileStoryBrief(journey, '')).not.toContain('PENDING_AUTHOR_FACT');
    expect(compileStoryBrief(journey, '')).not.toContain('pending.jpg');
    journey.answers = [];
    expect(confirmedCharacterReferences(journey)).toEqual([]);
    expect(confirmedCharacterReferences(null)).toEqual([]);
  });

  it.each(['uploading', 'analyzing'] as const)(
    'marks interrupted %s draft photos as errors without changing confirmed references',
    (status) => {
      const journey = createTemplateJourney(getStoryTemplate('pet-mission', 'pt-PT'));
      journey.answers = [{ ...photoQuestion, answer: 'Bento' }];
      journey.answerDraft = {
        questionId: 'pending',
        text: 'Keep text',
        photo: { ...photo, status },
      };
      const restored = parseTemplateJourney(journey);
      expect(restored?.answerDraft?.photo?.status).toBe('error');
      expect(restored?.answerDraft?.text).toBe('Keep text');
      expect(restored?.answers[0].photo?.status).toBe('done');
      expect(confirmedCharacterReferences(restored)).toEqual(confirmedCharacterReferences(journey));
      expect(journey.answerDraft.photo?.status).toBe(status);
    },
  );

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
