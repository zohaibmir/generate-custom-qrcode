import { Router, Request, Response } from 'express';
import { RealTimeAlertsController } from '../controllers/real-time-alerts.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware, alertRuleSchema, alertRuleUpdateSchema } from '../middleware/validation.middleware';

export function createRealTimeAlertsRoutes(
  alertsController: RealTimeAlertsController
): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Alert Rules Management
  router.post(
    '/rules',
    validationMiddleware(alertRuleSchema),
    (req: Request, res: Response) => alertsController.createAlertRule(req, res)
  );

  router.put(
    '/rules/:alertRuleId',
    validationMiddleware(alertRuleUpdateSchema),
    (req: Request, res: Response) => alertsController.updateAlertRule(req, res)
  );

  router.delete(
    '/rules/:alertRuleId',
    (req: Request, res: Response) => alertsController.deleteAlertRule(req, res)
  );

  // Alert Instances Management
  router.get(
    '/alerts',
    (req: Request, res: Response) => alertsController.getActiveAlerts(req, res)
  );

  router.post(
    '/alerts/:alertInstanceId/acknowledge',
    (req: Request, res: Response) => alertsController.acknowledgeAlert(req, res)
  );

  router.post(
    '/alerts/:alertInstanceId/resolve',
    (req: Request, res: Response) => alertsController.resolveAlert(req, res)
  );

  // Alert Engine Management (Admin only)
  router.post(
    '/engine/start',
    (req: Request, res: Response) => alertsController.startAlertEngine(req, res)
  );

  router.post(
    '/engine/stop',
    (req: Request, res: Response) => alertsController.stopAlertEngine(req, res)
  );

  // Alert Testing and Templates
  router.post(
    '/test',
    validationMiddleware(alertRuleSchema),
    (req: Request, res: Response) => alertsController.testAlertRule(req, res)
  );

  router.get(
    '/templates',
    (req: Request, res: Response) => alertsController.getAlertTemplates(req, res)
  );

  return router;
}