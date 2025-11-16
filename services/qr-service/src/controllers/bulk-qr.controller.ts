import { Request, Response } from 'express';
import {
  IBulkQRService,
  ILogger,
  CreateBulkTemplateRequest,
  CreateBulkBatchRequest,
  BulkBatchQueryOptions
} from '../interfaces';

/**
 * Bulk QR Controller
 * 
 * Handles HTTP requests for bulk QR generation operations following Clean Architecture.
 * Responsible only for HTTP layer concerns - authentication, request/response handling.
 */
export class BulkQRController {
  constructor(
    private readonly bulkQRService: IBulkQRService,
    private readonly logger: ILogger
  ) {}

  // ===============================================
  // BULK TEMPLATES ENDPOINTS
  // ===============================================

  /**
   * GET /bulk/templates
   * Get all bulk templates (system + user)
   */
  public async getBulkTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      this.logger.info('Getting bulk templates', { userId: userContext?.userId });
      
      const result = await this.bulkQRService.getBulkTemplates(userContext?.userId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get bulk templates');
    }
  }

  /**
   * GET /bulk/templates/:templateId
   * Get bulk template by ID
   */
  public async getBulkTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      this.logger.info('Getting bulk template by ID', { templateId });
      
      const result = await this.bulkQRService.getBulkTemplateById(templateId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get bulk template');
    }
  }

  /**
   * POST /bulk/templates
   * Create new bulk template
   */
  public async createBulkTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      if (!userContext?.userId) {
        return this.handleUnauthorized(res);
      }

      const templateData: CreateBulkTemplateRequest = req.body;
      this.logger.info('Creating bulk template', { 
        userId: userContext.userId,
        templateName: templateData.name 
      });
      
      const result = await this.bulkQRService.createBulkTemplate(userContext.userId, templateData);
      this.handleServiceResponse(res, result, 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create bulk template');
    }
  }

  /**
   * PUT /bulk/templates/:templateId
   * Update bulk template
   */
  public async updateBulkTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const templateData: Partial<CreateBulkTemplateRequest> = req.body;
      this.logger.info('Updating bulk template', { templateId });
      
      const result = await this.bulkQRService.updateBulkTemplate(templateId, templateData);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to update bulk template');
    }
  }

  /**
   * DELETE /bulk/templates/:templateId
   * Delete bulk template
   */
  public async deleteBulkTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      this.logger.info('Deleting bulk template', { templateId });
      
      const result = await this.bulkQRService.deleteBulkTemplate(templateId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete bulk template');
    }
  }

  // ===============================================
  // BULK BATCH ENDPOINTS
  // ===============================================

  /**
   * POST /bulk/batches
   * Create new bulk batch
   */
  public async createBulkBatch(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      if (!userContext?.userId) {
        return this.handleUnauthorized(res);
      }

      const batchData: CreateBulkBatchRequest = req.body;
      this.logger.info('Creating bulk batch', { 
        userId: userContext.userId,
        batchName: batchData.batchName 
      });
      
      const result = await this.bulkQRService.createBulkBatch(userContext.userId, batchData);
      this.handleServiceResponse(res, result, 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create bulk batch');
    }
  }

  /**
   * GET /bulk/batches
   * Get user's bulk batches
   */
  public async getUserBulkBatches(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      if (!userContext?.userId) {
        return this.handleUnauthorized(res);
      }

      const options: BulkBatchQueryOptions = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        status: req.query.status as any,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      this.logger.info('Getting user bulk batches', { 
        userId: userContext.userId,
        options 
      });
      
      const result = await this.bulkQRService.getUserBulkBatches(userContext.userId, options);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get bulk batches');
    }
  }

  /**
   * GET /bulk/batches/:batchId
   * Get bulk batch by ID
   */
  public async getBulkBatch(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      if (!userContext?.userId) {
        return this.handleUnauthorized(res);
      }

      const { batchId } = req.params;
      this.logger.info('Getting bulk batch', { 
        batchId,
        userId: userContext.userId 
      });
      
      const result = await this.bulkQRService.getBulkBatch(batchId, userContext.userId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get bulk batch');
    }
  }

  /**
   * POST /bulk/batches/:batchId/process
   * Process bulk batch
   */
  public async processBulkBatch(req: Request, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      this.logger.info('Processing bulk batch', { batchId });
      
      const result = await this.bulkQRService.processBulkBatch(batchId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to process bulk batch');
    }
  }

  /**
   * POST /bulk/batches/:batchId/cancel
   * Cancel bulk batch processing
   */
  public async cancelBulkBatch(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      if (!userContext?.userId) {
        return this.handleUnauthorized(res);
      }

      const { batchId } = req.params;
      this.logger.info('Cancelling bulk batch', { 
        batchId,
        userId: userContext.userId 
      });
      
      const result = await this.bulkQRService.cancelBulkBatch(batchId, userContext.userId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to cancel bulk batch');
    }
  }

  /**
   * DELETE /bulk/batches/:batchId
   * Delete bulk batch
   */
  public async deleteBulkBatch(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      if (!userContext?.userId) {
        return this.handleUnauthorized(res);
      }

      const { batchId } = req.params;
      this.logger.info('Deleting bulk batch', { 
        batchId,
        userId: userContext.userId 
      });
      
      const result = await this.bulkQRService.deleteBulkBatch(batchId, userContext.userId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete bulk batch');
    }
  }

  /**
   * GET /bulk/batches/:batchId/progress
   * Get bulk batch progress
   */
  public async getBulkBatchProgress(req: Request, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      this.logger.info('Getting bulk batch progress', { batchId });
      
      const result = await this.bulkQRService.getBulkBatchProgress(batchId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get bulk batch progress');
    }
  }

  // ===============================================
  // BULK PROCESSING ENDPOINTS
  // ===============================================

  /**
   * POST /bulk/process-csv
   * Process CSV data and return parsed result
   */
  public async processCsvData(req: Request, res: Response): Promise<void> {
    try {
      const { csvData, templateId } = req.body;
      
      if (!csvData) {
        res.status(400).json({
          success: false,
          error: 'CSV data is required'
        });
        return;
      }

      this.logger.info('Processing CSV data', { 
        templateId,
        dataLength: csvData.length 
      });
      
      const result = await this.bulkQRService.processCsvData(csvData, templateId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to process CSV data');
    }
  }

  /**
   * POST /bulk/validate
   * Validate bulk data
   */
  public async validateBulkData(req: Request, res: Response): Promise<void> {
    try {
      const { data, templateId } = req.body;
      
      if (!data || !Array.isArray(data)) {
        res.status(400).json({
          success: false,
          error: 'Valid data array is required'
        });
        return;
      }

      this.logger.info('Validating bulk data', { 
        templateId,
        recordCount: data.length 
      });
      
      const result = await this.bulkQRService.validateBulkData(data, templateId);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to validate bulk data');
    }
  }

  // ===============================================
  // STATISTICS ENDPOINTS
  // ===============================================

  /**
   * GET /bulk/stats
   * Get bulk generation statistics
   */
  public async getBulkStats(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      if (!userContext?.userId) {
        return this.handleUnauthorized(res);
      }

      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      this.logger.info('Getting bulk stats', { 
        userId: userContext.userId,
        days 
      });
      
      const result = await this.bulkQRService.getBulkStats(userContext.userId, days);
      this.handleServiceResponse(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to get bulk stats');
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
      if (result.error?.includes('not found') || result.error?.includes('Not found')) {
        res.status(404).json(result);
      } else if (result.error?.includes('unauthorized') || result.error?.includes('Unauthorized')) {
        res.status(401).json(result);
      } else if (result.error?.includes('forbidden') || result.error?.includes('Forbidden')) {
        res.status(403).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  }

  /**
   * Handle unauthorized requests
   */
  private handleUnauthorized(res: Response): void {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
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