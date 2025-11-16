import { Router } from 'express';
import { QRTemplateController } from '../controllers/template.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';
import { IQRTemplateService, ILogger } from '../interfaces';

/**
 * Template Routes - Clean Architecture with Auth System v2.0
 * Factory function pattern for proper dependency injection
 */

// Authentication middleware for protected routes
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.auth?.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        statusCode: 401
      }
    });
  }
  next();
};

/**
 * Create Template Routes with Dependency Injection
 */
export function createTemplateRoutes(
  templateService: IQRTemplateService,
  logger: ILogger
): Router {
  const router = Router();
  
  // Initialize controller with injected dependencies
  const templateController = new QRTemplateController(templateService, logger);

  // ==========================================
  // PUBLIC ROUTES (No Authentication Required)
  // ==========================================

  /**
   * Get All Templates
   * GET /templates
   */
  router.get('/templates', templateController.getAllTemplates.bind(templateController));

  /**
   * Get Templates by Category
   * GET /templates/category/:category
   */
  router.get('/templates/category/:category', templateController.getTemplatesByCategory.bind(templateController));

  /**
   * Get Template by ID
   * GET /templates/:id
   */
  router.get('/templates/:id', templateController.getTemplateById.bind(templateController));

  /**
   * Validate Template Data
   * POST /templates/:id/validate
   */
  router.post('/templates/:id/validate', templateController.validateTemplateData.bind(templateController));

  // ==========================================
  // PROTECTED ROUTES (Authentication Required)
  // ==========================================

  // Apply ServiceAuthExtractor to protected routes
  router.use(ServiceAuthExtractor.createServiceMiddleware());

  /**
   * Create QR from Template
   * POST /templates/:id/generate
   */
  router.post('/templates/:id/generate', requireAuth, templateController.createQRFromTemplate.bind(templateController));

  return router;
}

