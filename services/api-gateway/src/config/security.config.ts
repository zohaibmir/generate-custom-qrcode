import dotenv from 'dotenv';

dotenv.config();

export interface SecurityConfig {
  // IP Whitelisting Configuration
  ipWhitelisting: {
    enabled: boolean;
    allowedIPs: string[];
    allowPrivateNetworks: boolean;
    allowLocalhost: boolean;
    allowedCountries: string[];
    blockedCountries: string[];
    bypassRoutes: string[];
  };

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    perUserLimits: {
      free: number;
      pro: number;
      business: number;
      enterprise: number;
    };
    perIPLimits: {
      authenticated: number;
      anonymous: number;
    };
  };

  // Audit Logging Configuration
  auditLogging: {
    enabled: boolean;
    logRequests: boolean;
    logResponses: boolean;
    logHeaders: boolean;
    logBody: boolean;
    sensitiveFields: string[];
    excludeRoutes: string[];
    maxBodySize: number;
    retention: {
      enabled: boolean;
      days: number;
    };
  };

  // DDoS Protection
  ddosProtection: {
    enabled: boolean;
    thresholdPerMinute: number;
    blockDurationMinutes: number;
    whitelist: string[];
  };

  // Geolocation Blocking
  geoBlocking: {
    enabled: boolean;
    allowedCountries: string[];
    blockedCountries: string[];
    fallbackAction: 'allow' | 'block';
  };

  // Bot Detection
  botDetection: {
    enabled: boolean;
    strictMode: boolean;
    challengeEnabled: boolean;
    suspiciousUserAgents: string[];
    trustedBots: string[];
  };

  // CORS Security
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
    optionsSuccessStatus: number;
    maxAge: number;
  };

  // Headers Security
  headers: {
    enabled: boolean;
    hsts: boolean;
    contentSecurityPolicy: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
  };
}

export const securityConfig: SecurityConfig = {
  // IP Whitelisting Configuration
  ipWhitelisting: {
    enabled: process.env.GATEWAY_IP_WHITELIST_ENABLED === 'true',
    allowedIPs: (process.env.GATEWAY_ALLOWED_IPS || '').split(',').filter(ip => ip.trim()),
    allowPrivateNetworks: process.env.GATEWAY_ALLOW_PRIVATE_NETWORKS !== 'false',
    allowLocalhost: process.env.GATEWAY_ALLOW_LOCALHOST !== 'false',
    allowedCountries: (process.env.GATEWAY_ALLOWED_COUNTRIES || '').split(',').filter(c => c.trim()),
    blockedCountries: (process.env.GATEWAY_BLOCKED_COUNTRIES || '').split(',').filter(c => c.trim()),
    bypassRoutes: [
      '/health',
      '/api-docs',
      '/favicon.ico',
      ...(process.env.GATEWAY_IP_BYPASS_ROUTES || '').split(',').filter(r => r.trim())
    ]
  },

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: process.env.GATEWAY_RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.GATEWAY_RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.GATEWAY_RATE_LIMIT_MAX || '1000', 10),
    skipSuccessfulRequests: process.env.GATEWAY_RATE_LIMIT_SKIP_SUCCESS === 'true',
    skipFailedRequests: process.env.GATEWAY_RATE_LIMIT_SKIP_FAILED === 'true',
    perUserLimits: {
      free: parseInt(process.env.GATEWAY_RATE_LIMIT_FREE || '100', 10),
      pro: parseInt(process.env.GATEWAY_RATE_LIMIT_PRO || '500', 10),
      business: parseInt(process.env.GATEWAY_RATE_LIMIT_BUSINESS || '2000', 10),
      enterprise: parseInt(process.env.GATEWAY_RATE_LIMIT_ENTERPRISE || '10000', 10)
    },
    perIPLimits: {
      authenticated: parseInt(process.env.GATEWAY_RATE_LIMIT_AUTH_IP || '2000', 10),
      anonymous: parseInt(process.env.GATEWAY_RATE_LIMIT_ANON_IP || '200', 10)
    }
  },

  // Audit Logging Configuration
  auditLogging: {
    enabled: process.env.GATEWAY_AUDIT_ENABLED !== 'false',
    logRequests: process.env.GATEWAY_AUDIT_LOG_REQUESTS !== 'false',
    logResponses: process.env.GATEWAY_AUDIT_LOG_RESPONSES === 'true',
    logHeaders: process.env.GATEWAY_AUDIT_LOG_HEADERS === 'true',
    logBody: process.env.GATEWAY_AUDIT_LOG_BODY === 'true',
    sensitiveFields: [
      'password',
      'token',
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      ...(process.env.GATEWAY_AUDIT_SENSITIVE_FIELDS || '').split(',').filter(f => f.trim())
    ],
    excludeRoutes: [
      '/health',
      '/favicon.ico',
      '/api-docs',
      ...(process.env.GATEWAY_AUDIT_EXCLUDE_ROUTES || '').split(',').filter(r => r.trim())
    ],
    maxBodySize: parseInt(process.env.GATEWAY_AUDIT_MAX_BODY_SIZE || '1048576', 10), // 1MB
    retention: {
      enabled: process.env.GATEWAY_AUDIT_RETENTION_ENABLED === 'true',
      days: parseInt(process.env.GATEWAY_AUDIT_RETENTION_DAYS || '90', 10)
    }
  },

  // DDoS Protection
  ddosProtection: {
    enabled: process.env.GATEWAY_DDOS_ENABLED === 'true',
    thresholdPerMinute: parseInt(process.env.GATEWAY_DDOS_THRESHOLD || '100', 10),
    blockDurationMinutes: parseInt(process.env.GATEWAY_DDOS_BLOCK_DURATION || '60', 10),
    whitelist: (process.env.GATEWAY_DDOS_WHITELIST || '').split(',').filter(ip => ip.trim())
  },

  // Geolocation Blocking
  geoBlocking: {
    enabled: process.env.GATEWAY_GEO_BLOCKING_ENABLED === 'true',
    allowedCountries: (process.env.GATEWAY_GEO_ALLOWED_COUNTRIES || '').split(',').filter(c => c.trim()),
    blockedCountries: (process.env.GATEWAY_GEO_BLOCKED_COUNTRIES || '').split(',').filter(c => c.trim()),
    fallbackAction: (process.env.GATEWAY_GEO_FALLBACK_ACTION as 'allow' | 'block') || 'allow'
  },

  // Bot Detection
  botDetection: {
    enabled: process.env.GATEWAY_BOT_DETECTION_ENABLED === 'true',
    strictMode: process.env.GATEWAY_BOT_STRICT_MODE === 'true',
    challengeEnabled: process.env.GATEWAY_BOT_CHALLENGE_ENABLED === 'true',
    suspiciousUserAgents: [
      'curl',
      'wget',
      'python-requests',
      'postman',
      ...(process.env.GATEWAY_BOT_SUSPICIOUS_UA || '').split(',').filter(ua => ua.trim())
    ],
    trustedBots: [
      'googlebot',
      'bingbot',
      'slackbot',
      'facebookexternalhit',
      ...(process.env.GATEWAY_BOT_TRUSTED_UA || '').split(',').filter(ua => ua.trim())
    ]
  },

  // CORS Security
  cors: {
    enabled: process.env.GATEWAY_CORS_ENABLED !== 'false',
    origins: (process.env.GATEWAY_CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173').split(','),
    credentials: process.env.GATEWAY_CORS_CREDENTIALS !== 'false',
    optionsSuccessStatus: parseInt(process.env.GATEWAY_CORS_OPTIONS_STATUS || '200', 10),
    maxAge: parseInt(process.env.GATEWAY_CORS_MAX_AGE || '86400', 10) // 24 hours
  },

  // Headers Security
  headers: {
    enabled: process.env.GATEWAY_HEADERS_SECURITY_ENABLED !== 'false',
    hsts: process.env.GATEWAY_HEADERS_HSTS !== 'false',
    contentSecurityPolicy: process.env.GATEWAY_HEADERS_CSP !== 'false',
    xFrameOptions: process.env.GATEWAY_HEADERS_X_FRAME !== 'false',
    xContentTypeOptions: process.env.GATEWAY_HEADERS_X_CONTENT_TYPE !== 'false',
    referrerPolicy: process.env.GATEWAY_HEADERS_REFERRER !== 'false',
    crossOriginEmbedderPolicy: process.env.GATEWAY_HEADERS_COEP === 'true'
  }
};

// Export individual configurations for easy access
export const {
  ipWhitelisting,
  rateLimiting,
  auditLogging,
  ddosProtection,
  geoBlocking,
  botDetection,
  cors,
  headers
} = securityConfig;

export default securityConfig;