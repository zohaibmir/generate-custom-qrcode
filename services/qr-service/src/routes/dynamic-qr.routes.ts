import { Request, Response, Router } from 'express';
import { DynamicQRService } from '../services/DynamicQRService';
import { DynamicQRRepository } from '../repositories/DynamicQRRepository';
import { Logger } from '../services/logger.service';
import { Pool } from 'pg';
import { ValidationError, BusinessLogicError } from '../interfaces';

// Extend Express Request type for user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router = Router();
const logger = new Logger();

// TODO: Inject these dependencies properly
const database = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qrgen',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

// Initialize dependencies
const dynamicQRRepository = new DynamicQRRepository(database);
const dynamicQRService = new DynamicQRService(dynamicQRRepository);

// Simple validation helper
const validateRequest = (fields: string[], req: Request): string[] => {
  const errors: string[] = [];
  fields.forEach(field => {
    if (!req.body[field]) {
      errors.push(`${field} is required`);
    }
  });
  return errors;
};

// Extract user agent and IP information
const extractContextFromRequest = (req: Request) => ({
  userAgent: req.get('User-Agent'),
  ipAddress: req.ip || req.connection.remoteAddress,
  referrer: req.get('Referer'),
  sessionId: req.get('X-Session-ID') || req.get('Cookie')?.split('sessionId=')[1]?.split(';')[0]
});

// ===============================================
// CONTENT VERSION ROUTES
// ===============================================

/**
 * @swagger
 * /qr/{qrCodeId}/versions:
 *   post:
 *     summary: Create a new content version
 *     tags: [Dynamic QR - Content Versions]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: object
 *                 description: QR code content (JSONB)
 *               redirectUrl:
 *                 type: string
 *                 description: Redirect URL for this version
 *               isActive:
 *                 type: boolean
 *                 description: Whether this version should be active
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: When to activate this version
 *     responses:
 *       201:
 *         description: Content version created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:qrCodeId/versions', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const validationErrors = validateRequest(['content'], req);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const result = await dynamicQRService.createContentVersion(qrCodeId, {
      ...req.body,
      createdBy: req.user?.id
    });

    if (!result.success) {
      const statusCode = result.error?.includes('validation') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating content version:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/{qrCodeId}/versions:
 *   get:
 *     summary: Get all content versions for a QR code
 *     tags: [Dynamic QR - Content Versions]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Content versions retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:qrCodeId/versions', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const result = await dynamicQRService.getContentVersions(qrCodeId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting content versions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/{qrCodeId}/versions/active:
 *   get:
 *     summary: Get the active content version for a QR code
 *     tags: [Dynamic QR - Content Versions]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Active content version retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:qrCodeId/versions/active', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const result = await dynamicQRService.getActiveContentVersion(qrCodeId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting active content version:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/versions/{versionId}:
 *   put:
 *     summary: Update a content version
 *     tags: [Dynamic QR - Content Versions]
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Version ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: object
 *                 description: Updated QR code content
 *               redirectUrl:
 *                 type: string
 *                 description: Updated redirect URL
 *               isActive:
 *                 type: boolean
 *                 description: Updated active status
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: Updated schedule time
 *     responses:
 *       200:
 *         description: Content version updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Version not found
 *       500:
 *         description: Internal server error
 */
router.put('/versions/:versionId', async (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const result = await dynamicQRService.updateContentVersion(versionId, req.body);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 
                        result.error?.includes('validation') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error updating content version:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/versions/{versionId}/activate:
 *   post:
 *     summary: Activate a content version
 *     tags: [Dynamic QR - Content Versions]
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Version ID
 *     responses:
 *       200:
 *         description: Content version activated successfully
 *       404:
 *         description: Version not found
 *       500:
 *         description: Internal server error
 */
router.post('/versions/:versionId/activate', async (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const result = await dynamicQRService.activateContentVersion(versionId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error activating content version:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/versions/{versionId}/deactivate:
 *   post:
 *     summary: Deactivate a content version
 *     tags: [Dynamic QR - Content Versions]
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Version ID
 *     responses:
 *       200:
 *         description: Content version deactivated successfully
 *       404:
 *         description: Version not found
 *       500:
 *         description: Internal server error
 */
router.post('/versions/:versionId/deactivate', async (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const result = await dynamicQRService.deactivateContentVersion(versionId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error deactivating content version:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/versions/{versionId}:
 *   delete:
 *     summary: Delete a content version
 *     tags: [Dynamic QR - Content Versions]
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Version ID
 *     responses:
 *       200:
 *         description: Content version deleted successfully
 *       400:
 *         description: Cannot delete version (in use by active A/B test)
 *       404:
 *         description: Version not found
 *       500:
 *         description: Internal server error
 */
router.delete('/versions/:versionId', async (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const result = await dynamicQRService.deleteContentVersion(versionId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 :
                        result.error?.includes('Cannot delete') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error deleting content version:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ===============================================
// A/B TEST ROUTES
// ===============================================

/**
 * @swagger
 * /qr/{qrCodeId}/ab-tests:
 *   post:
 *     summary: Create a new A/B test
 *     tags: [Dynamic QR - A/B Testing]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testName
 *               - variantAVersionId
 *               - variantBVersionId
 *               - startDate
 *             properties:
 *               testName:
 *                 type: string
 *                 description: Name of the A/B test
 *               description:
 *                 type: string
 *                 description: Description of the test
 *               variantAVersionId:
 *                 type: string
 *                 description: Version ID for variant A
 *               variantBVersionId:
 *                 type: string
 *                 description: Version ID for variant B
 *               trafficSplit:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Percentage of traffic for variant A (default 50)
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Test start date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Test end date (optional)
 *     responses:
 *       201:
 *         description: A/B test created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:qrCodeId/ab-tests', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const validationErrors = validateRequest(['testName', 'variantAVersionId', 'variantBVersionId', 'startDate'], req);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const result = await dynamicQRService.createABTest(qrCodeId, req.body);

    if (!result.success) {
      const statusCode = result.error?.includes('validation') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/{qrCodeId}/ab-tests:
 *   get:
 *     summary: Get all A/B tests for a QR code
 *     tags: [Dynamic QR - A/B Testing]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: A/B tests retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:qrCodeId/ab-tests', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const result = await dynamicQRService.getABTests(qrCodeId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting A/B tests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/ab-tests/{testId}:
 *   put:
 *     summary: Update an A/B test
 *     tags: [Dynamic QR - A/B Testing]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testName:
 *                 type: string
 *                 description: Updated test name
 *               description:
 *                 type: string
 *                 description: Updated description
 *               trafficSplit:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Updated traffic split
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Updated start date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Updated end date
 *     responses:
 *       200:
 *         description: A/B test updated successfully
 *       400:
 *         description: Invalid request data or test is running
 *       404:
 *         description: Test not found
 *       500:
 *         description: Internal server error
 */
router.put('/ab-tests/:testId', async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;
    const result = await dynamicQRService.updateABTest(testId, req.body);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 :
                        result.error?.includes('Cannot change') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error updating A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/ab-tests/{testId}/start:
 *   post:
 *     summary: Start an A/B test
 *     tags: [Dynamic QR - A/B Testing]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     responses:
 *       200:
 *         description: A/B test started successfully
 *       400:
 *         description: Test cannot be started (not in draft status)
 *       404:
 *         description: Test not found
 *       500:
 *         description: Internal server error
 */
router.post('/ab-tests/:testId/start', async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;
    const result = await dynamicQRService.startABTest(testId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 :
                        result.error?.includes('Only draft') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error starting A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/ab-tests/{testId}/pause:
 *   post:
 *     summary: Pause an A/B test
 *     tags: [Dynamic QR - A/B Testing]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     responses:
 *       200:
 *         description: A/B test paused successfully
 *       404:
 *         description: Test not found
 *       500:
 *         description: Internal server error
 */
router.post('/ab-tests/:testId/pause', async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;
    const result = await dynamicQRService.pauseABTest(testId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error pausing A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/ab-tests/{testId}/complete:
 *   post:
 *     summary: Complete an A/B test
 *     tags: [Dynamic QR - A/B Testing]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winnerVariant:
 *                 type: string
 *                 enum: [A, B]
 *                 description: Winning variant (optional)
 *     responses:
 *       200:
 *         description: A/B test completed successfully
 *       404:
 *         description: Test not found
 *       500:
 *         description: Internal server error
 */
router.post('/ab-tests/:testId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;
    const { winnerVariant } = req.body;
    const result = await dynamicQRService.completeABTest(testId, winnerVariant);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error completing A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/ab-tests/{testId}:
 *   delete:
 *     summary: Delete an A/B test
 *     tags: [Dynamic QR - A/B Testing]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     responses:
 *       200:
 *         description: A/B test deleted successfully
 *       400:
 *         description: Cannot delete running test
 *       404:
 *         description: Test not found
 *       500:
 *         description: Internal server error
 */
router.delete('/ab-tests/:testId', async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;
    const result = await dynamicQRService.deleteABTest(testId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 :
                        result.error?.includes('Cannot delete') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error deleting A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ===============================================
// REDIRECT RULES ROUTES
// ===============================================

/**
 * @swagger
 * /qr/{qrCodeId}/redirect-rules:
 *   post:
 *     summary: Create a new redirect rule
 *     tags: [Dynamic QR - Redirect Rules]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ruleName
 *               - ruleType
 *               - conditions
 *               - targetVersionId
 *             properties:
 *               ruleName:
 *                 type: string
 *                 description: Name of the redirect rule
 *               ruleType:
 *                 type: string
 *                 enum: [geographic, device, time, custom]
 *                 description: Type of redirect rule
 *               conditions:
 *                 type: object
 *                 description: Rule conditions (JSONB)
 *               targetVersionId:
 *                 type: string
 *                 description: Target content version ID
 *               priority:
 *                 type: number
 *                 description: Rule priority (lower number = higher priority)
 *               isEnabled:
 *                 type: boolean
 *                 description: Whether the rule is enabled
 *     responses:
 *       201:
 *         description: Redirect rule created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:qrCodeId/redirect-rules', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const validationErrors = validateRequest(['ruleName', 'ruleType', 'conditions', 'targetVersionId'], req);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const result = await dynamicQRService.createRedirectRule(qrCodeId, req.body);

    if (!result.success) {
      const statusCode = result.error?.includes('validation') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating redirect rule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/{qrCodeId}/redirect-rules:
 *   get:
 *     summary: Get all redirect rules for a QR code
 *     tags: [Dynamic QR - Redirect Rules]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Redirect rules retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:qrCodeId/redirect-rules', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const result = await dynamicQRService.getRedirectRules(qrCodeId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting redirect rules:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/redirect-rules/{ruleId}:
 *   put:
 *     summary: Update a redirect rule
 *     tags: [Dynamic QR - Redirect Rules]
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ruleName:
 *                 type: string
 *                 description: Updated rule name
 *               conditions:
 *                 type: object
 *                 description: Updated conditions
 *               targetVersionId:
 *                 type: string
 *                 description: Updated target version ID
 *               priority:
 *                 type: number
 *                 description: Updated priority
 *               isEnabled:
 *                 type: boolean
 *                 description: Updated enabled status
 *     responses:
 *       200:
 *         description: Redirect rule updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Rule not found
 *       500:
 *         description: Internal server error
 */
router.put('/redirect-rules/:ruleId', async (req: AuthRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const result = await dynamicQRService.updateRedirectRule(ruleId, req.body);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error updating redirect rule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/redirect-rules/{ruleId}:
 *   delete:
 *     summary: Delete a redirect rule
 *     tags: [Dynamic QR - Redirect Rules]
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule ID
 *     responses:
 *       200:
 *         description: Redirect rule deleted successfully
 *       404:
 *         description: Rule not found
 *       500:
 *         description: Internal server error
 */
router.delete('/redirect-rules/:ruleId', async (req: AuthRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const result = await dynamicQRService.deleteRedirectRule(ruleId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error deleting redirect rule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ===============================================
// CONTENT SCHEDULING ROUTES
// ===============================================

/**
 * @swagger
 * /qr/{qrCodeId}/schedules:
 *   post:
 *     summary: Create a new content schedule
 *     tags: [Dynamic QR - Content Scheduling]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - versionId
 *               - scheduleName
 *               - startTime
 *             properties:
 *               versionId:
 *                 type: string
 *                 description: Content version ID to schedule
 *               scheduleName:
 *                 type: string
 *                 description: Name of the schedule
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Schedule start time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: Schedule end time (optional)
 *               repeatPattern:
 *                 type: string
 *                 enum: [none, daily, weekly, monthly]
 *                 description: Repeat pattern
 *               repeatDays:
 *                 type: array
 *                 items:
 *                   type: number
 *                   minimum: 1
 *                   maximum: 7
 *                 description: Days of week for repeat (1=Monday, 7=Sunday)
 *               timezone:
 *                 type: string
 *                 description: Timezone for the schedule
 *               isActive:
 *                 type: boolean
 *                 description: Whether the schedule is active
 *     responses:
 *       201:
 *         description: Content schedule created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:qrCodeId/schedules', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const validationErrors = validateRequest(['versionId', 'scheduleName', 'startTime'], req);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const result = await dynamicQRService.createContentSchedule(qrCodeId, req.body);

    if (!result.success) {
      const statusCode = result.error?.includes('validation') ? 400 : 500;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating content schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/{qrCodeId}/schedules:
 *   get:
 *     summary: Get all content schedules for a QR code
 *     tags: [Dynamic QR - Content Scheduling]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Content schedules retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:qrCodeId/schedules', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const result = await dynamicQRService.getContentSchedules(qrCodeId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting content schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/schedules/{scheduleId}:
 *   put:
 *     summary: Update a content schedule
 *     tags: [Dynamic QR - Content Scheduling]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduleName:
 *                 type: string
 *                 description: Updated schedule name
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Updated start time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: Updated end time
 *               repeatPattern:
 *                 type: string
 *                 enum: [none, daily, weekly, monthly]
 *                 description: Updated repeat pattern
 *               repeatDays:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Updated repeat days
 *               timezone:
 *                 type: string
 *                 description: Updated timezone
 *               isActive:
 *                 type: boolean
 *                 description: Updated active status
 *     responses:
 *       200:
 *         description: Content schedule updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Schedule not found
 *       500:
 *         description: Internal server error
 */
router.put('/schedules/:scheduleId', async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const result = await dynamicQRService.updateContentSchedule(scheduleId, req.body);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error updating content schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/schedules/{scheduleId}:
 *   delete:
 *     summary: Delete a content schedule
 *     tags: [Dynamic QR - Content Scheduling]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Content schedule deleted successfully
 *       404:
 *         description: Schedule not found
 *       500:
 *         description: Internal server error
 */
router.delete('/schedules/:scheduleId', async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const result = await dynamicQRService.deleteContentSchedule(scheduleId);

    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error deleting content schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ===============================================
// ANALYTICS & STATISTICS ROUTES
// ===============================================

/**
 * @swagger
 * /qr/{qrCodeId}/stats:
 *   get:
 *     summary: Get dynamic QR statistics
 *     tags: [Dynamic QR - Analytics]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:qrCodeId/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const result = await dynamicQRService.getDynamicQRStats(qrCodeId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting dynamic QR stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /qr/{qrCodeId}/resolve:
 *   get:
 *     summary: Resolve QR code redirect with dynamic logic
 *     tags: [Dynamic QR - Resolution]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: User's country for geo-targeting
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: User's region for geo-targeting
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: User's city for geo-targeting
 *     responses:
 *       302:
 *         description: Redirect to resolved URL
 *       404:
 *         description: No active content found
 *       500:
 *         description: Internal server error
 */
router.get('/:qrCodeId/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const context = {
      ...extractContextFromRequest(req),
      country: req.query.country as string,
      region: req.query.region as string,
      city: req.query.city as string,
      timestamp: new Date().toISOString()
    };

    const result = await dynamicQRService.resolveRedirect(qrCodeId, context);

    if (!result.success) {
      const statusCode = result.error?.includes('No active content') ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    // Redirect to the resolved URL
    res.redirect(302, result.data!);
  } catch (error) {
    logger.error('Error resolving QR redirect:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;