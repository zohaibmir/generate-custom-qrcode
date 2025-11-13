import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import config from './config/config';
import DatabaseConfig from './config/database';
import RedisConfig from './config/redis';
import { SSOProviderService } from './services/sso-provider.service';
import { SSOService } from './services/sso.service';
import { SSOProviderController } from './controllers/sso-provider.controller';
import ssoRoutes from './routes/sso.routes';
import authRoutes from './routes/auth.routes';
import providerRoutes from './routes/provider.routes';

export class SSOApp {
  public app: express.Application;
  private providerService!: SSOProviderService;
  private ssoService!: SSOService;
  private providerController!: SSOProviderController;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.security.cors.origin,
      credentials: config.security.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.max,
      message: {
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Session configuration
    this.app.use(session({
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: config.session.maxAge,
      },
    }));

    // Passport middleware
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  private initializeServices(): void {
    const pool = DatabaseConfig.getPool();
    this.providerService = new SSOProviderService(pool);
    this.ssoService = new SSOService(pool);
    this.providerController = new SSOProviderController(this.providerService, this.ssoService);
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'sso-service',
      });
    });

    // API routes
    this.app.use('/api/v1/sso', ssoRoutes);
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/providers', providerRoutes(this.providerController));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'QR SaaS SSO Service',
        version: '1.0.0',
        endpoints: [
          '/health',
          '/api/v1/sso',
          '/api/v1/auth',
          '/api/v1/providers',
        ],
      });
    });

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        title: 'QR SaaS SSO Service API',
        version: '1.0.0',
        description: 'Enterprise SSO integration service supporting SAML, OAuth2, OIDC, and LDAP',
        endpoints: {
          providers: {
            'GET /api/v1/providers/organizations/:organizationId': 'Get all SSO providers',
            'GET /api/v1/providers/organizations/:organizationId/enabled': 'Get enabled providers',
            'GET /api/v1/providers/:id': 'Get specific provider',
            'POST /api/v1/providers/organizations/:organizationId': 'Create provider',
            'PUT /api/v1/providers/:id': 'Update provider',
            'DELETE /api/v1/providers/:id': 'Delete provider',
            'POST /api/v1/providers/:id/test': 'Test provider',
            'POST /api/v1/providers/:id/enable': 'Enable provider',
            'POST /api/v1/providers/:id/disable': 'Disable provider',
            'GET /api/v1/providers/types': 'Get supported types',
            'GET /api/v1/providers/templates/:type': 'Get provider template',
          },
          authentication: {
            'POST /api/v1/auth/initiate': 'Initiate SSO authentication',
            'POST /api/v1/auth/callback': 'Handle SSO callback',
            'POST /api/v1/auth/ldap': 'LDAP authentication',
            'GET /api/v1/auth/providers/:organizationId': 'Get available providers',
          },
          sso: {
            'GET /api/v1/sso/identities/:userId': 'Get user identities',
            'POST /api/v1/sso/identities/link': 'Link user identity',
            'DELETE /api/v1/sso/identities/:userId/:providerId': 'Unlink identity',
            'POST /api/v1/sso/identities/:userId/:providerId/activate': 'Activate identity',
            'POST /api/v1/sso/identities/:userId/:providerId/deactivate': 'Deactivate identity',
          },
        },
        authentication: {
          type: 'JWT Bearer Token',
          header: 'Authorization: Bearer <token>',
          description: 'Include JWT token in Authorization header for authenticated endpoints',
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler:', error);

      // Don't log stack traces for 4xx errors
      if (error.status && error.status >= 400 && error.status < 500) {
        console.log(`Client error ${error.status}: ${error.message}`);
      } else {
        console.error('Server error:', error.stack);
      }

      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';

      res.status(status).json({
        error: status >= 500 ? 'Internal Server Error' : message,
        message: process.env.NODE_ENV === 'development' ? message : undefined,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || undefined,
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      const pool = DatabaseConfig.getPool();
      await pool.query('SELECT NOW()');
      console.log('✅ Database connection established');

      // Test Redis connection
      const redis = await RedisConfig.getClient();
      await redis.ping();
      console.log('✅ Redis connection established');

      // Start server
      const port = config.port;
      this.app.listen(port, config.host, () => {
        console.log(`🚀 SSO Service running on http://${config.host}:${port}`);
        console.log(`📚 API Documentation: http://${config.host}:${port}/api/docs`);
        console.log(`🏥 Health Check: http://${config.host}:${port}/health`);
      });

    } catch (error) {
      console.error('❌ Failed to start SSO service:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await DatabaseConfig.closePool();
      await RedisConfig.closeClient();
      console.log('✅ SSO Service stopped gracefully');
    } catch (error) {
      console.error('❌ Error stopping SSO service:', error);
    }
  }
}

export default SSOApp;