import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import clean architecture components
import { Logger } from './services/logger.service';
import { ServiceRegistry } from './services/service-registry.service';
import { HealthChecker } from './services/health-checker.service';
import { HealthController } from './controllers/health.controller';
import { ErrorHandler } from './middleware/error-handler.middleware';
import { RequestLogger } from './middleware/request-logger.middleware';

dotenv.config({ path: '../../.env' });

class ApiGatewayApplication {
  private app: express.Application;
  private logger!: Logger;
  private serviceRegistry!: ServiceRegistry;
  private healthChecker!: HealthChecker;
  private healthController!: HealthController;
  private errorHandler!: ErrorHandler;
  private requestLogger!: RequestLogger;

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

    this.logger.info('Clean architecture dependencies initialized');
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
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
    // Health endpoints with clean architecture
    this.app.get('/health', (req, res) => this.healthController.getHealth(req, res));
    this.app.get('/health/:serviceName', (req, res) => this.healthController.getServiceHealth(req, res));

    // Simple, working proxy routes (keeping what works while applying clean architecture principles)
    this.setupProxyRoutes();

    // 404 handler
    this.app.use(this.errorHandler.handle404);
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

    // Analytics routes - handle both base route and sub-routes
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
      await this.proxyRequest(req, res, 'notification-service', '/api/notifications', '/notifications');
    });
    
    this.app.all('/api/notifications/*', async (req, res) => {
      await this.proxyRequest(req, res, 'notification-service', '/api/notifications', '/notifications');
    });

    // Short URL redirect
    this.app.get('/r/:shortId', async (req, res) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const targetUrl = `${this.serviceRegistry.getServiceUrl('qr-service')}/redirect/${req.params.shortId}`;
      
      try {
        const response = await fetch(targetUrl);
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        this.logger.error('Redirect proxy failed', { requestId, error });
        res.status(500).json({ success: false, error: { code: 'REDIRECT_ERROR', message: 'Redirect failed' }});
      }
    });
  }

  private async proxyRequest(req: express.Request, res: express.Response, serviceName: string, fromPath: string, toPath: string): Promise<void> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const targetUrl = `${this.serviceRegistry.getServiceUrl(serviceName)}${req.path.replace(fromPath, toPath)}`;
    
    try {
      this.logger.info('Proxying request', { requestId, service: serviceName, method: req.method, path: req.path });
      
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
      });
      
      const data = await response.json();
      this.logger.info('Request completed', { requestId, service: serviceName, status: response.status });
      res.status(response.status).json(data);
      
    } catch (error) {
      this.logger.error('Proxy request failed', { 
        requestId, 
        service: serviceName, 
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