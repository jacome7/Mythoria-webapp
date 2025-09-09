#!/usr/bin/env node
/*
  Locale parity checker.
  Walks each locale directory under src/messages, using en-US as the source of truth.
  Reports:
    - Missing keys per locale
    - Extra (unused) keys per locale
    - Files present in one locale but missing in another
  Exits with non‑zero code if mismatches found (good for CI).
*/
import {readdirSync, readFileSync, statSync} from 'fs';
import {join, relative} from 'path';

const MESSAGES_DIR = join(process.cwd(), 'src', 'messages');
const SOURCE_LOCALE = 'en-US';

interface Tree { [key: string]: any }

function flatten(obj: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectLocaleFiles(locale: string): string[] {
  const dir = join(MESSAGES_DIR, locale);
  return readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f));
}

function buildLocaleMap(locale: string) {
  const files = collectLocaleFiles(locale);
  const map: Record<string, Record<string, string>> = {};
  for (const file of files) {
    try {
      const json = loadJson(file);
      map[relative(join(MESSAGES_DIR, locale), file)] = flatten(json);
    } catch (e) {
      console.error(`Failed to parse ${file}:`, e);
    }
  }
  return map;
}

const locales = readdirSync(MESSAGES_DIR).filter(d => statSync(join(MESSAGES_DIR, d)).isDirectory());
if (!locales.includes(SOURCE_LOCALE)) {
  console.error(`Source locale ${SOURCE_LOCALE} not found in ${MESSAGES_DIR}`);
  process.exit(1);
}

const sourceMap = buildLocaleMap(SOURCE_LOCALE);
let hasDiff = false;

for (const locale of locales) {
  if (locale === SOURCE_LOCALE) continue;
  const targetMap = buildLocaleMap(locale);
  // File level parity
  const sourceFiles = Object.keys(sourceMap).sort();
  const targetFiles = Object.keys(targetMap).sort();
  const missingFiles = sourceFiles.filter(f => !targetFiles.includes(f));
  const extraFiles = targetFiles.filter(f => !sourceFiles.includes(f));

  if (missingFiles.length || extraFiles.length) {
    hasDiff = true;
    console.log(`\n[File Parity] ${locale}`);
    if (missingFiles.length) console.log('  Missing files:', missingFiles.join(', '));
    if (extraFiles.length) console.log('  Extra files:', extraFiles.join(', '));
  }

  // Key parity per file that exists in both
  for (const file of sourceFiles) {
    if (!targetMap[file]) continue; // already reported missing file
    const sourceKeys = Object.keys(sourceMap[file]);
    const targetKeys = Object.keys(targetMap[file]);
    const missingKeys = sourceKeys.filter(k => !targetKeys.includes(k));
    const extraKeys = targetKeys.filter(k => !sourceKeys.includes(k));
    if (missingKeys.length || extraKeys.length) {
      hasDiff = true;
      console.log(`\n[Key Parity] ${locale} -> ${file}`);
      if (missingKeys.length) console.log('  Missing keys:', missingKeys.slice(0,50).join(', '));
      if (extraKeys.length) console.log('  Extra keys:', extraKeys.slice(0,50).join(', '));
    }
  }
}

if (!hasDiff) {
  console.log('All locale files are in parity with', SOURCE_LOCALE);
} else {
  console.log('\nLocale parity differences detected.');
  process.exit(2);
}
