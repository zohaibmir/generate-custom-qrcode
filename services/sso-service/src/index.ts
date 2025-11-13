import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import DatabaseConfig from './config/database';
import config from './config/config';
import { swaggerSpec } from './config/swagger';

// Route imports
import providerRoutes from './routes/provider.routes';
import ssoRoutes from './routes/sso.routes';
import authRoutes from './routes/auth.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Service health check
 *     tags: [Health]
 *     description: Returns the health status of the SSO service and its dependencies
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sso-service',
    version: '1.0.0'
  });
});

// Swagger API Documentation
if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
  const swaggerOptions = {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2563eb; font-size: 2rem; }
      .swagger-ui .info .description { color: #4b5563; font-size: 1.1rem; line-height: 1.6; }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .swagger-ui .auth-wrapper .authorize { background: #2563eb; border-color: #2563eb; }
      .swagger-ui .auth-wrapper .authorize:hover { background: #1d4ed8; }
    `,
    customSiteTitle: 'SSO Service API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2
    }
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
  
  // JSON specification endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(swaggerSpec, null, 2));
  });

  console.log('📚 Swagger documentation available at /api-docs');
}

// API routes
app.use('/api/v1/sso/providers', providerRoutes);
app.use('/api/v1/sso', ssoRoutes);
app.use('/api/v1/auth', authRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('SSO Service error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      timestamp: new Date().toISOString()
    }
  });
});

const PORT = process.env.SSO_SERVICE_PORT || 3015;

async function startServer() {
  try {
    // Initialize database connection
    DatabaseConfig.getPool();
    console.log('Database connection established');

    // Start server
    app.listen(PORT, () => {
      console.log(`SSO Service started on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API base: http://localhost:${PORT}/api/v1`);
    });

  } catch (error) {
    console.error('Failed to start SSO service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await DatabaseConfig.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await DatabaseConfig.closePool();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

export { app };