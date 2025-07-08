// Environment configuration management
// Database configuration now uses centralized config
import { getDatabaseConfig } from '../src/lib/database-config';

export const getEnvironmentConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbConfig = getDatabaseConfig();
  
  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    port: parseInt(process.env.PORT || '3000'),
    
    // Use centralized database configuration
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
      modelId: process.env.MODEL_ID || 'gemini-2.5-flash',
      pubsubTopic: process.env.PUBSUB_TOPIC || 'mythoria-story-requests',
    },
    
    storyGeneration: {
      workflowUrl: process.env.STORY_GENERATION_WORKFLOW_URL || 'http://localhost:8080',
    },
    
    admin: {
      apiUrl: process.env.ADMIN_API_URL || 'http://localhost:3001',
      apiKey: process.env.ADMIN_API_KEY || '',
    },
    
    notification: {
      engineUrl: process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:8081',
    },
  };
};

export const validateEnvironmentConfig = () => {
  const config = getEnvironmentConfig();
  const errors = [];
  
  // Required in all environments
  if (!config.auth.nextAuthSecret) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  
  if (!config.database.password) {
    errors.push('DB_PASSWORD is required');
  }
  
  // Validate external service URLs
  if (!config.notification.engineUrl) {
    errors.push('NOTIFICATION_ENGINE_URL is required');
  }
  
  if (!config.storyGeneration.workflowUrl) {
    errors.push('STORY_GENERATION_WORKFLOW_URL is required');
  }
  
  // Required in production
  if (config.isProduction) {
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
