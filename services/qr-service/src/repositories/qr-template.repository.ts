import { 
  IQRTemplateRepository, 
  QRTemplate, 
  QRTemplateCategory, 
  SubscriptionTier,
  ILogger,
  DatabaseError,
  NotFoundError 
} from '../interfaces';

/**
 * QR Template Repository - Clean Architecture Implementation
 * 
 * Currently uses in-memory storage, but follows repository pattern
 * for future database implementation without changing interface
 */
export class QRTemplateRepository implements IQRTemplateRepository {
  private templates: Map<string, QRTemplate> = new Map();

  constructor(
    private readonly logger: ILogger
  ) {
    this.initializeDefaultTemplates();
  }

  /**
   * Find all templates
   */
  async findAll(): Promise<QRTemplate[]> {
    try {
      this.logger.debug('Finding all QR templates');
      return Array.from(this.templates.values());
    } catch (error) {
      this.logger.error('Failed to find all templates', { error });
      throw new DatabaseError('Failed to fetch templates');
    }
  }

  /**
   * Find template by ID
   */
  async findById(id: string): Promise<QRTemplate | null> {
    try {
      this.logger.debug('Finding template by ID', { id });
      return this.templates.get(id) || null;
    } catch (error) {
      this.logger.error('Failed to find template by ID', { id, error });
      throw new DatabaseError('Failed to fetch template');
    }
  }

  /**
   * Find templates by category
   */
  async findByCategory(category: QRTemplateCategory): Promise<QRTemplate[]> {
    try {
      this.logger.debug('Finding templates by category', { category });
      return Array.from(this.templates.values()).filter(
        template => template.category === category
      );
    } catch (error) {
      this.logger.error('Failed to find templates by category', { category, error });
      throw new DatabaseError('Failed to fetch templates by category');
    }
  }

  /**
   * Find templates by subscription tier
   */
  async findBySubscriptionTier(tier: SubscriptionTier): Promise<QRTemplate[]> {
    try {
      this.logger.debug('Finding templates by subscription tier', { tier });
      
      const tierLevels: Record<SubscriptionTier, number> = {
        'free': 0,
        'starter': 1,
        'pro': 2,
        'business': 3,
        'enterprise': 4
      };

      const userTierLevel = tierLevels[tier] || 0;

      return Array.from(this.templates.values()).filter(template => {
        const templateTierLevel = tierLevels[template.requiredSubscriptionTier] || 0;
        return templateTierLevel <= userTierLevel;
      });
    } catch (error) {
      this.logger.error('Failed to find templates by subscription tier', { tier, error });
      throw new DatabaseError('Failed to fetch templates by subscription tier');
    }
  }

  /**
   * Find popular templates
   */
  async findPopular(): Promise<QRTemplate[]> {
    try {
      this.logger.debug('Finding popular templates');
      return Array.from(this.templates.values())
        .filter(template => template.isPopular)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.logger.error('Failed to find popular templates', { error });
      throw new DatabaseError('Failed to fetch popular templates');
    }
  }

  /**
   * Create new template
   */
  async create(templateData: Partial<QRTemplate>): Promise<QRTemplate> {
    try {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const template: QRTemplate = {
        id,
        name: templateData.name || 'Untitled Template',
        description: templateData.description || '',
        category: templateData.category || 'business',
        type: templateData.type || 'url',
        icon: templateData.icon || 'qrcode',
        isPopular: templateData.isPopular || false,
        isPremium: templateData.isPremium || false,
        requiredSubscriptionTier: templateData.requiredSubscriptionTier || 'free',
        defaultConfig: templateData.defaultConfig || {},
        fields: templateData.fields || [],
        contentStructure: templateData.contentStructure || {},
        examples: templateData.examples || [],
        createdAt: now,
        updatedAt: now
      };

      this.templates.set(id, template);
      this.logger.info('Created new template', { id, name: template.name });
      
      return template;
    } catch (error) {
      this.logger.error('Failed to create template', { templateData, error });
      throw new DatabaseError('Failed to create template');
    }
  }

  /**
   * Update existing template
   */
  async update(id: string, templateData: Partial<QRTemplate>): Promise<QRTemplate> {
    try {
      const existingTemplate = await this.findById(id);
      if (!existingTemplate) {
        throw new NotFoundError('Template');
      }

      const updatedTemplate: QRTemplate = {
        ...existingTemplate,
        ...templateData,
        id: existingTemplate.id, // Preserve ID
        createdAt: existingTemplate.createdAt, // Preserve creation date
        updatedAt: new Date()
      };

      this.templates.set(id, updatedTemplate);
      this.logger.info('Updated template', { id, changes: Object.keys(templateData) });
      
      return updatedTemplate;
    } catch (error) {
      this.logger.error('Failed to update template', { id, templateData, error });
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to update template');
    }
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<boolean> {
    try {
      const exists = this.templates.has(id);
      if (!exists) {
        return false;
      }

      this.templates.delete(id);
      this.logger.info('Deleted template', { id });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to delete template', { id, error });
      throw new DatabaseError('Failed to delete template');
    }
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Partial<QRTemplate>[] = [
      {
        name: 'Website URL',
        description: 'Simple QR code that redirects to any website',
        category: 'business',
        type: 'url',
        icon: 'globe',
        isPopular: true,
        isPremium: false,
        requiredSubscriptionTier: 'free',
        defaultConfig: {
          size: 300,
          format: 'png',
          errorCorrectionLevel: 'M'
        },
        fields: [
          {
            id: 'url',
            name: 'url',
            label: 'Website URL',
            type: 'url',
            required: true,
            placeholder: 'https://example.com',
            validation: {
              pattern: '^https?://.+$'
            }
          }
        ],
        contentStructure: {
          url: '{{url}}'
        },
        examples: [
          {
            name: 'Company Website',
            description: 'Link to your company homepage',
            data: { url: 'https://company.com' }
          }
        ]
      },
      {
        name: 'Business vCard',
        description: 'Share your contact information',
        category: 'business',
        type: 'vcard',
        icon: 'user',
        isPopular: true,
        isPremium: false,
        requiredSubscriptionTier: 'free',
        defaultConfig: {
          size: 300,
          format: 'png',
          errorCorrectionLevel: 'M'
        },
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'John Doe'
          },
          {
            id: 'phone',
            name: 'phone',
            label: 'Phone Number',
            type: 'phone',
            required: false,
            placeholder: '+1234567890'
          },
          {
            id: 'email',
            name: 'email',
            label: 'Email Address',
            type: 'email',
            required: false,
            placeholder: 'john@example.com'
          },
          {
            id: 'company',
            name: 'company',
            label: 'Company',
            type: 'text',
            required: false,
            placeholder: 'Company Inc.'
          }
        ],
        contentStructure: {
          fn: '{{name}}',
          org: '{{company}}',
          tel: '{{phone}}',
          email: '{{email}}'
        },
        examples: [
          {
            name: 'Business Card',
            description: 'Professional contact card',
            data: {
              name: 'John Doe',
              company: 'Tech Corp',
              phone: '+1234567890',
              email: 'john@techcorp.com'
            }
          }
        ]
      },
      {
        name: 'WiFi Access',
        description: 'Share WiFi credentials',
        category: 'personal',
        type: 'wifi',
        icon: 'wifi',
        isPopular: true,
        isPremium: false,
        requiredSubscriptionTier: 'free',
        defaultConfig: {
          size: 300,
          format: 'png',
          errorCorrectionLevel: 'M'
        },
        fields: [
          {
            id: 'ssid',
            name: 'ssid',
            label: 'Network Name (SSID)',
            type: 'text',
            required: true,
            placeholder: 'My Network'
          },
          {
            id: 'password',
            name: 'password',
            label: 'Password',
            type: 'password',
            required: true,
            placeholder: 'network password'
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
              { value: 'nopass', label: 'None' }
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
            name: 'Home WiFi',
            description: 'Share home network access',
            data: {
              ssid: 'Home Network',
              password: 'mypassword123',
              security: 'WPA'
            }
          }
        ]
      }
    ];

    // Create default templates
    defaultTemplates.forEach(async (templateData, index) => {
      try {
        await this.create({
          ...templateData,
          id: `default_${index + 1}`
        });
      } catch (error) {
        this.logger.error('Failed to create default template', { templateData, error });
      }
    });

    this.logger.info('Initialized default QR templates', { 
      count: defaultTemplates.length 
    });
  }
}