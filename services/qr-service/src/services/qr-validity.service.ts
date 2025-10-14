import { 
  QRCode, 
  ValidationResult, 
  QRValidityCheck,
  ScanAttemptResult,
  ValidityConfig,
  ScheduleConfig,
  ILogger
} from '../interfaces';

/**
 * QR Code Validity Service
 * Handles expiration, scan limits, password protection, and scheduling
 */
export class QRValidityService {
  constructor(private logger: ILogger) {}

  /**
   * Check if QR code is valid for scanning
   */
  async validateQRCode(
    qrCode: QRCode, 
    password?: string,
    requestTime: Date = new Date()
  ): Promise<QRValidityCheck> {
    try {
      const checks: ValidationResult[] = [];

      // Check if QR is active
      const activeCheck = this.checkIsActive(qrCode);
      checks.push(activeCheck);
      if (!activeCheck.isValid) {
        return {
          isValid: false,
          reason: 'QR_CODE_INACTIVE',
          message: 'This QR code has been deactivated',
          checks
        };
      }

      // Check expiration date
      const expirationCheck = this.checkExpiration(qrCode, requestTime);
      checks.push(expirationCheck);
      if (!expirationCheck.isValid) {
        return {
          isValid: false,
          reason: 'QR_CODE_EXPIRED',
          message: 'This QR code has expired',
          checks,
          expiredAt: qrCode.expires_at
        };
      }

      // Check scan limits
      const scanLimitCheck = this.checkScanLimits(qrCode);
      checks.push(scanLimitCheck);
      if (!scanLimitCheck.isValid) {
        return {
          isValid: false,
          reason: 'SCAN_LIMIT_EXCEEDED',
          message: 'This QR code has reached its maximum number of scans',
          checks,
          currentScans: qrCode.current_scans,
          maxScans: qrCode.max_scans
        };
      }

      // Check password protection
      const passwordCheck = this.checkPassword(qrCode, password);
      checks.push(passwordCheck);
      if (!passwordCheck.isValid) {
        return {
          isValid: false,
          reason: 'PASSWORD_REQUIRED',
          message: 'This QR code requires a password',
          checks
        };
      }

      // Check schedule (if configured)
      const scheduleCheck = this.checkSchedule(qrCode, requestTime);
      checks.push(scheduleCheck);
      if (!scheduleCheck.isValid) {
        return {
          isValid: false,
          reason: 'QR_CODE_SCHEDULED',
          message: 'This QR code is not active at this time',
          checks,
          schedule: qrCode.valid_schedule
        };
      }

      return {
        isValid: true,
        reason: 'VALID',
        message: 'QR code is valid for scanning',
        checks
      };

    } catch (error) {
      this.logger.error('QR validation failed', { 
        qrCodeId: qrCode.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        isValid: false,
        reason: 'VALIDATION_ERROR',
        message: 'Error validating QR code',
        checks: []
      };
    }
  }

  /**
   * Process a scan attempt and update scan count
   */
  async processScanAttempt(
    qrCode: QRCode,
    password?: string,
    requestTime: Date = new Date()
  ): Promise<ScanAttemptResult> {
    try {
      // First validate the QR code
      const validityCheck = await this.validateQRCode(qrCode, password, requestTime);
      
      if (!validityCheck.isValid) {
        this.logger.info('QR scan blocked', {
          qrCodeId: qrCode.id,
          reason: validityCheck.reason,
          currentScans: qrCode.current_scans
        });
        
        return {
          success: false,
          canScan: false,
          reason: validityCheck.reason,
          message: validityCheck.message,
          validityCheck
        };
      }

      // QR is valid, increment scan count
      const newScanCount = (qrCode.current_scans || 0) + 1;
      
      this.logger.info('QR scan allowed', {
        qrCodeId: qrCode.id,
        previousScans: qrCode.current_scans,
        newScans: newScanCount,
        maxScans: qrCode.max_scans
      });

      return {
        success: true,
        canScan: true,
        reason: 'SCAN_ALLOWED',
        message: 'QR code scan successful',
        newScanCount,
        validityCheck
      };

    } catch (error) {
      this.logger.error('Scan attempt processing failed', {
        qrCodeId: qrCode.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        canScan: false,
        reason: 'PROCESSING_ERROR',
        message: 'Error processing scan attempt'
      };
    }
  }

  /**
   * Check if QR code is active
   */
  private checkIsActive(qrCode: QRCode): ValidationResult {
    const isActive = qrCode.is_active === true;
    
    return {
      checkType: 'ACTIVE_STATUS',
      isValid: isActive,
      message: isActive ? 'QR code is active' : 'QR code is inactive',
      details: { is_active: qrCode.is_active }
    };
  }

  /**
   * Check if QR code has expired
   */
  private checkExpiration(qrCode: QRCode, requestTime: Date): ValidationResult {
    // If no expiration is set, it's valid
    if (!qrCode.expires_at) {
      return {
        checkType: 'EXPIRATION',
        isValid: true,
        message: 'No expiration date set',
        details: { expires_at: null }
      };
    }

    const expirationTime = new Date(qrCode.expires_at);
    const isValid = requestTime <= expirationTime;
    
    return {
      checkType: 'EXPIRATION',
      isValid,
      message: isValid ? 'QR code has not expired' : 'QR code has expired',
      details: {
        expires_at: qrCode.expires_at,
        current_time: requestTime.toISOString(),
        time_remaining: isValid ? expirationTime.getTime() - requestTime.getTime() : 0
      }
    };
  }

  /**
   * Check scan limits
   */
  private checkScanLimits(qrCode: QRCode): ValidationResult {
    // If no scan limit is set, it's valid
    if (!qrCode.max_scans) {
      return {
        checkType: 'SCAN_LIMIT',
        isValid: true,
        message: 'No scan limit set',
        details: { max_scans: null, current_scans: qrCode.current_scans }
      };
    }

    const currentScans = qrCode.current_scans || 0;
    const isValid = currentScans < qrCode.max_scans;
    
    return {
      checkType: 'SCAN_LIMIT',
      isValid,
      message: isValid ? 'Within scan limits' : 'Scan limit exceeded',
      details: {
        max_scans: qrCode.max_scans,
        current_scans: currentScans,
        remaining_scans: Math.max(0, qrCode.max_scans - currentScans)
      }
    };
  }

  /**
   * Check password protection
   */
  private checkPassword(qrCode: QRCode, providedPassword?: string): ValidationResult {
    // If no password is set, it's valid
    if (!qrCode.password_hash) {
      return {
        checkType: 'PASSWORD',
        isValid: true,
        message: 'No password protection',
        details: { password_protected: false }
      };
    }

    // If password is required but not provided
    if (!providedPassword) {
      return {
        checkType: 'PASSWORD',
        isValid: false,
        message: 'Password required',
        details: { password_protected: true, password_provided: false }
      };
    }

    // Here you would normally hash the provided password and compare
    // For now, we'll use a simple comparison (implement proper hashing later)
    const isValid = this.verifyPassword(providedPassword, qrCode.password_hash);
    
    return {
      checkType: 'PASSWORD',
      isValid,
      message: isValid ? 'Password correct' : 'Invalid password',
      details: { password_protected: true, password_provided: true }
    };
  }

  /**
   * Check schedule constraints
   */
  private checkSchedule(qrCode: QRCode, requestTime: Date): ValidationResult {
    // If no schedule is set, it's valid
    if (!qrCode.valid_schedule) {
      return {
        checkType: 'SCHEDULE',
        isValid: true,
        message: 'No schedule restrictions',
        details: { scheduled: false }
      };
    }

    try {
      const schedule = qrCode.valid_schedule as ScheduleConfig;
      const isValid = this.isWithinSchedule(schedule, requestTime);
      
      return {
        checkType: 'SCHEDULE',
        isValid,
        message: isValid ? 'Within scheduled hours' : 'Outside scheduled hours',
        details: {
          scheduled: true,
          schedule: schedule,
          current_time: requestTime.toISOString()
        }
      };
    } catch (error) {
      this.logger.warn('Invalid schedule configuration', {
        qrCodeId: qrCode.id,
        schedule: qrCode.valid_schedule,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        checkType: 'SCHEDULE',
        isValid: true, // Default to valid if schedule is malformed
        message: 'Invalid schedule configuration, allowing access',
        details: { scheduled: true, schedule_error: true }
      };
    }
  }

  /**
   * Check if current time is within the allowed schedule
   */
  private isWithinSchedule(schedule: ScheduleConfig, requestTime: Date): boolean {
    const currentDay = requestTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = requestTime.getHours();
    const currentMinute = requestTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Check daily schedule if configured
    if (schedule.dailyHours) {
      const { startHour = 0, startMinute = 0, endHour = 23, endMinute = 59 } = schedule.dailyHours;
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;
      
      if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
        return false;
      }
    }

    // Check weekly schedule if configured
    if (schedule.weeklyDays && schedule.weeklyDays.length > 0) {
      if (!schedule.weeklyDays.includes(currentDay)) {
        return false;
      }
    }

    // Check date range if configured
    if (schedule.dateRange) {
      const { startDate, endDate } = schedule.dateRange;
      if (startDate && requestTime < new Date(startDate)) {
        return false;
      }
      if (endDate && requestTime > new Date(endDate)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simple password verification (implement proper hashing in production)
   */
  private verifyPassword(providedPassword: string, storedHash: string): boolean {
    // TODO: Implement proper password hashing with bcrypt
    // For now, just do a simple comparison
    return providedPassword === storedHash;
  }

  /**
   * Get validity configuration for a subscription tier
   */
  getValidityConfigForTier(subscriptionTier: string): ValidityConfig {
    const configs: Record<string, ValidityConfig> = {
      free: {
        maxExpirationDays: 30,
        maxScanLimit: 100,
        allowPasswordProtection: false,
        allowScheduling: false,
        allowUnlimitedScans: false
      },
      pro: {
        maxExpirationDays: 365,
        maxScanLimit: 10000,
        allowPasswordProtection: true,
        allowScheduling: true,
        allowUnlimitedScans: false
      },
      business: {
        maxExpirationDays: 1095, // 3 years
        maxScanLimit: null, // unlimited
        allowPasswordProtection: true,
        allowScheduling: true,
        allowUnlimitedScans: true
      },
      enterprise: {
        maxExpirationDays: null, // unlimited
        maxScanLimit: null, // unlimited
        allowPasswordProtection: true,
        allowScheduling: true,
        allowUnlimitedScans: true
      }
    };

    return configs[subscriptionTier] || configs.free;
  }

  /**
   * Validate validity parameters against subscription limits
   */
  validateValidityParams(
    params: {
      expires_at?: Date;
      max_scans?: number;
      password?: string;
      valid_schedule?: ScheduleConfig;
    },
    subscriptionTier: string
  ): { isValid: boolean; errors: string[] } {
    const config = this.getValidityConfigForTier(subscriptionTier);
    const errors: string[] = [];

    // Check expiration date limits
    if (params.expires_at && config.maxExpirationDays) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + config.maxExpirationDays);
      
      if (params.expires_at > maxDate) {
        errors.push(`Expiration date cannot exceed ${config.maxExpirationDays} days for ${subscriptionTier} tier`);
      }
    }

    // Check scan limit
    if (params.max_scans !== undefined) {
      if (!config.allowUnlimitedScans && params.max_scans === null) {
        errors.push(`Unlimited scans not allowed for ${subscriptionTier} tier`);
      }
      
      if (config.maxScanLimit && params.max_scans && params.max_scans > config.maxScanLimit) {
        errors.push(`Scan limit cannot exceed ${config.maxScanLimit} for ${subscriptionTier} tier`);
      }
    }

    // Check password protection
    if (params.password && !config.allowPasswordProtection) {
      errors.push(`Password protection not allowed for ${subscriptionTier} tier`);
    }

    // Check scheduling
    if (params.valid_schedule && !config.allowScheduling) {
      errors.push(`Scheduling not allowed for ${subscriptionTier} tier`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}