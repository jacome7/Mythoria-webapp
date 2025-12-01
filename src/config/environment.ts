// Server-only environment configuration.
// IMPORTANT: Do not re-export anything from this file in client bundles.
// Keep imports of this file inside server code (API routes, server components, lib, scripts).

import { getDatabaseConfig } from '@/lib/database-config';

export interface EnvironmentConfig {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  auth: {
    clerkSecretKey: string;
    clerkPublishableKey: string;
    nextAuthSecret: string;
    nextAuthUrl: string;
  };
  app: {
    name: string;
    version: string;
    url: string;
  };
  googleCloud: {
    projectId: string;
    location: string;
    pubsubTopic: string;
  };
  storyGeneration: {
    workflowUrl: string;
    apiKey: string;
  };
  admin: {
    apiUrl: string;
    apiKey: string;
  };
  notification: {
    engineUrl: string;
    apiKey: string;
  };
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbConfig = getDatabaseConfig();

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    port: parseInt(process.env.PORT || '3000'),
    database: {
      host: dbConfig.host,
      port: dbConfig.port,
      name: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: !!dbConfig.ssl,
    },
    auth: {
      clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
      nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
      nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    },
    app: {
      name: 'Mythoria',
      version: process.env.npm_package_version || '0.1.0',
      url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    },
    googleCloud: {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'oceanic-beach-460916-n5',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'europe-west9',
      pubsubTopic: process.env.PUBSUB_TOPIC || 'mythoria-story-requests',
    },
    storyGeneration: {
      workflowUrl: process.env.STORY_GENERATION_WORKFLOW_URL || 'http://localhost:8080',
      apiKey: process.env.STORY_GENERATION_WORKFLOW_API_KEY || '',
    },
    admin: {
      apiUrl: process.env.ADMIN_API_URL || 'http://localhost:3001',
      apiKey: process.env.ADMIN_API_KEY || '',
    },
    notification: {
      engineUrl: process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:8081',
      apiKey: process.env.NOTIFICATION_ENGINE_API_KEY || '',
    },
  };
};

export const validateEnvironmentConfig = (): void => {
  const config = getEnvironmentConfig();
  const errors: string[] = [];

  if (!config.auth.nextAuthSecret) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  if (!config.database.password) {
    errors.push('DB_PASSWORD is required');
  }
  if (!config.notification.engineUrl) {
    errors.push('NOTIFICATION_ENGINE_URL is required');
  }
  if (!config.storyGeneration.workflowUrl) {
    errors.push('STORY_GENERATION_WORKFLOW_URL is required');
  }
  if (!config.admin.apiUrl) {
    errors.push('ADMIN_API_URL is required');
  }
  if (config.isProduction) {
    if (!config.admin.apiKey) {
      errors.push('ADMIN_API_KEY is required in production');
    }
    if (config.admin.apiUrl.includes('localhost')) {
      errors.push('ADMIN_API_URL cannot point to localhost in production');
    }
    if (!config.notification.apiKey) {
      errors.push('NOTIFICATION_ENGINE_API_KEY is required in production');
    }
    if (!config.auth.clerkSecretKey) {
      errors.push('CLERK_SECRET_KEY is required in production');
    }
    if (!config.auth.clerkPublishableKey) {
      errors.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
  }
};

export default getEnvironmentConfig;
