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

export function firstPreviewQuestion(
  template: StoryTemplate,
  mode: 'fiction' | 'memory',
  locale = 'en-US',
): StoryGuideQuestion {
  const id = `preview-protagonist-${template.id}-${mode}`;
  const bundle = messages[locale] ?? en;
  const questions = bundle.preview.questions;
  const entry = questions[template.id as StoryTemplateId] ?? questions.default;

  if (mode === 'memory') {
    return {
      id,
      text: entry.memory,
      choices: [],
      suggestedChoiceId: null,
      customOnly: true,
      photoTarget: 'protagonist',
    };
  }

  return {
    id,
    text: entry.fiction.text,
    choices: entry.fiction.choices.map((label, index) => ({
      id: `choice-${index + 1}`,
      label,
      value: label,
    })),
    suggestedChoiceId: 'choice-1',
    photoTarget: 'protagonist',
  };
}
