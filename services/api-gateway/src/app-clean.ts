/**
 * Clean Architecture API Gateway Application
 * Following Dependency Inversion and Clean Architecture principles
 * Integrates the new authentication system
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

// Import Clean Architecture Components
import { Logger } from './services/logger.service';
import { ServiceRegistry } from './services/service-registry.service';
import { HealthChecker } from './services/health-checker.service';
import { HealthController } from './controllers/health.controller';
import { ErrorHandler } from './middleware/error-handler.middleware';
import { RequestLogger } from './middleware/request-logger.middleware';
import { swaggerSpec } from './config/swagger';

// Import Authentication Module
import { 
  AuthenticationModuleFactory,
  DEFAULT_PUBLIC_ROUTES,
  DEFAULT_PROTECTED_ROUTES,
  DEFAULT_OPTIONAL_AUTH_ROUTES,
  ServiceAuthExtractor 
} from '@qr-saas/shared';

dotenv.config({ path: '../../.env' });

class CleanApiGatewayApplication {
  private app: express.Application;
  private logger!: Logger;
  private serviceRegistry!: ServiceRegistry;
  private healthChecker!: HealthChecker;
  private healthController!: HealthController;
  private errorHandler!: ErrorHandler;
  private requestLogger!: RequestLogger;
  private authModule: any;

  constructor() {
    this.app = express();
    this.initializeDependencies();
    this.initializeAuthentication();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeDependencies(): void {
    this.logger = new Logger('api-gateway');
    this.serviceRegistry = new ServiceRegistry(this.logger);
    this.healthChecker = new HealthChecker(this.serviceRegistry, this.logger);
    this.healthController = new HealthController(this.healthChecker, this.logger);
    this.errorHandler = new ErrorHandler(this.logger);
    this.requestLogger = new RequestLogger(this.logger);

    this.logger.info('Clean architecture dependencies initialized');
  }

  private initializeAuthentication(): void {
    const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    if (!jwtSecret || jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
      this.logger.warn('Using default JWT secret - CHANGE THIS IN PRODUCTION!');
    }

    // Create authentication module with dependency injection
    this.authModule = AuthenticationModuleFactory.create({
      jwtSecret,
      jwtIssuer: 'qr-saas-api-gateway',
      publicRoutes: DEFAULT_PUBLIC_ROUTES,
      protectedRoutes: DEFAULT_PROTECTED_ROUTES,
      optionalAuthRoutes: DEFAULT_OPTIONAL_AUTH_ROUTES,
      enableAuditLogging: process.env.NODE_ENV === 'production'
    });

    // Validate configuration
    const isValid = this.authModule.jwtTokenService.validateConfiguration();
    if (!isValid) {
      this.logger.error('Invalid JWT configuration detected');
    }

    this.logger.info('Authentication module initialized', {
      jwtIssuer: 'qr-saas-api-gateway',
      publicRoutes: DEFAULT_PUBLIC_ROUTES.length,
      protectedRoutes: DEFAULT_PROTECTED_ROUTES.length,
      optionalAuthRoutes: DEFAULT_OPTIONAL_AUTH_ROUTES.length
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 1000 : 5000,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP',
          timestamp: new Date().toISOString()
        }
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Request logging
    this.app.use(this.requestLogger.logRequest);

    this.logger.info('Middleware setup completed');
  }

  private setupRoutes(): void {
    // Swagger API Documentation (always public)
    this.setupSwaggerDocumentation();

    // Health endpoints (always public) 
    this.app.get('/health', (req, res) => this.healthController.getHealth(req, res));
    this.app.get('/health/:serviceName', (req, res) => this.healthController.getServiceHealth(req, res));

    // Static file serving (public)
    this.setupStaticFileServing();

    // Apply Clean Architecture authentication middleware
    this.app.use(this.authModule.createAuthMiddleware());

    // Proxy routes (authentication handled by middleware)
    this.setupProxyRoutes();

    // 404 handler
    this.app.use(this.errorHandler.handle404);
  }

  private setupSwaggerDocumentation(): void {
    const swaggerOptions = {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6; }
        .swagger-ui .info .description { color: #4b5563; }
        .swagger-ui .scheme-container { background: #f8fafc; padding: 10px; border-radius: 5px; }
      `,
      customSiteTitle: 'QR Code SaaS Platform API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'list'
      }
    };

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(swaggerSpec, null, 2));
    });

    // Welcome route
    this.app.get('/', (req, res) => {
      res.json({
        message: '🚀 QR Code SaaS Platform API Gateway v2.0',
        version: '2.0.0',
        status: 'operational',
        architecture: 'Clean Architecture with SOLID Principles',
        authentication: 'JWT with Gateway-level validation',
        documentation: {
          swagger: '/api-docs',
          json: '/api-docs.json'
        },
        services: this.serviceRegistry.getRegisteredServices(),
        health: '/health'
      });
    });

    this.logger.info('Swagger documentation configured');
  }

  private setupStaticFileServing(): void {
    const path = require('path');
    const qrImagesPath = path.resolve(__dirname, '../../qr-service/uploads/qr-images');
    
    this.app.use('/uploads/qr-images', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    
    this.app.use('/uploads/qr-images', express.static(qrImagesPath));
    
    this.logger.info('Static file serving configured');
  }

  private setupProxyRoutes(): void {
    // Authentication routes (handled by auth module as public)
    this.app.all('/api/auth/*', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/auth', '/auth');
    });

    // User routes
    this.app.all('/api/users', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/users', '/users');
    });
    this.app.all('/api/users/*', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/users', '/users');
    });

    // QR routes
    this.app.all('/api/qr', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/qr', '/qr');
    });
    this.app.all('/api/qr/*', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/qr', '/qr');
    });

    // Template routes (optional auth)
    this.app.all('/api/templates', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/templates', '/templates');
    });
    this.app.all('/api/templates/*', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/templates', '/templates');
    });

    // Analytics routes
    this.app.all('/api/analytics', async (req, res) => {
      await this.proxyRequest(req, res, 'analytics-service', '/api/analytics', '/analytics');
    });
    this.app.all('/api/analytics/*', async (req, res) => {
      await this.proxyRequest(req, res, 'analytics-service', '/api/analytics', '/analytics');
    });

    // File routes
    this.app.all('/api/files', async (req, res) => {
      await this.proxyRequest(req, res, 'file-service', '/api/files', '/files');
    });
    this.app.all('/api/files/*', async (req, res) => {
      await this.proxyRequest(req, res, 'file-service', '/api/files', '/files');
    });

    // Team routes (Pro+ only, handled by auth middleware)
    this.app.all('/api/teams', async (req, res) => {
      await this.proxyRequest(req, res, 'team-service', '/api/teams', '/api/v1');
    });
    this.app.all('/api/teams/*', async (req, res) => {
      await this.proxyRequest(req, res, 'team-service', '/api/teams', '/api/v1');
    });

    // Payment routes
    this.app.all('/api/payments', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/payments', '/api/v1/payments');
    });
    this.app.all('/api/payments/*', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/payments', '/api/v1/payments');
    });

    // Business routes (Business+ only)
    this.app.all('/api/business/*', async (req, res) => {
      await this.proxyRequest(req, res, 'business-tools-service', '/api/business', '/api/v1');
    });
    this.app.all('/api/domains', async (req, res) => {
      await this.proxyRequest(req, res, 'business-tools-service', '/api/domains', '/api/v1/domains');
    });
    this.app.all('/api/domains/*', async (req, res) => {
      await this.proxyRequest(req, res, 'business-tools-service', '/api/domains', '/api/v1/domains');
    });

    // White label routes (Enterprise only)
    this.app.all('/api/white-label', async (req, res) => {
      await this.proxyRequest(req, res, 'business-tools-service', '/api/white-label', '/api/v1/white-label');
    });
    this.app.all('/api/white-label/*', async (req, res) => {
      await this.proxyRequest(req, res, 'business-tools-service', '/api/white-label', '/api/v1/white-label');
    });

    // Admin routes (Admin permission required)
    this.app.all('/api/admin', async (req, res) => {
      await this.proxyRequest(req, res, 'admin-dashboard-service', '/api/admin', '/api');
    });
    this.app.all('/api/admin/*', async (req, res) => {
      await this.proxyRequest(req, res, 'admin-dashboard-service', '/api/admin', '/api');
    });

    // Public routes (no auth required)
    this.app.all('/api/public/*', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/public', '/api/v1/public');
    });

    // QR redirect route (public)
    this.app.get('/r/:shortId', async (req, res) => {
      const targetUrl = `${this.serviceRegistry.getServiceUrl('qr-service')}/redirect/${req.params.shortId}`;
      await this.handleRedirect(req, res, targetUrl);
    });

    // Landing page route (public)  
    this.app.get('/p/:slug', async (req, res) => {
      const targetUrl = `${this.serviceRegistry.getServiceUrl('landing-page-service')}/p/${req.params.slug}`;
      await this.handleRedirect(req, res, targetUrl);
    });

    this.logger.info('Proxy routes configured with Clean Architecture authentication');
  }

  private async proxyRequest(
    req: express.Request, 
    res: express.Response, 
    serviceName: string, 
    fromPath: string, 
    toPath: string
  ): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const targetPath = req.path.replace(fromPath, toPath);
    const targetUrl = `${this.serviceRegistry.getServiceUrl(serviceName)}${targetPath}`;
    
    try {
      this.logger.info('Proxying request with Clean Architecture auth', { 
        requestId, 
        service: serviceName,
        method: req.method,
        path: req.path,
        targetUrl,
        hasAuth: !!req.auth,
        userId: req.auth?.userId,
        subscriptionTier: req.auth?.subscriptionTier
      });
      
      // Prepare headers - authentication already handled by middleware
      const proxyHeaders: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'x-request-id': requestId
      };

      // Forward all auth headers set by authentication middleware
      const authHeaderPrefix = 'x-auth-';
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.startsWith(authHeaderPrefix) && value) {
          proxyHeaders[key] = Array.isArray(value) ? value[0] : value;
        }
      });
      
      // Add query parameters to target URL
      const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      const finalTargetUrl = targetUrl + queryString;
      
      const response = await fetch(finalTargetUrl, {
        method: req.method,
        headers: proxyHeaders,
        body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
      });
      
      // Handle binary responses
      const contentType = response.headers.get('content-type') || '';
      const isImageEndpoint = req.path.includes('/image') || req.path.includes('/download');
      
      if (isImageEndpoint && response.ok && !contentType.includes('application/json')) {
        const buffer = await response.arrayBuffer();
        
        res.setHeader('Content-Type', contentType);
        const contentLength = response.headers.get('content-length');
        const contentDisposition = response.headers.get('content-disposition');
        
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);
        
        res.status(response.status).send(Buffer.from(buffer));
      } else {
        const data = await response.json();
        res.status(response.status).json(data);
      }
      
      this.logger.info('Request proxied successfully', { requestId, service: serviceName, status: response.status });
      
    } catch (error) {
      this.logger.error('Proxy request failed', { 
        requestId, 
        service: serviceName, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      res.status(500).json({
        success: false,
        error: { 
          code: 'PROXY_ERROR', 
          message: `${serviceName} unavailable`, 
          requestId 
        }
      });
    }
  }

  private async handleRedirect(req: express.Request, res: express.Response, targetUrl: string): Promise<void> {
    try {
      const response = await fetch(targetUrl);
      const data = await response.json() as any;
      
      if (data.success && data.redirectTo) {
        // For production, perform actual redirect
        if (process.env.NODE_ENV === 'production') {
          res.redirect(data.redirectTo);
        } else {
          // For development, return redirect info
          res.status(200).json({
            message: 'Redirect detected',
            redirectTo: data.redirectTo,
            scans: data.scans
          });
        }
      } else {
        res.status(response.status).json(data);
      }
    } catch (error) {
      this.logger.error('Redirect handling error:', error);
      res.status(500).json({ error: 'Internal server error during redirect' });
    }
  }

  private setupErrorHandling(): void {
    this.app.use(this.errorHandler.handleError);
  }

  public async start(): Promise<void> {
    const PORT = parseInt(process.env.PORT || '3000', 10);

    try {
      const healthStatus = await this.healthChecker.checkHealth();
      this.logger.info('Initial health check completed', { status: healthStatus.status });

      this.app.listen(PORT, '0.0.0.0', () => {
        this.logger.info('🚀 Clean Architecture API Gateway v2.0 started successfully', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          services: this.serviceRegistry.getRegisteredServices(),
          architecture: 'Clean Architecture with SOLID Principles',
          authentication: 'JWT with Gateway-level validation'
        });
      });

    } catch (error) {
      this.logger.error('Failed to start API Gateway', error);
      process.exit(1);
    }
  }
}

// Start the application
const gateway = new CleanApiGatewayApplication();
gateway.start().catch(error => {
  console.error('Failed to start Clean Architecture API Gateway:', error);
  process.exit(1);
});

export { CleanApiGatewayApplication };