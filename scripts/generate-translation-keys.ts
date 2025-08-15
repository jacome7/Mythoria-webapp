#!/usr/bin/env ts-node
/*
  Generates a union type of all translation keys (flattened) for the source locale (en-US)
  and writes it to src/types/translation-keys.d.ts
  This enables: type TKey = TranslationKey; then enforce t<TKey>('key').
*/
import {readdirSync, readFileSync, statSync, mkdirSync, writeFileSync} from 'fs';
import {join} from 'path';

const MESSAGES_DIR = join(process.cwd(), 'src', 'messages');
const OUTPUT_DIR = join(process.cwd(), 'src', 'types');
const SOURCE_LOCALE = 'en-US';

function flatten(obj: any, prefix = '', out: string[] = []): string[] {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out.push(key);
    }
  }
  return out;
}

function collectKeys(locale: string) {
  const dir = join(MESSAGES_DIR, locale);
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  let keys: string[] = [];
  for (const f of files) {
    const json = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const flattened = flatten(json);
    keys.push(...flattened.map(k => k));
  }
  // de-duplicate & sort
  return Array.from(new Set(keys)).sort();
}

if (!statSync(join(MESSAGES_DIR, SOURCE_LOCALE)).isDirectory()) {
  console.error('Source locale not found:', SOURCE_LOCALE);
  process.exit(1);
}

const keys = collectKeys(SOURCE_LOCALE);
mkdirSync(OUTPUT_DIR, {recursive: true});
const banner = `// AUTO-GENERATED FILE. Run: npm run i18n:keys\n// Total keys: ${keys.length}\n`;
const union = keys.map(k => JSON.stringify(k)).join(' | ');
writeFileSync(join(OUTPUT_DIR, 'translation-keys.d.ts'), `${banner}export type TranslationKey = ${union};\n`);
console.log(`Generated translation-keys.d.ts with ${keys.length} keys.`);
