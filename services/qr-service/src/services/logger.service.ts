import { ILogger } from '../interfaces';

export class Logger implements ILogger {
  private serviceName: string;

  constructor(serviceName: string = 'qr-service') {
    this.serviceName = serviceName;
  }

  info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  error(message: string, metadata?: any): void {
    this.log('error', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  debug(message: string, metadata?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, metadata);
    }
  }

  private log(level: string, message: string, metadata?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      requestId: this.generateRequestId(),
      ...metadata
    };

    // In production, you would integrate with Azure Monitor, Application Insights, or similar
    console.log(JSON.stringify(logEntry));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}