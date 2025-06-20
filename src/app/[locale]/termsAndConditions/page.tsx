import { promises as fs } from 'fs';
import path from 'path';
import { setRequestLocale } from 'next-intl/server';

export default async function TermsAndConditionsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);
  const filePath = path.join(process.cwd(), 'src', 'messages', locale, 'termsAndConditions.html');
  const bodyHtml = await fs.readFile(filePath, 'utf8');  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <div 
            className="prose max-w-none
              [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-gray-800 [&_h1]:mb-8 [&_h1]:pb-4 [&_h1]:border-b-2 [&_h1]:border-blue-500
              [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-700 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-gray-300
              [&_section]:mb-6 [&_section]:pb-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml }} 
          />
        </div>
      </div>
    </div>
  );
}
