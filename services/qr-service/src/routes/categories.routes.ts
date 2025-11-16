import { Router } from 'express';
import { QRCategoryController } from '../controllers/qr-category.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';
import { IQRCategoryService, ILogger } from '../interfaces';

/**
 * QR Category Routes - Clean Architecture with Auth System v2.0
 * Factory function pattern for proper dependency injection
 * 
 * Authentication Flow:
 * API Gateway → JWT Validation → x-auth-* headers → ServiceAuthExtractor → req.auth
 * 
 * All category routes require authentication since categories are user-specific
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
 * Create Category Routes with Dependency Injection
 */
export function createCategoryRoutes(
  qrCategoryService: IQRCategoryService,
  logger: ILogger
): Router {
  const router = Router();
  
  // Initialize controller with injected dependencies
  const qrCategoryController = new QRCategoryController(qrCategoryService, logger);

  // Apply authentication middleware to all routes
  router.use(ServiceAuthExtractor.createServiceMiddleware());
  router.use(requireAuth);

  /**
   * Create Category
   * POST /
   */
  router.post('/', qrCategoryController.createCategory.bind(qrCategoryController));

  /**
   * Get User Categories
   * GET /?includeChildren=true&sortBy=name
   */
  router.get('/', qrCategoryController.getUserCategories.bind(qrCategoryController));

  /**
   * Get Category Tree Structure
   * GET /tree
   */
  router.get('/tree', qrCategoryController.getCategoryTree.bind(qrCategoryController));

  /**
   * Get Category Statistics
   * GET /stats
   */
  router.get('/stats', qrCategoryController.getCategoryStats.bind(qrCategoryController));

  /**
   * Get Category by ID
   * GET /:id
   */
  router.get('/:id', qrCategoryController.getCategoryById.bind(qrCategoryController));

  /**
   * Update Category
   * PUT /:id
   */
  router.put('/:id', qrCategoryController.updateCategory.bind(qrCategoryController));

  /**
   * Delete Category
   * DELETE /:id?transferTo=categoryId
   */
  router.delete('/:id', qrCategoryController.deleteCategory.bind(qrCategoryController));

  /**
   * Move QR Codes to Category
   * POST /:id/move-qrs
   */
  router.post('/:id/move-qrs', qrCategoryController.moveQRsToCategory.bind(qrCategoryController));

  return router;
}