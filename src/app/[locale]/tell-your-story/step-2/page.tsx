import { biographerEnabled } from '@/lib/biographer/validation';
import { getStoryTemplates } from '@/lib/story-templates/catalog';
import Step2Client from './Step2Client';

export const dynamic = 'force-dynamic';

export default async function Step2Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <Step2Client
      growthMeasurement={process.env.GROWTH_MEASUREMENT_V2_ENABLED === 'true'}
      templatesEnabled
      templates={getStoryTemplates(locale)}
      whispererEnabled={biographerEnabled()}
    />
  );
}
