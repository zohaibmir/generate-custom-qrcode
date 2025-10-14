import { IHealthChecker, ILogger, IDependencyContainer, HealthStatus } from '../interfaces';

export class HealthChecker implements IHealthChecker {
  constructor(
    private logger: ILogger,
    private container: IDependencyContainer
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const dependencies: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check database connection
      try {
        const database = this.container.resolve<any>('database');
        const dbStartTime = Date.now();
        
        // Test database connection with a simple query
        await database.query('SELECT 1');
        
        dependencies.database = {
          status: 'healthy',
          responseTime: Date.now() - dbStartTime
        };
      } catch (error) {
        this.logger.error('Database health check failed', { error });
        dependencies.database = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        overallStatus = 'unhealthy';
      }

      // Check storage provider
      try {
        const storageProvider = this.container.resolve<any>('storageProvider');
        const storageStartTime = Date.now();
        
        // Test storage by checking if it can generate a URL
        const testUrl = storageProvider.getFileUrl('health-check-test');
        
        dependencies.storage = {
          status: 'healthy',
          responseTime: Date.now() - storageStartTime,
          provider: 'local'
        };
      } catch (error) {
        this.logger.error('Storage health check failed', { error });
        dependencies.storage = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }

      // Check file system permissions (for local storage)
      try {
        const fs = require('fs');
        const path = require('path');
        const storageDir = process.env.FILE_STORAGE_PATH || './uploads';
        
        // Check if directory exists and is writable
        fs.accessSync(storageDir, fs.constants.F_OK | fs.constants.W_OK);
        
        dependencies.filesystem = {
          status: 'healthy',
          storageDir,
          writable: true
        };
      } catch (error) {
        this.logger.warn('File system check failed', { error });
        dependencies.filesystem = {
          status: 'degraded',
          error: 'Storage directory not accessible or not writable'
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      dependencies.memory = {
        status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'healthy' : 'degraded',
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      };

      if (dependencies.memory.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }

      // Check uptime
      dependencies.uptime = {
        status: 'healthy',
        seconds: Math.floor(process.uptime()),
        formatted: this.formatUptime(process.uptime())
      };

      const totalTime = Date.now() - startTime;
      
      this.logger.info('Health check completed', {
        status: overallStatus,
        responseTime: totalTime,
        dependencyCount: Object.keys(dependencies).length
      });

      return {
        status: overallStatus,
        service: 'file-service',
        timestamp: new Date().toISOString(),
        dependencies
      };

    } catch (error) {
      this.logger.error('Health check failed', { error });
      
      return {
        status: 'unhealthy',
        service: 'file-service',
        timestamp: new Date().toISOString(),
        dependencies: {
          error: {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      };
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}