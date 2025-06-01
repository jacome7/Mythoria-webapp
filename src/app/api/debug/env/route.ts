import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    nodeEnv: process.env.NODE_ENV,
    hasVertexAi: typeof require('@google-cloud/vertexai') !== 'undefined',
    envKeys: Object.keys(process.env).filter(key => key.includes('GOOGLE')).sort()
  });
}
