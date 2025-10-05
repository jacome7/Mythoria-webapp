// Server-only database connection helper.
// Keep imports restricted to server contexts (API routes, scripts, server components).

import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseConfig } from '@/lib/database-config';

type PostgresSslOption = boolean | { rejectUnauthorized: boolean };

export const createDatabaseConnection = (): PostgresJsDatabase => {
  const config = getDatabaseConfig();

  const connectionString =
    config.connectionString ||
    `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;

  const ssl: PostgresSslOption = config.ssl;
  const client = postgres(connectionString, { ssl, max: config.maxConnections });
  return drizzle(client);
};

export { getDatabaseConfig } from '@/lib/database-config';
export default getDatabaseConfig;
