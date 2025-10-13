import { ILogger } from '../interfaces';

export class Logger implements ILogger {
  private serviceName: string;

  constructor(serviceName: string = 'api-gateway') {
    this.serviceName = serviceName;
  }

  info(message: string, meta?: any): void {
    console.log(`[${new Date().toISOString()}] [INFO] [${this.serviceName}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  error(message: string, error?: any): void {
    console.error(`[${new Date().toISOString()}] [ERROR] [${this.serviceName}] ${message}`, error);
  }

  warn(message: string, meta?: any): void {
    console.warn(`[${new Date().toISOString()}] [WARN] [${this.serviceName}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.serviceName}] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
}