import { Request, Response } from 'express';
import { IHealthChecker, ILogger } from '../interfaces';

/**
 * Health Controller - Clean Architecture Implementation
 * 
 * Handles health check endpoints with proper error handling
 * and monitoring capabilities.
 */
export class HealthController {
  constructor(
    private readonly healthChecker: IHealthChecker,
    private readonly logger: ILogger
  ) {}

  /**
   * Health Check Endpoint
   * GET /health
   * 
   * Returns service health status including dependencies
   */
  checkHealth = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      this.logger.info('Health check requested', { requestId });
      
      const health = await this.healthChecker.checkHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        success: true,
        data: health
      });
      
    } catch (error) {
      this.logger.error('Health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId 
      });
      
      res.status(503).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed',
          statusCode: 503,
          requestId
        }
      });
    }
  };

  /**
   * Readiness Check
   * GET /ready
   * 
   * Returns whether the service is ready to accept requests
   */
  checkReadiness = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      this.logger.info('Readiness check requested', { requestId });
      
      const isReady = await this.healthChecker.checkDatabaseHealth();
      
      if (isReady) {
        res.status(200).json({
          success: true,
          data: {
            status: 'ready',
            timestamp: new Date().toISOString(),
            service: 'qr-service'
          }
        });
      } else {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_NOT_READY',
            message: 'Service is not ready',
            statusCode: 503
          }
        });
      }
      
    } catch (error) {
      this.logger.error('Readiness check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId 
      });
      
      res.status(503).json({
        success: false,
        error: {
          code: 'READINESS_CHECK_FAILED',
          message: 'Readiness check failed',
          statusCode: 503,
          requestId
        }
      });
    }
  };

  /**
   * Liveness Check
   * GET /live
   * 
   * Simple liveness probe for Kubernetes/container orchestration
   */
  checkLiveness = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: {
        status: 'alive',
        timestamp: new Date().toISOString(),
        service: 'qr-service'
      }
    });
  };
}