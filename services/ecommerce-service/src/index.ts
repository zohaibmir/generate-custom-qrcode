import dotenv from 'dotenv';
import { EcommerceApp } from './app';
import { WinstonLogger } from './utils/logger';

// Load environment variables
dotenv.config({ path: '../../.env' });

const logger = new WinstonLogger();

async function startServer(): Promise<void> {
  try {
    const app = new EcommerceApp();
    const port = parseInt(process.env.ECOMMERCE_SERVICE_PORT || '3007', 10);
    
    await app.start(port);
    
  } catch (error) {
    logger.error('Failed to start E-commerce Service', { error });
    process.exit(1);
  }
}

// Graceful shutdown handlers
function setupShutdownHandlers(app: EcommerceApp): void {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      await app.shutdown();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', { reason, promise });
    process.exit(1);
  });
}

// Start the server
if (require.main === module) {
  startServer()
    .then(() => {
      logger.info('E-commerce Service startup initiated');
    })
    .catch((error) => {
      logger.error('Failed to start E-commerce Service', { error });
      process.exit(1);
    });
}