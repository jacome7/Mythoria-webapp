// Database configuration for different environments
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mythoria_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  };

  // Validate required configuration
  if (!config.password) {
    throw new Error('Database password is required');
  }

  return config;
};

export const createDatabaseConnection = () => {
  const config = getDatabaseConfig();
  
  const connectionString = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  
  const client = postgres(connectionString, {
    ssl: config.ssl,
    max: config.maxConnections,
  });
  
  return drizzle(client);
};

export default getDatabaseConfig;
