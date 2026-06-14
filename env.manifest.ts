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
    name: 'SGW_WEBHOOK_SECRET',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
    note: 'Shared secret to validate SGW text-edit webhooks (uses STORY_GENERATION_WORKFLOW_API_KEY secret).',
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
  {
    name: 'PUBLIC_STORAGE_BUCKET_NAME',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'mythoria-public',
    source: 'substitution',
    note: 'Public bucket for partner logos and other public assets.',
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
    name: 'CLERK_OAUTH_CLIENT_ID',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    source: 'substitution',
    note: 'Client ID for Clerk OAuth application used by ChatGPT App OAuth setup.',
  },
  {
    name: 'CLERK_OAUTH_CLIENT_SECRET',
    required: true,
    scopes: ['prod', 'runtime', 'dev'],
    secret: true,
    source: 'secret-manager',
    note: 'Client secret for Clerk OAuth application used by ChatGPT App OAuth setup.',
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

  // Payments (Stripe)
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
    note: 'Stripe secret key for server-side Checkout Sessions and webhook follow-up calls.',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
    note: 'Stripe webhook signing secret for /api/payments/stripe/webhook.',
  },
  {
    name: 'STRIPE_API_VERSION',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    source: 'substitution',
    note: 'Optional Stripe API version override. Leave unset to use the installed stripe SDK default.',
  },
  {
    name: 'STRIPE_CREDIT_TAX_CODE',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    source: 'substitution',
    note: 'Optional Stripe Tax product tax code for Mythoria credit line items. If unset, Stripe Tax uses the dashboard default product tax code.',
  },

  // Fiscal invoicing (KeyInvoice)
  {
    name: 'KEYINVOICE_ENABLED',
    required: true,
    scopes: ['prod', 'runtime'],
    default: 'false',
    source: 'substitution',
    note: 'Enables automatic KeyInvoice fiscal document issuing after completed Stripe payments.',
  },
  {
    name: 'KEYINVOICE_API_URL',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'https://login.keyinvoice.com/API5.php',
    source: 'substitution',
    note: 'KeyInvoice API5 endpoint.',
  },
  {
    name: 'KEYINVOICE_API_KEY',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
    note: 'Production KeyInvoice API key used for fiscal document creation.',
  },
  {
    name: 'KEYINVOICE_DRAFT_ONLY',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'false',
    source: 'substitution',
    note: 'When true, records the intended KeyInvoice document payload locally and does not call insertDocument. Use for ngrok/local test payments.',
  },
  {
    name: 'KEYINVOICE_DOC_TYPE',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: '34',
    source: 'substitution',
    note: 'KeyInvoice fiscal document type. 34 is Fatura-Recibo.',
  },
  {
    name: 'KEYINVOICE_DOC_SERIES_ID',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    source: 'substitution',
    note: 'Optional KeyInvoice document series id for Fatura-Recibo issuing.',
  },
  {
    name: 'KEYINVOICE_PAYMENT_METHOD_ID_STRIPE',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
    note: 'KeyInvoice payment method id representing Stripe-paid orders.',
  },
  {
    name: 'KEYINVOICE_TAX_ID_BY_RATE_JSON',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
    note: 'JSON object mapping VAT rates to KeyInvoice tax ids, for example {"6":"1","23":"2"}.',
  },
  {
    name: 'KEYINVOICE_FALLBACK_TAX_ID',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
    note: 'KeyInvoice tax id used as the requested 6% fallback when Stripe tax result is unmapped.',
  },
  {
    name: 'KEYINVOICE_PRODUCT_IDS_BY_PACKAGE_KEY_JSON',
    required: true,
    scopes: ['prod', 'runtime'],
    source: 'substitution',
    note: 'JSON object mapping Mythoria credit package keys to KeyInvoice product ids.',
  },
  {
    name: 'KEYINVOICE_REGISTER_AT',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    default: 'false',
    source: 'substitution',
    note: 'Feature flag for calling KeyInvoice registerInvoiceAT after document creation. Keep false until accounting approves.',
  },
  {
    name: 'REVOLUT_API_URL',
    required: false,
    scopes: ['dev'],
    deprecated: true,
    note: 'Legacy Revolut checkout variable. The webapp no longer reads it after the Stripe-only migration.',
  },
  {
    name: 'REVOLUT_API_PUBLIC_KEY',
    required: false,
    scopes: ['dev'],
    secret: true,
    deprecated: true,
    note: 'Legacy Revolut checkout variable. Remove from local/deployment env after confirming no external service needs it.',
  },
  {
    name: 'REVOLUT_API_SECRET_KEY',
    required: false,
    scopes: ['dev'],
    secret: true,
    deprecated: true,
    note: 'Legacy Revolut checkout variable. Remove from local/deployment env after confirming no external service needs it.',
  },
  {
    name: 'REVOLUT_WEBHOOK_SECRET',
    required: false,
    scopes: ['dev'],
    secret: true,
    deprecated: true,
    note: 'Legacy Revolut checkout variable. Remove from local/deployment env after confirming no external service needs it.',
  },
  {
    name: 'NEXT_PUBLIC_REVOLUT_API_PUBLIC_KEY',
    required: false,
    scopes: ['dev', 'public'],
    deprecated: true,
    note: 'Legacy public Revolut key. The webapp no longer exposes Revolut Checkout.',
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
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: false,
    scopes: ['prod', 'build', 'dev', 'public'],
    source: 'secret-manager',
    note: 'Public Stripe publishable key. Stored in Secret Manager for deployment parity; Hosted Checkout v1 does not require client-side use.',
  },
  {
    name: 'GOOGLE_ANALYTICS_API_SECRET',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
    note: 'Required for server-side Measurement Protocol events.',
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
  {
    name: 'NEXT_PUBLIC_TTS_PROVIDER',
    required: false,
    scopes: ['prod', 'build', 'public', 'dev'],
    default: 'google-genai',
    source: 'substitution',
    note: 'TTS provider for audiobooks: openai or google-genai.',
  },
  {
    name: 'NEXT_PUBLIC_DEFAULT_CURRENCY',
    required: false,
    scopes: ['prod', 'build', 'public', 'dev'],
    default: 'EUR',
    note: 'Public-facing display currency for pricing and MCP tools.',
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    scopes: ['dev'],
    secret: true,
    note: 'Optional local key for repository image/mockup generation scripts; not used by the webapp runtime.',
  },
  {
    name: 'GOOGLE_GENAI_API_KEY',
    required: false,
    scopes: ['dev'],
    secret: true,
    note: 'Optional local key for repository sample-book, voice, and graphic generation scripts; not used by the webapp runtime.',
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
  {
    name: 'MCP_AUTHORIZATION_SERVER_URL',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    note: 'Optional override for MCP OAuth authorization server base URL (issuer).',
  },
  {
    name: 'MCP_RESOURCE_URL',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    note: 'Optional override for MCP OAuth protected resource identifier (defaults to <base-url>/api/mcp).',
  },
  {
    name: 'MCP_WIDGET_DOMAIN',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    note: 'Optional override for MCP widget metadata domain (defaults to NEXT_PUBLIC_BASE_URL origin).',
  },
  {
    name: 'MCP_AUTH_ALLOW_SESSION_TOKEN',
    required: false,
    scopes: ['dev', 'runtime'],
    default: 'false',
    note: 'Dev-only fallback to accept Clerk session_token for MCP while OAuth is being configured.',
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
  {
    name: 'MODEL_ID',
    required: false,
    scopes: ['prod', 'runtime', 'dev'],
    deprecated: true,
    note: 'Legacy model selector retained only for env parity until removed from env files.',
  },

  // Lead Marketing & Bounce API
  {
    name: 'LEAD_BOUNCE_API_SECRET',
    required: true,
    scopes: ['prod', 'runtime'],
    secret: true,
    source: 'secret-manager',
    note: 'Bearer token for bounce API authentication (Google Apps Script).',
  },
  {
    name: 'NEXT_PUBLIC_APP_DOMAIN',
    required: false,
    scopes: ['prod', 'public'],
    default: 'mythoria.pt',
    note: 'Domain for lead session cookies (e.g., .mythoria.pt). Optional in dev.',
  },
  {
    name: 'NEXT_PUBLIC_ASSETS_BASE_URL',
    required: true,
    scopes: ['prod', 'build', 'dev', 'public'],
    default: 'https://storage.googleapis.com/mythoria-public/',
    source: 'substitution',
    note: 'Base URL for public static assets hosted on GCS. Must end with a trailing slash.',
  },

  // Internal diagnostics
  {
    name: 'npm_package_version',
    required: false,
    scopes: ['build', 'runtime'],
    note: 'Injected automatically by npm scripts.',
  },

  // E2E Testing
  {
    name: 'CLERK_E2E_EMAIL',
    required: false,
    scopes: ['dev'],
    note: 'Optional email for Playwright E2E authentication tests.',
  },
  {
    name: 'MCP_E2E_REDIRECT_URI',
    required: false,
    scopes: ['dev'],
    note: 'Optional local OAuth callback URI for scripts/get-mcp-oauth-token.ts (must exist in Clerk OAuth app redirect allowlist).',
  },
  {
    name: 'MCP_E2E_SCOPE',
    required: false,
    scopes: ['dev'],
    note: 'Optional scope override for OAuth token retrieval in local MCP E2E scripts.',
  },
  {
    name: 'MCP_E2E_RESOURCE',
    required: false,
    scopes: ['dev'],
    note: 'Optional OAuth resource parameter override used by scripts/get-mcp-oauth-token.ts.',
  },
  {
    name: 'MCP_E2E_AUTH_TIMEOUT_MS',
    required: false,
    scopes: ['dev'],
    note: 'Optional timeout override (milliseconds) for local OAuth callback wait.',
  },
];

export function manifestByName() {
  const map: Record<string, EnvVarDescriptor> = {};
  for (const v of envManifest) map[v.name] = v;
  return map;
}
