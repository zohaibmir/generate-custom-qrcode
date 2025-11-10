import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { DependencyContainer } from './services/dependency-container.service';
import { 
  createOrganizationRoutes, 
  createMemberRoutes, 
  createInvitationRoutes, 
  createHealthRoutes,
  createTeamCollaborationRoutes
} from './routes';

export class ExpressApp {
  private app: Express;
  private container: DependencyContainer;

  constructor(container: DependencyContainer) {
    this.app = express();
    this.container = container;
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const logger = this.container.getLogger();
      logger.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  private initializeRoutes(): void {
    const logger = this.container.getLogger();

    // Initialize controllers
    const organizationController = this.container.getOrganizationController();
    const memberController = this.container.getMemberController();
    const invitationController = this.container.getInvitationController();
    const healthController = this.container.getHealthController();
    const teamCollaborationController = this.container.getTeamCollaborationController();

    // Mount routes
    this.app.use('/health', createHealthRoutes(healthController));
    this.app.use('/api/v1/organizations', createOrganizationRoutes(organizationController));
    this.app.use('/api/v1/members', createMemberRoutes(memberController));
    this.app.use('/api/v1/invitations', createInvitationRoutes(invitationController));
    
    // Team collaboration routes (QR Libraries, Permissions, Dashboard)
    this.app.use('/api/v1', createTeamCollaborationRoutes(teamCollaborationController));

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'Team Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    logger.info('Routes initialized successfully');
  }

  private initializeErrorHandling(): void {
    const logger = this.container.getLogger();

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      logger.warn(`404 - Route not found`, {
        method: req.method,
        path: req.originalUrl
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`
        }
      });
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path
      });

      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message
        }
      });
    });
  }

  public getApp(): Express {
    return this.app;
  }

  public async start(port: number = 3006): Promise<void> {
    const logger = this.container.getLogger();

    return new Promise((resolve, reject) => {
      const server = this.app.listen(port, () => {
        logger.info(`Team Service started successfully`, {
          port,
          env: process.env.NODE_ENV || 'development',
          pid: process.pid
        });
        resolve();
      });

      server.on('error', (error: any) => {
        logger.error('Failed to start server', { error: error.message });
        reject(error);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });
    });
  }
}