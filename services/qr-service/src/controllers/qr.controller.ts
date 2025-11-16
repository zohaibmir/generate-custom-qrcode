import { Request, Response, NextFunction } from 'express';
import { 
  IQRService, 
  ServiceResponse, 
  QRCode, 
  CreateQRRequest,
  AppError,
  ValidationError,
  ILogger
} from '../interfaces';

/**
 * QR Controller - Clean Architecture Implementation
 * 
 * Following SOLID Principles:
 * - Single Responsibility: Only handles HTTP concerns for QR operations
 * - Open/Closed: Extensible without modifying existing code
 * - Liskov Substitution: Can be substituted with any IQRController implementation
 * - Interface Segregation: Uses focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
export class QRController {
  constructor(
    private readonly qrService: IQRService,
    private readonly logger: ILogger
  ) {}

  /**
   * Extract user ID and subscription tier from Auth System v2.0
   * API Gateway → ServiceAuthExtractor → req.auth
   */
  private extractUserContext(req: Request): { userId: string; userTier: string } {
    const auth = (req as any).auth;
    
    if (!auth?.userId) {
      throw new ValidationError('Authentication required - user ID not found');
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
   * Create QR Code
   * POST /qr
   */
  createQR = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { userId, userTier } = this.extractUserContext(req);
      const qrData: CreateQRRequest = req.body;
      
      this.logger.info('Creating QR code', {
        requestId,
        userId,
        userTier,
        qrType: qrData.type
      });

      const result = await this.qrService.createQR(userId, qrData, userTier);
      
      const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
      
    } catch (error) {
      this.handleError(error, res, 'QR_CREATION', requestId);
    }
  };

  /**
   * Get QR Code by ID
   * GET /qr/:id
   */
  getQRById = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      
      this.logger.info('Fetching QR code by ID', {
        requestId,
        qrId: id
      });

      const result = await this.qrService.getQRById(id);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'QR_FETCH_BY_ID', requestId);
    }
  };

  /**
   * Get user's QR Codes with pagination
   * GET /qr
   */
  getUserQRs = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { userId } = this.extractUserContext(req);
      
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as string || 'desc') as 'asc' | 'desc'
      };
      
      this.logger.info('Fetching user QR codes', {
        requestId,
        userId,
        pagination
      });

      const result = await this.qrService.getUserQRs(userId, pagination);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'USER_QR_FETCH', requestId);
    }
  };

  /**
   * Update QR Code
   * PUT /qr/:id
   */
  updateQR = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      this.logger.info('Updating QR code', {
        requestId,
        qrId: id,
        updateFields: Object.keys(updateData)
      });

      const result = await this.qrService.updateQR(id, updateData);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'QR_UPDATE', requestId);
    }
  };

  /**
   * Delete QR Code
   * DELETE /qr/:id
   */
  deleteQR = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      
      this.logger.info('Deleting QR code', {
        requestId,
        qrId: id
      });

      const result = await this.qrService.deleteQR(id);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'QR_DELETE', requestId);
    }
  };

  /**
   * Generate QR Code Image
   * GET /qr/:id/image
   */
  generateQRImage = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const format = (req.query.format as any) || 'png';
      
      this.logger.info('Generating QR code image', {
        requestId,
        qrId: id,
        format
      });

      const result = await this.qrService.generateQRImage(id, format);
      
      if (result.success && result.data) {
        res.set({
          'Content-Type': `image/${format}`,
          'Content-Disposition': `inline; filename="qr-${id}.${format}"`,
          'Cache-Control': 'public, max-age=3600'
        });
        res.send(result.data);
      } else {
        this.handleServiceResponse(res, result);
      }
      
    } catch (error) {
      this.handleError(error, res, 'QR_IMAGE_GENERATION', requestId);
    }
  };

  /**
   * Download QR Code Image
   * GET /qr/:id/download
   */
  downloadQRImage = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const format = (req.query.format as any) || 'png';
      
      this.logger.info('Downloading QR code image', {
        requestId,
        qrId: id,
        format
      });

      const result = await this.qrService.generateQRImage(id, format);
      
      if (result.success && result.data) {
        res.set({
          'Content-Type': `image/${format}`,
          'Content-Disposition': `attachment; filename="qr-code-${id}.${format}"`,
          'Content-Length': result.data.length.toString()
        });
        res.send(result.data);
      } else {
        this.handleServiceResponse(res, result);
      }
      
    } catch (error) {
      this.handleError(error, res, 'QR_DOWNLOAD', requestId);
    }
  };

  /**
   * Process QR Code Scan (with validity checking)
   * GET /redirect/:shortId
   */
  processScan = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { shortId } = req.params;
      const password = req.query.password as string;
      
      this.logger.info('Processing QR code scan', {
        requestId,
        shortId,
        hasPassword: !!password
      });

      // Use the QR validity service through the main service
      const result = await this.qrService.processScan(shortId, password);
      
      if (result.success && result.data?.canScan) {
        // Get the QR data for redirect
        const qrResult = await this.qrService.getQRByShortId(shortId);
        
        if (qrResult.success && qrResult.data) {
          this.logger.info('QR scan successful', { 
            requestId,
            shortId,
            qrId: qrResult.data.id,
            scans: result.data.newScanCount
          });
          
          res.json({ 
            success: true,
            message: 'QR scan successful',
            redirectTo: qrResult.data.targetUrl,
            scans: result.data.newScanCount
          });
        } else {
          res.status(404).json({
            success: false,
            error: { message: 'QR code not found' }
          });
        }
      } else {
        // QR scan was blocked
        res.status(403).json({
          success: false,
          error: {
            message: result.data?.message || 'QR code scan not allowed',
            reason: result.data?.reason,
            validityCheck: result.data?.validityCheck
          }
        });
      }
      
    } catch (error) {
      this.handleError(error, res, 'QR_SCAN_PROCESSING', requestId);
    }
  };

  /**
   * Validate QR Code (check if scannable without incrementing count)
   * GET /qr/:shortId/validate
   */
  validateQRForScan = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { shortId } = req.params;
      const password = req.query.password as string;
      
      this.logger.info('Validating QR code for scan', {
        requestId,
        shortId,
        hasPassword: !!password
      });

      const result = await this.qrService.validateQRForScan(shortId, password);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'QR_VALIDATION', requestId);
    }
  };

  /**
   * Update QR Validity Settings
   * PUT /qr/:id/validity
   */
  updateValiditySettings = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const { userId, userTier } = this.extractUserContext(req);
      const validityData = req.body;
      
      this.logger.info('Updating QR validity settings', {
        requestId,
        qrId: id,
        userId,
        userTier,
        settings: Object.keys(validityData)
      });

      const result = await this.qrService.updateValiditySettings(
        id, 
        validityData,
        userTier
      );
      
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'VALIDITY_SETTINGS_UPDATE', requestId);
    }
  };

  /**
   * Get Validity Limits for Subscription Tier
   * GET /validity-limits/:tier
   */
  getValidityLimits = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { tier } = req.params;
      
      this.logger.info('Fetching validity limits', {
        requestId,
        tier
      });

      const result = this.qrService.getValidityLimits(tier);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'VALIDITY_LIMITS_FETCH', requestId);
    }
  };
}