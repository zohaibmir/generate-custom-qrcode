import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { WinstonLogger } from './utils/logger';
import { DatabaseConfig } from './config/database.config';
import { EcommerceRepository } from './repositories/ecommerce.repository';
import { EcommerceService } from './services/ecommerce.service';
import { InventoryService } from './services/inventory.service';
import { EncryptionService } from './services/encryption.service';
import { PricingEngine } from './utils/pricing-engine';
import ecommerceRoutes from './routes/ecommerce.routes';
import inventoryRoutes from './routes/inventory.routes';

export class EcommerceApp {
  private app: express.Application;
  private logger: WinstonLogger;
  private ecommerceService!: EcommerceService;
  private inventoryService!: InventoryService;

  constructor() {
    this.app = express();
    this.logger = new WinstonLogger();
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.initializeServices();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
    } catch (error) {
      this.logger.error('Failed to initialize E-commerce Service', { error });
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database
      const database = await DatabaseConfig.initialize(this.logger);
      this.logger.info('Database connection established');

      // Initialize utilities
      const pricingEngine = new PricingEngine(this.logger);
      const encryptionService = new EncryptionService(this.logger);
      
      // Initialize repositories
      const ecommerceRepository = new EcommerceRepository(database, this.logger);
      
      // Initialize services
      this.ecommerceService = new EcommerceService(
        ecommerceRepository,
        pricingEngine,
        this.logger,
        encryptionService // Add the missing 4th parameter
      );
      
      this.inventoryService = new InventoryService(
        ecommerceRepository,
        encryptionService,
        this.logger
      );

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services', { error });
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Compression middleware
    this.app.use(compression());

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Subscription-Tier'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later',
          statusCode: 429
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Request logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message) => this.logger.info('HTTP Request', { message: message.trim() })
        }
      }));
    }

    // Request ID middleware
    this.app.use((req, res, next) => {
      const requestId = `ecom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    });

    // Health check middleware (before auth)
    this.app.use('/health', (req, res, next) => {
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        // Check database connectivity
        const dbHealth = await DatabaseConfig.testConnection();
        
        // Check services health
        const servicesHealth = {
          ecommerce: this.ecommerceService ? 'healthy' : 'unhealthy',
          inventory: this.inventoryService ? 'healthy' : 'unhealthy'
        };

        const overallHealth = dbHealth && 
          servicesHealth.ecommerce === 'healthy' && 
          servicesHealth.inventory === 'healthy' 
          ? 'healthy' : 'unhealthy';

        const healthData = {
          service: 'ecommerce-service',
          status: overallHealth,
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          database: dbHealth ? 'connected' : 'disconnected',
          services: servicesHealth,
          environment: process.env.NODE_ENV || 'development'
        };

        const statusCode = overallHealth === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
          success: true,
          data: healthData
        });

      } catch (error) {
        this.logger.error('Health check failed', { error });
        res.status(503).json({
          success: false,
          error: {
            code: 'HEALTH_CHECK_FAILED',
            message: 'Health check failed',
            statusCode: 503
          }
        });
      }
    });

    // API routes
    this.app.use('/api/ecommerce', ecommerceRoutes);
    this.app.use('/api/inventory', inventoryRoutes);

    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'E-commerce QR Service API',
      explorer: true,
      swaggerOptions: {
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
      }
    }));

    // API documentation JSON
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      res.json({
        service: 'E-commerce QR Service',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          ecommerce: {
            base: '/api/ecommerce',
            endpoints: [
              'POST / - Create e-commerce QR',
              'GET /:id - Get e-commerce QR by ID',
              'PUT /:id - Update e-commerce QR',
              'DELETE /:id - Delete e-commerce QR',
              'GET /user/:userId - Get user\'s e-commerce QRs',
              'POST /:id/validate - Validate QR data',
              'GET /:id/analytics - Get QR analytics',
              'GET /dashboard/stats - Get dashboard statistics'
            ]
          },
          inventory: {
            base: '/api/inventory',
            endpoints: [
              'GET / - List inventory integrations',
              'POST / - Create inventory integration',
              'GET /:id - Get integration details',
              'PUT /:id - Update integration',
              'DELETE /:id - Delete integration',
              'POST /shopify/setup - Setup Shopify integration',
              'POST /woocommerce/setup - Setup WooCommerce integration',
              'POST /:id/sync - Sync inventory'
            ]
          }
        }
      });
    });

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      this.logger.warn('API route not found', { 
        method: req.method, 
        path: req.path,
        requestId: req.headers['x-request-id']
      });
      
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `API endpoint ${req.method} ${req.path} not found`,
          statusCode: 404
        }
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'E-commerce QR Service',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        documentation: '/api/docs'
      });
    });

    // Global 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          statusCode: 404
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', { 
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id'],
        url: req.url,
        method: req.method
      });

      // Prevent sending headers if already sent
      if (res.headersSent) {
        return next(error);
      }

      // Handle different error types
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'An unexpected error occurred';

      if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = error.message;
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        message = 'Authentication required';
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
        message = 'Access denied';
      } else if (error.statusCode) {
        statusCode = error.statusCode;
        errorCode = error.code || errorCode;
        message = error.message || message;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message,
          statusCode,
          requestId: req.headers['x-request-id'],
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3007): Promise<void> {
    try {
      // Test database connection before starting
      const dbHealthy = await DatabaseConfig.testConnection();
      if (!dbHealthy) {
        throw new Error('Database connection failed - cannot start service');
      }

      this.app.listen(port, () => {
        this.logger.info('🛍️ E-commerce QR Service started successfully', {
          port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          features: [
            'Product QR Codes',
            'Coupon QR Codes', 
            'Payment QR Codes',
            'Inventory Integration',
            'Dynamic Pricing',
            'Analytics Dashboard'
          ]
        });
      });

    } catch (error) {
      this.logger.error('Failed to start E-commerce Service', { error });
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down E-commerce Service gracefully...');
    
    try {
      // Close database connections
      await DatabaseConfig.close();
      this.logger.info('E-commerce Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during E-commerce Service shutdown', { error });
    }
  }
}