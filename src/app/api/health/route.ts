import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { sql } from "drizzle-orm";
import { isVpcDirectEgress } from "@/lib/database-config";
import { GoogleGenAI } from "@google/genai";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debug =
    searchParams.get("debug") === "true" || searchParams.get("debug") === "1";

  try {
    console.log("Health check starting...");
    
    // Test basic database connectivity
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("Database connection test successful:", result);    // Test Gen AI provider
    let genaiStatus: "working" | "failed" = "failed";
    let genaiError: string | null = null;
    
    try {
      console.log("Testing Gen AI provider...");
      const clientOptions = {
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT_ID || "oceanic-beach-460916-n5",
        location: process.env.GOOGLE_AI_LOCATION || "global",
      };
      
      const ai = new GoogleGenAI(clientOptions);
      
      const req = {
        model: "gemini-2.0-flash",
        contents: [
          {
            role: 'user',
            parts: [{ text: "Hi, are you working?" }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.1,
        },
      };
      
      const result = await ai.models.generateContent(req);
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text && text.length > 0) {
        genaiStatus = "working";
        console.log("Gen AI provider test successful, response preview:", text.substring(0, 100));
      } else {
        genaiError = "Empty response from Gen AI provider";
      }
    } catch (error) {
      genaiError = error instanceof Error ? error.message : "Unknown Gen AI error";
      console.error("Gen AI provider test failed:", genaiError);
    }

    const basicInfo = {
      status: "healthy" as const,
      database: "connected" as const,
      genai: genaiStatus,
      timestamp: new Date().toISOString(),
    };

    if (debug) {
      const connectionType = isVpcDirectEgress()
        ? "VPC Direct Egress"
        : "Public IP";      return NextResponse.json({
        ...basicInfo,
        connectionType,
        environment: process.env.NODE_ENV,
        dbHost: process.env.DB_HOST,
        dbName: process.env.DB_NAME,
        genaiProject: process.env.GOOGLE_CLOUD_PROJECT_ID,
        genaiLocation: process.env.GOOGLE_AI_LOCATION,
        ...(genaiError && { genaiError }),
      });
    }

    return NextResponse.json({
      ...basicInfo,
      ...(genaiError && { genaiError }),
    });
  } catch (error) {
    console.error("Health check failed:", error);

    const basicInfo = {
      status: "unhealthy" as const,
      database: "disconnected" as const,
      timestamp: new Date().toISOString(),
    };

    if (debug) {
      const connectionType = isVpcDirectEgress()
        ? "VPC Direct Egress"
        : "Public IP";      return NextResponse.json(
        {
          ...basicInfo,
          connectionType,
          error: error instanceof Error ? error.message : "Unknown error",
          environment: process.env.NODE_ENV,
          dbHost: process.env.DB_HOST,
          dbName: process.env.DB_NAME,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...basicInfo,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
