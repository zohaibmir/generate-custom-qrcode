import { Request, Response } from 'express';
import { IQRContentRulesService, IQRService, ILogger } from '../interfaces';

/**
 * QR Content Rules Controller
 * 
 * Handles HTTP requests for QR content rules following Clean Architecture.
 * Responsible only for HTTP layer concerns - authentication, request/response handling.
 */
export class QRContentRulesController {
  constructor(
    private readonly contentRulesService: IQRContentRulesService,
    private readonly qrService: IQRService,
    private readonly logger: ILogger
  ) {}

  /**
   * POST /qr/:id/rules
   * Create a new content rule for a QR code
   */
  public async createContentRule(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      const { id: qrCodeId } = req.params;
      const ruleData = req.body;
      const subscriptionTier = userContext?.subscriptionTier || 'free';

      this.logger.info('Creating content rule', { 
        qrCodeId,
        userId: userContext?.userId,
        ruleName: ruleData.rule_name 
      });

      // First verify the QR code exists and belongs to user
      const qrResult = await this.qrService.getQRById(qrCodeId);
      
      if (!qrResult.success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'QR_NOT_FOUND',
            message: 'QR code not found'
          }
        });
        return;
      }

      const result = await this.contentRulesService.createContentRule(qrCodeId, ruleData);
      this.handleServiceResponse(res, result, 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create content rule', 'RULE_CREATION_FAILED');
    }
  }

  /**
   * GET /qr/:id/rules
   * Get all content rules for a QR code
   */
  public async getQRContentRules(req: Request, res: Response): Promise<void> {
    try {
      const { id: qrCodeId } = req.params;
      
      this.logger.info('Getting content rules', { qrCodeId });

      const result = await this.contentRulesService.getQRContentRules(qrCodeId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch content rules', 'RULES_FETCH_FAILED');
    }
  }

  /**
   * PUT /qr/rules/:ruleId
   * Update a content rule
   */
  public async updateContentRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const updateData = req.body;

      this.logger.info('Updating content rule', { ruleId });

      const result = await this.contentRulesService.updateContentRule(ruleId, updateData);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to update content rule', 'RULE_UPDATE_FAILED');
    }
  }

  /**
   * DELETE /qr/rules/:ruleId
   * Delete a content rule
   */
  public async deleteContentRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      this.logger.info('Deleting content rule', { ruleId });

      const result = await this.contentRulesService.deleteContentRule(ruleId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete content rule', 'RULE_DELETE_FAILED');
    }
  }

  /**
   * POST /qr/:id/resolve
   * Resolve QR content based on scan context
   */
  public async resolveQRContent(req: Request, res: Response): Promise<void> {
    try {
      const { id: qrCodeId } = req.params;
      const scanContext = req.body;

      this.logger.info('Resolving QR content', { 
        qrCodeId,
        deviceType: scanContext.device?.type,
        country: scanContext.location?.country 
      });

      // Get the QR code
      const qrResult = await this.qrService.getQRById(qrCodeId);
      
      if (!qrResult.success || !qrResult.data) {
        res.status(404).json({
          success: false,
          error: {
            code: 'QR_NOT_FOUND',
            message: 'QR code not found'
          }
        });
        return;
      }

      // Resolve content using rules engine
      const result = await this.contentRulesService.resolveQRContent(qrCodeId, scanContext);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to resolve QR content', 'RESOLUTION_FAILED');
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
   * Handle service response with proper HTTP status codes
   */
  private handleServiceResponse(res: Response, result: any, successStatus: number = 200): void {
    if (result.success) {
      res.status(successStatus).json(result);
    } else {
      // Map service errors to appropriate HTTP status codes
      const statusCode = result.error?.statusCode || 
        (result.error?.message?.includes('not found') ? 404 : 
         result.error?.message?.includes('validation') ? 400 : 500);
      res.status(statusCode).json(result);
    }
  }

  /**
   * Handle controller errors with consistent error format
   */
  private handleError(res: Response, error: any, context: string, errorCode: string): void {
    this.logger.error(context, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: errorCode,
        message: context
      }
    });
  }
}