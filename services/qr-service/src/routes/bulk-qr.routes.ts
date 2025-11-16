import { Router } from 'express';
import { BulkQRController } from '../controllers/bulk-qr.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';
import { IBulkQRService, ILogger } from '../interfaces';

/**
 * Bulk QR Routes - Clean Architecture Implementation
 * 
 * Routes are responsible only for:
 * - Route definitions and HTTP method mappings
 * - Middleware application (auth, validation)
 * - Delegating to controllers
 * 
 * Auth System v2.0: API Gateway → JWT validation → x-auth-* headers → ServiceAuthExtractor
 */
export function createBulkQRRoutes(
  bulkQRService: IBulkQRService,
  logger: ILogger
): Router {
  const router = Router();
  const controller = new BulkQRController(bulkQRService, logger);

    // Apply ServiceAuthExtractor for all routes
  router.use(ServiceAuthExtractor.createServiceMiddleware());

  // ===============================================
  // BULK TEMPLATES ROUTES
  // ===============================================
  router.get('/templates', controller.getBulkTemplates.bind(controller));
  router.get('/templates/:templateId', controller.getBulkTemplateById.bind(controller));
  router.post('/templates', controller.createBulkTemplate.bind(controller));
  router.put('/templates/:templateId', controller.updateBulkTemplate.bind(controller));
  router.delete('/templates/:templateId', controller.deleteBulkTemplate.bind(controller));

  // ===============================================
  // BULK BATCH ROUTES
  // ===============================================
  router.post('/batches', controller.createBulkBatch.bind(controller));
  router.get('/batches', controller.getUserBulkBatches.bind(controller));
  router.get('/batches/:batchId', controller.getBulkBatch.bind(controller));
  router.post('/batches/:batchId/process', controller.processBulkBatch.bind(controller));
  router.post('/batches/:batchId/cancel', controller.cancelBulkBatch.bind(controller));
  router.delete('/batches/:batchId', controller.deleteBulkBatch.bind(controller));
  router.get('/batches/:batchId/progress', controller.getBulkBatchProgress.bind(controller));

  // ===============================================
  // BULK PROCESSING ROUTES
  // ===============================================
  router.post('/process-csv', controller.processCsvData.bind(controller));
  router.post('/validate', controller.validateBulkData.bind(controller));

  // ===============================================
  // STATISTICS ROUTES
  // ===============================================
  router.get('/stats', controller.getBulkStats.bind(controller));

  return router;
}