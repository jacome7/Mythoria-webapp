import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getDatabaseConfig, getPoolConfig, isVpcDirectEgress } from "@/lib/database-config";

// Check if we're in build time
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test';

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function initializeDatabase() {
  if (isBuildTime) {
    // During build time, return a mock database instance
    console.log('Build time detected - skipping database initialization');
    return null;
  }

  if (pool) {
    return dbInstance;
  }

  // Add debug logging for environment variables (remove in production)
  if (process.env.NODE_ENV !== "production") {
    const config = getDatabaseConfig();
    console.log("Database configuration:", {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      nodeEnv: process.env.NODE_ENV,
      hasConnectionString: !!config.connectionString,
    });
  }

  // Create pool with centralized configuration
  pool = new Pool(getPoolConfig());

  // Add connection error handling and monitoring
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
  pool.on('connect', () => {
    // Log connection method for debugging
    if (isVpcDirectEgress()) {
      console.log('Using VPC Direct Egress connection to Cloud SQL');
    }
  });
  pool.on('acquire', () => {
    // Pool client acquired
  });
  pool.on('remove', () => {
    // Pool client removed
  });

  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

// Create a proxy that initializes the database lazily
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    if (isBuildTime) {
      // During build time, return empty functions to prevent execution
      return () => Promise.resolve([]);
    }
    
    const instance = initializeDatabase();
    if (!instance) {
      throw new Error('Database not available during build time');
    }
    
    return instance[prop as keyof typeof instance];
  }
});
