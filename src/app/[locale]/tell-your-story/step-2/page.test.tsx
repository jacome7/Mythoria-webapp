/** @jest-environment node */
import Step2Page from './page';
import { getStoryTemplateAccess } from '@/lib/story-templates/access';
import { getStoryTemplates } from '@/lib/story-templates/catalog';

jest.mock('@/lib/story-templates/access', () => ({ getStoryTemplateAccess: jest.fn() }));
jest.mock('@/lib/story-templates/catalog', () => ({ getStoryTemplates: jest.fn() }));
jest.mock('./Step2Client', () => ({ __esModule: true, default: () => null }));

describe('step 2 template access', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['guest', 'non-opted-in author', 'global switch off'])(
    'hides templates for %s',
    async () => {
      jest.mocked(getStoryTemplateAccess).mockResolvedValue(false);
      const page = await Step2Page({ params: Promise.resolve({ locale: 'en-US' }) });
      expect(page.props.templatesEnabled).toBe(false);
      expect(page.props.templates).toEqual([]);
      expect(getStoryTemplates).not.toHaveBeenCalled();
    },
  );

  it('provides templates to an eligible author', async () => {
    jest.mocked(getStoryTemplateAccess).mockResolvedValue(true);
    jest.mocked(getStoryTemplates).mockReturnValue([]);
    const page = await Step2Page({ params: Promise.resolve({ locale: 'pt-PT' }) });
    expect(page.props.templatesEnabled).toBe(true);
    expect(getStoryTemplates).toHaveBeenCalledWith('pt-PT');
  });
});
