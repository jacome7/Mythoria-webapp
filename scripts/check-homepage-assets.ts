/**
 * Validates the homepage style folders (public/homepage/<styleId>) against
 * their assets_metadata.json:
 *
 *   1. every metadata entry's file exists on disk
 *   2. every image file on disk is listed in the metadata (mockups exempt)
 *   3. every required hero slot has at least one non-"missing" entry
 *   4. filenames follow the lowercase canonical grammar:
 *        {slot}.webp | {slot}_{device}.webp | {slot}_{device}_{locale}.webp
 *        | person{n}_{locale}.webp | free-form chrome slots
 *      with locale suffixes restricted to SUPPORTED_LOCALES
 *   5. declared dimensions match the real image header (via sharp)
 *
 * Usage: npm run homepage:assets
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { SUPPORTED_LOCALES } from '../src/config/locales';

const STYLE_IDS = ['kids_fantasy', 'sports_teams', 'romance'] as const;
const HOMEPAGE_DIR = path.join(__dirname, '..', 'public', 'homepage');

/** Files that live in a style folder but are not runtime assets. */
const EXEMPT_FILES = new Set(['assets_metadata.json', 'MISSING_ASSETS.md']);
const EXEMPT_PATTERNS = [/^homepage_mobile_mockup\.png$/, /^mockup.*\.png$/];

interface AssetEntry {
  file: string;
  slot: string;
  device?: 'laptop' | 'mobile';
  locale?: string;
  dimensions?: { w: number; h: number };
  status: 'final' | 'draft' | 'placeholder' | 'missing';
}

interface Metadata {
  schemaVersion: number;
  styleId: string;
  heroSlots?: { required?: string[] };
  assets: AssetEntry[];
}

const errors: string[] = [];
const warnings: string[] = [];

function fail(style: string, msg: string) {
  errors.push(`[${style}] ${msg}`);
}

function warn(style: string, msg: string) {
  warnings.push(`[${style}] ${msg}`);
}

/** Hero slots that must follow the strict {slot}[_{device}][_{locale}].webp grammar. */
const HERO_SLOT_RE =
  /^(cloud_left|cloud_right|sky_left|sky_right|sparkles|background|foreground|person\d+|icon\d+)$/;

/** Canonical filename check: lowercase slot, optional _device, optional _locale. */
function checkFilename(style: string, entry: AssetEntry) {
  if (entry.locale && !SUPPORTED_LOCALES.includes(entry.locale)) {
    fail(style, `file "${entry.file}" uses unsupported locale "${entry.locale}"`);
  }
  if (/[A-Z]/.test(entry.file.replace(/_(?:[a-z]{2}-[A-Z]{2})\.webp$/, ''))) {
    fail(style, `file "${entry.file}" contains uppercase characters outside the locale suffix`);
  }
  // Only the shared hero slots are required to be drop-in identical across
  // style folders; chrome slots (footer, social icons, ...) keep their names.
  if (!HERO_SLOT_RE.test(entry.slot)) return;
  const base = entry.file.replace(/\.(webp|png)$/, '');
  let expected = entry.slot;
  if (entry.device) expected += `_${entry.device}`;
  if (entry.locale) expected += `_${entry.locale}`;
  if (base !== expected) {
    fail(
      style,
      `file "${entry.file}" does not match its slot grammar — expected "${expected}.webp" ` +
        `(slot=${entry.slot}${entry.device ? `, device=${entry.device}` : ''}${entry.locale ? `, locale=${entry.locale}` : ''})`,
    );
  }
}

async function checkStyle(style: string): Promise<void> {
  const dir = path.join(HOMEPAGE_DIR, style);
  const metaPath = path.join(dir, 'assets_metadata.json');
  if (!fs.existsSync(metaPath)) {
    fail(style, 'assets_metadata.json is missing');
    return;
  }

  let meta: Metadata;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    fail(style, `assets_metadata.json is not valid JSON: ${(e as Error).message}`);
    return;
  }

  if (meta.styleId !== style) {
    fail(style, `metadata styleId "${meta.styleId}" does not match folder name`);
  }

  const listed = new Map<string, AssetEntry>();
  for (const entry of meta.assets) {
    if (listed.has(entry.file)) fail(style, `duplicate metadata entry for "${entry.file}"`);
    listed.set(entry.file, entry);
  }

  // 1. listed files exist + 4. naming + 5. dimensions
  for (const entry of meta.assets) {
    if (entry.status === 'missing') continue;
    const filePath = path.join(dir, entry.file);
    if (!fs.existsSync(filePath)) {
      fail(
        style,
        `metadata lists "${entry.file}" (status ${entry.status}) but it does not exist on disk`,
      );
      continue;
    }
    checkFilename(style, entry);
    if (entry.dimensions) {
      try {
        const m = await sharp(filePath).metadata();
        if (m.width !== entry.dimensions.w || m.height !== entry.dimensions.h) {
          fail(
            style,
            `"${entry.file}" declares ${entry.dimensions.w}x${entry.dimensions.h} but is actually ${m.width}x${m.height}`,
          );
        }
      } catch (e) {
        fail(style, `could not read image header of "${entry.file}": ${(e as Error).message}`);
      }
    }
  }

  // 2. disk files are listed
  for (const file of fs.readdirSync(dir)) {
    if (EXEMPT_FILES.has(file) || EXEMPT_PATTERNS.some((p) => p.test(file))) continue;
    if (!/\.(webp|png)$/.test(file)) continue;
    if (!listed.has(file)) {
      fail(style, `"${file}" exists on disk but is not listed in assets_metadata.json`);
    }
  }

  // 3. required slots covered
  for (const slot of meta.heroSlots?.required ?? []) {
    const covered = meta.assets.some((a) => a.slot === slot && a.status !== 'missing');
    if (!covered) fail(style, `required hero slot "${slot}" has no usable asset`);
  }

  // Advisory: placeholders/drafts remind that designer work is pending.
  const pending = meta.assets.filter((a) => a.status === 'placeholder' || a.status === 'draft');
  if (pending.length > 0) {
    warn(style, `${pending.length} asset(s) still placeholder/draft — see MISSING_ASSETS.md`);
  }
}

(async () => {
  for (const style of STYLE_IDS) {
    await checkStyle(style);
  }
  for (const w of warnings) console.warn(`WARN  ${w}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`ERROR ${e}`);
    console.error(`\nhomepage assets check FAILED with ${errors.length} error(s).`);
    process.exit(1);
  }
  console.log(
    `homepage assets check passed for: ${STYLE_IDS.join(', ')} (${warnings.length} warning(s)).`,
  );
})();
