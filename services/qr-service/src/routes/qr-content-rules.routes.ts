import { Router } from 'express';
import { QRContentRulesController } from '../controllers/qr-content-rules.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';
import { IQRContentRulesService, IQRService, ILogger } from '../interfaces';

/**
 * QR Content Rules Routes - Clean Architecture Implementation
 * 
 * Routes are responsible only for:
 * - Route definitions and HTTP method mappings
 * - Middleware application (auth, validation)
 * - Delegating to controllers
 * 
 * Auth System v2.0: API Gateway → JWT validation → x-auth-* headers → ServiceAuthExtractor
 */
export function createQRContentRulesRoutes(
  contentRulesService: IQRContentRulesService,
  qrService: IQRService,
  logger: ILogger
): Router {
  const router = Router();
  const controller = new QRContentRulesController(contentRulesService, qrService, logger);

    // Apply ServiceAuthExtractor for all routes
  router.use(ServiceAuthExtractor.createServiceMiddleware());

  // ===============================================
  // CONTENT RULES ROUTES
  // ===============================================
  router.post('/:id/rules', controller.createContentRule.bind(controller));
  router.get('/:id/rules', controller.getQRContentRules.bind(controller));
  router.put('/rules/:ruleId', controller.updateContentRule.bind(controller));
  router.delete('/rules/:ruleId', controller.deleteContentRule.bind(controller));
  router.post('/:id/resolve', controller.resolveQRContent.bind(controller));

  return router;
}

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