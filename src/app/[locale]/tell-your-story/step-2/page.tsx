import { getStoryTemplates } from '@/lib/story-templates/catalog';
import { getStoryTemplateAccess } from '@/lib/story-templates/access';
import Step2Client from './Step2Client';

export const dynamic = 'force-dynamic';

export default async function Step2Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const enabled = await getStoryTemplateAccess();
  return (
    <Step2Client templatesEnabled={enabled} templates={enabled ? getStoryTemplates(locale) : []} />
  );
}
