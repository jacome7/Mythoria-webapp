import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

interface DiagnosticSample {
  HomePage?: {
    hasWords: boolean;
    wordCount: number;
    keys: string[];
  };
  Header?: {
    hasNavigation: boolean;
    keys: string[];
  };
  common?: {
    hasHeader: boolean;
    hasFooter: boolean;
    keys: string[];
  };
}

interface DiagnosticTranslation {
  files: string[];
  sample: DiagnosticSample;
}

export async function GET() {
  const diagnostics = {
    environment: process.env.NODE_ENV,
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
    translations: {} as Record<string, DiagnosticTranslation>,
    errors: [] as string[],
  };

  try {
    const messagesDir = path.join(process.cwd(), 'src', 'messages');
    const locales = await readdir(messagesDir);

    for (const locale of locales) {
      try {
        const localeDir = path.join(messagesDir, locale);
        const statResult = await stat(localeDir);

        if (!statResult.isDirectory()) continue;

        const files = await readdir(localeDir);
        diagnostics.translations[locale] = {
          files: files,
          sample: {},
        };

        // Load HomePage.json as sample
        if (files.includes('HomePage.json')) {
          const content = await readFile(path.join(localeDir, 'HomePage.json'), 'utf8');
          const json = JSON.parse(content);
          diagnostics.translations[locale].sample.HomePage = {
            hasWords: Array.isArray(json.words),
            wordCount: Array.isArray(json.words) ? json.words.length : 0,
            keys: Object.keys(json),
          };
        }

        // Load Header.json as sample
        if (files.includes('Header.json')) {
          const content = await readFile(path.join(localeDir, 'Header.json'), 'utf8');
          const json = JSON.parse(content);
          diagnostics.translations[locale].sample.Header = {
            hasNavigation: !!json.Header?.navigation,
            keys: Object.keys(json.Header || {}),
          };
        }
      } catch (e) {
        diagnostics.errors.push(
          `Failed to process locale ${locale}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  } catch (e) {
    diagnostics.errors.push(
      `Failed to read messages directory: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  return NextResponse.json(diagnostics, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
