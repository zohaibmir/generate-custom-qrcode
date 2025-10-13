import { 
  IHealthChecker, 
  HealthStatus, 
  ILogger,
  IDependencyContainer 
} from '../interfaces';
import { DatabaseConfig } from '../config/database.config';

export class HealthChecker implements IHealthChecker {
  constructor(
    private logger: ILogger,
    private container: IDependencyContainer
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const dependencies: { [key: string]: any } = {};

    // Check database health
    const dbStart = Date.now();
    const dbHealthy = await this.checkDatabaseHealth();
    const dbResponseTime = Date.now() - dbStart;

    dependencies.database = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      responseTime: dbResponseTime,
      error: dbHealthy ? undefined : 'Database connection failed'
    };

    // Determine overall health status
    const allHealthy = Object.values(dependencies).every(dep => dep.status === 'healthy');
    const someHealthy = Object.values(dependencies).some(dep => dep.status === 'healthy');

    const status: HealthStatus = {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      service: 'qr-service',
      timestamp: new Date().toISOString(),
      dependencies
    };

    const totalResponseTime = Date.now() - startTime;
    this.logger.info('Health check completed', {
      status: status.status,
      responseTime: totalResponseTime,
      dependencies: Object.keys(dependencies).length
    });

    return status;
  }

  async checkDatabaseHealth(): Promise<boolean> {
    try {
      return await DatabaseConfig.testConnection();
    } catch (error) {
      this.logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}