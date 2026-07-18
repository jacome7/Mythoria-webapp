import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isValidIntent, type StoryIntent } from '@/constants/intents';
import type { SampleBook } from '@/types/sample-book';

interface LegacyBook {
  id: string;
  title: string;
  synopses: string;
  locale: string;
  intent: string;
  recipients: string[];
  tags: string;
  style: string;
}

interface AssetMetadata {
  localPath?: string;
}

interface PackBook {
  id: string;
  title: string;
  slug: string;
  language: string;
  targetAudience?: string;
  readerAgeBand?: string;
  buyerPersona?: string;
  recipientType?: string;
  storyIntent?: string;
  synopsis: string;
  shortExcerpt?: string;
  sampleChapterPath?: string;
  audioTeaserText?: string;
  graphicalStyle?: string;
  novelStyle?: string;
  fictionalUserContext?: string;
  coverImage?: AssetMetadata;
  featureImage?: AssetMetadata;
  sampleChapterImage?: AssetMetadata;
  audioSample?: AssetMetadata & { status?: string };
  safetyNotes?: string[];
}

interface PackManifest {
  placement?: string;
  usageTags?: string[];
  status?: string;
  riskRating?: string;
}

const PACK_INTENTS: Record<string, StoryIntent> = {
  'a-beatriz-recorda-os-melhores-dias-do-max': 'remembrance',
  'a-final-do-bairro-das-estrelas': 'sports_teams',
  'a-leonor-abre-espaco-para-o-amor': 'kids_transitions',
  'a-mala-que-falava-portugues': 'grandparents',
  'a-primeira-manha-corajosa-da-sofia': 'kids_transitions',
  'a-receita-das-estrelas-da-avo': 'grandparents',
  'a-semana-da-clara-tem-duas-cozinhas': 'kids_transitions',
  'as-cartas-da-avo-rosa': 'grandparents',
  'as-ferias-na-casa-amarela': 'grandparents',
  'duas-chavenas-uma-vida': 'romance',
  'ines-e-diogo-um-amor-inesperado': 'romance',
  'leonor-e-matilde-dois-paises-uma-casa': 'romance',
  'o-clube-dos-mapas-impossiveis': 'school_projects',
  'o-comboio-dos-domingos-do-avo': 'grandparents',
  'o-gato-que-guardava-a-lua': 'pet_stories',
  'o-jardim-das-fotografias-antigas': 'grandparents',
  'o-mateus-e-a-lua-aprendem-juntos': 'pet_stories',
  'o-nosso-primeiro-beijo-foi-so-o-principio': 'romance',
  'o-tomas-guarda-as-historias-de-domingo-da-avo-teresa': 'remembrance',
  'rui-e-tomas-o-ultimo-capitulo-antes-do-sim': 'romance',
};

const publicDirectory = path.join(process.cwd(), 'public');

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function exists(filePath: string | undefined): Promise<boolean> {
  if (!filePath) return false;

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function publicPath(...segments: string[]): string {
  return `/${segments
    .flatMap((segment) => segment.replaceAll('\\', '/').split('/'))
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

function normalizeTags(tags: string[] | undefined): string[] {
  return (tags ?? []).filter(Boolean);
}

function legacyToSampleBook(book: LegacyBook): SampleBook | null {
  if (!isValidIntent(book.intent)) return null;

  return {
    id: book.id,
    slug: book.id,
    title: book.title,
    synopsis: book.synopses,
    locale: book.locale,
    intent: book.intent,
    recipients: book.recipients,
    tags: book.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    style: book.style,
    coverSrc: publicPath('SampleBooks', `${book.id}.jpeg`),
    featureSrc: publicPath('SampleBooks', `${book.id}_scene.jpeg`),
    source: 'legacy',
  };
}

async function packToSampleBook(folderName: string): Promise<SampleBook> {
  const packDirectory = path.join(publicDirectory, 'sample-books', folderName);
  const [book, manifest] = await Promise.all([
    readJson<PackBook>(path.join(packDirectory, 'book.json')),
    readJson<PackManifest>(path.join(packDirectory, 'manifest.json')),
  ]);
  const intent = PACK_INTENTS[book.slug];

  if (!intent) {
    throw new Error(`Sample book pack ${book.slug} has no canonical intent mapping.`);
  }

  const assetPath = (asset: AssetMetadata | undefined) =>
    asset?.localPath ? publicPath('sample-books', book.slug, asset.localPath) : undefined;
  const audioPath = assetPath(book.audioSample);
  const hasAudio = await exists(
    book.audioSample?.localPath ? path.join(packDirectory, book.audioSample.localPath) : undefined,
  );

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    synopsis: book.synopsis,
    shortExcerpt: book.shortExcerpt,
    locale: book.language,
    intent,
    recipients: book.recipientType ? [book.recipientType] : [],
    tags: normalizeTags(manifest.usageTags),
    style: book.graphicalStyle ?? book.novelStyle ?? 'sample book',
    graphicalStyle: book.graphicalStyle,
    novelStyle: book.novelStyle,
    targetAudience: book.targetAudience,
    readerAgeBand: book.readerAgeBand,
    buyerPersona: book.buyerPersona,
    recipientType: book.recipientType,
    storyIntent: book.storyIntent,
    fictionalUserContext: book.fictionalUserContext,
    safetyNotes: book.safetyNotes,
    placement: manifest.placement,
    status: manifest.status,
    riskRating: manifest.riskRating,
    coverSrc: assetPath(book.coverImage) ?? publicPath('Mythoria-logo-white-512x336.jpg'),
    featureSrc: assetPath(book.featureImage),
    chapterImageSrc: assetPath(book.sampleChapterImage),
    sampleChapterSrc: book.sampleChapterPath
      ? publicPath('sample-books', book.slug, book.sampleChapterPath)
      : undefined,
    audioSampleSrc: hasAudio ? audioPath : undefined,
    audioSampleTitle: hasAudio ? 'Audio teaser' : undefined,
    audioTeaserText: book.audioTeaserText,
    source: 'sample-pack',
  };
}

export async function getSampleBooksCatalog(): Promise<SampleBook[]> {
  const legacyBooks = await readJson<LegacyBook[]>(
    path.join(publicDirectory, 'SampleBooks', 'SampleBooks.json'),
  );
  const packDirectory = path.join(publicDirectory, 'sample-books');
  const packFolders = (await fs.readdir(packDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const packs = await Promise.all(packFolders.map(packToSampleBook));

  return [
    ...legacyBooks.map(legacyToSampleBook).filter((book): book is SampleBook => book !== null),
    ...packs,
  ];
}
