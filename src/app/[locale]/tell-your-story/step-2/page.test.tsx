/** @jest-environment node */
import Step2Page from './page';
import { getStoryTemplates } from '@/lib/story-templates/catalog';
jest.mock('@/lib/story-templates/catalog', () => ({ getStoryTemplates: jest.fn() }));
jest.mock('./Step2Client', () => ({ __esModule: true, default: () => null }));
it.each(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'])(
  'provides templates in %s',
  async (locale) => {
    const page = await Step2Page({ params: Promise.resolve({ locale }) });
    expect(page.props.templatesEnabled).toBe(true);
    expect(getStoryTemplates).toHaveBeenCalledWith(locale);
  },
);
