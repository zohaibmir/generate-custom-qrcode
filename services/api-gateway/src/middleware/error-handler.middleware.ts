import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../interfaces';

export class ErrorHandler {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  handleError = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    this.logger.error('Unhandled error occurred', {
      requestId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack
    });

    // Don't send error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { 
          details: error.message,
          stack: error.stack 
        })
      }
    });
  };

  handle404 = (req: Request, res: Response): void => {
    this.logger.warn('Route not found', {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent')
    });

    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
      }
    });
  };
}