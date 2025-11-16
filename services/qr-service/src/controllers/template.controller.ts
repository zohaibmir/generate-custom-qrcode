import { Request, Response } from 'express';
import { IQRTemplateService, ILogger, ServiceResponse, AppError } from '../interfaces';

/**
 * QR Template Controller - Clean Architecture Implementation
 * 
 * Handles HTTP concerns for QR template operations with proper
 * separation of concerns and dependency injection.
 */
export class QRTemplateController {
  constructor(
    private readonly templateService: IQRTemplateService,
    private readonly logger: ILogger
  ) {}

  /**
   * Extract user context from Auth System v2.0
   */
  private extractUserContext(req: Request): { userId: string; userTier: string } {
    const auth = (req as any).auth;
    
    if (!auth?.userId) {
      throw new AppError('Authentication required - user ID not found', 401, 'AUTHENTICATION_REQUIRED');
    }
    
    return {
      userId: auth.userId,
      userTier: auth.subscriptionTier || 'free'
    };
  }

  /**
   * Handle service response and send appropriate HTTP response
   */
  private handleServiceResponse<T>(res: Response, result: ServiceResponse<T>): void {
    const statusCode = result.success ? 
      (result.data ? 200 : 204) : 
      (result.error?.statusCode || 500);
    
    res.status(statusCode).json(result);
  }

  /**
   * Handle controller errors with proper logging and response
   */
  private handleError(error: any, res: Response, operation: string, requestId?: string): void {
    this.logger.error(`${operation} failed`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          requestId
        }
      });
    }
  }

  /**
   * Get All Templates
   * GET /templates
   */
  getAllTemplates = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      this.logger.info('Fetching all templates', { requestId });
      
      const result = await this.templateService.getAllTemplates();
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'TEMPLATE_FETCH_ALL', requestId);
    }
  };

  /**
   * Get Templates by Category
   * GET /templates/category/:category
   */
  getTemplatesByCategory = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { category } = req.params;
      
      this.logger.info('Fetching templates by category', { 
        requestId, 
        category 
      });
      
      const result = await this.templateService.getTemplatesByCategory(category);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'TEMPLATE_FETCH_BY_CATEGORY', requestId);
    }
  };

  /**
   * Get Template by ID
   * GET /templates/:id
   */
  getTemplateById = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      
      this.logger.info('Fetching template by ID', { 
        requestId, 
        templateId: id 
      });
      
      const result = await this.templateService.getTemplateById(id);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'TEMPLATE_FETCH_BY_ID', requestId);
    }
  };

  /**
   * Create QR from Template
   * POST /templates/:id/generate
   */
  createQRFromTemplate = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const { userId } = this.extractUserContext(req);
      const customData = req.body;
      
      this.logger.info('Creating QR from template', {
        requestId,
        templateId: id,
        userId,
        hasCustomData: Object.keys(customData).length > 0
      });
      
      const result = await this.templateService.createQRFromTemplate(
        id, 
        userId, 
        customData
      );
      
      const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
      
    } catch (error) {
      this.handleError(error, res, 'TEMPLATE_QR_CREATION', requestId);
    }
  };

  /**
   * Validate Template Data
   * POST /templates/:id/validate
   */
  validateTemplateData = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const data = req.body;
      
      this.logger.info('Validating template data', {
        requestId,
        templateId: id,
        dataKeys: Object.keys(data)
      });
      
      const result = await this.templateService.validateTemplateData(id, data);
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      this.handleError(error, res, 'TEMPLATE_VALIDATION', requestId);
    }
  };
}
