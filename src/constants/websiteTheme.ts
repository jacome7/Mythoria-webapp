import { getValidatedIntent } from '@/lib/campaign-context';

export type WebsiteTheme = 'christmas' | 'kids';

export function resolveWebsiteTheme(rawIntent?: string | null): WebsiteTheme {
  const intent = getValidatedIntent(rawIntent);
  return intent === 'christmas' ? 'christmas' : 'kids';
}
