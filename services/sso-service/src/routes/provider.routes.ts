import { Router } from 'express';
import { SSOProviderController } from '../controllers/sso-provider.controller';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateProviderRequest:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - configuration
 *       properties:
 *         name:
 *           type: string
 *           description: Provider display name
 *           example: "Company Azure AD"
 *         type:
 *           type: string
 *           enum: [SAML, OAUTH2, OIDC, LDAP, GOOGLE, MICROSOFT, GITHUB]
 *           description: Authentication provider type
 *           example: "SAML"
 *         configuration:
 *           type: object
 *           description: Provider-specific configuration
 *           example:
 *             entryPoint: "https://login.microsoftonline.com/tenant-id/saml2"
 *             issuer: "company-azure-ad"
 *             cert: "-----BEGIN CERTIFICATE-----..."
 *         metadata:
 *           type: object
 *           description: Additional provider metadata
 *           example:
 *             attributeMapping:
 *               email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
 */

export default function providerRoutes(controller: SSOProviderController): Router {
  const router = Router();

  /**
   * @swagger
   * /api/v1/sso/providers/organizations/{organizationId}:
   *   get:
   *     summary: Get all SSO providers for organization
   *     tags: [Providers]
   *     description: Retrieve all SSO providers for a specific organization
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: organizationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Organization identifier
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [SAML, OAUTH2, OIDC, LDAP, GOOGLE, MICROSOFT, GITHUB]
   *         description: Filter by provider type
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [ACTIVE, INACTIVE, TESTING]
   *         description: Filter by provider status
   *     responses:
   *       200:
   *         description: Successfully retrieved providers
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/SSOProvider'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Organization not found
   *       500:
   *         description: Internal server error
   */
  // Provider management routes
  router.get('/organizations/:organizationId', (req, res) => controller.getProviders(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/organizations/{organizationId}/enabled:
   *   get:
   *     summary: Get enabled SSO providers for organization
   *     tags: [Providers]
   *     description: Retrieve only active/enabled SSO providers for a specific organization
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: organizationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Organization identifier
   *     responses:
   *       200:
   *         description: Successfully retrieved enabled providers
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/SSOProvider'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Organization not found
   */
  router.get('/organizations/:organizationId/enabled', (req, res) => controller.getEnabledProviders(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/{id}:
   *   get:
   *     summary: Get specific SSO provider
   *     tags: [Providers]
   *     description: Retrieve details of a specific SSO provider
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Successfully retrieved provider
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/SSOProvider'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider not found
   */
  router.get('/:id', (req, res) => controller.getProvider(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/organizations/{organizationId}:
   *   post:
   *     summary: Create new SSO provider
   *     tags: [Providers]
   *     description: Create a new SSO authentication provider for an organization
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: organizationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Organization identifier
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProviderRequest'
   *     responses:
   *       201:
   *         description: Provider created successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/SSOProvider'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       409:
   *         description: Provider with same name already exists
   */
  router.post('/organizations/:organizationId', (req, res) => controller.createProvider(req as any, res));

  /**
   * @swagger
   * /api/v1/sso/providers/{id}:
   *   put:
   *     summary: Update SSO provider
   *     tags: [Providers]
   *     description: Update an existing SSO provider configuration
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Provider identifier
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProviderRequest'
   *     responses:
   *       200:
   *         description: Provider updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/SSOProvider'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider not found
   */
  router.put('/:id', (req, res) => controller.updateProvider(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/{id}:
   *   delete:
   *     summary: Delete SSO provider
   *     tags: [Providers]
   *     description: Delete an SSO provider (soft delete - archives the provider)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Provider deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider not found
   *       409:
   *         description: Cannot delete provider with active users
   */
  router.delete('/:id', (req, res) => controller.deleteProvider(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/{id}/test:
   *   post:
   *     summary: Test SSO provider connection
   *     tags: [Providers]
   *     description: Test the connection and configuration of an SSO provider
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Provider test successful
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         testResult:
   *                           type: string
   *                           enum: [success, failure]
   *                         message:
   *                           type: string
   *                         details:
   *                           type: object
   *       400:
   *         description: Provider configuration invalid
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider not found
   */
  // Provider actions
  router.post('/:id/test', (req, res) => controller.testProvider(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/{id}/enable:
   *   post:
   *     summary: Enable SSO provider
   *     tags: [Providers]
   *     description: Enable an SSO provider for authentication
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Provider enabled successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider not found
   */
  router.post('/:id/enable', (req, res) => controller.enableProvider(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/{id}/disable:
   *   post:
   *     summary: Disable SSO provider
   *     tags: [Providers]
   *     description: Disable an SSO provider from accepting new authentications
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Provider disabled successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider not found
   */
  router.post('/:id/disable', (req, res) => controller.disableProvider(req, res));

  /**
   * @swagger
   * /api/v1/sso/providers/organizations/{organizationId}/{id}/default:
   *   post:
   *     summary: Set default SSO provider
   *     tags: [Providers]
   *     description: Set a specific provider as the default SSO provider for an organization
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: organizationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Organization identifier
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Provider identifier
   *     responses:
   *       200:
   *         description: Default provider set successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Provider or organization not found
   */
  router.post('/organizations/:organizationId/:id/default', (req, res) => controller.setDefaultProvider(req, res));

  // Provider information
  router.get('/types', (req, res) => controller.getSupportedTypes(req, res));
  router.get('/templates/:type', (req, res) => controller.getProviderTemplate(req, res));
  router.get('/organizations/:organizationId/stats', (req, res) => controller.getProviderStats(req, res));
  router.get('/:id/login-stats', (req, res) => controller.getProviderLoginStats(req, res));

  return router;
}