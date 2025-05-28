import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    console.log("Health check starting...");
    
    // Test basic database connectivity
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("Database connection test successful:", result);
    
    // Determine connection type
    const isVpcDirectEgress = process.env.DB_HOST === "10.19.192.3" || process.env.DB_HOST?.startsWith("10.");
    const connectionType = isVpcDirectEgress ? "VPC Direct Egress" : "Public IP";
    
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      connectionType,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      dbHost: process.env.DB_HOST,
      dbPort: process.env.DB_PORT,
      dbName: process.env.DB_NAME,
      dbUser: process.env.DB_USER,
    });  } catch (error) {
    console.error("Health check failed:", error);
    
    // Determine connection type
    const isVpcDirectEgress = process.env.DB_HOST === "10.19.192.3" || process.env.DB_HOST?.startsWith("10.");
    const connectionType = isVpcDirectEgress ? "VPC Direct Egress" : "Public IP";
    
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        connectionType,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        dbHost: process.env.DB_HOST,
        dbPort: process.env.DB_PORT,
        dbName: process.env.DB_NAME,
        dbUser: process.env.DB_USER,
      },
      { status: 500 }
    );
  }
}
