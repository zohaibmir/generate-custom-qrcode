import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../interfaces';

export class RequestLogger {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  logRequest = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Add request ID to headers for tracking
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    this.logger.info('Request started', {
      requestId,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    });

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      this.logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  };

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}