import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { IHealthChecker, ILogger } from '../interfaces';

/**
 * Health Routes - Clean Architecture
 * 
 * Provides health check endpoints for monitoring and orchestration
 */

export function createHealthRoutes(
  healthChecker: IHealthChecker,
  logger: ILogger
): Router {
  const router = Router();
  const healthController = new HealthController(healthChecker, logger);

  /**
   * Health Check Endpoint
   * GET /health
   */
  router.get('/health', healthController.checkHealth);

  /**
   * Readiness Check
   * GET /ready
   */
  router.get('/ready', healthController.checkReadiness);

  /**
   * Liveness Check
   * GET /live
   */
  router.get('/live', healthController.checkLiveness);

  return router;
}
