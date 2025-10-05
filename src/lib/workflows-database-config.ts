// Workflows database configuration utility
// This provides connection to the workflows database from mythoria-webapp

import { getDatabaseConfig } from './database-config';

export interface WorkflowsDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  maxConnections: number;
  connectionString?: string;
}

/**
 * Gets the workflows database configuration
 * Uses the same credentials as main database but different database name
 */
export function getWorkflowsDatabaseConfig(): WorkflowsDatabaseConfig {
  const mainDbConfig = getDatabaseConfig();

  const config: WorkflowsDatabaseConfig = {
    host: mainDbConfig.host,
    port: mainDbConfig.port,
    database: process.env.WORKFLOWS_DB_NAME || 'workflows_db',
    user: mainDbConfig.user,
    password: mainDbConfig.password,
    ssl: mainDbConfig.ssl,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  };

  // Build connection string for workflows database
  const sslParam = config.ssl
    ? typeof config.ssl === 'object'
      ? '&sslmode=require'
      : '&ssl=true'
    : '';
  config.connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}?${sslParam}`;

  return config;
}
