import { IServiceRegistry, ServiceEndpoint, ILogger } from '../interfaces';

export class ServiceRegistry implements IServiceRegistry {
  private services: Map<string, ServiceEndpoint> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.initializeServices();
  }

  private initializeServices(): void {
    const services: ServiceEndpoint[] = [
      {
        name: 'user-service',
        url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
        healthPath: '/health',
        timeout: 5000
      },
      {
        name: 'qr-service',
        url: process.env.QR_SERVICE_URL || 'http://localhost:3002',
        healthPath: '/health',
        timeout: 5000
      },
      {
        name: 'analytics-service',
        url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3003',
        healthPath: '/health',
        timeout: 5000
      },
      {
        name: 'file-service',
        url: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
        healthPath: '/health',
        timeout: 5000
      },
      {
        name: 'notification-service',
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
        healthPath: '/health',
        timeout: 5000
      },
      {
        name: 'team-service',
        url: process.env.TEAM_SERVICE_URL || 'http://localhost:3006',
        healthPath: '/health',
        timeout: 5000
      },
      {
        name: 'api-service',
        url: process.env.API_SERVICE_URL || 'http://localhost:3007',
        healthPath: '/health',
        timeout: 5000
      },
      {
        name: 'landing-page-service',
        url: process.env.LANDING_PAGE_SERVICE_URL || 'http://localhost:3010',
        healthPath: '/health',
        timeout: 5000
      }
    ];

    services.forEach(service => {
      this.services.set(service.name, service);
      this.healthStatus.set(service.name, true); // Assume healthy initially
    });

    this.logger.info('Service registry initialized', { services: services.map(s => s.name) });
  }

  getServiceUrl(serviceName: string): string {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found in registry`);
    }
    this.logger.info('Service URL resolved', { serviceName, url: service.url });
    return service.url;
  }

  async isServiceHealthy(serviceName: string): Promise<boolean> {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), service.timeout || 5000);

      const response = await fetch(`${service.url}${service.healthPath}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const isHealthy = response.ok;
      this.healthStatus.set(serviceName, isHealthy);
      
      return isHealthy;
    } catch (error) {
      this.logger.error(`Health check failed for ${serviceName}`, error);
      this.healthStatus.set(serviceName, false);
      return false;
    }
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  getServiceEndpoint(serviceName: string): ServiceEndpoint | undefined {
    return this.services.get(serviceName);
  }
}