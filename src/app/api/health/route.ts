const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const;

function getMissingRequiredEnvVars() {
  return requiredEnvVars.filter((envVar) => {
    const value = process.env[envVar];
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

export async function GET() {
  const missingEnvVars = getMissingRequiredEnvVars();
  const isHealthy = missingEnvVars.length === 0;

  return new Response(
    JSON.stringify({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'mythoria-webapp',
      timestamp: new Date().toISOString(),
      checks: {
        config: isHealthy ? 'ok' : 'missing_required_env',
      },
      ...(isHealthy ? {} : { missingEnvVars }),
    }),
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}
