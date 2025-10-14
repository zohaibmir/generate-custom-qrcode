import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type for multer
declare global {
  namespace Express {
    interface Request {
      file?: multer.File;
    }
  }
}
import { DependencyContainer } from './infrastructure/dependency-container';
import { Logger } from './services/logger.service';
import { DatabaseConfig } from './infrastructure/database.config';
import { FileRepository } from './repositories/file.repository';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { FileValidator } from './services/file-validator.service';
import { FileService } from './services/file.service';
import { HealthChecker } from './services/health-checker.service';
import { 
  ILogger, 
  IFileService, 
  IHealthChecker,
  FileUploadRequest,
  FileEntity,
  ValidationError,
  StorageError,
  DatabaseError,
  NotFoundError
} from './interfaces';

class FileServiceApp {
  private app: express.Application;
  private container: DependencyContainer;
  private logger: ILogger;
  private fileService!: IFileService;
  private healthChecker!: IHealthChecker;
  private upload: multer.Multer;

  constructor() {
    this.app = express();
    this.container = new DependencyContainer();
    this.logger = new Logger('file-service');
    
    this.setupDependencies();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupDependencies(): void {
    // Register services
    this.container.register('logger', () => this.logger);
    this.container.register('database', () => new DatabaseConfig());
    this.container.register('storageProvider', () => new LocalStorageProvider(this.logger));
    
    // Register repositories
    this.container.register('fileRepository', () => 
      new FileRepository(
        this.container.resolve('database'),
        this.container.resolve('logger')
      )
    );
    
    // Register validators
    this.container.register('fileValidator', () => 
      new FileValidator(this.container.resolve('logger'))
    );
    
    // Register services
    this.container.register('fileService', () => 
      new FileService(
        this.container.resolve('fileRepository'),
        this.container.resolve('storageProvider'),
        this.container.resolve('fileValidator'),
        this.container.resolve('logger')
      )
    );
    
    // Register health checker
    this.container.register('healthChecker', () => 
      new HealthChecker(this.container.resolve('logger'), this.container)
    );

    // Resolve main services
    this.fileService = this.container.resolve('fileService');
    this.healthChecker = this.container.resolve('healthChecker');

    // Setup multer for file uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        files: 1
      }
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });

    // Logging middleware
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string;
      this.logger.info('Incoming request', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthChecker.checkHealth();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        this.logger.error('Health check failed', { error });
        res.status(503).json({
          status: 'unhealthy',
          service: 'file-service',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    });

    // File upload endpoint
    this.app.post('/files', this.upload.single('file'), async (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      
      try {
        if (!req.file) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'No file provided',
            requestId
          });
        }

        const uploadRequest: FileUploadRequest = {
          originalName: req.file.originalname,
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          size: req.file.size,
          userId: req.body.userId || req.headers['x-user-id'] as string
        };

        if (!uploadRequest.userId) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'User ID is required',
            requestId
          });
        }

        const result = await this.fileService.uploadFile(uploadRequest);
        
        this.logger.info('File uploaded successfully', {
          requestId,
          fileId: result.data?.id,
          originalName: result.data?.originalName,
          size: result.data?.fileSize,
          userId: uploadRequest.userId
        });

        res.status(201).json(result);

      } catch (error) {
        this.handleRouteError(error, res, requestId, 'File upload failed');
      }
    });

    // File download endpoint
    this.app.get('/files/:fileId', async (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      const { fileId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      try {
        const result = await this.fileService.downloadFile(fileId, userId);
        
        this.logger.info('File download initiated', {
          requestId,
          fileId,
          userId,
          filename: result.data?.filename
        });

        if (result.data) {
          res.setHeader('Content-Type', result.data.mimeType);
          res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
          res.setHeader('Content-Length', result.data.size);
          
          result.data.stream.pipe(res);
        }

      } catch (error) {
        this.handleRouteError(error, res, requestId, 'File download failed');
      }
    });

    // Delete file endpoint
    this.app.delete('/files/:fileId', async (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      const { fileId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      try {
        if (!userId) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'User ID is required',
            requestId
          });
        }

        await this.fileService.deleteFile(fileId, userId);
        
        this.logger.info('File deleted successfully', {
          requestId,
          fileId,
          userId
        });

        res.status(204).send();

      } catch (error) {
        this.handleRouteError(error, res, requestId, 'File deletion failed');
      }
    });

    // List user files endpoint
    this.app.get('/files', async (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      const userId = req.headers['x-user-id'] as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      try {
        if (!userId) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'User ID is required',
            requestId
          });
        }

        const result = await this.fileService.listUserFiles(userId, page, limit);
        
        this.logger.info('Files listed successfully', {
          requestId,
          userId,
          count: result.data?.files.length || 0,
          page,
          limit
        });

        res.json(result);

      } catch (error) {
        this.handleRouteError(error, res, requestId, 'File listing failed');
      }
    });

    // Get file metadata endpoint
    this.app.get('/files/:fileId/metadata', async (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      const { fileId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      try {
        const file = await this.fileService.getFileById(fileId, userId);
        
        this.logger.info('File metadata retrieved', {
          requestId,
          fileId,
          userId
        });

        res.json({
          id: file.id,
          originalName: file.originalName,
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.size,
          uploadedAt: file.uploadedAt,
          userId: file.userId
        });

      } catch (error) {
        this.handleRouteError(error, res, requestId, 'File metadata retrieval failed');
      }
    });

    // Get storage statistics endpoint
    this.app.get('/storage/stats', async (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      const userId = req.headers['x-user-id'] as string;

      try {
        const stats = await this.fileService.getStorageStats(userId);
        
        this.logger.info('Storage stats retrieved', {
          requestId,
          userId,
          totalFiles: stats.data?.totalFiles || 0,
          totalSize: stats.data?.totalSize || 0
        });

        res.json(stats);

      } catch (error) {
        this.handleRouteError(error, res, requestId, 'Storage stats retrieval failed');
      }
    });

    // Generate presigned URL endpoint
    this.app.post('/files/:fileId/presigned-url', async (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      const { fileId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { operation, expiresIn } = req.body;

      try {
        if (!userId) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'User ID is required',
            requestId
          });
        }

        const result = await this.fileService.generatePresignedUrl(
          fileId, 
          userId, 
          operation || 'download',
          expiresIn || 3600
        );
        
        this.logger.info('Presigned URL generated', {
          requestId,
          fileId,
          userId,
          operation,
          expiresIn
        });

        res.json(result);

      } catch (error) {
        this.handleRouteError(error, res, requestId, 'Presigned URL generation failed');
      }
    });
  }

  private handleRouteError(error: unknown, res: express.Response, requestId: string, context: string): void {
    this.logger.error(context, { error, requestId });

    if (error instanceof ValidationError) {
      res.status(400).json({
        error: 'ValidationError',
        message: error.message,
        requestId
      });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        error: 'NotFoundError',
        message: error.message,
        requestId
      });
    } else if (error instanceof StorageError) {
      res.status(500).json({
        error: 'StorageError',
        message: 'File storage operation failed',
        requestId
      });
    } else if (error instanceof DatabaseError) {
      res.status(500).json({
        error: 'DatabaseError',
        message: 'Database operation failed',
        requestId
      });
    } else {
      res.status(500).json({
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        requestId
      });
    }
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      const requestId = req.headers['x-request-id'] as string;
      this.logger.warn('Route not found', {
        requestId,
        method: req.method,
        url: req.originalUrl
      });
      
      res.status(404).json({
        error: 'NotFound',
        message: 'Route not found',
        requestId
      });
    });

    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const requestId = req.headers['x-request-id'] as string;
      this.logger.error('Unhandled error', { error: err, requestId });
      
      res.status(500).json({
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        requestId
      });
    });
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3004;
    
    try {
      // Initialize database connection
      const database = this.container.resolve<DatabaseConfig>('database');
      await database.connect();
      
      this.logger.info('Database connected successfully');

      // Start server
      this.app.listen(port, () => {
        this.logger.info('File service started', {
          port,
          nodeEnv: process.env.NODE_ENV || 'development',
          maxFileSize: process.env.MAX_FILE_SIZE || '10485760',
          storagePath: process.env.FILE_STORAGE_PATH || './uploads'
        });
      });

    } catch (error) {
      this.logger.error('Failed to start file service', { error });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      const database = this.container.resolve<DatabaseConfig>('database');
      await database.disconnect();
      this.logger.info('File service stopped gracefully');
    } catch (error) {
      this.logger.error('Error during graceful shutdown', { error });
    }
  }
}

// Handle graceful shutdown
const fileService = new FileServiceApp();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await fileService.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await fileService.stop();
  process.exit(0);
});

// Start the service
fileService.start().catch((error) => {
  console.error('Failed to start file service:', error);
  process.exit(1);
});

export default FileServiceApp;