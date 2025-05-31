import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { getDatabaseConfig } from "./src/lib/database-config";

// Load environment variables from .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: (() => {
    const dbConfig = getDatabaseConfig();
    return {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      ssl: typeof dbConfig.ssl === 'object' ? dbConfig.ssl : dbConfig.ssl ? { rejectUnauthorized: false } : false,
    };
  })(),
});
