import { isValidIntent } from '@/constants/intents';

export type WhispererOpening = {
  question: string;
  choices: string[];
};

export function whispererOpeningKey(intent: unknown) {
  return isValidIntent(intent) ? intent : 'neutral';
}
