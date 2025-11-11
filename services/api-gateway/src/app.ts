import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

// Import clean architecture components
import { Logger } from './services/logger.service';
import { ServiceRegistry } from './services/service-registry.service';
import { HealthChecker } from './services/health-checker.service';
import { HealthController } from './controllers/health.controller';
import { ErrorHandler } from './middleware/error-handler.middleware';
import { RequestLogger } from './middleware/request-logger.middleware';
import { AdvancedAnalyticsRoutes } from './routes/advanced-analytics.routes';
import { swaggerSpec } from './config/swagger';

dotenv.config({ path: '../../.env' });

class ApiGatewayApplication {
  private app: express.Application;
  private logger!: Logger;
  private serviceRegistry!: ServiceRegistry;
  private healthChecker!: HealthChecker;
  private healthController!: HealthController;
  private errorHandler!: ErrorHandler;
  private requestLogger!: RequestLogger;
  private advancedAnalyticsRoutes!: AdvancedAnalyticsRoutes;

  constructor() {
    this.app = express();
    this.initializeDependencies();
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
    this.advancedAnalyticsRoutes = new AdvancedAnalyticsRoutes(this.logger, this.serviceRegistry);

    this.logger.info('Clean architecture dependencies initialized');
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5000, // Much higher limit for development and analytics
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP',
          timestamp: new Date().toISOString()
        }
      }
    });
    this.app.use(limiter);
    this.app.use(this.requestLogger.logRequest);
  }

  private setupRoutes(): void {
    // Swagger API Documentation
    this.setupSwaggerDocumentation();

    // Health endpoints with clean architecture
    this.app.get('/health', (req, res) => this.healthController.getHealth(req, res));
    this.app.get('/health/:serviceName', (req, res) => this.healthController.getServiceHealth(req, res));

    // Static file serving for QR code images
    this.setupStaticFileServing();

    // Simple, working proxy routes (keeping what works while applying clean architecture principles)
    this.setupProxyRoutes();

    // 404 handler
    this.app.use(this.errorHandler.handle404);
  }

  private setupSwaggerDocumentation(): void {
    // Swagger UI setup with custom options
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

    // Main API documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
    
    // JSON specification endpoint
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(swaggerSpec, null, 2));
    });

    // Welcome route with documentation links
    this.app.get('/', (req, res) => {
      res.json({
        message: '🚀 QR Code SaaS Platform API Gateway',
        version: '1.0.0',
        status: 'operational',
        documentation: {
          swagger: '/api-docs',
          json: '/api-docs.json',
          postman: 'Import postman-collection.json for comprehensive testing'
        },
        services: {
          'user-service': 'User management and authentication with payment processing',
          'qr-service': 'QR code generation and management',
          'analytics-service': 'Scan tracking and analytics',
          'file-service': 'File upload and storage',
          'notification-service': 'Email/SMS with database persistence',
          'api-service': 'API keys, webhooks, SDK generation, and third-party integrations',
          'team-service': 'Team and organization management with member invitations',
          'landing-page-service': 'Landing page builder with A/B testing and forms',
          'payment-processing': 'Multi-provider payments: Swish (Swedish), Stripe, Klarna, PayPal',
          'admin-dashboard-service': 'Admin authentication, content management, and dashboard APIs'
        },
        database: 'PostgreSQL with complete persistence',
        architecture: 'Clean Architecture with SOLID principles',
        health: '/health'
      });
    });

    this.logger.info('Swagger documentation configured', { 
      endpoint: '/api-docs',
      json: '/api-docs.json' 
    });
  }

  private setupStaticFileServing(): void {
    const path = require('path');
    
    // Serve QR code images from the QR service uploads directory
    const qrImagesPath = path.resolve(__dirname, '../../qr-service/uploads/qr-images');
    
    // Add CORS headers for static files before serving them
    this.app.use('/uploads/qr-images', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    
    this.app.use('/uploads/qr-images', express.static(qrImagesPath));
    
    this.logger.info('Static file serving configured with CORS', { 
      route: '/uploads/qr-images',
      directory: qrImagesPath 
    });
  }

  private setupProxyRoutes(): void {
    // Auth routes - working proxy with clean logging
    this.app.all('/api/auth/*', async (req, res) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const targetUrl = `${this.serviceRegistry.getServiceUrl('user-service')}${req.path.replace('/api/auth', '/auth')}`;
      
      try {
        this.logger.info('Proxying auth request', { requestId, method: req.method, path: req.path, targetUrl });
        
        const response = await fetch(targetUrl, {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
        });
        
        const data = await response.json();
        this.logger.info('Auth request completed', { requestId, status: response.status });
        res.status(response.status).json(data);
        
      } catch (error) {
        this.logger.error('Auth proxy failed', { requestId, error: error instanceof Error ? error.message : 'Unknown' });
        res.status(500).json({
          success: false,
          error: { code: 'PROXY_ERROR', message: 'Auth service unavailable', requestId }
        });
      }
    });

    // Users routes - handle both base route and sub-routes
    this.app.all('/api/users', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/users', '/users');
    });
    
    this.app.all('/api/users/*', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/users', '/users');
    });

    // QR routes - handle both base route and sub-routes
    this.app.all('/api/qr', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/qr', '/qr');
    });
    
    this.app.all('/api/qr/*', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/qr', '/qr');
    });

    // Template routes - handle both base route and sub-routes
    this.app.all('/api/templates', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/templates', '/templates');
    });
    
    this.app.all('/api/templates/*', async (req, res) => {
      await this.proxyRequest(req, res, 'qr-service', '/api/templates', '/templates');
    });

    // Advanced Analytics routes - specific routes for advanced features
    this.app.use('/api/analytics', this.advancedAnalyticsRoutes.getRouter());

    // Analytics routes - handle basic analytics and any remaining routes
    this.app.all('/api/analytics', async (req, res) => {
      await this.proxyRequest(req, res, 'analytics-service', '/api/analytics', '/analytics');
    });
    
    this.app.all('/api/analytics/*', async (req, res) => {
      await this.proxyRequest(req, res, 'analytics-service', '/api/analytics', '/analytics');
    });

    // Files routes - handle both base route and sub-routes
    this.app.all('/api/files', async (req, res) => {
      await this.proxyRequest(req, res, 'file-service', '/api/files', '/files');
    });
    
    this.app.all('/api/files/*', async (req, res) => {
      await this.proxyRequest(req, res, 'file-service', '/api/files', '/files');
    });

    // Notifications routes - handle both base route and sub-routes
    this.app.all('/api/notifications', async (req, res) => {
      await this.proxyRequest(req, res, 'notification-service', '/api/notifications', '');
    });
    
    this.app.all('/api/notifications/*', async (req, res) => {
      await this.proxyRequest(req, res, 'notification-service', '/api/notifications', '');
    });

    // Landing Pages routes - handle both base route and sub-routes
    this.app.all('/api/landing-pages', async (req, res) => {
      await this.proxyRequest(req, res, 'landing-page-service', '/api/landing-pages', '');
    });
    
    this.app.all('/api/landing-pages/*', async (req, res) => {
      await this.proxyRequest(req, res, 'landing-page-service', '/api/landing-pages', '');
    });

    // Landing Page Templates routes
    this.app.all('/api/landing-templates', async (req, res) => {
      await this.proxyRequest(req, res, 'landing-page-service', '/api/landing-templates', '/templates');
    });
    
    this.app.all('/api/landing-templates/*', async (req, res) => {
      await this.proxyRequest(req, res, 'landing-page-service', '/api/landing-templates', '/templates');
    });

    // Teams routes - handle both base route and sub-routes (following QR/Analytics pattern)
    this.app.all('/api/teams', async (req, res) => {
      await this.proxyRequest(req, res, 'team-service', '/api/teams', '/api/v1');
    });
    
    this.app.all('/api/teams/*', async (req, res) => {
      await this.proxyRequest(req, res, 'team-service', '/api/teams', '/api/v1');
    });

    // Payment routes - handle all payment-related operations including Swish
    this.app.all('/api/payments', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/payments', '/api/v1/payments');
    });
    
    this.app.all('/api/payments/*', async (req, res) => {
      await this.proxyRequest(req, res, 'user-service', '/api/payments', '/api/v1/payments');
    });

    // API Service routes - handle API keys, webhooks, SDK generation, and third-party integrations
    this.app.all('/api/integrations', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/integrations', '/api/v1');
    });
    
    this.app.all('/api/integrations/*', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/integrations', '/api/v1');
    });

    // API Keys routes - specific route for better organization
    this.app.all('/api/keys', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/keys', '/api/v1/keys');
    });
    
    this.app.all('/api/keys/*', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/keys', '/api/v1/keys');
    });

    // Webhooks routes - specific route for better organization  
    this.app.all('/api/webhooks', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/webhooks', '/api/v1/webhooks');
    });
    
    this.app.all('/api/webhooks/*', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/webhooks', '/api/v1/webhooks');
    });

    // SDK Generation routes - specific route for SDK operations
    this.app.all('/api/sdks', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/sdks', '/api/v1/sdks');
    });
    
    this.app.all('/api/sdks/*', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/sdks', '/api/v1/sdks');
    });

    // Public API routes - for API key based access
    this.app.all('/api/public', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/public', '/api/v1/public');
    });
    
    this.app.all('/api/public/*', async (req, res) => {
      await this.proxyRequest(req, res, 'api-service', '/api/public', '/api/v1/public');
    });

    // Admin Authentication routes - handle admin login/logout/auth
    this.app.all('/api/admin/auth', async (req, res) => {
      await this.proxyRequest(req, res, 'admin-dashboard-service', '/api/admin/auth', '/auth');
    });
    
    this.app.all('/api/admin/auth/*', async (req, res) => {
      await this.proxyRequest(req, res, 'admin-dashboard-service', '/api/admin/auth', '/auth');
    });

    // Admin Dashboard routes - handle admin authentication and dashboard API
    this.app.all('/api/admin', async (req, res) => {
      await this.proxyRequest(req, res, 'admin-dashboard-service', '/api/admin', '/api');
    });
    
    this.app.all('/api/admin/*', async (req, res) => {
      await this.proxyRequest(req, res, 'admin-dashboard-service', '/api/admin', '/api');
    });

    // Public landing page access (special route)
    this.app.get('/p/:slug', async (req, res) => {
      const targetUrl = `${this.serviceRegistry.getServiceUrl('landing-page-service')}/p/${req.params.slug}`;
      
      try {
        const response = await fetch(targetUrl);
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
          // Return HTML for public landing pages
          const html = await response.text();
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        } else {
          // Return JSON response
          const data = await response.json();
          res.status(response.status).json(data);
        }
      } catch (error) {
        this.logger.error('Landing page access failed', { 
          slug: req.params.slug,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ 
          success: false, 
          error: { 
            code: 'LANDING_PAGE_ERROR', 
            message: 'Landing page access failed' 
          }
        });
      }
    });

    // Short URL redirect with validity checking
    this.app.get('/r/:shortId', async (req, res) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const password = req.query.password as string;
      const targetUrl = `${this.serviceRegistry.getServiceUrl('qr-service')}/redirect/${req.params.shortId}${password ? `?password=${encodeURIComponent(password)}` : ''}`;
      
      try {
        this.logger.info('QR redirect attempt', { 
          requestId, 
          shortId: req.params.shortId,
          hasPassword: !!password,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });

        const response = await fetch(targetUrl);
        const data = await response.json() as any;
        
        if (data.success && data.redirectTo) {
          // Log successful scan for analytics
          this.logger.info('QR scan successful', {
            requestId,
            shortId: req.params.shortId,
            scans: data.scans,
            redirectTo: data.redirectTo
          });
          
          // In production, perform actual redirect
          // res.redirect(data.redirectTo);
          
          // For now, return the redirect info
          res.status(200).json({
            success: true,
            message: 'QR code is valid',
            redirectTo: data.redirectTo,
            scans: data.scans
          });
        } else {
          // Handle blocked scans (expired, limit exceeded, etc.)
          this.logger.warn('QR scan blocked', {
            requestId,
            shortId: req.params.shortId,
            reason: data.error?.reason,
            message: data.error?.message
          });
          
          res.status(response.status).json(data);
        }
      } catch (error) {
        this.logger.error('Redirect proxy failed', { 
          requestId, 
          shortId: req.params.shortId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ 
          success: false, 
          error: { 
            code: 'REDIRECT_ERROR', 
            message: 'QR redirect failed' 
          }
        });
      }
    });
  }

  private async getDefaultUserId(): Promise<string | null> {
    try {
      // Try to get the first available user from the database
      const response = await fetch(`${this.serviceRegistry.getServiceUrl('user-service')}/users?limit=1`);
      if (response.ok) {
        const data = await response.json() as any;
        if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
          return data.data[0].id;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to fetch default user ID', { error: error instanceof Error ? error.message : 'Unknown' });
    }
    return null;
  }

  private async proxyRequest(req: express.Request, res: express.Response, serviceName: string, fromPath: string, toPath: string): Promise<void> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const targetPath = req.path.replace(fromPath, toPath);
    const targetUrl = `${this.serviceRegistry.getServiceUrl(serviceName)}${targetPath}`;
    
    try {
      this.logger.info('Request started', { 
        requestId, 
        method: req.method, 
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      this.logger.info('Service URL resolved', {
        serviceName,
        url: this.serviceRegistry.getServiceUrl(serviceName)
      });
      
      this.logger.info('Proxying request', { 
        requestId, 
        service: serviceName, 
        method: req.method, 
        originalPath: req.path,
        targetPath,
        targetUrl 
      });
      
      // Prepare headers for the proxied request
      const proxyHeaders: { [key: string]: string } = {
        'Content-Type': 'application/json'
      };
      
      // Extract user ID from JWT token if available
      let userIdFromToken: string | null = null;
      const authHeader = req.headers['authorization'] as string;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production') as any;
          userIdFromToken = decoded.sub || decoded.id;
          this.logger.info('JWT token decoded successfully', { 
            requestId,
            userId: userIdFromToken,
            tokenExp: decoded.exp,
            tokenIat: decoded.iat
          });
        } catch (jwtError) {
          this.logger.warn('JWT token validation failed', { 
            requestId,
            error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error'
          });
        }
      }
      
      // Forward user identification headers with priority: JWT > explicit headers > query params > default
      if (userIdFromToken) {
        proxyHeaders['x-user-id'] = userIdFromToken;
        this.logger.info('Using user ID from JWT token', { requestId, userId: userIdFromToken });
      } else if (req.headers['x-user-id']) {
        proxyHeaders['x-user-id'] = req.headers['x-user-id'] as string;
        this.logger.info('Using user ID from x-user-id header', { requestId, userId: req.headers['x-user-id'] });
      } else if (req.headers['user-id']) {
        proxyHeaders['user-id'] = req.headers['user-id'] as string;
        this.logger.info('Using user ID from user-id header', { requestId, userId: req.headers['user-id'] });
      } else if (req.query?.userId) {
        // Check for user ID in URL query params (for analytics frontend)
        const userId = req.query.userId as string;
        proxyHeaders['x-user-id'] = userId;
        this.logger.info('Using user ID from query parameter', { requestId, userId });
      } else {
        // Get a valid user ID from the database for development
        const defaultUserId = await this.getDefaultUserId();
        if (defaultUserId) {
          proxyHeaders['x-user-id'] = defaultUserId;
          this.logger.info('Using default user ID from database', { requestId, userId: defaultUserId });
        } else {
          this.logger.error('No user ID available and unable to fetch from database', { requestId });
        }
      }
      
      // Add query parameters to target URL
      const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      const finalTargetUrl = targetUrl + queryString;
      
      const response = await fetch(finalTargetUrl, {
        method: req.method,
        headers: proxyHeaders,
        body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
      });
      
      // Handle binary data for image endpoints
      const isImageEndpoint = req.path.includes('/image') || req.path.includes('/download');
      
      if (isImageEndpoint && response.ok) {
        // For image/binary endpoints, pipe the response directly
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentLength = response.headers.get('content-length');
        const contentDisposition = response.headers.get('content-disposition');
        
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);
        
        const buffer = await response.arrayBuffer();
        this.logger.info('Binary request completed', { 
          requestId, 
          service: serviceName, 
          status: response.status,
          contentType,
          size: buffer.byteLength 
        });
        
        res.status(response.status).send(Buffer.from(buffer));
      } else {
        // For JSON endpoints, parse as JSON
        const data = await response.json();
        this.logger.info('Request completed', { 
          requestId, 
          service: serviceName, 
          status: response.status 
        });
        res.status(response.status).json(data);
      }
      
    } catch (error) {
      this.logger.error('Proxy request failed', { 
        requestId, 
        service: serviceName, 
        originalPath: req.path,
        targetUrl,
        error: error instanceof Error ? error.message : 'Unknown' 
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

  private setupErrorHandling(): void {
    this.app.use(this.errorHandler.handleError);
  }

  public async start(): Promise<void> {
    const PORT = parseInt(process.env.PORT || '3000', 10);

    try {
      const healthStatus = await this.healthChecker.checkHealth();
      this.logger.info('Initial health check completed', { status: healthStatus.status });

      this.app.listen(PORT, '0.0.0.0', () => {
        this.logger.info('🚀 Clean Architecture API Gateway started successfully', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          services: this.serviceRegistry.getRegisteredServices(),
          architecture: 'Clean Architecture with SOLID Principles'
        });
      });

    } catch (error) {
      this.logger.error('Failed to start API Gateway', error);
      process.exit(1);
    }
  }
}

// Start the application
const gateway = new ApiGatewayApplication();
gateway.start().catch(error => {
  console.error('Failed to start API Gateway:', error);
  process.exit(1);
});