import cartaPt from '../../../public/sample-books/a-carta-que-perdeu-o-envelope/book.json';
import cartaEs from '../../../public/sample-books/la-carta-que-perdio-su-sobre/book.json';
import teatroPt from '../../../public/sample-books/quando-a-estrela-do-teatro-se-apagou/book.json';
import teatroEs from '../../../public/sample-books/cuando-se-apago-la-estrella-del-teatro/book.json';
import telhadoPt from '../../../public/sample-books/o-clube-do-telhado-torto/book.json';
import telhadoEs from '../../../public/sample-books/el-club-del-tejado-torcido/book.json';
import noticiaPt from '../../../public/sample-books/a-noticia-a-que-faltava-metade/book.json';
import noticiaEs from '../../../public/sample-books/la-noticia-a-la-que-le-faltaba-la-mitad/book.json';
import type { LandingPageBook } from './types';

type SeasonalLocale = 'pt-PT' | 'es-ES';

const previewBooks = {
  'pt-PT': { carta: cartaPt, teatro: teatroPt, telhado: telhadoPt, noticia: noticiaPt },
  'es-ES': { carta: cartaEs, teatro: teatroEs, telhado: telhadoEs, noticia: noticiaEs },
};

const illustratedBook = {
  'pt-PT': {
    title: 'O barco que tinha sede',
    slug: 'o-barco-que-tinha-sede',
    synopsis:
      'A Inês quer pôr o seu barco de papel a navegar, mas o ribeiro secou. Um som quase escondido leva-a até uma ponte de pedra, onde a água e uns pequenos girinos a esperam.',
    excerpt: 'Dobrou um canto. Dobrou outro. E de um quadrado de papel nasceu um barco vermelho.',
    imageAlt: 'A Inês ajoelhada junto ao ribeiro com o seu barco de papel vermelho.',
    styleLabel: 'Álbum ilustrado',
    contextLabel: 'A água e os girinos',
    ageLabel: '3–6 anos',
  },
  'es-ES': {
    title: 'El barco que tenía sed',
    slug: 'el-barco-que-tenia-sed',
    synopsis:
      'Inés quiere que su barco de papel navegue, pero el arroyo se ha secado. Un sonido casi escondido la lleva hasta un puente de piedra. Allí la esperan el agua y unos renacuajos.',
    excerpt: 'Dobló una esquina. Luego dobló otra. Y de un cuadrado de papel nació un barco rojo.',
    imageAlt: 'Inés se arrodilla junto al arroyo y mira su barco de papel rojo.',
    styleLabel: 'Álbum ilustrado',
    contextLabel: 'El agua y los renacuajos',
    ageLabel: '3–6 años',
  },
};

export function christmasBookSamples(locale: SeasonalLocale): LandingPageBook[] {
  const boatAssets = `/seasonal-books/ines/${locale}`;
  const boat = {
    ...illustratedBook[locale],
    id: 'ines',
    imageSrc: `${boatAssets}/cover.webp`,
    fullBookPdf: {
      href: `${boatAssets}/leitura.pdf`,
      label: locale === 'pt-PT' ? 'Ler o livro completo' : 'Leer el libro completo',
    },
  };

  const previews = Object.entries(previewBooks[locale]).map(([id, book]): LandingPageBook => {
    const assetRoot = `/sample-books/${book.slug}`;
    return {
      id,
      slug: book.slug,
      title: book.title,
      synopsis: book.synopsis,
      excerpt: book.shortExcerpt,
      imageSrc: `${assetRoot}/${book.coverImage.localPath}`,
      imageAlt: locale === 'pt-PT' ? `Capa de «${book.title}»` : `Portada de «${book.title}»`,
      styleLabel: book.styleLabel,
      contextLabel: book.storyIntent,
      ageLabel: book.readerAgeBand,
      sampleChapter: {
        title: book.chapterTitle,
        imageSrc: `${assetRoot}/${book.sampleChapterImage.localPath}`,
        imageAlt: book.chapterImageAlt,
        paragraphs: book.openingParagraphs,
      },
      ...(book.audioSample.status === 'generated' && {
        audioSampleSrc: `${assetRoot}/${book.audioSample.localPath}`,
        audioSampleTranscript: book.audioTeaserText,
      }),
    };
  });
  return [boat, ...previews];
}
