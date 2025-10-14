import { ILogger, QRCode } from '../interfaces';

/**
 * Service to manage subscription-based QR code validity
 * Handles deactivation when subscriptions expire or limits are exceeded
 */
export class SubscriptionValidityService {
  constructor(private logger: ILogger) {}

  /**
   * Check and update QR codes based on user's subscription status
   */
  async enforceSubscriptionLimits(
    userId: string,
    subscriptionTier: string,
    subscriptionExpiry: Date | null,
    userQRCodes: QRCode[]
  ): Promise<{
    deactivated: number;
    limitExceeded: boolean;
    allowedCount: number;
    currentCount: number;
  }> {
    try {
      const limits = this.getSubscriptionLimits(subscriptionTier);
      let deactivatedCount = 0;

      // Check if subscription has expired
      const isSubscriptionActive = !subscriptionExpiry || new Date() <= subscriptionExpiry;
      
      if (!isSubscriptionActive && subscriptionTier !== 'free') {
        // Deactivate all dynamic QR codes for expired non-free subscriptions
        const dynamicQRs = userQRCodes.filter(qr => qr.expires_at || qr.max_scans || qr.password_hash);
        deactivatedCount = dynamicQRs.length;
        
        this.logger.info('Subscription expired - deactivating dynamic QR codes', {
          userId,
          subscriptionTier,
          deactivatedCount
        });

        return {
          deactivated: deactivatedCount,
          limitExceeded: false,
          allowedCount: limits.maxQRCodes || 0,
          currentCount: userQRCodes.length
        };
      }

      // Check QR code count limits
      const activeQRs = userQRCodes.filter(qr => qr.is_active);
      const limitExceeded = limits.maxQRCodes !== null && activeQRs.length > limits.maxQRCodes;

      if (limitExceeded) {
        // Deactivate oldest QR codes that exceed the limit
        const sortedQRs = activeQRs.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        const excessCount = activeQRs.length - limits.maxQRCodes!;
        const toDeactivate = sortedQRs.slice(0, excessCount);
        deactivatedCount = toDeactivate.length;

        this.logger.info('QR code limit exceeded - deactivating oldest codes', {
          userId,
          subscriptionTier,
          limit: limits.maxQRCodes,
          currentCount: activeQRs.length,
          deactivatedCount
        });
      }

      return {
        deactivated: deactivatedCount,
        limitExceeded,
        allowedCount: limits.maxQRCodes || 0,
        currentCount: activeQRs.length
      };

    } catch (error) {
      this.logger.error('Failed to enforce subscription limits', {
        userId,
        subscriptionTier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        deactivated: 0,
        limitExceeded: false,
        allowedCount: 0,
        currentCount: userQRCodes.length
      };
    }
  }

  /**
   * Validate if user can create new QR codes based on their subscription
   */
  canCreateQR(
    currentQRCount: number,
    subscriptionTier: string,
    subscriptionExpiry: Date | null
  ): {
    canCreate: boolean;
    reason?: string;
    limit?: number;
  } {
    const limits = this.getSubscriptionLimits(subscriptionTier);
    
    // Check subscription expiry
    const isSubscriptionActive = !subscriptionExpiry || new Date() <= subscriptionExpiry;
    
    if (!isSubscriptionActive && subscriptionTier !== 'free') {
      return {
        canCreate: false,
        reason: 'Subscription has expired',
        limit: limits.maxQRCodes || 0
      };
    }

    // Check QR code limits
    if (limits.maxQRCodes !== null && currentQRCount >= limits.maxQRCodes) {
      return {
        canCreate: false,
        reason: `QR code limit reached (${limits.maxQRCodes})`,
        limit: limits.maxQRCodes
      };
    }

    return {
      canCreate: true,
      limit: limits.maxQRCodes || undefined
    };
  }

  /**
   * Validate QR creation parameters against subscription tier
   */
  validateQRCreationParams(
    params: {
      expires_at?: Date;
      max_scans?: number;
      password?: string;
      valid_schedule?: any;
    },
    subscriptionTier: string
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const limits = this.getSubscriptionLimits(subscriptionTier);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check expiration limits
    if (params.expires_at && limits.maxExpirationDays !== null) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + limits.maxExpirationDays);
      
      if (params.expires_at > maxDate) {
        errors.push(`Expiration date cannot exceed ${limits.maxExpirationDays} days for ${subscriptionTier} tier`);
      }
    }

    // Check scan limits
    if (params.max_scans !== undefined) {
      if (!limits.allowUnlimitedScans && params.max_scans === null) {
        errors.push(`Unlimited scans not allowed for ${subscriptionTier} tier`);
      }
      
      if (limits.maxScanLimit && params.max_scans && params.max_scans > limits.maxScanLimit) {
        errors.push(`Scan limit cannot exceed ${limits.maxScanLimit} for ${subscriptionTier} tier`);
      }
    }

    // Check password protection
    if (params.password && !limits.allowPasswordProtection) {
      errors.push(`Password protection not allowed for ${subscriptionTier} tier`);
    }

    // Check scheduling
    if (params.valid_schedule && !limits.allowScheduling) {
      errors.push(`Scheduling not allowed for ${subscriptionTier} tier`);
    }

    // Add upgrade warnings for free tier
    if (subscriptionTier === 'free' && errors.length > 0) {
      warnings.push('Upgrade to Pro or Business tier to access advanced QR code features');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get subscription limits for a tier
   */
  private getSubscriptionLimits(subscriptionTier: string): {
    maxQRCodes: number | null;
    maxExpirationDays: number | null;
    maxScanLimit: number | null;
    allowPasswordProtection: boolean;
    allowScheduling: boolean;
    allowUnlimitedScans: boolean;
    analyticsRetentionDays: number;
  } {
    const limits = {
      free: {
        maxQRCodes: 10,
        maxExpirationDays: 30,
        maxScanLimit: 100,
        allowPasswordProtection: false,
        allowScheduling: false,
        allowUnlimitedScans: false,
        analyticsRetentionDays: 30
      },
      pro: {
        maxQRCodes: 500,
        maxExpirationDays: 365,
        maxScanLimit: 10000,
        allowPasswordProtection: true,
        allowScheduling: true,
        allowUnlimitedScans: false,
        analyticsRetentionDays: 365
      },
      business: {
        maxQRCodes: null, // unlimited
        maxExpirationDays: 1095, // 3 years
        maxScanLimit: null, // unlimited
        allowPasswordProtection: true,
        allowScheduling: true,
        allowUnlimitedScans: true,
        analyticsRetentionDays: 1095
      },
      enterprise: {
        maxQRCodes: null, // unlimited
        maxExpirationDays: null, // unlimited
        maxScanLimit: null, // unlimited
        allowPasswordProtection: true,
        allowScheduling: true,
        allowUnlimitedScans: true,
        analyticsRetentionDays: -1 // permanent
      }
    };

    return limits[subscriptionTier as keyof typeof limits] || limits.free;
  }

  /**
   * Get analytics retention period for subscription tier
   */
  getAnalyticsRetentionPeriod(subscriptionTier: string): number {
    const limits = this.getSubscriptionLimits(subscriptionTier);
    return limits.analyticsRetentionDays;
  }

  /**
   * Check if user can access advanced features
   */
  canAccessFeature(feature: string, subscriptionTier: string): boolean {
    const limits = this.getSubscriptionLimits(subscriptionTier);
    
    switch (feature) {
      case 'password_protection':
        return limits.allowPasswordProtection;
      case 'scheduling':
        return limits.allowScheduling;
      case 'unlimited_scans':
        return limits.allowUnlimitedScans;
      case 'bulk_operations':
        return subscriptionTier !== 'free';
      case 'custom_domains':
        return ['business', 'enterprise'].includes(subscriptionTier);
      case 'white_label':
        return ['business', 'enterprise'].includes(subscriptionTier);
      case 'api_access':
        return subscriptionTier !== 'free';
      case 'team_features':
        return ['business', 'enterprise'].includes(subscriptionTier);
      default:
        return false;
    }
  }
}