import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getDatabaseConfig, getPoolConfig, isVpcDirectEgress } from "@/lib/database-config";

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
const pool = new Pool(getPoolConfig());

// Add connection error handling and monitoring
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== "production") {
    console.log('Database client connected');
  }
    // Log connection method for debugging
  if (isVpcDirectEgress()) {
    console.log('Using VPC Direct Egress connection to Cloud SQL');
  }
});

pool.on('acquire', () => {
  if (process.env.NODE_ENV !== "production") {
    console.log('Database client acquired from pool');
  }
});

pool.on('remove', () => {
  if (process.env.NODE_ENV !== "production") {
    console.log('Database client removed from pool');
  }
});

export const db = drizzle(pool, { schema });
