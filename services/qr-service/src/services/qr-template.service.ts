import { 
  IQRTemplateService, 
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
 */
export class QRTemplateService implements IQRTemplateService {
  private templates: QRTemplate[] = [];

  constructor(
    private readonly logger: ILogger,
    private readonly qrService: IQRService
  ) {
    this.initializeTemplates();
  }

  /**
   * Get all available templates
   */
  async getAllTemplates(): Promise<ServiceResponse<QRTemplate[]>> {
    try {
      this.logger.info('Fetching all QR templates');
      
      return {
        success: true,
        data: this.templates,
        metadata: {
          timestamp: new Date().toISOString(),
          total: this.templates.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch templates', error);
      return {
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_ERROR',
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
      
      const template = this.templates.find(t => t.id === id);
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
            code: 'TEMPLATE_NOT_FOUND',
            message: error.message,
            statusCode: 404
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_ERROR',
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
      
      const filteredTemplates = this.templates.filter(t => t.category === category);
      
      return {
        success: true,
        data: filteredTemplates,
        metadata: {
          timestamp: new Date().toISOString(),
          category,
          total: filteredTemplates.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch templates by category', { category, error });
      return {
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_ERROR',
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
          code: 'QR_CREATION_ERROR',
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
   * Get templates by subscription tier
   */
  getTemplatesByTier(tier: SubscriptionTier): QRTemplate[] {
    const tierHierarchy: Record<SubscriptionTier, number> = {
      free: 0,
      pro: 1,
      business: 2,
      enterprise: 3
    };

    const userTierLevel = tierHierarchy[tier];
    
    return this.templates.filter(template => {
      const requiredTierLevel = tierHierarchy[template.requiredSubscriptionTier];
      return requiredTierLevel <= userTierLevel;
    });
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(): QRTemplate[] {
    return this.templates.filter(t => t.isPopular);
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
   * Initialize default templates
   */
  private initializeTemplates(): void {
    this.templates = [
      // Restaurant Menu Template
      {
        id: 'restaurant-menu',
        name: 'Restaurant Menu',
        description: 'Create a QR code that links to your digital menu',
        category: 'hospitality',
        type: 'url',
        icon: '🍽️',
        isPopular: true,
        isPremium: false,
        requiredSubscriptionTier: 'free',
        defaultConfig: {
          size: 300,
          errorCorrectionLevel: 'M',
          color: {
            foreground: '#8B4513',
            background: '#FFFFFF'
          }
        },
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'QR Code Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., Main Menu QR',
            validation: { minLength: 3, maxLength: 50 }
          },
          {
            id: 'menuUrl',
            name: 'menuUrl',
            label: 'Menu URL',
            type: 'url',
            required: true,
            placeholder: 'https://yourrestaurant.com/menu',
            validation: { pattern: '^https?://.+' }
          },
          {
            id: 'restaurantName',
            name: 'restaurantName',
            label: 'Restaurant Name',
            type: 'text',
            required: false,
            placeholder: 'Your Restaurant Name'
          }
        ],
        contentStructure: {
          url: '{{menuUrl}}'
        },
        examples: [
          {
            name: 'Pizza Palace Menu',
            description: 'Digital menu for a pizza restaurant',
            data: {
              name: 'Pizza Palace Menu QR',
              menuUrl: 'https://pizzapalace.com/menu',
              restaurantName: 'Pizza Palace'
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // WiFi Access Template
      {
        id: 'wifi-access',
        name: 'WiFi Access',
        description: 'Let customers connect to your WiFi instantly',
        category: 'business',
        type: 'wifi',
        icon: '📶',
        isPopular: true,
        isPremium: false,
        requiredSubscriptionTier: 'free',
        defaultConfig: {
          size: 250,
          errorCorrectionLevel: 'M',
          color: {
            foreground: '#4169E1',
            background: '#FFFFFF'
          }
        },
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'QR Code Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., Cafe WiFi Access'
          },
          {
            id: 'ssid',
            name: 'ssid',
            label: 'WiFi Network Name (SSID)',
            type: 'text',
            required: true,
            placeholder: 'CafeWiFi_Guest'
          },
          {
            id: 'password',
            name: 'password',
            label: 'WiFi Password',
            type: 'password',
            required: true,
            placeholder: 'Enter WiFi password'
          },
          {
            id: 'security',
            name: 'security',
            label: 'Security Type',
            type: 'select',
            required: true,
            options: [
              { value: 'WPA', label: 'WPA/WPA2' },
              { value: 'WEP', label: 'WEP' },
              { value: 'nopass', label: 'No Password' }
            ],
            defaultValue: 'WPA'
          }
        ],
        contentStructure: {
          ssid: '{{ssid}}',
          password: '{{password}}',
          security: '{{security}}'
        },
        examples: [
          {
            name: 'Coffee Shop WiFi',
            description: 'Guest WiFi access for coffee shop',
            data: {
              name: 'Coffee Shop Guest WiFi',
              ssid: 'CoffeeShop_Guest',
              password: 'coffee123',
              security: 'WPA'
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Contact Card Template
      {
        id: 'contact-card',
        name: 'Contact Card',
        description: 'Share your contact information instantly',
        category: 'business',
        type: 'vcard',
        icon: '👤',
        isPopular: true,
        isPremium: false,
        requiredSubscriptionTier: 'free',
        defaultConfig: {
          size: 300,
          errorCorrectionLevel: 'M',
          color: {
            foreground: '#2E8B57',
            background: '#FFFFFF'
          }
        },
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'QR Code Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., John Smith Contact'
          },
          {
            id: 'firstName',
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: true,
            placeholder: 'John'
          },
          {
            id: 'lastName',
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: true,
            placeholder: 'Smith'
          },
          {
            id: 'email',
            name: 'email',
            label: 'Email',
            type: 'email',
            required: false,
            placeholder: 'john@example.com'
          },
          {
            id: 'phone',
            name: 'phone',
            label: 'Phone Number',
            type: 'phone',
            required: false,
            placeholder: '+1-555-123-4567'
          },
          {
            id: 'company',
            name: 'company',
            label: 'Company',
            type: 'text',
            required: false,
            placeholder: 'Your Company'
          },
          {
            id: 'title',
            name: 'title',
            label: 'Job Title',
            type: 'text',
            required: false,
            placeholder: 'Software Engineer'
          }
        ],
        contentStructure: {
          firstName: '{{firstName}}',
          lastName: '{{lastName}}',
          email: '{{email}}',
          phone: '{{phone}}',
          company: '{{company}}',
          title: '{{title}}'
        },
        examples: [
          {
            name: 'Business Card',
            description: 'Professional contact card',
            data: {
              name: 'John Smith Contact',
              firstName: 'John',
              lastName: 'Smith',
              email: 'john@techcorp.com',
              phone: '+1-555-123-4567',
              company: 'TechCorp',
              title: 'Senior Developer'
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Event RSVP Template
      {
        id: 'event-rsvp',
        name: 'Event RSVP',
        description: 'Collect RSVPs for your events easily',
        category: 'events',
        type: 'url',
        icon: '🎉',
        isPopular: true,
        isPremium: true,
        requiredSubscriptionTier: 'pro',
        defaultConfig: {
          size: 300,
          errorCorrectionLevel: 'M',
          color: {
            foreground: '#FF6347',
            background: '#FFFFFF'
          }
        },
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'QR Code Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., Wedding RSVP'
          },
          {
            id: 'eventName',
            name: 'eventName',
            label: 'Event Name',
            type: 'text',
            required: true,
            placeholder: 'Annual Company Party'
          },
          {
            id: 'rsvpUrl',
            name: 'rsvpUrl',
            label: 'RSVP Form URL',
            type: 'url',
            required: true,
            placeholder: 'https://forms.google.com/your-rsvp-form',
            validation: { pattern: '^https?://.+' }
          },
          {
            id: 'eventDate',
            name: 'eventDate',
            label: 'Event Date',
            type: 'text',
            required: false,
            placeholder: 'December 25, 2024'
          }
        ],
        contentStructure: {
          url: '{{rsvpUrl}}'
        },
        examples: [
          {
            name: 'Wedding RSVP',
            description: 'RSVP collection for wedding',
            data: {
              name: 'Wedding RSVP QR',
              eventName: 'John & Jane Wedding',
              rsvpUrl: 'https://forms.google.com/wedding-rsvp',
              eventDate: 'June 15, 2025'
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Social Media Profile Template
      {
        id: 'social-profile',
        name: 'Social Media Profile',
        description: 'Link to your social media profiles',
        category: 'social',
        type: 'url',
        icon: '📱',
        isPopular: true,
        isPremium: false,
        requiredSubscriptionTier: 'free',
        defaultConfig: {
          size: 250,
          errorCorrectionLevel: 'M',
          color: {
            foreground: '#1DA1F2',
            background: '#FFFFFF'
          }
        },
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'QR Code Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., My Instagram Profile'
          },
          {
            id: 'platform',
            name: 'platform',
            label: 'Social Platform',
            type: 'select',
            required: true,
            options: [
              { value: 'instagram', label: 'Instagram' },
              { value: 'twitter', label: 'Twitter/X' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'facebook', label: 'Facebook' },
              { value: 'tiktok', label: 'TikTok' },
              { value: 'youtube', label: 'YouTube' }
            ]
          },
          {
            id: 'profileUrl',
            name: 'profileUrl',
            label: 'Profile URL',
            type: 'url',
            required: true,
            placeholder: 'https://instagram.com/yourusername',
            validation: { pattern: '^https?://.+' }
          }
        ],
        contentStructure: {
          url: '{{profileUrl}}'
        },
        examples: [
          {
            name: 'Instagram Profile',
            description: 'Link to Instagram business profile',
            data: {
              name: 'Business Instagram',
              platform: 'instagram',
              profileUrl: 'https://instagram.com/yourbusiness'
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.logger.info(`Initialized ${this.templates.length} QR templates`);
  }
}