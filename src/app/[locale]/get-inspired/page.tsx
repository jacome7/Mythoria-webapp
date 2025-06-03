import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';

interface BookData {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  imageAlt: string;
}

// Sample book data - this can later be replaced with API calls
const sampleBooks: BookData[] = [
  {
    id: '1',
    title: 'A Bea tem um macaco no Nariz',
    author: 'Andrea Vieira',
    imageUrl: '/SampleBooks/bea_bedside.jpg',
    imageAlt: 'A Bea tem um macaco no Nariz - Story cover'
  },
  {
    id: '2', 
    title: 'How I Met Your Mother',
    author: 'André Silva',
    imageUrl: '/SampleBooks/How_I_met_you_mother_reading.jpg',
    imageAlt: 'How I Met Your Mother - Story cover'
  }
];

interface GetInspiredPageProps {
  params: Promise<{ locale: string }>;
}

export default async function GetInspiredPage({ params }: GetInspiredPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations('GetInspiredPage');
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Gallery Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            {t('gallery.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('gallery.subtitle')}
          </p>
        </div>        {/* Book Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {sampleBooks.map((book) => (            <div key={book.id} className="card bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <figure className="px-4 pt-4">
                <div className="relative w-full h-80 rounded-xl overflow-hidden">
                  <Image
                    src={book.imageUrl}
                    alt={book.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </div>
              </figure>
              <div className="card-body text-center">
                <h3 className="card-title justify-center text-lg font-bold text-gray-800">
                  {book.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('gallery.createdBy')} <span className="font-semibold">{book.author}</span>
                </p>
                <div className="card-actions justify-center">
                  <button className="btn btn-primary btn-sm">
                    {t('gallery.viewStory')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>      </div>
    </div>
  );
}
