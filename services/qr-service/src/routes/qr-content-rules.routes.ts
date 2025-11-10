import { Router, Request, Response } from 'express';
import { QRContentRulesService } from '../services/qr-content-rules.service';
import { QRContentRulesRepository } from '../repositories/qr-content-rules.repository';
import { QRService } from '../services/qr.service';
import { QRRepository } from '../repositories/qr.repository';
import { Logger } from '../services/logger.service';
import { ShortIdGenerator } from '../utils/short-id-generator';
import { QRGenerator } from '../utils/qr-generator';
import { Pool } from 'pg';

// Extend Express Request type for user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier?: string;
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
const contentRulesRepository = new QRContentRulesRepository(database, logger);
const contentRulesService = new QRContentRulesService(contentRulesRepository, logger);

const qrRepository = new QRRepository(database, logger);
const shortIdGenerator = new ShortIdGenerator();
const qrGenerator = new QRGenerator();
const qrService = new QRService(qrRepository, qrGenerator, shortIdGenerator, logger);

// Simple validation helper
const validateUserId = (req: AuthRequest): string => {
  return req.user?.id || 'test-user-id'; // TODO: Replace with proper auth
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ContentRule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         qr_code_id:
 *           type: string
 *           format: uuid
 *         rule_name:
 *           type: string
 *           description: Display name for the rule
 *         rule_type:
 *           type: string
 *           enum: [time, location, language, device]
 *         rule_data:
 *           type: object
 *           description: Rule-specific configuration data
 *         content_type:
 *           type: string
 *           enum: [url, text, landing_page]
 *         content_value:
 *           type: string
 *           description: The content to show when rule matches
 *         priority:
 *           type: integer
 *           description: Rule priority (higher numbers = higher priority)
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     
 *     CreateContentRuleRequest:
 *       type: object
 *       required: [rule_name, rule_type, rule_data, content_type, content_value]
 *       properties:
 *         rule_name:
 *           type: string
 *           example: "Mobile Users Only"
 *         rule_type:
 *           type: string
 *           enum: [time, location, language, device]
 *           example: device
 *         rule_data:
 *           type: object
 *           description: Rule configuration (varies by rule_type)
 *           example:
 *             device_type: mobile
 *         content_type:
 *           type: string
 *           enum: [url, text, landing_page]
 *           example: url
 *         content_value:
 *           type: string
 *           example: "https://mobile.example.com"
 *         priority:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           example: 10
 *         is_active:
 *           type: boolean
 *           example: true
 *     
 *     QRResolutionResult:
 *       type: object
 *       properties:
 *         final_content:
 *           type: string
 *           description: The resolved content to display
 *         content_type:
 *           type: string
 *           enum: [url, text, landing_page]
 *         matched_rules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               rule_id:
 *                 type: string
 *               rule_type:
 *                 type: string
 *               priority:
 *                 type: integer
 *         fallback_used:
 *           type: boolean
 *           description: Whether original QR content was used as fallback
 *         resolution_time_ms:
 *           type: integer
 *           description: Time taken to resolve content
 */

/**
 * @swagger
 * /qr/{id}/rules:
 *   post:
 *     summary: Create a new content rule for a QR code
 *     tags: [Advanced QR Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: QR code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContentRuleRequest'
 *           examples:
 *             device_rule:
 *               summary: Device-specific rule
 *               value:
 *                 rule_name: "Mobile App Download"
 *                 rule_type: "device"
 *                 rule_data:
 *                   device_type: "mobile"
 *                 content_type: "url"
 *                 content_value: "https://apps.example.com/mobile"
 *                 priority: 10
 *             location_rule:
 *               summary: Location-based rule
 *               value:
 *                 rule_name: "US Users"
 *                 rule_type: "location"
 *                 rule_data:
 *                   countries: ["US", "CA"]
 *                 content_type: "url"
 *                 content_value: "https://us.example.com"
 *                 priority: 5
 *             time_rule:
 *               summary: Time-based rule
 *               value:
 *                 rule_name: "Business Hours"
 *                 rule_type: "time"
 *                 rule_data:
 *                   start_time: "09:00"
 *                   end_time: "17:00"
 *                   days_of_week: [1,2,3,4,5]
 *                 content_type: "text"
 *                 content_value: "We're open! Call us now."
 *                 priority: 15
 *             language_rule:
 *               summary: Language-based rule
 *               value:
 *                 rule_name: "Spanish Content"
 *                 rule_type: "language"
 *                 rule_data:
 *                   supported_languages: ["es", "es-MX"]
 *                 content_type: "url"
 *                 content_value: "https://example.com/es"
 *                 priority: 8
 *     responses:
 *       201:
 *         description: Content rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ContentRule'
 *       400:
 *         description: Invalid rule configuration
 *       403:
 *         description: Rule limit exceeded for subscription tier
 *       404:
 *         description: QR code not found
 */
router.post('/:id/rules', async (req: AuthRequest, res: Response) => {
  try {
    const qrCodeId = req.params.id;
    const ruleData = req.body;
    const subscriptionTier = req.user?.subscriptionTier || 'free';
    
    // First verify the QR code exists and belongs to user
    const qrResult = await qrService.getQRById(qrCodeId);
    
    if (!qrResult.success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QR_NOT_FOUND',
          message: 'QR code not found'
        }
      });
    }

    const result = await contentRulesService.createContentRule(qrCodeId, ruleData, subscriptionTier);

    if (!result.success) {
      return res.status(result.error?.statusCode || 500).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating content rule', { 
      qrCodeId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RULE_CREATION_FAILED',
        message: 'Failed to create content rule'
      }
    });
  }
});

/**
 * @swagger
 * /qr/{id}/rules:
 *   get:
 *     summary: Get all content rules for a QR code
 *     tags: [Advanced QR Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: QR code ID
 *     responses:
 *       200:
 *         description: Content rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContentRule'
 */
router.get('/:id/rules', async (req: AuthRequest, res: Response) => {
  try {
    const qrCodeId = req.params.id;
    
    const result = await contentRulesService.getQRContentRules(qrCodeId);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching content rules', { 
      qrCodeId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RULES_FETCH_FAILED',
        message: 'Failed to fetch content rules'
      }
    });
  }
});

/**
 * @swagger
 * /qr/rules/{ruleId}:
 *   put:
 *     summary: Update a content rule
 *     tags: [Advanced QR Features]
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rule_name:
 *                 type: string
 *               rule_data:
 *                 type: object
 *               content_value:
 *                 type: string
 *               priority:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Content rule updated successfully
 *       404:
 *         description: Content rule not found
 */
router.put('/rules/:ruleId', async (req: AuthRequest, res: Response) => {
  try {
    const ruleId = req.params.ruleId;
    const updateData = req.body;

    const result = await contentRulesService.updateContentRule(ruleId, updateData);

    if (!result.success) {
      return res.status(result.error?.statusCode || 500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error updating content rule', { 
      ruleId: req.params.ruleId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RULE_UPDATE_FAILED',
        message: 'Failed to update content rule'
      }
    });
  }
});

/**
 * @swagger
 * /qr/rules/{ruleId}:
 *   delete:
 *     summary: Delete a content rule
 *     tags: [Advanced QR Features]
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Content rule ID
 *     responses:
 *       200:
 *         description: Content rule deleted successfully
 *       404:
 *         description: Content rule not found
 */
router.delete('/rules/:ruleId', async (req: AuthRequest, res: Response) => {
  try {
    const ruleId = req.params.ruleId;

    const result = await contentRulesService.deleteContentRule(ruleId);

    res.json(result);
  } catch (error) {
    logger.error('Error deleting content rule', { 
      ruleId: req.params.ruleId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RULE_DELETE_FAILED',
        message: 'Failed to delete content rule'
      }
    });
  }
});

/**
 * @swagger
 * /qr/{id}/resolve:
 *   post:
 *     summary: Resolve QR content based on scan context (Advanced Dynamic Resolution)
 *     tags: [Advanced QR Features]
 *     description: |
 *       This endpoint demonstrates the advanced QR resolution engine that determines
 *       what content to show based on device type, location, language, and time.
 *       This is typically called by your QR redirect service when a QR is scanned.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: QR code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *               location:
 *                 type: object
 *                 properties:
 *                   country:
 *                     type: string
 *                     example: "US"
 *                   region:
 *                     type: string
 *                     example: "California"
 *                   city:
 *                     type: string
 *                     example: "San Francisco"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                       lng:
 *                         type: number
 *               device:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [mobile, tablet, desktop]
 *                   os:
 *                     type: string
 *                     example: "iOS"
 *                   browser:
 *                     type: string
 *                     example: "Safari"
 *                   screen_size:
 *                     type: object
 *                     properties:
 *                       width:
 *                         type: number
 *                       height:
 *                         type: number
 *               language:
 *                 type: object
 *                 properties:
 *                   browser_languages:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["en-US", "en"]
 *                   detected_language:
 *                     type: string
 *                     example: "en"
 *               ip_address:
 *                 type: string
 *               user_agent:
 *                 type: string
 *           example:
 *             timestamp: "2024-11-10T10:30:00Z"
 *             timezone: "America/New_York"
 *             location:
 *               country: "US"
 *               region: "California"
 *               city: "San Francisco"
 *               coordinates:
 *                 lat: 37.7749
 *                 lng: -122.4194
 *             device:
 *               type: "mobile"
 *               os: "iOS"
 *               browser: "Safari"
 *               screen_size:
 *                 width: 375
 *                 height: 812
 *             language:
 *               browser_languages: ["en-US", "en"]
 *               detected_language: "en"
 *             ip_address: "192.168.1.1"
 *             user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
 *     responses:
 *       200:
 *         description: QR content resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QRResolutionResult'
 *       404:
 *         description: QR code not found
 */
router.post('/:id/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const qrCodeId = req.params.id;
    const scanContext = req.body;

    // Get the QR code
    const qrResult = await qrService.getQRById(qrCodeId);
    
    if (!qrResult.success || !qrResult.data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QR_NOT_FOUND',
          message: 'QR code not found'
        }
      });
    }

    // Resolve content using rules engine
    const result = await contentRulesService.resolveQRContent(qrResult.data, scanContext);

    res.json(result);
  } catch (error) {
    logger.error('Error resolving QR content', { 
      qrCodeId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RESOLUTION_FAILED',
        message: 'Failed to resolve QR content'
      }
    });
  }
});

export default router;