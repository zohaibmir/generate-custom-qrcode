import { 
  ILogger,
  ServiceResponse,
  ValidationError,
  QRCode,
  AppError
} from '../interfaces';
import { QRContentRulesRepository } from '../repositories/qr-content-rules.repository';

export interface ScanContext {
  timestamp: Date;
  timezone: string;
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates?: { lat: number; lng: number; };
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    screen_size: { width: number; height: number; };
  };
  language: {
    browser_languages: string[];
    detected_language: string;
  };
  ip_address: string;
  user_agent: string;
}

export interface ContentRule {
  id: string;
  qr_code_id: string;
  rule_name: string;
  rule_type: 'time' | 'location' | 'language' | 'device';
  rule_data: any;
  content_type: 'url' | 'text' | 'landing_page';
  content_value: string;
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContentRuleRequest {
  rule_name: string;
  rule_type: 'time' | 'location' | 'language' | 'device';
  rule_data: any;
  content_type: 'url' | 'text' | 'landing_page';
  content_value: string;
  priority?: number;
  is_active?: boolean;
}

export interface QRResolutionResult {
  final_content: string;
  content_type: 'url' | 'text' | 'landing_page';
  matched_rules: Array<{
    rule_id: string;
    rule_type: string;
    priority: number;
  }>;
  fallback_used: boolean;
  resolution_time_ms: number;
}

export class QRContentRulesService {
  constructor(
    private repository: QRContentRulesRepository,
    private logger: ILogger
  ) {}

  /**
   * Create a new content rule for a QR code
   */
  async createContentRule(
    qrCodeId: string, 
    ruleData: CreateContentRuleRequest,
    subscriptionTier: string = 'free'
  ): Promise<ServiceResponse<ContentRule>> {
    try {
      // Validate subscription limits
      const limitCheck = await this.checkRuleLimits(qrCodeId, subscriptionTier);
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: {
            code: 'RULE_LIMIT_EXCEEDED',
            message: limitCheck.message,
            statusCode: 403,
            details: {
              currentRules: limitCheck.currentRules,
              limit: limitCheck.limit,
              subscriptionTier
            }
          }
        };
      }

      // Validate rule data structure
      const validation = this.validateRuleData(ruleData);
      if (!validation.isValid) {
        throw new ValidationError('Invalid rule configuration', validation.errors);
      }

      this.logger.info('Creating content rule', {
        qrCodeId,
        ruleType: ruleData.rule_type,
        subscriptionTier
      });

      const rule = await this.repository.createRule({
        qr_code_id: qrCodeId,
        rule_name: ruleData.rule_name,
        rule_type: ruleData.rule_type,
        rule_data: ruleData.rule_data,
        content_type: ruleData.content_type,
        content_value: ruleData.content_value,
        priority: ruleData.priority || 0,
        is_active: ruleData.is_active !== false
      });

      return {
        success: true,
        data: rule,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to create content rule', {
        qrCodeId,
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
          code: 'RULE_CREATION_FAILED',
          message: 'Failed to create content rule',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get all content rules for a QR code
   */
  async getQRContentRules(qrCodeId: string): Promise<ServiceResponse<ContentRule[]>> {
    try {
      const rules = await this.repository.findByQRCodeId(qrCodeId);
      
      return {
        success: true,
        data: rules
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RULES_FETCH_FAILED',
          message: 'Failed to fetch content rules',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update a content rule
   */
  async updateContentRule(
    ruleId: string, 
    updateData: Partial<CreateContentRuleRequest>
  ): Promise<ServiceResponse<ContentRule>> {
    try {
      // Validate update data if provided
      if (updateData.rule_data) {
        const validation = this.validateRuleData(updateData as CreateContentRuleRequest);
        if (!validation.isValid) {
          throw new ValidationError('Invalid rule configuration', validation.errors);
        }
      }

      const rule = await this.repository.updateRule(ruleId, updateData);
      
      if (!rule) {
        return {
          success: false,
          error: {
            code: 'RULE_NOT_FOUND',
            message: 'Content rule not found',
            statusCode: 404
          }
        };
      }

      return {
        success: true,
        data: rule
      };
    } catch (error) {
      this.logger.error('Failed to update content rule', {
        ruleId,
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
          code: 'RULE_UPDATE_FAILED',
          message: 'Failed to update content rule',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Delete a content rule
   */
  async deleteContentRule(ruleId: string): Promise<ServiceResponse<boolean>> {
    try {
      const deleted = await this.repository.deleteRule(ruleId);
      
      return {
        success: true,
        data: deleted
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RULE_DELETE_FAILED',
          message: 'Failed to delete content rule',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Main resolution engine - determines what content to show based on scan context
   */
  async resolveQRContent(
    qrCode: QRCode, 
    scanContext: ScanContext
  ): Promise<ServiceResponse<QRResolutionResult>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Resolving QR content', {
        qrCodeId: qrCode.id,
        deviceType: scanContext.device.type,
        country: scanContext.location?.country,
        language: scanContext.language.detected_language
      });

      // Get all active rules for this QR code
      const rules = await this.repository.findActiveRulesByQRCodeId(qrCode.id);
      
      if (!rules || rules.length === 0) {
        // No rules - return original QR content
        return {
          success: true,
          data: {
            final_content: this.getOriginalQRContent(qrCode),
            content_type: 'url',
            matched_rules: [],
            fallback_used: true,
            resolution_time_ms: Date.now() - startTime
          }
        };
      }

      // Evaluate each rule against scan context
      const matchedRules = await this.evaluateRules(rules, scanContext);
      
      // Sort by priority (highest first) and take the first match
      const selectedRule = matchedRules
        .sort((a, b) => b.priority - a.priority)[0];

      if (selectedRule) {
        // Track analytics for rule usage
        await this.trackRuleAnalytics(qrCode.id, selectedRule.id, scanContext);

        return {
          success: true,
          data: {
            final_content: selectedRule.content_value,
            content_type: selectedRule.content_type,
            matched_rules: [{
              rule_id: selectedRule.id,
              rule_type: selectedRule.rule_type,
              priority: selectedRule.priority
            }],
            fallback_used: false,
            resolution_time_ms: Date.now() - startTime
          }
        };
      }

      // No rules matched - fallback to original content
      return {
        success: true,
        data: {
          final_content: this.getOriginalQRContent(qrCode),
          content_type: 'url',
          matched_rules: [],
          fallback_used: true,
          resolution_time_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      this.logger.error('Failed to resolve QR content', {
        qrCodeId: qrCode.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'RESOLUTION_FAILED',
          message: 'Failed to resolve QR content',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Evaluate rules against scan context
   */
  private async evaluateRules(rules: ContentRule[], context: ScanContext): Promise<ContentRule[]> {
    const matchedRules: ContentRule[] = [];

    for (const rule of rules) {
      try {
        const matches = await this.evaluateRule(rule, context);
        if (matches) {
          matchedRules.push(rule);
          this.logger.debug('Rule matched', {
            ruleId: rule.id,
            ruleType: rule.rule_type,
            priority: rule.priority
          });
        }
      } catch (error) {
        this.logger.warn('Rule evaluation failed', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with other rules
      }
    }

    return matchedRules;
  }

  /**
   * Evaluate individual rule against scan context
   */
  private async evaluateRule(rule: ContentRule, context: ScanContext): Promise<boolean> {
    switch (rule.rule_type) {
      case 'device':
        return this.evaluateDeviceRule(rule.rule_data, context.device);
      
      case 'location':
        return this.evaluateLocationRule(rule.rule_data, context.location);
      
      case 'language':
        return this.evaluateLanguageRule(rule.rule_data, context.language);
      
      case 'time':
        return this.evaluateTimeRule(rule.rule_data, context.timestamp, context.timezone);
      
      default:
        this.logger.warn('Unknown rule type', { ruleType: rule.rule_type });
        return false;
    }
  }

  /**
   * Evaluate device-specific rules
   */
  private evaluateDeviceRule(ruleData: any, device: ScanContext['device']): boolean {
    if (ruleData.device_type && ruleData.device_type !== device.type) {
      return false;
    }

    if (ruleData.operating_system && !device.os.toLowerCase().includes(ruleData.operating_system.toLowerCase())) {
      return false;
    }

    if (ruleData.browser && !device.browser.toLowerCase().includes(ruleData.browser.toLowerCase())) {
      return false;
    }

    if (ruleData.screen_size) {
      const { min_width, max_width } = ruleData.screen_size;
      const { width } = device.screen_size;
      
      if (min_width && width < min_width) return false;
      if (max_width && width > max_width) return false;
    }

    return true;
  }

  /**
   * Evaluate location-specific rules
   */
  private evaluateLocationRule(ruleData: any, location?: ScanContext['location']): boolean {
    if (!location) return false;

    if (ruleData.countries && !ruleData.countries.includes(location.country)) {
      return false;
    }

    if (ruleData.regions && !ruleData.regions.includes(location.region)) {
      return false;
    }

    if (ruleData.cities && !ruleData.cities.includes(location.city)) {
      return false;
    }

    if (ruleData.coordinates && location.coordinates) {
      const distance = this.calculateDistance(
        ruleData.coordinates.latitude,
        ruleData.coordinates.longitude,
        location.coordinates.lat,
        location.coordinates.lng
      );
      
      if (distance > ruleData.coordinates.radius_km) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate language-specific rules
   */
  private evaluateLanguageRule(ruleData: any, language: ScanContext['language']): boolean {
    const supportedLanguages = ruleData.supported_languages || [];
    
    // Check detected language first
    if (supportedLanguages.includes(language.detected_language)) {
      return true;
    }

    // Check browser languages
    for (const browserLang of language.browser_languages) {
      if (supportedLanguages.includes(browserLang.split('-')[0])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate time-based rules
   */
  private evaluateTimeRule(ruleData: any, timestamp: Date, timezone: string): boolean {
    const now = new Date(timestamp);
    
    // Check date range
    if (ruleData.start_date && now < new Date(ruleData.start_date)) {
      return false;
    }
    
    if (ruleData.end_date && now > new Date(ruleData.end_date)) {
      return false;
    }

    // Check time of day
    if (ruleData.start_time && ruleData.end_time) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = ruleData.start_time.split(':').map(Number);
      const [endHour, endMin] = ruleData.end_time.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      if (currentTime < startTime || currentTime > endTime) {
        return false;
      }
    }

    // Check days of week
    if (ruleData.days_of_week && ruleData.days_of_week.length > 0) {
      const dayOfWeek = now.getDay(); // 0 = Sunday
      if (!ruleData.days_of_week.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  /**
   * Get original QR content as fallback
   */
  private getOriginalQRContent(qrCode: QRCode): string {
    return qrCode.targetUrl || qrCode.data || '';
  }

  /**
   * Track analytics for rule usage
   */
  private async trackRuleAnalytics(qrCodeId: string, ruleId: string, context: ScanContext): Promise<void> {
    try {
      // This would integrate with your existing analytics service
      this.logger.info('Rule analytics tracked', {
        qrCodeId,
        ruleId,
        deviceType: context.device.type,
        country: context.location?.country
      });
    } catch (error) {
      this.logger.warn('Failed to track rule analytics', {
        qrCodeId,
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate rule configuration
   */
  private validateRuleData(ruleData: CreateContentRuleRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!ruleData.rule_name) {
      errors.push('Rule name is required');
    }

    if (!ruleData.rule_type) {
      errors.push('Rule type is required');
    }

    if (!['time', 'location', 'language', 'device'].includes(ruleData.rule_type)) {
      errors.push('Invalid rule type');
    }

    if (!ruleData.content_type) {
      errors.push('Content type is required');
    }

    if (!['url', 'text', 'landing_page'].includes(ruleData.content_type)) {
      errors.push('Invalid content type');
    }

    if (!ruleData.content_value) {
      errors.push('Content value is required');
    }

    // Validate rule-specific data
    switch (ruleData.rule_type) {
      case 'device':
        this.validateDeviceRuleData(ruleData.rule_data, errors);
        break;
      case 'location':
        this.validateLocationRuleData(ruleData.rule_data, errors);
        break;
      case 'language':
        this.validateLanguageRuleData(ruleData.rule_data, errors);
        break;
      case 'time':
        this.validateTimeRuleData(ruleData.rule_data, errors);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateDeviceRuleData(ruleData: any, errors: string[]): void {
    if (!ruleData) {
      errors.push('Device rule data is required');
      return;
    }

    if (ruleData.device_type && !['mobile', 'tablet', 'desktop'].includes(ruleData.device_type)) {
      errors.push('Invalid device type');
    }
  }

  private validateLocationRuleData(ruleData: any, errors: string[]): void {
    if (!ruleData) {
      errors.push('Location rule data is required');
      return;
    }

    if (ruleData.coordinates) {
      if (typeof ruleData.coordinates.latitude !== 'number' || 
          typeof ruleData.coordinates.longitude !== 'number') {
        errors.push('Invalid coordinates format');
      }

      if (typeof ruleData.coordinates.radius_km !== 'number' || ruleData.coordinates.radius_km <= 0) {
        errors.push('Invalid radius value');
      }
    }
  }

  private validateLanguageRuleData(ruleData: any, errors: string[]): void {
    if (!ruleData) {
      errors.push('Language rule data is required');
      return;
    }

    if (!ruleData.supported_languages || !Array.isArray(ruleData.supported_languages)) {
      errors.push('Supported languages list is required');
    }
  }

  private validateTimeRuleData(ruleData: any, errors: string[]): void {
    if (!ruleData) {
      errors.push('Time rule data is required');
      return;
    }

    if (ruleData.start_time && !/^\d{2}:\d{2}$/.test(ruleData.start_time)) {
      errors.push('Invalid start time format (use HH:MM)');
    }

    if (ruleData.end_time && !/^\d{2}:\d{2}$/.test(ruleData.end_time)) {
      errors.push('Invalid end time format (use HH:MM)');
    }
  }

  /**
   * Check rule limits based on subscription tier
   */
  private async checkRuleLimits(
    qrCodeId: string, 
    subscriptionTier: string
  ): Promise<{
    allowed: boolean;
    message: string;
    currentRules: number;
    limit: number;
  }> {
    try {
      const currentRules = await this.repository.countRulesByQRCodeId(qrCodeId);
      const limits = this.getRuleLimitsForTier(subscriptionTier);

      if (limits.maxRulesPerQR === -1) {
        return {
          allowed: true,
          message: 'Unlimited rules allowed',
          currentRules,
          limit: -1
        };
      }

      if (currentRules >= limits.maxRulesPerQR) {
        return {
          allowed: false,
          message: `Rule limit reached (${limits.maxRulesPerQR}). Upgrade your plan for more rules.`,
          currentRules,
          limit: limits.maxRulesPerQR
        };
      }

      return {
        allowed: true,
        message: `${limits.maxRulesPerQR - currentRules} rules remaining`,
        currentRules,
        limit: limits.maxRulesPerQR
      };
    } catch (error) {
      this.logger.error('Failed to check rule limits', {
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        allowed: true,
        message: 'Unable to verify limits, allowing creation',
        currentRules: 0,
        limit: -1
      };
    }
  }

  /**
   * Get rule limits for subscription tier
   */
  private getRuleLimitsForTier(subscriptionTier: string): {
    maxRulesPerQR: number;
    allowedRuleTypes: string[];
  } {
    const tierLimits: Record<string, { maxRulesPerQR: number; allowedRuleTypes: string[] }> = {
      free: { 
        maxRulesPerQR: 1, 
        allowedRuleTypes: ['device', 'language'] 
      },
      pro: { 
        maxRulesPerQR: 3, 
        allowedRuleTypes: ['device', 'language', 'time'] 
      },
      business: { 
        maxRulesPerQR: 10, 
        allowedRuleTypes: ['device', 'language', 'time', 'location'] 
      },
      enterprise: { 
        maxRulesPerQR: -1, 
        allowedRuleTypes: ['device', 'language', 'time', 'location'] 
      }
    };

    return tierLimits[subscriptionTier.toLowerCase()] || tierLimits.free;
  }
}