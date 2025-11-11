import { Request, Response, Router } from 'express';
import { EcommerceService } from '../services/ecommerce.service';
import { EcommerceRepository } from '../repositories/ecommerce.repository';
import { InventoryIntegrationService } from '../services/inventory-integration.service';
import { InventoryIntegrationRepository } from '../repositories/inventory-integration.repository';
import { PricingEngine } from '../utils/pricing-engine';
import { WinstonLogger } from '../utils/logger';
import { DatabaseConfig } from '../config/database.config';

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier?: string;
  };
}

const router = Router();
const logger = new WinstonLogger();
const db = DatabaseConfig.getPool();

// Initialize dependencies
const ecommerceRepository = new EcommerceRepository(db, logger);
const inventoryRepository = new InventoryIntegrationRepository(db, logger);
const pricingEngine = new PricingEngine(logger);
const inventoryService = new InventoryIntegrationService(inventoryRepository, logger);
const ecommerceService = new EcommerceService(
  ecommerceRepository,
  inventoryRepository,
  pricingEngine,
  logger
);

// Validation helper
const validateUserId = (req: AuthRequest): string => {
  return req.user?.id || 'test-user-id';
};

// ==========================================
// PRODUCT QR CODES
// ==========================================

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a product QR code
 *     description: Generate a QR code for a specific product with customizable design and analytics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - integration_id
 *               - product_id
 *               - name
 *             properties:
 *               integration_id:
 *                 type: string
 *                 format: uuid
 *                 description: Integration ID for the e-commerce platform
 *               product_id:
 *                 type: string
 *                 description: External product ID from the e-commerce platform
 *               name:
 *                 type: string
 *                 description: Display name for the QR code
 *                 example: "iPhone 15 Pro QR"
 *               qr_config:
 *                 type: object
 *                 description: QR code design configuration
 *                 properties:
 *                   size:
 *                     type: number
 *                     minimum: 100
 *                     maximum: 1000
 *                     description: QR code size in pixels
 *                   color:
 *                     type: object
 *                     properties:
 *                       foreground:
 *                         type: string
 *                         pattern: "^#[0-9A-Fa-f]{6}$"
 *                       background:
 *                         type: string
 *                         pattern: "^#[0-9A-Fa-f]{6}$"
 *               analytics_enabled:
 *                 type: boolean
 *                 description: Enable analytics tracking for this QR code
 *                 default: true
 *     responses:
 *       201:
 *         description: Product QR code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/EcommerceQRCode'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Integration or product not found
 *       500:
 *         description: Internal server error
 */
// Create Product QR
router.post('/products', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await ecommerceService.createProductQR(userId, req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to create product QR', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create product QR',
        statusCode: 500
      }
    });
  }
});

// Get User Product QRs
router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await ecommerceService.getUserEcommerceQRs(userId, 'product');

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get product QRs', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get product QRs',
        statusCode: 500
      }
    });
  }
});

// ==========================================
// COUPON QR CODES
// ==========================================

/**
 * @swagger
 * /coupons:
 *   post:
 *     summary: Create a coupon QR code
 *     description: Generate a QR code for discount coupons with usage tracking and validation
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *               - value
 *             properties:
 *               integration_id:
 *                 type: string
 *                 format: uuid
 *                 description: Integration ID (optional for standalone coupons)
 *               code:
 *                 type: string
 *                 description: Coupon code (auto-generated if not provided)
 *                 example: "SAVE20"
 *               name:
 *                 type: string
 *                 description: Coupon display name
 *                 example: "20% Off Everything"
 *               description:
 *                 type: string
 *                 description: Coupon description
 *                 example: "Save 20% on all items until end of month"
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed_amount, free_shipping, bogo]
 *                 description: Type of discount
 *               value:
 *                 type: number
 *                 description: Discount value (percentage or fixed amount)
 *                 example: 20
 *               currency:
 *                 type: string
 *                 description: Currency for fixed amount discounts
 *                 example: "USD"
 *               minimum_amount:
 *                 type: number
 *                 description: Minimum order amount required
 *               usage_limit:
 *                 type: integer
 *                 description: Maximum number of uses (null for unlimited)
 *               valid_from:
 *                 type: string
 *                 format: date-time
 *                 description: Coupon start date
 *               valid_to:
 *                 type: string
 *                 format: date-time
 *                 description: Coupon expiration date
 *               qr_config:
 *                 type: object
 *                 description: QR code design configuration
 *     responses:
 *       201:
 *         description: Coupon QR code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: Invalid coupon data
 *       500:
 *         description: Internal server error
 */
// Create Coupon QR
router.post('/coupons', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await ecommerceService.createCouponQR(userId, req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to create coupon QR', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create coupon QR',
        statusCode: 500
      }
    });
  }
});

// Get User Coupon QRs
router.get('/coupons', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await ecommerceService.getUserEcommerceQRs(userId, 'coupon');

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get coupon QRs', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get coupon QRs',
        statusCode: 500
      }
    });
  }
});

// Validate Coupon
router.post('/coupons/validate', async (req: AuthRequest, res: Response) => {
  try {
    const { couponCode } = req.body;
    const result = await ecommerceService.validateCoupon(couponCode);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to validate coupon', { error, couponCode: req.body.couponCode });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate coupon',
        statusCode: 500
      }
    });
  }
});

// ==========================================
// PAYMENT QR CODES
// ==========================================

// Create Payment QR
router.post('/payments', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await ecommerceService.createPaymentQR(userId, req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to create payment QR', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create payment QR',
        statusCode: 500
      }
    });
  }
});

// Get User Payment QRs
router.get('/payments', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await ecommerceService.getUserEcommerceQRs(userId, 'payment');

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get payment QRs', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get payment QRs',
        statusCode: 500
      }
    });
  }
});

// Process Payment
router.post('/payments/process', async (req: AuthRequest, res: Response) => {
  try {
    const result = await ecommerceService.processPayment(req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to process payment', { error, paymentData: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process payment',
        statusCode: 500
      }
    });
  }
});

// ==========================================
// GENERAL E-COMMERCE QR OPERATIONS
// ==========================================

// Get E-commerce QR by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ecommerceService.getEcommerceQR(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get e-commerce QR', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get e-commerce QR',
        statusCode: 500
      }
    });
  }
});

// Update E-commerce QR
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ecommerceService.updateEcommerceQR(id, req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to update e-commerce QR', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update e-commerce QR',
        statusCode: 500
      }
    });
  }
});

// Delete E-commerce QR
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ecommerceService.deleteEcommerceQR(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to delete e-commerce QR', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete e-commerce QR',
        statusCode: 500
      }
    });
  }
});

// Get All User E-commerce QRs
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const type = req.query.type as string | undefined;
    const result = await ecommerceService.getUserEcommerceQRs(userId, type as any);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get user e-commerce QRs', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get e-commerce QRs',
        statusCode: 500
      }
    });
  }
});

// Get Dashboard
router.get('/dashboard/overview', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await ecommerceService.getDashboard(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get dashboard', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get dashboard',
        statusCode: 500
      }
    });
  }
});

// Add documentation route at the end
/**
 * @swagger
 * /:
 *   get:
 *     summary: E-commerce service information
 *     description: Get basic information about the E-commerce QR service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service information
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         service:
 *                           type: string
 *                           example: "E-commerce QR Service"
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         features:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Product QR Codes", "Coupon QR Codes", "Payment Links"]
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const serviceInfo = {
      service: 'E-commerce QR Service',
      version: '1.0.0',
      description: 'Complete E-commerce QR functionality including product QRs, coupons, payment links, and analytics',
      features: [
        'Product QR Code Generation',
        'Inventory Integration (Shopify, WooCommerce, etc.)',
        'Coupon QR Codes with Usage Tracking',
        'Payment Link QR Codes',
        'E-commerce Analytics',
        'Real-time Synchronization',
        'Webhook Support'
      ],
      documentation: '/api-docs',
      health: '/health',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: serviceInfo
    });
  } catch (error) {
    logger.error('Failed to get service info', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_INFO_ERROR',
        message: 'Failed to retrieve service information'
      }
    });
  }
});

export default router;