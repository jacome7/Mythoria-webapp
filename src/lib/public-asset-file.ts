import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import publicAssetAliases from '../../public-asset-aliases.json';

const publicRoot = join(process.cwd(), 'public');
const aliases: Readonly<Record<string, string | undefined>> = publicAssetAliases;

// Match Next.js: a physical file takes precedence over its fallback rewrite.
export function resolvePublicAssetFile(file: string): string {
  if (existsSync(file)) return file;
  const url = '/' + relative(publicRoot, file).split(sep).join('/');
  const destination = aliases[url];
  return destination ? join(publicRoot, destination) : file;
}
