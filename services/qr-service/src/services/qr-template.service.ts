import { 
  IQRTemplateService, 
  IQRTemplateRepository,
  QRTemplate, 
  QRTemplateCategory, 
  ServiceResponse, 
  QRCode, 
  ValidationResult,
  ILogger,
  CreateQRRequest,
  IQRService,
  NotFoundError,
  ValidationError,
  SubscriptionTier
} from '../interfaces';

/**
 * QR Template Service - Clean Architecture Implementation
 * 
 * Provides pre-configured QR code templates for common use cases
 * Follows SOLID principles with clean separation of concerns
 * Uses repository pattern for data access
 */
export class QRTemplateService implements IQRTemplateService {
  constructor(
    private readonly templateRepository: IQRTemplateRepository,
    private readonly logger: ILogger,
    private readonly qrService: IQRService
  ) {}

  /**
   * Get all available templates
   */
  async getAllTemplates(): Promise<ServiceResponse<QRTemplate[]>> {
    try {
      this.logger.info('Fetching all QR templates');
      
      const templates = await this.templateRepository.findAll();
      
      return {
        success: true,
        data: templates,
        metadata: {
          timestamp: new Date().toISOString(),
          total: templates.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch templates', error);
      return {
        success: false,
        error: {
          code: 'FAILED_TO_FETCH_TEMPLATES',
          message: 'Failed to fetch templates',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<ServiceResponse<QRTemplate>> {
    try {
      this.logger.info('Fetching template by ID', { templateId: id });
      
      const template = await this.templateRepository.findById(id);
      if (!template) {
        throw new NotFoundError('Template');
      }

      return {
        success: true,
        data: template,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch template by ID', { templateId: id, error });
      
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_FETCH_TEMPLATE',
          message: 'Failed to fetch template',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<ServiceResponse<QRTemplate[]>> {
    try {
      this.logger.info('Fetching templates by category', { category });
      
      const templates = await this.templateRepository.findByCategory(category as QRTemplateCategory);
      
      return {
        success: true,
        data: templates,
        metadata: {
          timestamp: new Date().toISOString(),
          category,
          total: templates.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch templates by category', { category, error });
      return {
        success: false,
        error: {
          code: 'FAILED_TO_FETCH_TEMPLATES_BY_CATEGORY',
          message: 'Failed to fetch templates by category',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Create QR code from template
   */
  async createQRFromTemplate(
    templateId: string, 
    userId: string, 
    customData: any
  ): Promise<ServiceResponse<QRCode>> {
    try {
      this.logger.info('Creating QR from template', { templateId, userId });

      // Get template
      const templateResponse = await this.getTemplateById(templateId);
      if (!templateResponse.success || !templateResponse.data) {
        return templateResponse as any;
      }

      const template = templateResponse.data;

      // Validate custom data against template
      const validationResult = await this.validateTemplateData(templateId, customData);
      if (!validationResult.isValid) {
        throw new ValidationError(validationResult.message, validationResult.details);
      }

      // Build QR content from template and custom data
      const qrContent = this.buildQRContent(template, customData);

      // Create QR request
      const qrRequest: CreateQRRequest = {
        data: qrContent.url || JSON.stringify(qrContent),
        type: template.type,
        title: customData.name || template.name,
        description: `Created from ${template.name} template`,
        customization: {
          ...template.defaultConfig,
          ...customData.design
        }
      };

      // Create QR code using existing service
      const qrResult = await this.qrService.createQR(userId, qrRequest);
      
      if (qrResult.success) {
        this.logger.info('QR created successfully from template', { 
          templateId, 
          userId, 
          qrId: qrResult.data?.id 
        });
      }

      return qrResult;

    } catch (error) {
      this.logger.error('Failed to create QR from template', { templateId, userId, error });
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return {
          success: false,
          error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.statusCode || 500,
          details: error.details
        }
        };
      }

      return {
        success: false,
        error: {
          code: 'FAILED_TO_CREATE_QR_FROM_TEMPLATE',
          message: 'Failed to create QR from template',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Validate template data
   */
  async validateTemplateData(templateId: string, data: any): Promise<ValidationResult> {
    try {
      const templateResponse = await this.getTemplateById(templateId);
      if (!templateResponse.success || !templateResponse.data) {
        return {
          checkType: 'TEMPLATE_VALIDATION',
          isValid: false,
          message: 'Template not found'
        };
      }

      const template = templateResponse.data;
      const errors: string[] = [];

      // Validate required fields
      for (const field of template.fields) {
        if (field.required && (!data[field.name] || data[field.name] === '')) {
          errors.push(`${field.label} is required`);
          continue;
        }

        if (data[field.name]) {
          // Validate field based on type and validation rules
          const fieldValidation = this.validateField(field, data[field.name]);
          if (!fieldValidation.isValid) {
            errors.push(fieldValidation.message);
          }
        }
      }

      return {
        checkType: 'TEMPLATE_VALIDATION',
        isValid: errors.length === 0,
        message: errors.length === 0 ? 'Template data is valid' : 'Validation failed',
        details: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      this.logger.error('Template validation failed', { templateId, error });
      return {
        checkType: 'TEMPLATE_VALIDATION',
        isValid: false,
        message: 'Template validation error'
      };
    }
  }

  /**
   * Get templates for a specific subscription tier
   */
  async getTemplatesForTier(tier: SubscriptionTier): Promise<QRTemplate[]> {
    const tierHierarchy: Record<SubscriptionTier, number> = {
      free: 0,
      starter: 1,
      pro: 2,
      business: 3,
      enterprise: 4
    };

    const userTierLevel = tierHierarchy[tier];
    const allTemplates = await this.templateRepository.findAll();
    
    return allTemplates.filter((template: QRTemplate) => {
      const requiredTierLevel = tierHierarchy[template.requiredSubscriptionTier];
      return requiredTierLevel <= userTierLevel;
    });
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(): Promise<QRTemplate[]> {
    const allTemplates = await this.templateRepository.findAll();
    return allTemplates.filter((t: QRTemplate) => t.isPopular);
  }

  /**
   * Private method to validate individual field
   */
  private validateField(field: any, value: any): ValidationResult {
    const validation = field.validation;
    if (!validation) {
      return { checkType: 'FIELD_VALIDATION', isValid: true, message: 'Valid' };
    }

    // String length validation
    if (validation.minLength && value.length < validation.minLength) {
      return {
        checkType: 'FIELD_VALIDATION',
        isValid: false,
        message: `${field.label} must be at least ${validation.minLength} characters`
      };
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return {
        checkType: 'FIELD_VALIDATION',
        isValid: false,
        message: `${field.label} must not exceed ${validation.maxLength} characters`
      };
    }

    // Pattern validation
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return {
          checkType: 'FIELD_VALIDATION',
          isValid: false,
          message: `${field.label} format is invalid`
        };
      }
    }

    // Number validation
    if (field.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return {
          checkType: 'FIELD_VALIDATION',
          isValid: false,
          message: `${field.label} must be a valid number`
        };
      }

      if (validation.min !== undefined && numValue < validation.min) {
        return {
          checkType: 'FIELD_VALIDATION',
          isValid: false,
          message: `${field.label} must be at least ${validation.min}`
        };
      }

      if (validation.max !== undefined && numValue > validation.max) {
        return {
          checkType: 'FIELD_VALIDATION',
          isValid: false,
          message: `${field.label} must not exceed ${validation.max}`
        };
      }
    }

    return { checkType: 'FIELD_VALIDATION', isValid: true, message: 'Valid' };
  }

  /**
   * Private method to build QR content from template and data
   */
  private buildQRContent(template: QRTemplate, data: any): any {
    const content = { ...template.contentStructure };

    // Replace placeholders with actual data
    const replaceContent = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
          return data[fieldName] || match;
        });
      }
      
      if (Array.isArray(obj)) {
        return obj.map(replaceContent);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceContent(value);
        }
        return result;
      }
      
      return obj;
    };

    return replaceContent(content);
  }

    /**
   * Note: Template initialization is now handled by the QRTemplateRepository
   * This service no longer manages template data directly, following Clean Architecture principles
   */
}
