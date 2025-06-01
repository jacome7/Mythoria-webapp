import { NextResponse } from "next/server";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hasVertexAi = typeof require('@google-cloud/vertexai') !== 'undefined';
  
  return NextResponse.json({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    nodeEnv: process.env.NODE_ENV,
    hasVertexAi,
    envKeys: Object.keys(process.env).filter(key => key.includes('GOOGLE')).sort()
  });
}
