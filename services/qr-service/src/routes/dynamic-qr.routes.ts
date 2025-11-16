import { Router } from 'express';
import { DynamicQRController } from '../controllers/dynamic-qr.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';
import { IDynamicQRService, ILogger } from '../interfaces';

/**
 * Dynamic QR Routes - Clean Architecture Implementation
 * 
 * Routes are responsible only for:
 * - Route definitions and HTTP method mappings
 * - Middleware application (auth, validation)
 * - Delegating to controllers
 * 
 * Auth System v2.0: API Gateway → JWT validation → x-auth-* headers → ServiceAuthExtractor
 */
export function createDynamicQRRoutes(
  dynamicQRService: IDynamicQRService,
  logger: ILogger
): Router {
  const router = Router();
  const controller = new DynamicQRController(dynamicQRService, logger);

    // Apply ServiceAuthExtractor for all routes
  router.use(ServiceAuthExtractor.createServiceMiddleware());

  // ===============================================
  // CONTENT VERSION ROUTES
  // ===============================================
  router.post('/:qrCodeId/versions', controller.createContentVersion.bind(controller));
  router.get('/:qrCodeId/versions', controller.getContentVersions.bind(controller));
  router.get('/:qrCodeId/versions/active', controller.getActiveContentVersion.bind(controller));
  router.put('/versions/:versionId', controller.updateContentVersion.bind(controller));
  router.post('/versions/:versionId/activate', controller.activateContentVersion.bind(controller));
  router.post('/versions/:versionId/deactivate', controller.deactivateContentVersion.bind(controller));
  router.delete('/versions/:versionId', controller.deleteContentVersion.bind(controller));

  // ===============================================
  // A/B TEST ROUTES
  // ===============================================
  router.post('/:qrCodeId/ab-tests', controller.createABTest.bind(controller));
  router.get('/:qrCodeId/ab-tests', controller.getABTests.bind(controller));
  router.put('/ab-tests/:testId', controller.updateABTest.bind(controller));
  router.post('/ab-tests/:testId/start', controller.startABTest.bind(controller));
  router.post('/ab-tests/:testId/pause', controller.pauseABTest.bind(controller));
  router.post('/ab-tests/:testId/complete', controller.completeABTest.bind(controller));
  router.delete('/ab-tests/:testId', controller.deleteABTest.bind(controller));

  // ===============================================
  // REDIRECT RULES ROUTES
  // ===============================================
  router.post('/:qrCodeId/redirect-rules', controller.createRedirectRule.bind(controller));
  router.get('/:qrCodeId/redirect-rules', controller.getRedirectRules.bind(controller));
  router.put('/redirect-rules/:ruleId', controller.updateRedirectRule.bind(controller));
  router.delete('/redirect-rules/:ruleId', controller.deleteRedirectRule.bind(controller));

  // ===============================================
  // CONTENT SCHEDULING ROUTES
  // ===============================================
  router.post('/:qrCodeId/schedules', controller.createContentSchedule.bind(controller));
  router.get('/:qrCodeId/schedules', controller.getContentSchedules.bind(controller));
  router.put('/schedules/:scheduleId', controller.updateContentSchedule.bind(controller));
  router.delete('/schedules/:scheduleId', controller.deleteContentSchedule.bind(controller));

  // ===============================================
  // ANALYTICS & STATISTICS ROUTES
  // ===============================================
  router.get('/:qrCodeId/stats', controller.getDynamicQRStats.bind(controller));
  router.get('/:qrCodeId/resolve', controller.resolveRedirect.bind(controller));

  return router;
}