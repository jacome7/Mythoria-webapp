import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

interface BookAssetSpec {
  slug: string;
  title: string;
  titleLines: string[];
  titleColor: string;
  titlePanel: string;
}

type LocalizedLandingLocale = 'en-US' | 'es-ES' | 'fr-FR';

interface LocalizedTitleSpec {
  title: string;
  titleLines: string[];
}

const books: BookAssetSpec[] = [
  {
    slug: 'mia-e-a-pastelaria-da-lua',
    title: 'Mia e a Pastelaria da Lua',
    titleLines: ['Mia e a', 'Pastelaria da Lua'],
    titleColor: '#fff8e7',
    titlePanel: 'rgba(18, 45, 73, 0.84)',
  },
  {
    slug: 'tomas-e-o-mapa-das-portas-escondidas',
    title: 'Tomás e o Mapa das Portas Escondidas',
    titleLines: ['Tomás e o Mapa', 'das Portas Escondidas'],
    titleColor: '#263a42',
    titlePanel: 'rgba(255, 248, 231, 0.88)',
  },
  {
    slug: 'lia-e-o-jardim-das-palavras-perdidas',
    title: 'Lia e o Jardim das Palavras Perdidas',
    titleLines: ['Lia e o Jardim', 'das Palavras Perdidas'],
    titleColor: '#29493f',
    titlePanel: 'rgba(255, 252, 241, 0.88)',
  },
  {
    slug: 'a-equipa-que-marcou-um-golo-nas-estrelas',
    title: 'A Equipa que Marcou um Golo nas Estrelas',
    titleLines: ['A Equipa que Marcou', 'um Golo nas Estrelas'],
    titleColor: '#fff8e7',
    titlePanel: 'rgba(21, 42, 69, 0.88)',
  },
  {
    slug: 'ines-e-o-robo-feito-de-desenhos',
    title: 'Inês e o Robô Feito de Desenhos',
    titleLines: ['Inês e o Robô', 'Feito de Desenhos'],
    titleColor: '#303a45',
    titlePanel: 'rgba(255, 252, 241, 0.9)',
  },
];

const localizedTitles: Record<LocalizedLandingLocale, Record<string, LocalizedTitleSpec>> = {
  'en-US': {
    'mia-e-a-pastelaria-da-lua': {
      title: 'Maya and the Moonlight Bakery',
      titleLines: ['Maya and the', 'Moonlight Bakery'],
    },
    'tomas-e-o-mapa-das-portas-escondidas': {
      title: 'Theo and the Map of Hidden Doors',
      titleLines: ['Theo and the Map', 'of Hidden Doors'],
    },
    'lia-e-o-jardim-das-palavras-perdidas': {
      title: 'Lily and the Garden of Lost Words',
      titleLines: ['Lily and the Garden', 'of Lost Words'],
    },
    'a-equipa-que-marcou-um-golo-nas-estrelas': {
      title: 'The Team That Scored Among the Stars',
      titleLines: ['The Team That Scored', 'Among the Stars'],
    },
    'ines-e-o-robo-feito-de-desenhos': {
      title: 'Ivy and the Robot Made of Drawings',
      titleLines: ['Ivy and the Robot', 'Made of Drawings'],
    },
  },
  'es-ES': {
    'mia-e-a-pastelaria-da-lua': {
      title: 'Mía y la Panadería de la Luna',
      titleLines: ['Mía y la Panadería', 'de la Luna'],
    },
    'tomas-e-o-mapa-das-portas-escondidas': {
      title: 'Tomás y el Mapa de las Puertas Ocultas',
      titleLines: ['Tomás y el Mapa', 'de las Puertas Ocultas'],
    },
    'lia-e-o-jardim-das-palavras-perdidas': {
      title: 'Lucía y el Jardín de las Palabras Perdidas',
      titleLines: ['Lucía y el Jardín', 'de las Palabras Perdidas'],
    },
    'a-equipa-que-marcou-um-golo-nas-estrelas': {
      title: 'El Equipo que Marcó un Gol en las Estrellas',
      titleLines: ['El Equipo que Marcó', 'un Gol en las Estrellas'],
    },
    'ines-e-o-robo-feito-de-desenhos': {
      title: 'Inés y el Robot Hecho de Dibujos',
      titleLines: ['Inés y el Robot', 'Hecho de Dibujos'],
    },
  },
  'fr-FR': {
    'mia-e-a-pastelaria-da-lua': {
      title: 'Mia et la Boulangerie de la Lune',
      titleLines: ['Mia et la Boulangerie', 'de la Lune'],
    },
    'tomas-e-o-mapa-das-portas-escondidas': {
      title: 'Théo et la Carte des Portes Cachées',
      titleLines: ['Théo et la Carte', 'des Portes Cachées'],
    },
    'lia-e-o-jardim-das-palavras-perdidas': {
      title: 'Léa et le Jardin des Mots Perdus',
      titleLines: ['Léa et le Jardin', 'des Mots Perdus'],
    },
    'a-equipa-que-marcou-um-golo-nas-estrelas': {
      title: 'L’Équipe qui a Marqué un But dans les Étoiles',
      titleLines: ['L’Équipe qui a Marqué', 'un But dans les Étoiles'],
    },
    'ines-e-o-robo-feito-de-desenhos': {
      title: 'Inès et le Robot Fait de Dessins',
      titleLines: ['Inès et le Robot', 'Fait de Dessins'],
    },
  },
};

const publicRoot = join(process.cwd(), 'public');
const sampleRoot = join(publicRoot, 'sample-books');
const landingRoot = join(publicRoot, 'landing-pages', 'livro-personalizado-crianca', 'assets');

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function titleOverlay(book: BookAssetSpec): Buffer {
  const lineHeight = 82;
  const startY = book.titleLines.length === 2 ? 138 : 105;
  const text = book.titleLines
    .map(
      (line, index) =>
        `<text x="512" y="${startY + index * lineHeight}" text-anchor="middle" fill="${book.titleColor}" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700" letter-spacing="-1">${escapeXml(line)}</text>`,
    )
    .join('');
  return Buffer.from(`
    <svg width="1024" height="1536" viewBox="0 0 1024 1536" xmlns="http://www.w3.org/2000/svg">
      <rect x="64" y="48" width="896" height="230" rx="28" fill="${book.titlePanel}"/>
      ${text}
    </svg>
  `);
}

async function assertSource(path: string): Promise<void> {
  if (!existsSync(path)) throw new Error(`Missing generated source asset: ${path}`);
  const metadata = await sharp(path).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Unreadable generated asset: ${path}`);
}

async function composeCover(book: BookAssetSpec, source: string, output: string): Promise<string> {
  await assertSource(source);
  await sharp(source)
    .resize(1024, 1536, { fit: 'cover', position: 'centre' })
    .composite([{ input: titleOverlay(book), left: 0, top: 0 }])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(output);
  return output;
}

async function composeFeature(coverPath: string, source: string, output: string): Promise<string> {
  await assertSource(source);
  const cover = await sharp(coverPath)
    .resize(560, 800, { fit: 'contain', background: '#f7f0e1' })
    .composite([
      {
        input: Buffer.from(
          '<svg width="560" height="800" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="554" height="794" rx="7" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="6"/></svg>',
        ),
      },
    ])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();

  await sharp(source)
    .resize(1536, 1024, { fit: 'cover', position: 'centre' })
    .composite([{ input: cover, left: 488, top: 112 }])
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(output);
  return output;
}

async function copyRuntimeAssets(
  book: BookAssetSpec,
  includeAudio: boolean,
): Promise<Record<string, string>> {
  const assets = join(sampleRoot, book.slug, 'assets');
  const chapter = join(assets, 'chapter-01.jpeg');
  const audio = join(assets, 'audio-teaser.mp3');
  await assertSource(chapter);
  if (includeAudio && !existsSync(audio))
    throw new Error(`Missing generated audio asset: ${audio}`);

  const cover = await composeCover(
    book,
    join(assets, 'source-cover.jpeg'),
    join(assets, 'cover.jpeg'),
  );
  const feature = await composeFeature(
    cover,
    join(assets, 'source-feature.jpeg'),
    join(assets, 'feature.jpeg'),
  );
  const destination = join(landingRoot, 'books', book.slug);
  await mkdir(destination, { recursive: true });
  const copies: Array<[string, string]> = [
    [cover, join(destination, 'cover.jpeg')],
    [feature, join(destination, 'feature.jpeg')],
    [chapter, join(destination, 'chapter-01.jpeg')],
  ];
  if (includeAudio) copies.push([audio, join(destination, 'audio-teaser.mp3')]);
  for (const [source, target] of copies) await copyFile(source, target);
  return Object.fromEntries(
    copies.map(([, target]) => [target.slice(landingRoot.length + 1), target]),
  );
}

async function createLocalizedAssets(
  book: BookAssetSpec,
  locale: LocalizedLandingLocale,
): Promise<{ slug: string; title: string; files: string[] }> {
  const title = localizedTitles[locale][book.slug];
  if (!title) throw new Error(`Missing ${locale} title for ${book.slug}`);

  const sourceAssets = join(sampleRoot, book.slug, 'assets');
  const destination = join(landingRoot, 'i18n', locale, 'books', book.slug);
  await mkdir(destination, { recursive: true });
  const localizedBook: BookAssetSpec = { ...book, ...title };
  await composeCover(
    localizedBook,
    join(sourceAssets, 'source-cover.jpeg'),
    join(destination, 'cover.jpeg'),
  );
  await composeFeature(
    join(destination, 'cover.jpeg'),
    join(sourceAssets, 'source-feature.jpeg'),
    join(destination, 'feature.jpeg'),
  );
  await copyFile(join(sourceAssets, 'chapter-01.jpeg'), join(destination, 'chapter-01.jpeg'));

  return {
    slug: book.slug,
    title: title.title,
    files: ['cover.jpeg', 'feature.jpeg', 'chapter-01.jpeg'],
  };
}

async function createLocalizedHero(locale: LocalizedLandingLocale): Promise<void> {
  const source = join(landingRoot, 'i18n', locale, 'books', books[0]!.slug, 'feature.jpeg');
  const destination = join(landingRoot, 'i18n', locale, 'hero');
  await mkdir(destination, { recursive: true });
  await sharp(source)
    .resize(1500, 1200, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(join(destination, 'hero.jpeg'));
  await sharp(source)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(join(destination, 'og-cover.jpeg'));
}

async function main() {
  const includeAudio = !process.argv.includes('--images-only');
  await mkdir(join(landingRoot, 'hero'), { recursive: true });
  const entries = [];
  for (const book of books) {
    const files = await copyRuntimeAssets(book, includeAudio);
    entries.push({ slug: book.slug, title: book.title, files: Object.keys(files).sort() });
    console.log(`synced ${book.slug}`);
  }

  for (const locale of Object.keys(localizedTitles) as LocalizedLandingLocale[]) {
    const localizedEntries = [];
    for (const book of books) {
      localizedEntries.push(await createLocalizedAssets(book, locale));
      console.log(`localized ${locale} ${book.slug}`);
    }
    await createLocalizedHero(locale);
    const localizedManifestPath = join(landingRoot, 'i18n', locale, 'asset-manifest.json');
    await writeFile(
      localizedManifestPath,
      `${JSON.stringify(
        {
          schemaVersion: '1.0',
          locale,
          source: 'public/sample-books',
          deterministicComposition: { localizedCoverTitles: true },
          books: localizedEntries,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }

  const miaFeature = join(sampleRoot, books[0]!.slug, 'assets', 'feature.jpeg');
  await sharp(miaFeature)
    .resize(1500, 1200, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(join(landingRoot, 'hero', 'hero.jpeg'));
  await sharp(miaFeature)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(join(landingRoot, 'hero', 'og-cover.jpeg'));

  const manifestPath = join(landingRoot, 'asset-manifest.json');
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: '1.0',
        source: 'public/sample-books',
        generationModel: 'gpt-image-2',
        audioIncluded: includeAudio,
        deterministicComposition: {
          coverTitles: true,
          featureCoverPlacement: { left: 488, top: 112, width: 560, height: 800 },
          heroSource: 'mia-e-a-pastelaria-da-lua/assets/feature.jpeg',
        },
        books: entries,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { books: unknown[] };
  if (manifest.books.length !== 5)
    throw new Error('Asset manifest must include exactly five books.');
  console.log(`wrote ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
