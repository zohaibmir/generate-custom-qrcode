import { Request, Response } from 'express';
import { IDynamicQRService, ILogger } from '../interfaces';

/**
 * Dynamic QR Controller
 * 
 * Handles HTTP requests for dynamic QR operations following Clean Architecture.
 * Responsible only for HTTP layer concerns - authentication, request/response handling.
 */
export class DynamicQRController {
  constructor(
    private readonly dynamicQRService: IDynamicQRService,
    private readonly logger: ILogger
  ) {}

  // ===============================================
  // CONTENT VERSION ENDPOINTS
  // ===============================================

  /**
   * POST /dynamic/:qrCodeId/versions
   * Create a new content version
   */
  public async createContentVersion(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      const { qrCodeId } = req.params;
      
      if (!req.body.content) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: ['startDate and endDate are required']
        });
        return;
        return;
        return;
        return;
      }

      this.logger.info('Creating content version', { 
        qrCodeId,
        userId: userContext?.userId 
      });
      
      const result = await this.dynamicQRService.createContentVersion(qrCodeId, {
        ...req.body,
        createdBy: userContext?.userId
      });
      
      this.handleServiceResponse(res, result, 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create content version');
    }
  }

  /**
   * GET /dynamic/:qrCodeId/versions
   * Get all content versions for a QR code
   */
  public async getContentVersions(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      this.logger.info('Getting content versions', { qrCodeId });
      
      const result = await this.dynamicQRService.getContentVersions(qrCodeId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get content versions');
    }
  }

  /**
   * GET /dynamic/:qrCodeId/versions/active
   * Get the active content version for a QR code
   */
  public async getActiveContentVersion(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      this.logger.info('Getting active content version', { qrCodeId });
      
      const result = await this.dynamicQRService.getActiveContentVersion(qrCodeId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get active content version');
    }
  }

  /**
   * PUT /dynamic/versions/:versionId
   * Update a content version
   */
  public async updateContentVersion(req: Request, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      this.logger.info('Updating content version', { versionId });
      
      const result = await this.dynamicQRService.updateContentVersion(versionId, req.body);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to update content version');
    }
  }

  /**
   * POST /dynamic/versions/:versionId/activate
   * Activate a content version
   */
  public async activateContentVersion(req: Request, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      this.logger.info('Activating content version', { versionId });
      
      const result = await this.dynamicQRService.activateContentVersion(versionId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to activate content version');
    }
  }

  /**
   * POST /dynamic/versions/:versionId/deactivate
   * Deactivate a content version
   */
  public async deactivateContentVersion(req: Request, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      this.logger.info('Deactivating content version', { versionId });
      
      const result = await this.dynamicQRService.deactivateContentVersion(versionId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to deactivate content version');
    }
  }

  /**
   * DELETE /dynamic/versions/:versionId
   * Delete a content version
   */
  public async deleteContentVersion(req: Request, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      this.logger.info('Deleting content version', { versionId });
      
      const result = await this.dynamicQRService.deleteContentVersion(versionId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete content version');
    }
  }

  // ===============================================
  // A/B TEST ENDPOINTS
  // ===============================================

  /**
   * POST /dynamic/:qrCodeId/ab-tests
   * Create a new A/B test
   */
  public async createABTest(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const requiredFields = ['testName', 'variantAVersionId', 'variantBVersionId', 'startDate'];
      const validationErrors = this.validateRequiredFields(requiredFields, req.body);
      
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
        return;
      }

      this.logger.info('Creating A/B test', { 
        qrCodeId,
        testName: req.body.testName 
      });
      
      const result = await this.dynamicQRService.createABTest(qrCodeId, req.body);
      this.handleServiceResponse(res, result, 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create A/B test');
    }
  }

  /**
   * GET /dynamic/:qrCodeId/ab-tests
   * Get all A/B tests for a QR code
   */
  public async getABTests(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      this.logger.info('Getting A/B tests', { qrCodeId });
      
      const result = await this.dynamicQRService.getABTests(qrCodeId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get A/B tests');
    }
  }

  /**
   * PUT /dynamic/ab-tests/:testId
   * Update an A/B test
   */
  public async updateABTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      this.logger.info('Updating A/B test', { testId });
      
      const result = await this.dynamicQRService.updateABTest(testId, req.body);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to update A/B test');
    }
  }

  /**
   * POST /dynamic/ab-tests/:testId/start
   * Start an A/B test
   */
  public async startABTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      this.logger.info('Starting A/B test', { testId });
      
      const result = await this.dynamicQRService.startABTest(testId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to start A/B test');
    }
  }

  /**
   * POST /dynamic/ab-tests/:testId/pause
   * Pause an A/B test
   */
  public async pauseABTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      this.logger.info('Pausing A/B test', { testId });
      
      const result = await this.dynamicQRService.pauseABTest(testId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to pause A/B test');
    }
  }

  /**
   * POST /dynamic/ab-tests/:testId/complete
   * Complete an A/B test
   */
  public async completeABTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      const { winnerVariant } = req.body;
      this.logger.info('Completing A/B test', { testId, winnerVariant });
      
      const result = await this.dynamicQRService.completeABTest(testId, winnerVariant);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to complete A/B test');
    }
  }

  /**
   * DELETE /dynamic/ab-tests/:testId
   * Delete an A/B test
   */
  public async deleteABTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      this.logger.info('Deleting A/B test', { testId });
      
      const result = await this.dynamicQRService.deleteABTest(testId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete A/B test');
    }
  }

  // ===============================================
  // REDIRECT RULES ENDPOINTS
  // ===============================================

  /**
   * POST /dynamic/:qrCodeId/redirect-rules
   * Create a new redirect rule
   */
  public async createRedirectRule(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const requiredFields = ['ruleName', 'ruleType', 'conditions', 'targetVersionId'];
      const validationErrors = this.validateRequiredFields(requiredFields, req.body);
      
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
        return;
      }

      this.logger.info('Creating redirect rule', { 
        qrCodeId,
        ruleName: req.body.ruleName 
      });
      
      const result = await this.dynamicQRService.createRedirectRule(qrCodeId, req.body);
      this.handleServiceResponse(res, result, 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create redirect rule');
    }
  }

  /**
   * GET /dynamic/:qrCodeId/redirect-rules
   * Get all redirect rules for a QR code
   */
  public async getRedirectRules(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      this.logger.info('Getting redirect rules', { qrCodeId });
      
      const result = await this.dynamicQRService.getRedirectRules(qrCodeId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get redirect rules');
    }
  }

  /**
   * PUT /dynamic/redirect-rules/:ruleId
   * Update a redirect rule
   */
  public async updateRedirectRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      this.logger.info('Updating redirect rule', { ruleId });
      
      const result = await this.dynamicQRService.updateRedirectRule(ruleId, req.body);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to update redirect rule');
    }
  }

  /**
   * DELETE /dynamic/redirect-rules/:ruleId
   * Delete a redirect rule
   */
  public async deleteRedirectRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      this.logger.info('Deleting redirect rule', { ruleId });
      
      const result = await this.dynamicQRService.deleteRedirectRule(ruleId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete redirect rule');
    }
  }

  // ===============================================
  // CONTENT SCHEDULING ENDPOINTS
  // ===============================================

  /**
   * POST /dynamic/:qrCodeId/schedules
   * Create a new content schedule
   */
  public async createContentSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const requiredFields = ['versionId', 'scheduleName', 'startTime'];
      const validationErrors = this.validateRequiredFields(requiredFields, req.body);
      
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
        return;
      }

      this.logger.info('Creating content schedule', { 
        qrCodeId,
        scheduleName: req.body.scheduleName 
      });
      
      const result = await this.dynamicQRService.createContentSchedule(qrCodeId, req.body);
      this.handleServiceResponse(res, result, 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create content schedule');
    }
  }

  /**
   * GET /dynamic/:qrCodeId/schedules
   * Get all content schedules for a QR code
   */
  public async getContentSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      this.logger.info('Getting content schedules', { qrCodeId });
      
      const result = await this.dynamicQRService.getContentSchedules(qrCodeId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get content schedules');
    }
  }

  /**
   * PUT /dynamic/schedules/:scheduleId
   * Update a content schedule
   */
  public async updateContentSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      this.logger.info('Updating content schedule', { scheduleId });
      
      const result = await this.dynamicQRService.updateContentSchedule(scheduleId, req.body);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to update content schedule');
    }
  }

  /**
   * DELETE /dynamic/schedules/:scheduleId
   * Delete a content schedule
   */
  public async deleteContentSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      this.logger.info('Deleting content schedule', { scheduleId });
      
      const result = await this.dynamicQRService.deleteContentSchedule(scheduleId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete content schedule');
    }
  }

  // ===============================================
  // ANALYTICS & STATISTICS ENDPOINTS
  // ===============================================

  /**
   * GET /dynamic/:qrCodeId/stats
   * Get dynamic QR statistics
   */
  public async getDynamicQRStats(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      this.logger.info('Getting dynamic QR stats', { qrCodeId });
      
      const result = await this.dynamicQRService.getDynamicQRStats(qrCodeId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get dynamic QR stats');
    }
  }

  /**
   * GET /dynamic/:qrCodeId/resolve
   * Resolve QR code redirect with dynamic logic
   */
  public async resolveRedirect(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const context = this.extractRedirectContext(req);
      
      this.logger.info('Resolving QR redirect', { 
        qrCodeId,
        country: context.country 
      });
      
      const result = await this.dynamicQRService.resolveRedirect(qrCodeId, context);
      
      if (result.success && result.data) {
        // Redirect to the resolved URL
        res.redirect(302, result.data);
      } else {
        this.handleServiceResponse(res, result);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to resolve QR redirect');
    }
  }

  // ===============================================
  // HELPER METHODS
  // ===============================================

  /**
   * Extract user context from Auth System v2.0 headers
   */
  private extractUserContext(req: Request): { userId: string; email: string; subscriptionTier: string } | null {
    const userId = req.headers['x-auth-user-id'] as string;
    const email = req.headers['x-auth-user-email'] as string;
    const subscriptionTier = req.headers['x-auth-user-subscription-tier'] as string;

    if (!userId || !email) {
      return null;
    }

    return { userId, email, subscriptionTier };
  }

  /**
   * Extract redirect context from request
   */
  private extractRedirectContext(req: Request) {
    return {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.get('Referer'),
      sessionId: req.get('X-Session-ID') || req.get('Cookie')?.split('sessionId=')[1]?.split(';')[0],
      country: req.query.country as string,
      region: req.query.region as string,
      city: req.query.city as string,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate required fields in request body
   */
  private validateRequiredFields(fields: string[], body: any): string[] {
    const errors: string[] = [];
    fields.forEach(field => {
      if (!body[field]) {
        errors.push(`${field} is required`);
      }
    });
    return errors;
  }

  /**
   * Handle service response with proper HTTP status codes
   */
  private handleServiceResponse(res: Response, result: any, successStatus: number = 200): void {
    if (result.success) {
      res.status(successStatus).json(result);
    } else {
      // Map service errors to appropriate HTTP status codes
      if (result.error?.includes('not found') || result.error?.includes('Not found')) {
        res.status(404).json(result);
      } else if (result.error?.includes('unauthorized') || result.error?.includes('Unauthorized')) {
        res.status(401).json(result);
      } else if (result.error?.includes('forbidden') || result.error?.includes('Forbidden')) {
        res.status(403).json(result);
      } else if (result.error?.includes('validation') || result.error?.includes('Validation')) {
        res.status(400).json(result);
      } else if (result.error?.includes('Cannot delete') || result.error?.includes('Cannot change')) {
        res.status(400).json(result);
      } else if (result.error?.includes('No active content')) {
        res.status(404).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  }

  /**
   * Handle controller errors
   */
  private handleError(res: Response, error: any, context: string): void {
    this.logger.error(context, { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}