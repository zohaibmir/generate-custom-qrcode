import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import clean architecture components
import { 
  ServiceResponse, 
  QRCode, 
  CreateQRRequest,
  IQRService,
  IBulkQRService,
  IHealthChecker,
  IDependencyContainer,
  AppError
} from './interfaces';
import { Logger } from './services/logger.service';
import { DependencyContainer } from './services/dependency-container.service';
import { DatabaseConfig } from './config/database.config';
import { QRRepository } from './repositories/qr.repository';
import { QRService } from './services/qr.service';
import { QRGenerator } from './utils/qr-generator';
import { ShortIdGenerator } from './utils/short-id-generator';
import { HealthChecker } from './services/health-checker.service';

dotenv.config({ path: '../../.env' });

class QRServiceApplication {
  private app: express.Application;
  private container: IDependencyContainer;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.container = new DependencyContainer();
    this.logger = new Logger('qr-service');
    
    this.initializeDependencies();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeDependencies(): void {
    try {
      // Initialize database
      const database = DatabaseConfig.initialize(this.logger);
      
      // Register core dependencies
      this.container.register('logger', this.logger);
      this.container.register('database', database);
      
      // Register repositories
      const qrRepository = new QRRepository(database, this.logger);
      this.container.register('qrRepository', qrRepository);
      
      // Register utilities
      const qrGenerator = new QRGenerator();
      const shortIdGenerator = new ShortIdGenerator();
      this.container.register('qrGenerator', qrGenerator);
      this.container.register('shortIdGenerator', shortIdGenerator);
      
      // Register services
      const qrService = new QRService(qrRepository, qrGenerator, shortIdGenerator, this.logger);
      
      // Register template services with repository pattern
      const { QRTemplateService } = require('./services/qr-template.service');
      const { QRTemplateRepository } = require('./repositories/qr-template.repository');
      const qrTemplateRepository = new QRTemplateRepository(this.logger);
      const qrTemplateService = new QRTemplateService(qrTemplateRepository, this.logger, qrService);
      
      // Register bulk QR services
      const { BulkQRRepository } = require('./repositories/bulk-qr.repository');
      const { BulkQRService } = require('./services/bulk-qr.service');
      const { CsvProcessor } = require('./utils/csv-processor');
      
      const bulkQRRepository = new BulkQRRepository(database, this.logger);
      const csvProcessor = new CsvProcessor(this.logger);
      const bulkQRService = new BulkQRService(bulkQRRepository, qrService, csvProcessor, this.logger);
      
      // Register category services
      const { QRCategoryService } = require('./services/qr-category.service');
      const { QRCategoryRepository } = require('./repositories/qr-category.repository');
      
      const qrCategoryRepository = new QRCategoryRepository(database, this.logger);
      const qrCategoryService = new QRCategoryService(qrCategoryRepository, this.logger);
      
      // Register dynamic QR services
      const { DynamicQRService } = require('./services/DynamicQRService');
      const { DynamicQRRepository } = require('./repositories/DynamicQRRepository');
      
      const dynamicQRRepository = new DynamicQRRepository(database);
      const dynamicQRService = new DynamicQRService(dynamicQRRepository);
      
      // Register content rules services
      const { QRContentRulesService } = require('./services/qr-content-rules.service');
      const { QRContentRulesRepository } = require('./repositories/qr-content-rules.repository');
      
      const qrContentRulesRepository = new QRContentRulesRepository(database, this.logger);
      const qrContentRulesService = new QRContentRulesService(qrContentRulesRepository, this.logger);
      
      const healthChecker = new HealthChecker(this.logger, this.container);
      
      // Register all services in container
      this.container.register('qrService', qrService);
      this.container.register('qrTemplateRepository', qrTemplateRepository);
      this.container.register('qrTemplateService', qrTemplateService);
      this.container.register('qrCategoryService', qrCategoryService);
      this.container.register('qrCategoryRepository', qrCategoryRepository);
      this.container.register('dynamicQRService', dynamicQRService);
      this.container.register('dynamicQRRepository', dynamicQRRepository);
      this.container.register('qrContentRulesService', qrContentRulesService);
      this.container.register('qrContentRulesRepository', qrContentRulesRepository);
      this.container.register('bulkQRRepository', bulkQRRepository);
      this.container.register('bulkQRService', bulkQRService);
      this.container.register('csvProcessor', csvProcessor);
      this.container.register('healthChecker', healthChecker);
      
      this.logger.info('Clean architecture dependencies initialized', {
        registeredDependencies: this.container.getRegisteredTokens()
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize dependencies', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP',
          statusCode: 429
        }
      }
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      
      this.logger.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      next();
    });
  }

  private setupRoutes(): void {
    // Health routes first - no authentication needed
    const healthChecker = this.container.resolve('healthChecker');
    const { createHealthRoutes } = require('./routes/health.routes');
    const healthRoutes = createHealthRoutes(healthChecker, this.logger);
    this.app.use('/', healthRoutes);
    
    // Clean Architecture Routes - using controllers and ServiceAuthExtractor
    this.setupCleanArchitectureRoutes();
    
    // Advanced QR Features (Content Rules)
    this.setupContentRulesRoutes();
    
    // Dynamic QR routes
    this.setupDynamicQRRoutes();
    
    // Bulk QR routes
    this.setupBulkQRRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      this.logger.warn('Route not found', { 
        method: req.method, 
        path: req.path,
        requestId: req.headers['x-request-id']
      });
      
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${req.method} ${req.path} not found`,
          statusCode: 404
        }
      });
    });
  }

  private setupCleanArchitectureRoutes(): void {
    try {
      // Get services from dependency container
      const qrService = this.container.resolve('qrService');
      const qrTemplateService = this.container.resolve('qrTemplateService');
      const qrCategoryService = this.container.resolve('qrCategoryService');
      
      // Register Clean Architecture QR routes with proper authentication
      const { createQRRoutes } = require('./routes/qr.routes');
      const qrRoutes = createQRRoutes(qrService, this.logger);
      this.app.use('/', qrRoutes);
      
      // Register Clean Architecture Template routes
      const { createTemplateRoutes } = require('./routes/template.routes');
      const templateRoutes = createTemplateRoutes(qrTemplateService, this.logger);
      this.app.use('/', templateRoutes);
      
      // Register Clean Architecture Category routes
      const { createCategoryRoutes } = require('./routes/categories.routes');
      const categoryRoutes = createCategoryRoutes(qrCategoryService, this.logger);
      this.app.use('/categories', categoryRoutes);
      
      this.logger.info('Clean Architecture routes registered successfully');
    } catch (error) {
      this.logger.error('Failed to register Clean Architecture routes', { error });
    }
  }

  private setupBulkQRRoutes(): void {
    try {
      const bulkQRService = this.container.resolve('bulkQRService');
      const { createBulkQRRoutes } = require('./routes/bulk-qr.routes');
      const bulkQRRoutes = createBulkQRRoutes(bulkQRService, this.logger);
      
      this.app.use('/bulk', bulkQRRoutes);
      this.logger.info('Bulk QR routes registered successfully');
    } catch (error) {
      this.logger.error('Failed to register Bulk QR routes', { error });
    }
  }

  private setupContentRulesRoutes(): void {
    // Import and use the advanced QR features routes
    try {
      const qrContentRulesService = this.container.resolve('qrContentRulesService');
      const qrService = this.container.resolve('qrService');
      const { createQRContentRulesRoutes } = require('./routes/qr-content-rules.routes');
      const contentRulesRoutes = createQRContentRulesRoutes(qrContentRulesService, qrService, this.logger);
      
      this.app.use('/qr', contentRulesRoutes);
      this.logger.info('Advanced QR Features (Content Rules) routes registered successfully');
    } catch (error) {
      this.logger.error('Failed to register Content Rules routes', { error });
    }
  }

  private setupDynamicQRRoutes(): void {
    // Import and use the dynamic QR routes
    try {
      const dynamicQRService = this.container.resolve('dynamicQRService');
      const { createDynamicQRRoutes } = require('./routes/dynamic-qr.routes');
      const dynamicQRRoutes = createDynamicQRRoutes(dynamicQRService, this.logger);
      
      this.app.use('/dynamic', dynamicQRRoutes);
      this.logger.info('Dynamic QR routes registered successfully');
    } catch (error) {
      this.logger.error('Failed to register Dynamic QR routes', { error });
    }
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', { 
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          requestId: req.headers['x-request-id']
        }
      });
    });
  }

  public async start(): Promise<void> {
    const PORT = process.env.PORT || 3002;

    try {
      // Test database connection
      const dbHealthy = await DatabaseConfig.testConnection();
      if (!dbHealthy) {
        throw new Error('Database connection failed');
      }

      this.app.listen(PORT, () => {
        this.logger.info('🚀 QR Service started successfully', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          architecture: 'Clean Architecture with SOLID Principles',
          dependencies: this.container.getRegisteredTokens()
        });
      });

    } catch (error) {
      this.logger.error('Failed to start QR Service', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down QR Service gracefully...');
    
    try {
      await DatabaseConfig.close();
      this.logger.info('QR Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

// Initialize and start the application
const qrServiceApp = new QRServiceApplication();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await qrServiceApp.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await qrServiceApp.shutdown();
  process.exit(0);
});

// Start the service
qrServiceApp.start().catch(error => {
  console.error('Failed to start QR Service:', error);
  process.exit(1);
});