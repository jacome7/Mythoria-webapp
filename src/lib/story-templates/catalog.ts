import type { StoryIntent } from '@/constants/intents';
import { GraphicalStyle, NovelStyle, TargetAudience } from '@/types/story-enums';
import type { StoryGuideQuestion, StoryTemplate } from '@/types/story-template';
import en from '@/messages/en-US/StoryTemplates.json';
import pt from '@/messages/pt-PT/StoryTemplates.json';
import es from '@/messages/es-ES/StoryTemplates.json';
import fr from '@/messages/fr-FR/StoryTemplates.json';
import de from '@/messages/de-DE/StoryTemplates.json';
import type { StoryTemplateId } from './ids';

const messages: Record<string, typeof en> = {
  'en-US': en,
  'pt-PT': pt,
  'es-ES': es,
  'fr-FR': fr,
  'de-DE': de,
};

type QuestionKey = keyof typeof en.questions;
type Recipe = Pick<
  StoryTemplate,
  'intents' | 'targetAudience' | 'novelStyle' | 'graphicalStyle' | 'modes' | 'defaultMode'
> & {
  id: StoryTemplateId;
  sampleSlug: string;
  questions: QuestionKey[];
};

const recipes: Recipe[] = [
  {
    id: 'drawing-adventure',
    intents: ['kids_adventures', 'learning_and_discovery'],
    sampleSlug: 'ines-e-o-robo-feito-de-desenhos',
    targetAudience: TargetAudience.CHILDREN_7_10,
    novelStyle: NovelStyle.ADVENTURE,
    graphicalStyle: GraphicalStyle.COLORED_PENCIL,
    modes: ['fiction'],
    defaultMode: 'fiction',
    questions: ['drawing', 'tone', 'pace'],
  },
  {
    id: 'moonlight-adventure',
    intents: ['kids_bedtime'],
    sampleSlug: 'mia-e-a-pastelaria-da-lua',
    targetAudience: TargetAudience.CHILDREN_3_6,
    novelStyle: NovelStyle.FAIRY_TALE,
    graphicalStyle: GraphicalStyle.WATERCOLOR,
    modes: ['fiction'],
    defaultMode: 'fiction',
    questions: ['moon', 'tone', 'pace'],
  },
  {
    id: 'pet-mission',
    intents: ['pet_stories', 'kids_adventures'],
    sampleSlug: 'o-gato-que-guardava-a-lua',
    targetAudience: TargetAudience.CHILDREN_3_6,
    novelStyle: NovelStyle.ADVENTURE,
    graphicalStyle: GraphicalStyle.WATERCOLOR,
    modes: ['fiction'],
    defaultMode: 'fiction',
    questions: ['pet', 'tone', 'pace'],
  },
  {
    id: 'magic-doorway',
    intents: ['kids_adventures', 'learning_and_discovery'],
    sampleSlug: 'tomas-e-o-mapa-das-portas-escondidas',
    targetAudience: TargetAudience.CHILDREN_7_10,
    novelStyle: NovelStyle.FANTASY,
    graphicalStyle: GraphicalStyle.DIGITAL_ART,
    modes: ['fiction'],
    defaultMode: 'fiction',
    questions: ['door', 'tone', 'pace'],
  },
  {
    id: 'little-love',
    intents: ['romance', 'milestones_celebrations'],
    sampleSlug: 'duas-chavenas-uma-vida',
    targetAudience: TargetAudience.ADULT_18_PLUS,
    novelStyle: NovelStyle.ROMANCE,
    graphicalStyle: GraphicalStyle.OIL_PAINTING,
    modes: ['fiction', 'memory'],
    defaultMode: 'fiction',
    questions: ['tone', 'presentation', 'focus'],
  },
  {
    id: 'travel-memories',
    intents: ['family_travels', 'amusement_parks'],
    sampleSlug: 'o-mapa-dos-dias-que-eram-so-nossos',
    targetAudience: TargetAudience.ALL_AGES,
    novelStyle: NovelStyle.ADVENTURE,
    graphicalStyle: GraphicalStyle.WATERCOLOR,
    modes: ['fiction', 'memory'],
    defaultMode: 'fiction',
    questions: ['tone', 'presentation', 'focus'],
  },
  {
    id: 'grandparent-memory',
    intents: ['grandparents'],
    sampleSlug: 'as-cartas-da-avo-rosa',
    targetAudience: TargetAudience.ALL_AGES,
    novelStyle: NovelStyle.BIOGRAPHY,
    graphicalStyle: GraphicalStyle.WATERCOLOR,
    modes: ['memory'],
    defaultMode: 'memory',
    questions: ['tone', 'presentation', 'focus'],
  },
  {
    id: 'teamwork-day',
    intents: ['sports_teams', 'school_projects'],
    sampleSlug: 'a-equipa-que-marcou-um-golo-nas-estrelas',
    targetAudience: TargetAudience.CHILDREN_7_10,
    novelStyle: NovelStyle.SPORTS_ADVENTURE,
    graphicalStyle: GraphicalStyle.COMIC_BOOK,
    modes: ['fiction'],
    defaultMode: 'fiction',
    questions: ['team', 'tone', 'pace'],
  },
];

/** Only editorially approved samples map to reusable templates. Never infer from user stories. */
export function getStoryTemplates(locale: string): StoryTemplate[] {
  const copy = Object.hasOwn(messages, locale) ? messages[locale] : en;
  return recipes.map((recipe) => ({
    id: recipe.id,
    version: 1,
    intents: [...recipe.intents],
    sampleSlugs: [recipe.sampleSlug],
    image: `/sample-books/${recipe.sampleSlug}/assets/feature.jpeg`,
    targetAudience: recipe.targetAudience,
    novelStyle: recipe.novelStyle,
    graphicalStyle: recipe.graphicalStyle,
    modes: [...recipe.modes],
    defaultMode: recipe.defaultMode,
    ...copy.templates[recipe.id],
    tone: copy.questions.tone.first,
    fallbackQuestions: recipe.questions.map((key): StoryGuideQuestion => {
      const question = copy.questions[key];
      return {
        id: `${recipe.id}-${key}`,
        text: question.text,
        choices: ['first', 'second', 'third'].map((id) => ({
          id,
          label: question[id as 'first' | 'second' | 'third'],
          value: question[id as 'first' | 'second' | 'third'],
        })),
        suggestedChoiceId: 'first',
      };
    }),
  }));
}

export function getStoryTemplate(id: string, locale: string): StoryTemplate | undefined {
  return getStoryTemplates(locale).find((template) => template.id === id);
}

export function getTemplateForSample(slug: string, locale: string): StoryTemplate | undefined {
  return getStoryTemplates(locale).find((template) => template.sampleSlugs.includes(slug));
}

/** Intent changes order only; never hide options or mutate the editorial catalog. */
export function rankStoryTemplates(
  templates: StoryTemplate[],
  intent?: StoryIntent | null,
): StoryTemplate[] {
  if (!intent) return [...templates];
  return [...templates].sort(
    (a, b) => Number(b.intents.includes(intent)) - Number(a.intents.includes(intent)),
  );
}
