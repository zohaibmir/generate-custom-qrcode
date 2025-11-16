import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import service integration middleware
import { ServiceIntegrationMiddleware } from '@qr-saas/shared';

// Import clean architecture components
import { 
  ServiceResponse, 
  User, 
  CreateUserRequest,
  IUserService,
  ISubscriptionService,
  IHealthChecker,
  IDependencyContainer,
  AppError
} from './interfaces';
import { Logger } from './services/logger.service';
import { DependencyContainer } from './services/dependency-container.service';
import { DatabaseConfig } from './config/database.config';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { PasswordHasher } from './utils/password-hasher';
import { HealthChecker } from './services/health-checker.service';

dotenv.config({ path: '../../.env' });

class UserServiceApplication {
  private app: express.Application;
  private container: IDependencyContainer;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.container = new DependencyContainer();
    this.logger = new Logger('user-service');
    
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
      
      // Register utilities
      const passwordHasher = new PasswordHasher();
      this.container.register('passwordHasher', passwordHasher);
      
      // Register repositories
      const userRepository = new UserRepository(database, this.logger);
      this.container.register('userRepository', userRepository);
      
      // Register subscription repository
      const { SubscriptionRepository } = require('./repositories/subscription.repository');
      const subscriptionRepository = new SubscriptionRepository(database, this.logger);
      this.container.register('subscriptionRepository', subscriptionRepository);
      
      // Register subscription service first
      const { SubscriptionService } = require('./services/subscription.service');
      const subscriptionService = new SubscriptionService(subscriptionRepository, userRepository, this.logger);
      this.container.register('subscriptionService', subscriptionService);
      
      // Register user service with subscription service dependency
      const userService = new UserService(userRepository, passwordHasher, this.logger, subscriptionService);
      const healthChecker = new HealthChecker(this.logger, this.container);
      this.container.register('userService', userService);
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

    // Service integration middleware - extract auth context from API Gateway
    const serviceAuthMiddleware = ServiceIntegrationMiddleware.createInternal({
      requireAuthentication: false, // User service handles both auth and non-auth routes
      allowDirectAccess: true       // Allow direct access for internal operations
    });
    this.app.use(serviceAuthMiddleware);
  }

  private setupRoutes(): void {
    const userService = this.container.resolve<IUserService>('userService');
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

    // User routes
    this.setupUserRoutes(userService);

    // Subscription routes
    const subscriptionService = this.container.resolve<ISubscriptionService>('subscriptionService');
    this.setupSubscriptionRoutes(subscriptionService);

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

  private setupUserRoutes(userService: IUserService): void {
    // User Profile Route - uses authentication context from gateway
    this.app.get('/users/profile', async (req: any, res) => {
      try {
        // Get authenticated user from service integration middleware
        const authUser = req.auth;
        
        if (!authUser) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'User authentication required to access profile',
              statusCode: 401
            }
          });
        }

        // Fetch full user profile using the authenticated user ID
        const result = await userService.getUserById(authUser.userId);
        
        if (result.success) {
          // Add authentication context to response
          const profileData = {
            ...result.data,
            authContext: {
              subscription: authUser.subscriptionTier,
              permissions: authUser.permissions,
              isEmailVerified: authUser.isEmailVerified,
              organizationId: authUser.organizationId
            }
          };
          
          res.status(200).json({
            success: true,
            data: profileData,
            message: 'Profile retrieved successfully'
          });
        } else {
          res.status(result.error?.statusCode || 500).json(result);
        }
        
      } catch (error) {
        this.handleRouteError(error, res, 'PROFILE_FETCH_FAILED');
      }
    });

    // Update User Profile Route - uses authentication context
    this.app.put('/users/profile', async (req: any, res) => {
      try {
        const authUser = req.auth;
        
        if (!authUser) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'User authentication required to update profile',
              statusCode: 401
            }
          });
        }

        // Only allow users to update their own profile
        const result = await userService.updateUser(authUser.userId, req.body);
        
        if (result.success) {
          this.logger.info('Profile updated', {
            userId: authUser.userId,
            email: authUser.email,
            requestId: req.serviceContext?.requestId
          });
        }
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'PROFILE_UPDATE_FAILED');
      }
    });

    // Create User (admin only or registration)
    this.app.post('/users', async (req, res) => {
      try {
        const result = await userService.createUser(req.body);
        
        const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USER_CREATION_FAILED');
      }
    });

    // Get User by ID
    this.app.get('/users/:id', async (req, res) => {
      try {
        const result = await userService.getUserById(req.params.id);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USER_FETCH_FAILED');
      }
    });

    // Get Users with pagination
    this.app.get('/users', async (req, res) => {
      try {
        const pagination = {
          page: parseInt(req.query.page as string) || 1,
          limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
          sortBy: (req.query.sortBy as string) || 'created_at',
          sortOrder: (req.query.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
        };
        
        const result = await userService.getUsers(pagination);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USERS_FETCH_FAILED');
      }
    });

    // Update User
    this.app.put('/users/:id', async (req, res) => {
      try {
        const result = await userService.updateUser(req.params.id, req.body);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USER_UPDATE_FAILED');
      }
    });

    // Delete User
    this.app.delete('/users/:id', async (req, res) => {
      try {
        const result = await userService.deleteUser(req.params.id);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USER_DELETE_FAILED');
      }
    });

    // Verify Email
    this.app.post('/users/:id/verify-email', async (req, res) => {
      try {
        const { token } = req.body;
        const result = await userService.verifyEmail(req.params.id, token);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'EMAIL_VERIFICATION_FAILED');
      }
    });

    // Change Password
    this.app.post('/users/:id/change-password', async (req, res) => {
      try {
        const { oldPassword, newPassword } = req.body;
        const result = await userService.changePassword(req.params.id, oldPassword, newPassword);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'PASSWORD_CHANGE_FAILED');
      }
    });

    // Get User by Email (for authentication)
    this.app.get('/users/email/:email', async (req, res) => {
      try {
        const result = await userService.getUserByEmail(req.params.email);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USER_FETCH_FAILED');
      }
    });

    // Get User by Username
    this.app.get('/users/username/:username', async (req, res) => {
      try {
        const result = await userService.getUserByUsername(req.params.username);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USER_FETCH_FAILED');
      }
    });
  }

  private setupSubscriptionRoutes(subscriptionService: ISubscriptionService): void {
    // Create Subscription
    this.app.post('/subscriptions', async (req, res) => {
      try {
        const result = await subscriptionService.createSubscription(req.body);
        
        const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'SUBSCRIPTION_CREATION_FAILED');
      }
    });

    // Get Subscription by User ID
    this.app.get('/subscriptions/user/:userId', async (req, res) => {
      try {
        const result = await subscriptionService.getSubscriptionByUserId(req.params.userId);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'SUBSCRIPTION_FETCH_FAILED');
      }
    });

    // Update Subscription
    this.app.put('/subscriptions/:id', async (req, res) => {
      try {
        const result = await subscriptionService.updateSubscription(req.params.id, req.body);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'SUBSCRIPTION_UPDATE_FAILED');
      }
    });

    // Cancel Subscription
    this.app.delete('/subscriptions/:id', async (req, res) => {
      try {
        const cancelAtPeriodEnd = req.query.cancelAtPeriodEnd === 'true';
        const result = await subscriptionService.cancelSubscription(req.params.id, cancelAtPeriodEnd);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'SUBSCRIPTION_CANCELLATION_FAILED');
      }
    });

    // Get Subscription Plans
    this.app.get('/subscription-plans', async (req, res) => {
      try {
        const result = await subscriptionService.getSubscriptionPlans();
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'PLANS_FETCH_FAILED');
      }
    });

    // Get Subscription Plan by ID
    this.app.get('/subscription-plans/:id', async (req, res) => {
      try {
        const result = await subscriptionService.getSubscriptionPlan(req.params.id);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'PLAN_FETCH_FAILED');
      }
    });

    // Validate Plan Upgrade
    this.app.post('/subscriptions/validate-upgrade', async (req, res) => {
      try {
        const { currentPlanId, newPlanId } = req.body;
        const result = await subscriptionService.validatePlanUpgrade(currentPlanId, newPlanId);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'PLAN_VALIDATION_FAILED');
      }
    });

    // Calculate Proration
    this.app.post('/subscriptions/calculate-proration', async (req, res) => {
      try {
        const { userId, newPlanId } = req.body;
        const result = await subscriptionService.calculateProration(userId, newPlanId);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'PRORATION_CALCULATION_FAILED');
      }
    });

    // Get Subscription Usage
    this.app.get('/subscriptions/usage/:userId', async (req, res) => {
      try {
        const result = await subscriptionService.getSubscriptionUsage(req.params.userId);
        
        const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
        res.status(statusCode).json(result);
        
      } catch (error) {
        this.handleRouteError(error, res, 'USAGE_FETCH_FAILED');
      }
    });
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
          statusCode: error.statusCode
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
        dependencies: this.container.getRegisteredTokens()
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