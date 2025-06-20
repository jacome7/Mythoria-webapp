import { promises as fs } from 'fs';
import path from 'path';
import { setRequestLocale } from 'next-intl/server';

export default async function TermsAndConditionsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);
  const filePath = path.join(process.cwd(), 'src', 'messages', locale, 'termsAndConditions.html');
  const bodyHtml = await fs.readFile(filePath, 'utf8');
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>
      </div>
    </div>
  );
}
