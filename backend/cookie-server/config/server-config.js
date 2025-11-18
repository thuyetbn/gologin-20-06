/**
 * Server Configuration
 * Centralized configuration cho cookie server
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const serverConfig = {
  // Server settings
  server: {
    port: process.env.COOKIE_SERVER_PORT || 3001,
    host: process.env.COOKIE_SERVER_HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Database settings
  database: {
    type: process.env.DB_TYPE || 'mysql', // 'mysql' or 'sqlite'

    // MySQL settings
    mysql: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cookie_server',
      charset: 'utf8mb4',
      timezone: '+00:00',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      timeout: parseInt(process.env.DB_TIMEOUT) || 60000
    },

    // SQLite settings (fallback)
    sqlite: {
      path: process.env.COOKIE_DB_PATH || join(__dirname, '..', 'data', 'cookies.db'),
      backupPath: process.env.COOKIE_DB_BACKUP_PATH || join(__dirname, '..', 'data', 'backups'),
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
      busyTimeout: parseInt(process.env.DB_BUSY_TIMEOUT) || 30000
    }
  },

  // Security settings
  security: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
    apiKeyLength: 32,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000 // 24 hours
  },

  // Cookie settings
  cookies: {
    maxCookiesPerRequest: parseInt(process.env.MAX_COOKIES_PER_REQUEST) || 10000,
    maxCookieSize: parseInt(process.env.MAX_COOKIE_SIZE) || 4096,
    maxCookiesPerProfile: parseInt(process.env.MAX_COOKIES_PER_PROFILE) || 100000,
    defaultExpiration: parseInt(process.env.DEFAULT_COOKIE_EXPIRATION) || 365 * 24 * 60 * 60 * 1000 // 1 year
  },

  // Backup settings
  backup: {
    autoBackup: process.env.AUTO_BACKUP === 'true',
    backupInterval: parseInt(process.env.BACKUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
    maxBackups: parseInt(process.env.MAX_BACKUPS) || 30,
    compressionLevel: parseInt(process.env.BACKUP_COMPRESSION) || 6
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || join(__dirname, '..', 'logs', 'server.log'),
    maxSize: process.env.LOG_MAX_SIZE || '10MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    enableConsole: process.env.LOG_CONSOLE !== 'false'
  },

  // Performance settings
  performance: {
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    bodyLimit: process.env.BODY_LIMIT || '10mb',
    compressionThreshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,
    cacheTimeout: parseInt(process.env.CACHE_TIMEOUT) || 5 * 60 * 1000 // 5 minutes
  },

  // Admin settings
  admin: {
    enabled: process.env.ADMIN_ENABLED !== 'false',
    defaultUsername: process.env.ADMIN_USERNAME || 'admin',
    defaultEmail: process.env.ADMIN_EMAIL || 'admin@localhost',
    dashboardPath: '/admin'
  },

  // Integration settings
  integration: {
    gologinApiUrl: process.env.GOLOGIN_API_URL || 'https://api.gologin.com',
    webhookUrl: process.env.WEBHOOK_URL,
    webhookSecret: process.env.WEBHOOK_SECRET,
    enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true'
  }
};

/**
 * Validate configuration
 */
export function validateConfig() {
  const errors = [];

  // Validate required settings
  if (!serverConfig.server.port || isNaN(serverConfig.server.port)) {
    errors.push('Invalid server port');
  }

  if (!serverConfig.database.path) {
    errors.push('Database path is required');
  }

  if (serverConfig.security.allowedOrigins.length === 0) {
    errors.push('At least one allowed origin is required');
  }

  if (serverConfig.cookies.maxCookiesPerRequest <= 0) {
    errors.push('Max cookies per request must be positive');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

/**
 * Get environment-specific config
 */
export function getEnvConfig() {
  const env = serverConfig.server.env;
  
  const envConfigs = {
    development: {
      logging: {
        ...serverConfig.logging,
        level: 'debug',
        enableConsole: true
      },
      security: {
        ...serverConfig.security,
        rateLimitMax: 10000 // Higher limit for development
      }
    },
    
    production: {
      logging: {
        ...serverConfig.logging,
        level: 'warn',
        enableConsole: false
      },
      security: {
        ...serverConfig.security,
        rateLimitMax: 1000 // Stricter limit for production
      }
    },
    
    test: {
      database: {
        ...serverConfig.database,
        path: ':memory:' // In-memory database for tests
      },
      logging: {
        ...serverConfig.logging,
        level: 'error',
        enableConsole: false
      }
    }
  };

  return {
    ...serverConfig,
    ...envConfigs[env]
  };
}

/**
 * Create default admin user config
 */
export function getDefaultAdminConfig() {
  return {
    username: serverConfig.admin.defaultUsername,
    email: serverConfig.admin.defaultEmail,
    isAdmin: true
  };
}

/**
 * Export configuration based on environment
 */
export default getEnvConfig();
