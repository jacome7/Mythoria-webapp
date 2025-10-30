// drizzle.config.ts is deprecated in favor of drizzle.config.json for drizzle-kit >=0.18.0
// See drizzle.config.json for configuration.
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Allow switching env files without leaking secrets in the config itself
const inferredEnvFile =
  process.env.DRIZZLE_ENV_FILE ??
  (process.env.DRIZZLE_ENV ? `.env.${process.env.DRIZZLE_ENV}` : '.env.local');
const resolvedEnvPath = path.resolve(inferredEnvFile);

if (fs.existsSync(resolvedEnvPath)) {
  config({ path: resolvedEnvPath });
} else {
  // Fallback to default .env loading when the targeted file does not exist
  config();
}

const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});
