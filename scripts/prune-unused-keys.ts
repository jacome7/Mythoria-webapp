import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

type JsonObject = { [k: string]: any };

function run(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0', TERM: 'dumb', COLUMNS: '512' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

function deleteByPath(obj: JsonObject, pathParts: string[]) {
  if (!obj) return;
  const last = pathParts[pathParts.length - 1];
  const parent = pathParts.slice(0, -1).reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
  if (parent && typeof parent === 'object' && last in parent) {
    delete parent[last];
  }
}

function pruneEmptyObjects(obj: any) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      pruneEmptyObjects(obj[key]);
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    }
  }
}

async function pruneForNamespace(locale: string, namespace: string) {
  const cwd = process.cwd();
  const localeDir = path.join('src', 'messages', locale);
  const targetFile = path.join(localeDir, namespace);
  const rootKey = path.basename(namespace, path.extname(namespace));

  // Load keep list once per run
  const keepConfigPath = path.join('src', 'messages', 'i18n-keep.json');
  let keepPrefixes: string[] = [];
  if (existsSync(keepConfigPath)) {
    try {
      const keepConfig = JSON.parse(readFileSync(keepConfigPath, 'utf8')) as { keep?: string[] };
      keepPrefixes = Array.isArray(keepConfig.keep) ? keepConfig.keep : [];
    } catch (e) {
      // ignore malformed keep file
    }
  }

  const args = [
    '@lingual/i18n-check',
    '-l',
    localeDir,
    '-s',
    locale,
    '-f',
    'next-intl',
    '-o',
    'unused',
    '--unused',
    'src',
    '-r',
    'standard',
  ];

  const { stdout, stderr, code } = await run('npx', args, cwd);
  if (code !== 0) {
    console.error('i18n-check failed:', stderr || stdout);
    process.exit(code);
  }

  const lines = stdout.split(/\r?\n/);
  // capture dot paths like <namespace>.foo.bar
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`${escapeRegExp(rootKey)}(?:\\.[A-Za-z0-9_+-]+)+`, 'g');
  const keys = new Set<string>();
  for (const line of lines) {
    const matches = line.match(keyRegex);
    if (matches) {
      for (const m of matches) keys.add(m);
    }
  }

  if (keys.size === 0) {
    console.log(`No unused keys found for ${targetFile}`);
    return;
  }

  console.log(`Pruning ${keys.size} unused keys from ${targetFile}`);
  const jsonText = readFileSync(targetFile, 'utf8');
  const json = JSON.parse(jsonText);

  for (const key of keys) {
    // Skip keys that match any keep prefix
    if (keepPrefixes.some((p) => key === p || key.startsWith(p + '.'))) {
      continue;
    }
    const parts = key.split('.');
    // Guard: ensure path starts at root key present in file
    if (!json[parts[0]]) continue;
    deleteByPath(json, parts);
  }
  pruneEmptyObjects(json);
  writeFileSync(targetFile, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

async function main() {
  const [locale = 'pt-PT', namespace = 'common.json'] = process.argv.slice(2);
  const localeDir = path.join('src', 'messages', locale);

  if (namespace.toUpperCase() === 'ALL') {
    const entries = readdirSync(localeDir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.json'))
      .map((d) => d.name);
    for (const file of entries) {
      await pruneForNamespace(locale, file);
    }
    return;
  }

  await pruneForNamespace(locale, namespace);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
