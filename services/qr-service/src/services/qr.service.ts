import { 
  IQRService,
  IQRRepository,
  IQRGenerator,
  IShortIdGenerator,
  ILogger,
  QRCode, 
  CreateQRRequest, 
  ServiceResponse,
  PaginationOptions,
  ImageFormat,
  NotFoundError, 
  ValidationError,
  AppError,
  QRValidityCheck,
  ScanAttemptResult,
  ScheduleConfig
} from '../interfaces';
import { QRValidityService } from './qr-validity.service';
import { Logger } from './logger.service';

export class QRService implements IQRService {
  private validityService: QRValidityService;

  constructor(
    private qrRepository: IQRRepository,
    private qrGenerator: IQRGenerator,
    private shortIdGenerator: IShortIdGenerator,
    private logger: ILogger
  ) {
    this.validityService = new QRValidityService(logger);
  }

  async createQR(userId: string, qrData: CreateQRRequest): Promise<ServiceResponse<QRCode>> {
    try {
      // Validate input data
      this.validateQRData(qrData);

      this.logger.info('Creating QR code', { 
        userId, 
        type: qrData.type,
        hasCustomization: !!qrData.customization 
      });

      const shortId = await this.shortIdGenerator.generate();
      
      const qrCode = await this.qrRepository.create({
        ...qrData,
        userId,
        shortId,
        targetUrl: this.buildTargetUrl(shortId, qrData.type),
        currentScans: 0
      });

      this.logger.info('QR code created successfully', { 
        qrId: qrCode.id,
        userId,
        shortId: qrCode.shortId 
      });

      return {
        success: true,
        data: qrCode,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to create QR code', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'QR_CREATION_FAILED',
          message: 'Failed to create QR code',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getQRById(id: string): Promise<ServiceResponse<QRCode>> {
    try {
      const qrCode = await this.qrRepository.findById(id);
      
      if (!qrCode) {
        throw new NotFoundError('QR Code');
      }

      return {
        success: true,
        data: qrCode
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof NotFoundError ? 'QR_NOT_FOUND' : 'QR_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: error instanceof NotFoundError ? 404 : 500
        }
      };
    }
  }

  async getQRByShortId(shortId: string): Promise<ServiceResponse<QRCode>> {
    try {
      const qrCode = await this.qrRepository.findByShortId(shortId);
      
      if (!qrCode) {
        throw new NotFoundError('QR Code');
      }

      return {
        success: true,
        data: qrCode
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof NotFoundError ? 'QR_NOT_FOUND' : 'QR_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: error instanceof NotFoundError ? 404 : 500
        }
      };
    }
  }

  async getUserQRs(userId: string, pagination?: any): Promise<ServiceResponse<QRCode[]>> {
    try {
      const qrCodes = await this.qrRepository.findByUserId(userId, pagination);
      
      return {
        success: true,
        data: qrCodes
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QR_FETCH_FAILED',
          message: 'Failed to fetch QR codes',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async generateQRImage(qrCodeId: string, format: 'png' | 'svg' | 'pdf' = 'png'): Promise<ServiceResponse<Buffer>> {
    try {
      const qrCode = await this.qrRepository.findById(qrCodeId);
      
      if (!qrCode) {
        throw new NotFoundError('QR Code');
      }

      // Map QRDesignConfig to QRGenerationOptions
      const generationOptions = qrCode.designConfig ? {
        errorCorrectionLevel: qrCode.designConfig.errorCorrectionLevel,
        margin: qrCode.designConfig.margin,
        width: qrCode.designConfig.size,
        color: qrCode.designConfig.color ? {
          dark: qrCode.designConfig.color.foreground,
          light: qrCode.designConfig.color.background
        } : undefined
      } : undefined;

      const imageBuffer = await this.qrGenerator.generate(
        qrCode.targetUrl || qrCode.id,
        generationOptions,
        format
      );

      return {
        success: true,
        data: imageBuffer
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QR_GENERATION_FAILED',
          message: 'Failed to generate QR image',
          statusCode: 500,
          details: error
        }
      };
    }
  }

  async updateQR(id: string, qrData: Partial<CreateQRRequest>): Promise<ServiceResponse<QRCode>> {
    try {
      // First check if QR code exists
      const existingQR = await this.qrRepository.findById(id);
      if (!existingQR) {
        throw new NotFoundError('QR Code');
      }

      this.logger.info('Updating QR code', { qrId: id, updates: Object.keys(qrData) });

      const updatedQR = await this.qrRepository.update(id, qrData);

      return {
        success: true,
        data: updatedQR,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to update QR code', { 
        qrId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'QR_UPDATE_FAILED',
          message: 'Failed to update QR code',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async deleteQR(id: string): Promise<ServiceResponse<boolean>> {
    try {
      // First check if QR code exists
      const existingQR = await this.qrRepository.findById(id);
      if (!existingQR) {
        throw new NotFoundError('QR Code');
      }

      this.logger.info('Deleting QR code', { qrId: id });

      const deleted = await this.qrRepository.delete(id);

      return {
        success: true,
        data: deleted,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to delete QR code', { 
        qrId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'QR_DELETE_FAILED',
          message: 'Failed to delete QR code',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Validate QR code for scanning (check expiry, limits, etc.)
   */
  async validateQRForScan(shortId: string, password?: string): Promise<ServiceResponse<QRValidityCheck>> {
    try {
      const qrCode = await this.qrRepository.findByShortId(shortId);
      
      if (!qrCode) {
        throw new NotFoundError('QR Code');
      }

      const validityCheck = await this.validityService.validateQRCode(qrCode, password);

      return {
        success: true,
        data: validityCheck
      };
    } catch (error) {
      this.logger.error('Failed to validate QR code', {
        shortId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'QR_VALIDATION_FAILED',
          message: 'Failed to validate QR code',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Process a scan attempt (validates and increments counter)
   */
  async processScan(shortId: string, password?: string): Promise<ServiceResponse<ScanAttemptResult>> {
    try {
      const qrCode = await this.qrRepository.findByShortId(shortId);
      
      if (!qrCode) {
        throw new NotFoundError('QR Code');
      }

      const scanResult = await this.validityService.processScanAttempt(qrCode, password);
      
      // If scan is allowed, increment the counter in database
      if (scanResult.canScan && scanResult.newScanCount) {
        await this.qrRepository.incrementScanCount(qrCode.id);
      }

      return {
        success: true,
        data: scanResult
      };
    } catch (error) {
      this.logger.error('Failed to process scan', {
        shortId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SCAN_PROCESSING_FAILED',
          message: 'Failed to process QR scan',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update QR validity settings
   */
  async updateValiditySettings(
    id: string, 
    validitySettings: {
      expires_at?: Date;
      max_scans?: number;
      password?: string;
      valid_schedule?: ScheduleConfig;
      is_active?: boolean;
    },
    userSubscriptionTier: string = 'free'
  ): Promise<ServiceResponse<QRCode>> {
    try {
      // Validate the settings against subscription limits
      const validation = this.validityService.validateValidityParams(
        validitySettings,
        userSubscriptionTier
      );

      if (!validation.isValid) {
        throw new ValidationError('Invalid validity parameters', validation.errors);
      }

      // Hash password if provided
      const updateData: any = { ...validitySettings };
      if (validitySettings.password) {
        updateData.password_hash = validitySettings.password; // TODO: Implement proper hashing
        delete updateData.password;
      }

      const updatedQR = await this.qrRepository.update(id, updateData);

      this.logger.info('QR validity settings updated', {
        qrId: id,
        settings: Object.keys(validitySettings),
        subscriptionTier: userSubscriptionTier
      });

      return {
        success: true,
        data: updatedQR,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to update validity settings', {
        qrId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'VALIDITY_UPDATE_FAILED',
          message: 'Failed to update validity settings',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get validity configuration for subscription tier
   */
  getValidityLimits(subscriptionTier: string): ServiceResponse<any> {
    try {
      const limits = this.validityService.getValidityConfigForTier(subscriptionTier);
      
      return {
        success: true,
        data: limits
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIMITS_FETCH_FAILED',
          message: 'Failed to get validity limits',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private buildTargetUrl(shortId: string, type: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/r/${shortId}`;
  }

  private validateQRData(qrData: CreateQRRequest): void {
    if (!qrData.data && !qrData.title) {
      throw new ValidationError('QR code data or title is required');
    }

    if (!qrData.type) {
      throw new ValidationError('QR code type is required');
    }

    const validTypes = ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'location', 'vcard'];
    if (!validTypes.includes(qrData.type)) {
      throw new ValidationError(`Invalid QR code type. Must be one of: ${validTypes.join(', ')}`);
    }
  }
}