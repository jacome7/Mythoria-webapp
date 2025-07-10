// drizzle.config.ts is deprecated in favor of drizzle.config.json for drizzle-kit >=0.18.0
// See drizzle.config.json for configuration.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql'
});