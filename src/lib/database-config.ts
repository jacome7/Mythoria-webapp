// Centralized database configuration utility
// This eliminates duplication across multiple config files

export interface DatabaseConfig {
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
 * Determines if we're using VPC Direct Egress (private IP connection)
 * This centralizes the VPC detection logic used across the application
 */
export function isVpcDirectEgress(): boolean {
  return process.env.DB_HOST === "10.19.192.3" || (process.env.DB_HOST?.startsWith("10.") ?? false);
}

/**
 * Gets the centralized database configuration
 * This replaces the duplicate logic in index.ts, database.js, environment.js, and drizzle.config.ts
 */
export function getDatabaseConfig(): DatabaseConfig {
  const isVpcConnection = isVpcDirectEgress();
  const isProduction = process.env.NODE_ENV === "production";
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  // During build time, provide default values to prevent build failures
  if (isBuildTime) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'mythoria_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'build-time-placeholder',
      ssl: false,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    };
  }
  
  // Validate required environment variables for runtime
  if (!process.env.DB_PASSWORD) {
    throw new Error('Database password is required');
  }

  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mythoria_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    // For VPC Direct Egress, SSL is not required since traffic stays within VPC
    // For public connections in production, we need SSL
    ssl: isProduction && !isVpcConnection ? { rejectUnauthorized: false } : false,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  };

  // Build connection string if needed
  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
  }

  return config;
}

/**
 * Gets pool configuration for node-postgres
 */
export function getPoolConfig() {
  const config = getDatabaseConfig();
  const isVpcConnection = isVpcDirectEgress();
  
  const poolConfig = config.connectionString ? {
    connectionString: config.connectionString,
    ssl: config.ssl,
  } : {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl,
  };

  return {
    ...poolConfig,
    max: config.maxConnections,
    idleTimeoutMillis: 30000,
    // Faster timeout for VPC connections
    connectionTimeoutMillis: isVpcConnection ? 5000 : 10000,
  };
}
