import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(__dirname, '../..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ecommerce-service' },
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export class WinstonLogger {
  info(message: string, metadata?: any): void {
    logger.info(message, metadata);
  }

  error(message: string, metadata?: any): void {
    logger.error(message, metadata);
  }

  warn(message: string, metadata?: any): void {
    logger.warn(message, metadata);
  }

  debug(message: string, metadata?: any): void {
    logger.debug(message, metadata);
  }
}