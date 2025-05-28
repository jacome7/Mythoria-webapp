import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Add debug logging for environment variables (remove in production)
if (process.env.NODE_ENV !== "production") {
  console.log("Database configuration:", {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    nodeEnv: process.env.NODE_ENV,
    hasConnectionString: !!process.env.DATABASE_URL,
  });
}

// Determine if we're using VPC Direct Egress (private IP connection)
const isVpcDirectEgress = process.env.DB_HOST === "10.19.192.3" || process.env.DB_HOST?.startsWith("10.");

// Create pool with optimized configuration for Google Cloud SQL with VPC Direct Egress
const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" && !isVpcDirectEgress ? { rejectUnauthorized: false } : false,
} : {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // For VPC Direct Egress, SSL is not required since traffic stays within VPC
  // For public connections, we still need SSL
  ssl: process.env.NODE_ENV === "production" && !isVpcDirectEgress ? { rejectUnauthorized: false } : false,
};

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isVpcDirectEgress ? 5000 : 10000, // Faster timeout for VPC connections
});

// Add connection error handling and monitoring
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== "production") {
    console.log('Database client connected');
  }
  
  // Log connection method for debugging
  if (isVpcDirectEgress) {
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
