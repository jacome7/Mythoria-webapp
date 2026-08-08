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

async function composeCover(book: BookAssetSpec, assets: string): Promise<string> {
  const source = join(assets, 'source-cover.jpeg');
  const output = join(assets, 'cover.jpeg');
  await assertSource(source);
  await sharp(source)
    .resize(1024, 1536, { fit: 'cover', position: 'centre' })
    .composite([{ input: titleOverlay(book), left: 0, top: 0 }])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(output);
  return output;
}

async function composeFeature(coverPath: string, assets: string): Promise<string> {
  const source = join(assets, 'source-feature.jpeg');
  const output = join(assets, 'feature.jpeg');
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

  const cover = await composeCover(book, assets);
  const feature = await composeFeature(cover, assets);
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

async function main() {
  const includeAudio = !process.argv.includes('--images-only');
  await mkdir(join(landingRoot, 'hero'), { recursive: true });
  const entries = [];
  for (const book of books) {
    const files = await copyRuntimeAssets(book, includeAudio);
    entries.push({ slug: book.slug, title: book.title, files: Object.keys(files).sort() });
    console.log(`synced ${book.slug}`);
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
