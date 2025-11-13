import dotenv from 'dotenv';

dotenv.config();

export interface SSOConfig {
  // Server Configuration
  port: number;
  host: string;
  
  // Database Configuration
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  
  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  // JWT Configuration
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  
  // Session Configuration
  session: {
    secret: string;
    maxAge: number;
  };
  
  // SSO Configuration
  sso: {
    baseUrl: string;
    callbackUrl: string;
    successRedirect: string;
    failureRedirect: string;
    sessionTimeout: number;
    maxConcurrentSessions: number;
  };
  
  // SAML Configuration
  saml: {
    cert?: string;
    privateKey?: string;
    signatureAlgorithm: string;
    digestAlgorithm: string;
  };
  
  // LDAP Configuration
  ldap: {
    timeout: number;
    connectTimeout: number;
    idleTimeout: number;
    reconnect: boolean;
  };
  
  // Security Configuration
  security: {
    rateLimit: {
      windowMs: number;
      max: number;
    };
    cors: {
      origin: string[];
      credentials: boolean;
    };
    encryption: {
      algorithm: string;
      secretKey: string;
      iv: string;
    };
  };
  
  // Logging Configuration
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
    filename?: string;
    maxsize: number;
    maxFiles: number;
  };
}

const config: SSOConfig = {
  port: parseInt(process.env.SSO_PORT || '3015'),
  host: process.env.SSO_HOST || '0.0.0.0',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'qr_saas_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_SSO_DB || '3'),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'sso_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'sso_refresh_secret_key_change_in_production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'sso_session_secret_change_in_production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
  },
  
  sso: {
    baseUrl: process.env.SSO_BASE_URL || 'http://localhost:3015',
    callbackUrl: process.env.SSO_CALLBACK_URL || 'http://localhost:3000/auth/callback',
    successRedirect: process.env.SSO_SUCCESS_REDIRECT || 'http://localhost:3000/dashboard',
    failureRedirect: process.env.SSO_FAILURE_REDIRECT || 'http://localhost:3000/login?error=sso_failed',
    sessionTimeout: parseInt(process.env.SSO_SESSION_TIMEOUT || '3600'), // 1 hour
    maxConcurrentSessions: parseInt(process.env.SSO_MAX_CONCURRENT_SESSIONS || '5'),
  },
  
  saml: {
    cert: process.env.SAML_CERT,
    privateKey: process.env.SAML_PRIVATE_KEY,
    signatureAlgorithm: process.env.SAML_SIGNATURE_ALGORITHM || 'sha256',
    digestAlgorithm: process.env.SAML_DIGEST_ALGORITHM || 'sha256',
  },
  
  ldap: {
    timeout: parseInt(process.env.LDAP_TIMEOUT || '5000'),
    connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || '10000'),
    idleTimeout: parseInt(process.env.LDAP_IDLE_TIMEOUT || '30000'),
    reconnect: process.env.LDAP_RECONNECT === 'true',
  },
  
  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
      credentials: true,
    },
    encryption: {
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc',
      secretKey: process.env.ENCRYPTION_SECRET_KEY || 'sso_encryption_key_32_chars_long!',
      iv: process.env.ENCRYPTION_IV || '1234567890123456',
    },
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    filename: process.env.LOG_FILENAME || 'logs/sso-service.log',
    maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  },
};

export default config;