import { Router } from 'express';
import { QRController } from '../controllers/qr.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';
import { IQRService, ILogger } from '../interfaces';

/**
 * QR Routes - Clean Architecture with Auth System v2.0
 * Factory function pattern for proper dependency injection
 * 
 * Authentication Flow:
 * API Gateway → JWT Validation → x-auth-* headers → ServiceAuthExtractor → req.auth
 * 
 * Routes are separated into:
 * - Public routes: No authentication required (scan/redirect)
 * - Protected routes: Require authentication (CRUD operations)
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
 * Create QR Routes with Dependency Injection
 */
export function createQRRoutes(
  qrService: IQRService,
  logger: ILogger
): Router {
  const router = Router();
  
  // Initialize controller with injected dependencies
  const qrController = new QRController(qrService, logger);

  // ==========================================
  // PUBLIC ROUTES (No Authentication Required)
  // ==========================================

  /**
   * QR Code Scanning & Redirect
   * GET /redirect/:shortId?password=xxx
   */
  router.get('/redirect/:shortId', qrController.processScan.bind(qrController));

  /**
   * QR Code Validation (Check if scannable)
   * GET /qr/:shortId/validate?password=xxx
   */
  router.get('/qr/:shortId/validate', qrController.validateQRForScan.bind(qrController));

  // ==========================================
  // PROTECTED ROUTES (Authentication Required)
  // ==========================================

  // Apply ServiceAuthExtractor to all protected routes
  router.use(ServiceAuthExtractor.createServiceMiddleware());

  /**
   * Create QR Code
   * POST /qr
   */
  router.post('/qr', requireAuth, qrController.createQR.bind(qrController));

  /**
   * Get User's QR Codes (with pagination)
   * GET /qr?page=1&limit=20&sortBy=createdAt&sortOrder=desc
   */
  router.get('/qr', requireAuth, qrController.getUserQRs.bind(qrController));

  /**
   * Get QR Code by ID
   * GET /qr/:id
   */
  router.get('/qr/:id', requireAuth, qrController.getQRById.bind(qrController));

  /**
   * Update QR Code
   * PUT /qr/:id
   */
  router.put('/qr/:id', requireAuth, qrController.updateQR.bind(qrController));

  /**
   * Delete QR Code
   * DELETE /qr/:id
   */
  router.delete('/qr/:id', requireAuth, qrController.deleteQR.bind(qrController));

  /**
   * Generate QR Code Image
   * GET /qr/:id/image?format=png
   */
  router.get('/qr/:id/image', requireAuth, qrController.generateQRImage.bind(qrController));

  /**
   * Download QR Code Image
   * GET /qr/:id/download?format=png
   */
  router.get('/qr/:id/download', requireAuth, qrController.downloadQRImage.bind(qrController));

  /**
   * Update QR Validity Settings
   * PUT /qr/:id/validity
   */
  router.put('/qr/:id/validity', requireAuth, qrController.updateValiditySettings.bind(qrController));

  /**
   * Get Validity Limits for Subscription Tier
   * GET /validity-limits/:tier
   */
  router.get('/validity-limits/:tier', requireAuth, qrController.getValidityLimits.bind(qrController));

  return router;
}

