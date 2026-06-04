import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { Storage } from '@google-cloud/storage';
import type { Client, ClientConfig } from 'pg';

type CliOptions = {
  execute: boolean;
  deleteLegacy: boolean;
  limit?: number;
};

type CharacterRow = {
  character_id: string;
  author_id: string | null;
  photo_url: string | null;
  photo_gcs_uri: string | null;
};

type LegacyPath = {
  sourcePath: string;
  authorId: string;
  characterId: string;
  filename: string;
};

const DEFAULT_BUCKET_NAME = 'mythoria-generated-stories';

function loadLocalEnv() {
  for (const filename of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;

    for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separator = line.indexOf('=');
      if (separator === -1) continue;

      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { execute: false, deleteLegacy: true };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--execute') {
      options.execute = true;
    } else if (arg === '--keep-legacy') {
      options.deleteLegacy = false;
    } else if (arg === '--limit' && next) {
      const limit = Number(next);
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('--limit must be a positive integer');
      }
      options.limit = limit;
      i += 1;
    } else if (arg === '--help') {
      process.stdout.write(
        [
          'Usage: npm run character-photos:migrate -- [--execute] [--keep-legacy] [--limit N]',
          '',
          'Dry-run is the default. --execute copies GCS objects, updates DB rows, and deletes legacy objects unless --keep-legacy is set.',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return options;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

async function getDbClient(): Promise<Client> {
  const { Client } = await import('pg');
  const host = requireEnv('DB_HOST');
  const port = Number(process.env.DB_PORT || '5432');
  const database = process.env.DB_NAME || 'mythoria_db';
  const user = requireEnv('DB_USER');
  const password = requireEnv('DB_PASSWORD');
  const isVpcConnection = host.startsWith('10.');

  const config: ClientConfig = {
    host,
    port,
    database,
    user,
    password,
    ssl:
      process.env.DB_SSL === 'true' || (!isVpcConnection && process.env.NODE_ENV === 'production')
        ? { rejectUnauthorized: false }
        : false,
    connectionTimeoutMillis: isVpcConnection ? 5000 : 10000,
  };

  return new Client(config);
}

function objectPathFromReference(value: string | null, bucketName: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(`gs://${bucketName}/`)) {
    return trimmed.slice(`gs://${bucketName}/`.length);
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname === 'storage.googleapis.com' &&
      parsed.pathname.startsWith(`/${bucketName}/`)
    ) {
      return decodeURIComponent(parsed.pathname.slice(`/${bucketName}/`.length));
    }
    if (parsed.hostname === `${bucketName}.storage.googleapis.com` && parsed.pathname.length > 1) {
      return decodeURIComponent(parsed.pathname.slice(1));
    }
    return null;
  } catch {
    if (trimmed.startsWith('/') || trimmed.includes('://')) return null;
    return trimmed;
  }
}

function parseLegacyPath(value: string | null, bucketName: string): LegacyPath | null {
  const objectPath = objectPathFromReference(value, bucketName);
  if (!objectPath || objectPath.includes('..')) return null;

  const match = /^characters\/([^/]+)\/([^/]+)\/([^/]+\.jpe?g)$/i.exec(objectPath);
  if (!match) return null;

  return {
    sourcePath: objectPath,
    authorId: match[1],
    characterId: match[2],
    filename: match[3],
  };
}

function newPathFor(legacy: LegacyPath): string {
  return `${legacy.authorId}/characters/${legacy.characterId}/${legacy.filename}`;
}

async function main() {
  loadLocalEnv();
  const options = parseArgs();
  const bucketName = process.env.STORAGE_BUCKET_NAME || DEFAULT_BUCKET_NAME;
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const client = await getDbClient();

  const summary = {
    scanned: 0,
    eligible: 0,
    migrated: 0,
    skipped: 0,
    deletedLegacy: 0,
    errors: 0,
  };

  await client.connect();
  try {
    const result = await client.query<CharacterRow>(
      `
        select character_id, author_id, photo_url, photo_gcs_uri
        from characters
        where photo_url is not null or photo_gcs_uri is not null
        order by created_at asc
        ${options.limit ? 'limit $1' : ''}
      `,
      options.limit ? [options.limit] : [],
    );

    summary.scanned = result.rows.length;

    for (const row of result.rows) {
      const legacy =
        parseLegacyPath(row.photo_gcs_uri, bucketName) ??
        parseLegacyPath(row.photo_url, bucketName);

      if (!legacy) {
        summary.skipped += 1;
        continue;
      }

      if (!row.author_id) {
        summary.skipped += 1;
        process.stdout.write(`skip ${row.character_id}: missing author_id\n`);
        continue;
      }

      if (legacy.authorId !== row.author_id || legacy.characterId !== row.character_id) {
        summary.skipped += 1;
        process.stdout.write(
          `skip ${row.character_id}: path owner mismatch (${legacy.sourcePath})\n`,
        );
        continue;
      }

      summary.eligible += 1;
      const destinationPath = newPathFor(legacy);

      if (!options.execute) {
        process.stdout.write(`dry-run ${legacy.sourcePath} -> ${destinationPath}\n`);
        continue;
      }

      try {
        const source = bucket.file(legacy.sourcePath);
        const destination = bucket.file(destinationPath);
        const [sourceExists] = await source.exists();
        if (!sourceExists) {
          summary.skipped += 1;
          process.stdout.write(`skip ${row.character_id}: source missing ${legacy.sourcePath}\n`);
          continue;
        }

        const [destinationExists] = await destination.exists();
        if (!destinationExists) {
          await source.copy(destination);
        }

        const [verified] = await destination.exists();
        if (!verified) {
          throw new Error(`Destination not found after copy: ${destinationPath}`);
        }

        await client.query(
          `
            update characters
            set photo_url = $1, photo_gcs_uri = $1
            where character_id = $2
          `,
          [destinationPath, row.character_id],
        );

        if (options.deleteLegacy && legacy.sourcePath !== destinationPath) {
          await source.delete({ ignoreNotFound: true });
          summary.deletedLegacy += 1;
        }

        summary.migrated += 1;
        process.stdout.write(`migrated ${legacy.sourcePath} -> ${destinationPath}\n`);
      } catch (error) {
        summary.errors += 1;
        process.stderr.write(
          `error ${row.character_id}: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }
    }
  } finally {
    await client.end();
  }

  process.stdout.write(
    `${JSON.stringify({ mode: options.execute ? 'execute' : 'dry-run', summary }, null, 2)}\n`,
  );
  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
