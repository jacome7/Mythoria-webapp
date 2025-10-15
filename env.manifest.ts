// Canonical environment variable manifest for Mythoria
// Each entry describes a variable, its requirement status, and the scopes where it must exist.
// Scopes meaning:
//  - dev: needed for local development (.env.local)
//  - prod: needed in production runtime (Cloud Run deployed container)
//  - build: needed during container build (Docker build args / Next.js build time)
//  - runtime: needed at application runtime inside the container
//  - public: value is exposed to the browser (NEXT_PUBLIC_ prefix enforced)
//  - secret: value must come from a secret store (never committed)
// Optional fields:
//  - default: fallback value acceptable in dev
//  - note: extra context
//  - alias: alternative keys (rare)
//  - source: 'secret-manager' | 'substitution' | 'inline'
//  - deprecated: true if scheduled for removal
//
// Adjust this list when adding/removing env vars; other tooling (parity script, type generation) consumes it.

export type EnvScope = 'dev' | 'prod' | 'build' | 'runtime' | 'public';
export interface EnvVarDescriptor {
  name: string;
  required: boolean; // Required in all listed scopes
  scopes: EnvScope[]; // Where this variable must be present
  secret?: boolean; // Indicates secret handling / should not have literal in .env.production
  public?: boolean; // Convenience flag (derived from scopes includes 'public')
  default?: string; // Dev fallback only
  source?: 'secret-manager' | 'substitution' | 'inline';
  note?: string;
  deprecated?: boolean;
}

// Helper to ensure NEXT_PUBLIC_ prefix alignment
// Removed unused helper (was previously used for prefix alignment)
// function p(name: string): string { return name.startsWith('NEXT_PUBLIC_') ? name : `NEXT_PUBLIC_${name}`; }

export const envManifest: EnvVarDescriptor[] = [
  // Core runtime environment
  {
    name: 'NODE_ENV',
    required: true,
    scopes: ['prod', 'runtime'],
    default: 'development',
    note: 'Framework provided; build scope not enforced.',
  },
  {
    name: 'PORT',
    required: false,
    scopes: ['dev', 'runtime'],
    default: '3000',
    note: 'Optional override for local server port.',
  },
  {
    name: 'NEXT_PHASE',
    required: false,
    scopes: ['build'],
    note: 'Next.js internal phase marker; not user-specified.',
  },

  // Database (primary app DB)
  {
    name: 'DB_HOST',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'DB_PORT',
    required: true,
    scopes: ['prod', 'runtime'],
    default: '5432',
    source: 'substitution',
  },
  {
    name: 'DB_NAME',
    required: true,
    scopes: ['prod', 'runtime'],
    default: 'mythoria_db',
    source: 'substitution',
  },
  {
    name: 'DB_USER',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'DB_PASSWORD',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'DB_MAX_CONNECTIONS',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: '20',
    note: 'Tunable; optional override.',
  },
  {
    name: 'DATABASE_URL',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    note: 'Optional single connection string override; mutually exclusive with individual DB_* vars.',
  },
  {
    name: 'DB_SSL_CA',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    note: 'Optional SSL CA for direct DB connection outside Cloud SQL proxy.',
  },
  {
    name: 'DB_SSL_KEY',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    note: 'Optional SSL key.',
  },
  {
    name: 'DB_SSL_CERT',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    note: 'Optional SSL certificate.',
  },

  // Workflows / story generation
  {
    name: 'STORY_GENERATION_WORKFLOW_URL',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'http://localhost:8080',
    source: 'substitution',
    note: 'Used at runtime; build scope not strictly enforced.',
  },
  {
    name: 'STORY_GENERATION_WORKFLOW_API_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'WORKFLOWS_DB_NAME',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'workflows_db',
    note: 'Auxiliary database name for workflows system.',
  },

  // Admin API integration
  {
    name: 'ADMIN_API_URL',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'http://localhost:3001',
    source: 'substitution',
  },
  {
    name: 'ADMIN_API_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },

  // Notification engine
  {
    name: 'NOTIFICATION_ENGINE_URL',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'http://localhost:8081',
    source: 'substitution',
  },
  {
    name: 'NOTIFICATION_ENGINE_API_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },

  // Google Cloud / AI
  {
    name: 'GOOGLE_CLOUD_PROJECT_ID',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'oceanic-beach-460916-n5',
    source: 'substitution',
  },
  {
    name: 'GOOGLE_CLOUD_LOCATION',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'europe-west9',
    source: 'substitution',
  },
  {
    name: 'MODEL_ID',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'gemini-2.5-flash',
    source: 'substitution',
    note: 'Primary model id for AI interactions.',
  },
  {
    name: 'PUBSUB_TOPIC',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'mythoria-story-requests',
    source: 'substitution',
  },
  {
    name: 'PUBSUB_AUDIOBOOK_TOPIC',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'mythoria-audiobook-requests',
    note: 'Secondary topic for audiobook generation.',
  },
  {
    name: 'STORAGE_BUCKET_NAME',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'mythoria-generated-stories',
    source: 'substitution',
  },

  // Authentication (Clerk / NextAuth)
  {
    name: 'CLERK_SECRET_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'CLERK_WEBHOOK_SECRET',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: false,
    scopes: ['prod', 'runtime'],
    secret: true,
    note: 'Only required if NextAuth features in use.',
  },
  {
    name: 'NEXTAUTH_URL',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'http://localhost:3000',
    note: 'Base URL for NextAuth callbacks.',
  },

  // Payments (Revolut)
  {
    name: 'REVOLUT_API_URL',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'https://sandbox-merchant.revolut.com',
    note: 'Falls back internally based on NODE_ENV.',
  },
  {
    name: 'REVOLUT_API_PUBLIC_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'REVOLUT_API_SECRET_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },
  {
    name: 'REVOLUT_WEBHOOK_SECRET',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },

  // Admin internal tokens
  {
    name: 'ADMIN_API_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
  },

  // Public web configuration (browser-exposed)
  {
    name: 'NEXT_PUBLIC_BASE_URL',
    required: false,
    scopes: ['prod', 'build', 'dev', 'public'],
    default: 'https://mythoria.com',
    note: 'Used for metadata generation; may differ per locale.',
  },
  {
    name: 'NEXT_PUBLIC_SUPPORTED_LOCALES',
    required: false,
    scopes: ['prod', 'build', 'dev', 'public'],
    default: 'en,pt,es,fr,de',
    note: 'Comma-separated list; default falls back to internal constant.',
  },
  {
    name: 'NEXT_PUBLIC_GA_MEASUREMENT_ID',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'secret-manager',
    note: 'Analytics instrumentation id.',
  },
  {
    name: 'NEXT_PUBLIC_GOOGLE_ADS_ID',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_GOOGLE_TAG_ID',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'secret-manager',
  },
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_CLERK_IS_DEVELOPMENT',
    required: false,
    scopes: ['prod', 'build', 'public'],
    default: 'false',
    source: 'substitution',
  },
  {
    name: 'NEXT_PUBLIC_GA_DEBUG',
    required: false,
    scopes: ['dev', 'build', 'public'],
    default: 'false',
    note: 'Enable GA debug in dev builds.',
  },
  {
    name: 'NEXT_PUBLIC_REVOLUT_API_PUBLIC_KEY',
    required: true,
    scopes: ['prod', 'build', 'public'],
    source: 'secret-manager',
    note: 'Mirrors REVOLUT_API_PUBLIC_KEY for client usage.',
  },
  {
    name: 'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL',
    required: false,
    scopes: ['prod', 'build', 'public'],
    note: 'If using specific conversion events.',
  },
  // Feature flags & optional public toggles
  {
    name: 'NEXT_PUBLIC_SHOW_SOON_PAGE',
    required: false,
    scopes: ['prod', 'build', 'public', 'dev'],
    default: 'false',
    note: 'Feature flag to show coming soon page.',
  },

  // Non-public Clerk URLs used at runtime (not exposed publicly without prefix)
  {
    name: 'CLERK_SIGN_IN_URL',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
    note: 'Internal redirect path',
  },
  {
    name: 'CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
    required: false,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
    note: 'Not currently injected at runtime; set if custom fallback needed.',
  },
  {
    name: 'CLERK_SIGN_UP_URL',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
  },
  {
    name: 'CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
  },
  {
    name: 'CLERK_SIGN_UP_FORCE_REDIRECT_URL',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
  },

  // Potential AI provider keys (not currently referenced in code but reserved)
  {
    name: 'OPEN_AI_API_KEY',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    secret: true,
    note: 'Reserved for future OpenAI integration.',
  },
  {
    name: 'CLAUDE_API_KEY',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    secret: true,
    note: 'Reserved for future Claude integration.',
  },

  // Internal diagnostics
  {
    name: 'npm_package_version',
    required: false,
    scopes: ['build', 'runtime'],
    note: 'Injected automatically by npm scripts.',
  },
];

export function manifestByName() {
  const map: Record<string, EnvVarDescriptor> = {};
  for (const v of envManifest) map[v.name] = v;
  return map;
}
