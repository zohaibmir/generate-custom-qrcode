import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import Clean Architecture service auth
import { ServiceAuthExtractor } from '@qr-saas/shared';

// Import route modules
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { subscriptionRoutes } from './routes/subscription.routes';

// Import clean architecture components
import { Logger } from './services/logger.service';
import { DatabaseConfig } from './config/database.config';

dotenv.config({ path: '../../.env' });

class UserServiceApplication {
  private app: express.Application;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.logger = new Logger('user-service');
    
    this.initializeDependencies();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeDependencies(): void {
    try {
      // Initialize database
      DatabaseConfig.initialize(this.logger);
      
      this.logger.info('Clean Architecture dependencies initialized');
      
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
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-request-id']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: { error: 'Too many requests from this IP, please try again later.' }
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId.toString();
      
      this.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId
      });
      
      next();
    });

    // Service Authentication Middleware - extracts x-auth-* headers from API Gateway
    // This middleware simply extracts them into req.auth
    this.app.use(ServiceAuthExtractor.createServiceMiddleware());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        // Test database connection
        const dbHealthy = await DatabaseConfig.testConnection();
        
        res.status(dbHealthy ? 200 : 503).json({
          success: true,
          data: {
            status: dbHealthy ? 'healthy' : 'degraded',
            service: 'user-service',
            timestamp: new Date().toISOString(),
            database: dbHealthy ? 'connected' : 'disconnected'
          }
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

    // Setup Clean Architecture routes
    this.setupCleanRoutes();

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

  private setupCleanRoutes(): void {
    try {
      // Mount route modules following Clean Architecture
      this.app.use('/auth', authRoutes);
      this.app.use('/users', userRoutes);
      this.app.use('/subscription', subscriptionRoutes);

      this.logger.info('Clean Architecture routes initialized', {
        mountedRoutes: ['/auth', '/users', '/subscription']
      });

    } catch (error) {
      this.logger.error('Failed to setup Clean Architecture routes', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
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
    const PORT = parseInt(process.env.PORT || '3001', 10);

    try {
      // Test database connection
      const dbHealthy = await DatabaseConfig.testConnection();
      if (!dbHealthy) {
        throw new Error('Database connection failed');
      }

      this.app.listen(PORT, '0.0.0.0', () => {
        this.logger.info('🚀 User Service started successfully', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          architecture: 'Clean Architecture with SOLID Principles',
          routes: ['GET /health', 'POST /auth/login', 'POST /auth/register', 'POST /auth/forgot-password', 'GET /users/profile', 'GET /subscription/current']
        });
      });

    } catch (error) {
      this.logger.error('Failed to start User Service', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down User Service gracefully...');
    
    try {
      await DatabaseConfig.close();
      this.logger.info('User Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

// Initialize and start the application
const userServiceApp = new UserServiceApplication();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await userServiceApp.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await userServiceApp.shutdown();
  process.exit(0);
});

// Start the service
userServiceApp.start().catch(error => {
  console.error('Failed to start User Service:', error);
  process.exit(1);
});