import { promises as fs } from 'fs';
import path from 'path';
import { setRequestLocale } from 'next-intl/server';

interface TermsAndConditionsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TermsAndConditionsPage({ params }: TermsAndConditionsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filePath = path.join(process.cwd(), 'src', 'messages', locale, 'termsAndConditions.html');
  const bodyHtml = await fs.readFile(filePath, 'utf8');

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        <div className="bg-white shadow-xl rounded-lg p-4 sm:p-8">
          <div
            className="prose max-w-none break-words overflow-wrap-anywhere
              [&_h1]:text-2xl sm:[&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-gray-800 [&_h1]:mb-8 [&_h1]:pb-4 [&_h1]:border-b-2 [&_h1]:border-blue-500 [&_h1]:break-words
              [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-700 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-gray-300 [&_h2]:break-words
              [&_section]:mb-6 [&_section]:pb-4
              [&_p]:break-words [&_p]:overflow-wrap-anywhere [&_p]:hyphens-auto
              [&_li]:break-words [&_li]:overflow-wrap-anywhere [&_li]:hyphens-auto
              [&_a]:break-all [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800
              [&_strong]:break-words
              [&_em]:break-words"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      </div>
    </div>
  );
}
