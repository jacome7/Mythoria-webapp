const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const;

function getMissingRequiredEnvVars() {
  return requiredEnvVars.filter((envVar) => {
    const value = process.env[envVar];
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

export async function GET(request: Request) {
  const missingEnvVars = getMissingRequiredEnvVars();
  const isHealthy = missingEnvVars.length === 0;
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true' || searchParams.get('debug') === '1';

  return new Response(
    JSON.stringify({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'mythoria-webapp',
      timestamp: new Date().toISOString(),
      checks: {
        config: isHealthy ? 'ok' : 'missing_required_env',
      },
      ...(!isHealthy && debug ? { missingEnvVars } : {}),
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
