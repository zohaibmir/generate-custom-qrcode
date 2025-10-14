import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DependencyContainer } from './infrastructure/dependency-container';
import { ConsoleNotificationProvider } from './infrastructure/console-notification.provider';
import { Logger } from './services/logger.service';
import { TemplateService } from './services/template.service';
import { NotificationService } from './services/notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { DatabaseConfig } from './config/database.config';
import { NotificationError, ValidationError } from './interfaces';

const app = express();
const port = process.env.PORT || 3005;

// Global variables for dependencies
let notificationService: NotificationService;
let logger: Logger;

// Initialize dependencies function
async function initializeDependencies() {
  logger = new Logger('notification-service');

  // Initialize database
  const database = DatabaseConfig.initialize(logger);
  await DatabaseConfig.testConnection();

  const notificationProvider = new ConsoleNotificationProvider(logger);
  const templateService = new TemplateService(logger);
  const notificationRepository = new NotificationRepository(database, logger);
  notificationService = new NotificationService(notificationProvider, notificationRepository, templateService, logger);

  const container = new DependencyContainer();
  container.register('notificationService', notificationService);
  container.register('logger', logger);

  logger.info('Dependencies initialized successfully');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  }
});

app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'notification-service',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    }
  });
});

// Send email endpoint
app.post('/email', async (req, res) => {
  try {
    const { to, subject, body, template, templateData } = req.body;

    const result = await notificationService.sendEmail({
      to,
      subject,
      body,
      template,
      templateData
    });

    res.json(result);
  } catch (error) {
    logger.error('Email endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error instanceof NotificationError) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send SMS endpoint
app.post('/sms', async (req, res) => {
  try {
    const { to, message } = req.body;

    const result = await notificationService.sendSMS({
      to,
      message
    });

    res.json(result);
  } catch (error) {
    logger.error('SMS endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error instanceof NotificationError) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get notification status endpoint
app.get('/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await notificationService.getNotificationStatus(messageId);

    res.json(result);
  } catch (error) {
    logger.error('Status endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error instanceof NotificationError) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user notifications endpoint
app.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;

    const result = await notificationService.getUserNotifications(
      userId,
      type as 'email' | 'sms' | undefined
    );

    res.json(result);
  } catch (error) {
    logger.error('User notifications endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error instanceof NotificationError) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Convenience endpoints for common notifications
app.post('/welcome', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required'
      });
    }

    const result = await notificationService.sendWelcomeEmail(email, name);

    res.json(result);
  } catch (error) {
    logger.error('Welcome email endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/password-reset', async (req, res) => {
  try {
    const { email, name, resetLink } = req.body;

    if (!email || !name || !resetLink) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, and resetLink are required'
      });
    }

    const result = await notificationService.sendPasswordResetEmail(email, name, resetLink);

    res.json(result);
  } catch (error) {
    logger.error('Password reset email endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/qr-created', async (req, res) => {
  try {
    const { email, userName, qrName, qrType } = req.body;

    if (!email || !userName || !qrName || !qrType) {
      return res.status(400).json({
        success: false,
        error: 'Email, userName, qrName, and qrType are required'
      });
    }

    const result = await notificationService.sendQRCreatedNotification(email, userName, qrName, qrType);

    res.json(result);
  } catch (error) {
    logger.error('QR created notification endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server function
async function startServer() {
  try {
    await initializeDependencies();

    app.listen(port, () => {
      logger.info(`🚀 Notification service started successfully on port ${port}`);
      logger.info('Available endpoints:', {
        health: '/health',
        email: 'POST /email',
        sms: 'POST /sms',
        status: 'GET /status/:messageId',
        userNotifications: 'GET /user/:userId',
        welcome: 'POST /welcome',
        passwordReset: 'POST /password-reset',
        qrCreated: 'POST /qr-created'
      });
      logger.info('Database persistence enabled for notifications');
    });
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;