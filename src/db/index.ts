import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === "production" 
    ? {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA, // Path to server-ca.pem
        key: process.env.DB_SSL_KEY, // Path to client-key.pem
        cert: process.env.DB_SSL_CERT, // Path to client-cert.pem
      }
    : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
