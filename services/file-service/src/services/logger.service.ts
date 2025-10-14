import { ILogger } from '../interfaces';

export class Logger implements ILogger {
  constructor(private serviceName: string = 'file-service') {}

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry: any = {
      level: level.toLowerCase(),
      service: this.serviceName,
      message,
      timestamp
    };

    if (meta) {
      Object.assign(logEntry, meta);
    }

    return JSON.stringify(logEntry);
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  error(message: string, meta?: any): void {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }
}