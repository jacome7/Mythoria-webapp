// Database configuration for different environments
// This file now uses the centralized database configuration
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseConfig } from '../src/lib/database-config';

export const createDatabaseConnection = () => {
  const config = getDatabaseConfig();
  
  const connectionString = config.connectionString || 
    `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  
  const client = postgres(connectionString, {
    ssl: config.ssl,
    max: config.maxConnections,
  });
  
  return drizzle(client);
};

// Re-export the centralized config for backward compatibility
export { getDatabaseConfig as getDatabaseConfig } from '../src/lib/database-config';
export default getDatabaseConfig;
