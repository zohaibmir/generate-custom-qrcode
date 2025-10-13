import { IHealthChecker, HealthStatus, IServiceRegistry, ILogger } from '../interfaces';

export class HealthChecker implements IHealthChecker {
  private serviceRegistry: IServiceRegistry;
  private logger: ILogger;

  constructor(serviceRegistry: IServiceRegistry, logger: ILogger) {
    this.serviceRegistry = serviceRegistry;
    this.logger = logger;
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const dependencies: Record<string, HealthStatus> = {};
    
    try {
      const services = this.serviceRegistry.getRegisteredServices();
      const healthChecks = services.map(async (serviceName: string) => {
        const serviceHealth = await this.checkServiceHealth(serviceName);
        dependencies[serviceName] = serviceHealth;
        return serviceHealth;
      });

      await Promise.all(healthChecks);

      const allHealthy = Object.values(dependencies).every(dep => dep.status === 'healthy');
      const anyUnhealthy = Object.values(dependencies).some(dep => dep.status === 'unhealthy');

      const overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 
        allHealthy ? 'healthy' : anyUnhealthy ? 'degraded' : 'unhealthy';

      const duration = Date.now() - startTime;
      this.logger.info(`Health check completed`, { 
        status: overallStatus, 
        duration: `${duration}ms`,
        services: Object.keys(dependencies).length
      });

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        dependencies
      };

    } catch (error) {
      this.logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        dependencies
      };
    }
  }

  async checkServiceHealth(serviceName: string): Promise<HealthStatus> {
    try {
      const isHealthy = await this.serviceRegistry.isServiceHealthy(serviceName);
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: serviceName
      };

    } catch (error) {
      this.logger.error(`Service health check failed for ${serviceName}`, error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: serviceName
      };
    }
  }
}