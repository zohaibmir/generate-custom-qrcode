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
import * as bcrypt from 'bcrypt';

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

  async createQR(userId: string, qrData: CreateQRRequest, subscriptionTier?: string): Promise<ServiceResponse<QRCode>> {
    try {
      // Validate input data
      this.validateQRData(qrData);

      // Check plan limits before creation
      const limitCheck = await this.checkPlanLimits(userId, subscriptionTier || 'free');
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: {
            code: 'QR_LIMIT_EXCEEDED',
            message: limitCheck.message,
            statusCode: 403,
            details: {
              currentCount: limitCheck.currentCount,
              limit: limitCheck.limit,
              subscriptionTier: subscriptionTier || 'free'
            }
          }
        };
      }

      this.logger.info('Creating QR code', { 
        userId, 
        type: qrData.type,
        hasCustomization: !!qrData.customization,
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit
      });

      const shortId = await this.generateUniqueShortId();
      
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

      const qrDataString = this.generateQRDataString(qrCode);
      
      const imageBuffer = await this.qrGenerator.generate(
        qrDataString,
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
        const saltRounds = 12;
        updateData.password_hash = await bcrypt.hash(validitySettings.password, saltRounds);
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

  private generateQRDataString(qrCode: QRCode): string {
    switch (qrCode.type) {
      case 'swish':
        return this.generateSwishQRData(qrCode.data);
      case 'url':
        return qrCode.targetUrl || qrCode.data;
      case 'text':
        return qrCode.data;
      case 'email':
        return `mailto:${qrCode.data.email}?subject=${encodeURIComponent(qrCode.data.subject || '')}&body=${encodeURIComponent(qrCode.data.body || '')}`;
      case 'phone':
        return `tel:${qrCode.data.phone}`;
      case 'sms':
        return `sms:${qrCode.data.phone}?body=${encodeURIComponent(qrCode.data.message || '')}`;
      case 'wifi':
        return `WIFI:T:${qrCode.data.security || 'WPA'};S:${qrCode.data.ssid};P:${qrCode.data.password || ''};H:${qrCode.data.hidden ? 'true' : 'false'};;`;
      case 'vcard':
        return this.generateVCardData(qrCode.data);
      case 'location':
        return `geo:${qrCode.data.latitude},${qrCode.data.longitude}`;
      default:
        return qrCode.targetUrl || qrCode.data;
    }
  }

  private generateSwishQRData(swishData: any): string {
    // Swish QR codes use a specific URL format
    let swishUrl = `swish://payment`;
    const params: string[] = [];

    // Add recipient (required)
    if (swishData.recipient) {
      // Normalize phone number (remove spaces, add +46 if needed)
      let recipient = swishData.recipient.replace(/\s+/g, '');
      if (recipient.startsWith('07') || recipient.startsWith('7')) {
        recipient = '+46' + recipient.substring(recipient.startsWith('07') ? 2 : 1);
      } else if (recipient.startsWith('0046')) {
        recipient = '+46' + recipient.substring(4);
      } else if (recipient.startsWith('46') && !recipient.startsWith('+46')) {
        recipient = '+' + recipient;
      }
      params.push(`phone=${encodeURIComponent(recipient)}`);
    }

    // Add amount if specified
    if (swishData.amount !== undefined && swishData.amount > 0) {
      params.push(`amount=${swishData.amount}`);
    }

    // Add message if specified
    if (swishData.message) {
      params.push(`message=${encodeURIComponent(swishData.message)}`);
    }

    // Add editable flags
    if (swishData.editableAmount !== undefined) {
      params.push(`editable=${swishData.editableAmount ? '1' : '0'}`);
    }

    if (params.length > 0) {
      swishUrl += `?${params.join('&')}`;
    }

    return swishUrl;
  }

  private generateVCardData(vcardData: any): string {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vcardData.name || ''}`,
      `ORG:${vcardData.organization || ''}`,
      `TEL:${vcardData.phone || ''}`,
      `EMAIL:${vcardData.email || ''}`,
      `URL:${vcardData.website || ''}`,
      'END:VCARD'
    ];
    
    return vcard.join('\n');
  }

  private validateQRData(qrData: CreateQRRequest): void {
    if (!qrData.data && !qrData.title) {
      throw new ValidationError('QR code data or title is required');
    }

    if (!qrData.type) {
      throw new ValidationError('QR code type is required');
    }

    const validTypes = ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'location', 'vcard', 'swish'];
    if (!validTypes.includes(qrData.type)) {
      throw new ValidationError(`Invalid QR code type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate Swish-specific data
    if (qrData.type === 'swish') {
      this.validateSwishData(qrData.data);
    }
  }

  private validateSwishData(swishData: any): void {
    if (!swishData.recipient) {
      throw new ValidationError('Swish recipient (phone number) is required');
    }

    // Validate Swedish phone number format
    const phoneRegex = /^(\+46|0046|46)?[1-9]\d{8,9}$/;
    if (!phoneRegex.test(swishData.recipient.replace(/\s+/g, ''))) {
      throw new ValidationError('Invalid Swedish phone number format for Swish recipient');
    }

    // Validate amount if provided
    if (swishData.amount !== undefined) {
      if (typeof swishData.amount !== 'number' || swishData.amount <= 0) {
        throw new ValidationError('Swish amount must be a positive number');
      }
      if (swishData.amount > 150000) {
        throw new ValidationError('Swish amount cannot exceed 150,000 SEK');
      }
    }

    // Validate message length if provided
    if (swishData.message && swishData.message.length > 50) {
      throw new ValidationError('Swish message cannot exceed 50 characters');
    }
  }

  /**
   * Check if user has reached their QR creation limit for their subscription tier
   */
  private async checkPlanLimits(userId: string, subscriptionTier: string): Promise<{
    allowed: boolean;
    message: string;
    currentCount: number;
    limit: number;
  }> {
    try {
      // Get current QR count for user
      const userQRs = await this.qrRepository.findByUserId(userId, { page: 1, limit: 1000 });
      const currentCount = userQRs.length;

      // Get plan limits
      const planLimits = this.getPlanLimits(subscriptionTier);
      const limit = planLimits.qrLimit;

      // Check if unlimited
      if (limit === -1) {
        return {
          allowed: true,
          message: 'Unlimited QR codes allowed',
          currentCount,
          limit
        };
      }

      // Check if at or over limit
      if (currentCount >= limit) {
        return {
          allowed: false,
          message: `QR code limit reached (${limit}). Upgrade your plan to create more QR codes.`,
          currentCount,
          limit
        };
      }

      return {
        allowed: true,
        message: `${limit - currentCount} QR codes remaining`,
        currentCount,
        limit
      };
    } catch (error) {
      this.logger.error('Failed to check plan limits', {
        userId,
        subscriptionTier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Default to allowing creation if we can't check limits
      return {
        allowed: true,
        message: 'Unable to verify limits, allowing creation',
        currentCount: 0,
        limit: -1
      };
    }
  }

  /**
   * Get plan limits for subscription tier
   */
  private getPlanLimits(subscriptionTier: string): {
    qrLimit: number;
    analyticsRetention: number;
  } {
    const tierLimits: Record<string, { qrLimit: number; analyticsRetention: number }> = {
      free: { qrLimit: 10, analyticsRetention: 30 },
      pro: { qrLimit: 500, analyticsRetention: 365 },
      business: { qrLimit: -1, analyticsRetention: 1095 }, // unlimited
      enterprise: { qrLimit: -1, analyticsRetention: -1 } // unlimited
    };

    return tierLimits[subscriptionTier.toLowerCase()] || tierLimits.free;
  }

  /**
   * Generate a unique short ID with collision handling
   */
  private async generateUniqueShortId(maxRetries: number = 5): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const shortId = await this.shortIdGenerator.generate();
      
      // Check if this short ID already exists
      const existingQR = await this.qrRepository.findByShortId(shortId);
      
      if (!existingQR) {
        this.logger.debug('Generated unique short ID', { shortId, attempt });
        return shortId;
      }
      
      this.logger.warn('Short ID collision detected', { shortId, attempt, maxRetries });
      
      if (attempt === maxRetries) {
        this.logger.error('Failed to generate unique short ID after retries', { maxRetries });
        throw new Error('Unable to generate unique short ID. Please try again.');
      }
    }
    
    throw new Error('Short ID generation failed unexpectedly');
  }
}