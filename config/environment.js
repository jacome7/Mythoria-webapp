// Environment configuration management
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
  };
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    port: parseInt(process.env.PORT || '3000'),
    
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME || 'mythoria_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: nodeEnv === 'production',
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
    },
  };
};

export const validateEnvironmentConfig = (): void => {
  const config = getEnvironmentConfig();
  const errors: string[] = [];
  
  // Required in all environments
  if (!config.auth.nextAuthSecret) {
    errors.push('NEXTAUTH_SECRET is required');
  }
  
  if (!config.database.password) {
    errors.push('DB_PASSWORD is required');
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
