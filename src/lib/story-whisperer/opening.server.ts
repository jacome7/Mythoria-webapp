import en from '@/messages/en-US/StoryWhisperer.json';
import pt from '@/messages/pt-PT/StoryWhisperer.json';
import es from '@/messages/es-ES/StoryWhisperer.json';
import fr from '@/messages/fr-FR/StoryWhisperer.json';
import de from '@/messages/de-DE/StoryWhisperer.json';

import { whispererOpeningKey, type WhispererOpening } from './opening';

const openingsByLocale = {
  'en-US': en.StoryWhisperer.openings,
  'pt-PT': pt.StoryWhisperer.openings,
  'es-ES': es.StoryWhisperer.openings,
  'fr-FR': fr.StoryWhisperer.openings,
  'de-DE': de.StoryWhisperer.openings,
} as const;

export function getWhispererOpening(locale: string, intent?: unknown): WhispererOpening {
  const localized = Object.hasOwn(openingsByLocale, locale)
    ? openingsByLocale[locale as keyof typeof openingsByLocale]
    : openingsByLocale['en-US'];
  const { question, choice1, choice2, choice3, choice4 } = localized[whispererOpeningKey(intent)];
  return { question, choices: [choice1, choice2, choice3, choice4] };
}
