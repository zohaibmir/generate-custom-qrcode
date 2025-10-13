import { Request, Response } from 'express';
import { IHealthChecker, ILogger } from '../interfaces';

export class HealthController {
  private healthChecker: IHealthChecker;
  private logger: ILogger;

  constructor(healthChecker: IHealthChecker, logger: ILogger) {
    this.healthChecker = healthChecker;
    this.logger = logger;
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await this.healthChecker.checkHealth();
      
      const statusCode = this.getStatusCode(healthStatus.status);
      
      this.logger.info('Health check requested', {
        status: healthStatus.status,
        dependenciesCount: Object.keys(healthStatus.dependencies || {}).length
      });

      res.status(statusCode).json({
        success: healthStatus.status !== 'unhealthy',
        data: healthStatus
      });

    } catch (error) {
      this.logger.error('Health check failed', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Unable to perform health check',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async getServiceHealth(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      
      if (!serviceName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SERVICE_NAME',
            message: 'Service name is required'
          }
        });
        return;
      }

      const serviceHealth = await this.healthChecker.checkServiceHealth(serviceName);
      const statusCode = this.getStatusCode(serviceHealth.status);

      this.logger.info(`Service health check requested for ${serviceName}`, {
        status: serviceHealth.status
      });

      res.status(statusCode).json({
        success: serviceHealth.status !== 'unhealthy',
        data: serviceHealth
      });

    } catch (error) {
      this.logger.error('Service health check failed', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_HEALTH_CHECK_FAILED',
          message: 'Unable to check service health',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private getStatusCode(status: 'healthy' | 'unhealthy' | 'degraded'): number {
    switch (status) {
      case 'healthy':
        return 200;
      case 'degraded':
        return 200; // Still operational but with issues
      case 'unhealthy':
        return 503;
      default:
        return 500;
    }
  }
}