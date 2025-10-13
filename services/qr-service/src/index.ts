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
      const healthChecker = new HealthChecker(this.logger, this.container);
      this.container.register('qrService', qrService);
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
      max: 100, // Limit each IP to 100 requests per windowMs
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
    const qrService = this.container.resolve<IQRService>('qrService');
    const healthChecker = this.container.resolve<IHealthChecker>('healthChecker');

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await healthChecker.checkHealth();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
          success: true,
          data: health
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

    // QR Code routes
    this.setupQRRoutes(qrService);

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

  private setupQRRoutes(qrService: IQRService): void {
    // Create QR Code
    this.app.post('/qr', async (req, res) => {
      try {
        const userId = this.extractUserId(req); // TODO: Extract from JWT token
        const result = await qrService.createQR(userId, req.body);
        
        const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'QR_CREATION_FAILED');
      }
    });

    // Get QR Code by ID
    this.app.get('/qr/:id', async (req, res) => {
      try {
        const result = await qrService.getQRById(req.params.id);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'QR_FETCH_FAILED');
      }
    });

    // Get user's QR Codes
    this.app.get('/qr', async (req, res) => {
      try {
        const userId = this.extractUserId(req);
        const pagination = {
          page: parseInt(req.query.page as string) || 1,
          limit: Math.min(parseInt(req.query.limit as string) || 20, 100)
        };
        
        const result = await qrService.getUserQRs(userId, pagination);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'QR_FETCH_FAILED');
      }
    });

    // Update QR Code
    this.app.put('/qr/:id', async (req, res) => {
      try {
        const result = await qrService.updateQR(req.params.id, req.body);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'QR_UPDATE_FAILED');
      }
    });

    // Delete QR Code
    this.app.delete('/qr/:id', async (req, res) => {
      try {
        const result = await qrService.deleteQR(req.params.id);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'QR_DELETE_FAILED');
      }
    });

    // Generate QR Image
    this.app.get('/qr/:id/image', async (req, res) => {
      try {
        const format = (req.query.format as any) || 'png';
        const result = await qrService.generateQRImage(req.params.id, format);
        
        if (result.success && result.data) {
          res.set({
            'Content-Type': `image/${format}`,
            'Content-Disposition': `inline; filename="qr-${req.params.id}.${format}"`
          });
          res.send(result.data);
        } else {
          const statusCode = result.error?.statusCode || 500;
          res.status(statusCode).json(result);
        }
        
      } catch (error) {
        this.handleRouteError(error, res, 'QR_IMAGE_GENERATION_FAILED');
      }
    });

    // Redirect endpoint
    this.app.get('/redirect/:shortId', async (req, res) => {
      try {
        const result = await qrService.getQRByShortId(req.params.shortId);
        
        if (result.success && result.data) {
          // TODO: Implement analytics tracking here
          this.logger.info('QR redirect accessed', { 
            shortId: req.params.shortId,
            qrId: result.data.id 
          });
          
          res.json({ 
            message: `Redirect for ${req.params.shortId}`, 
            qr: result.data 
          });
        } else {
          res.status(404).send('QR code not found');
        }
        
      } catch (error) {
        this.handleRouteError(error, res, 'QR_REDIRECT_FAILED');
      }
    });
  }

  private extractUserId(req: express.Request): string {
    // TODO: Extract user ID from JWT token
    // For now, using the actual user ID from database
    return 'c327137a-1894-49b3-a265-82b6bd862e14';
  }

  private handleRouteError(error: any, res: express.Response, defaultCode: string): void {
    this.logger.error('Route error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      code: defaultCode 
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: defaultCode,
          message: 'Internal server error',
          statusCode: 500
        }
      });
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