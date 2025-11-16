import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';
import { bulkQRSchemas } from '../docs/bulk-qr-routes';
import { paymentSchemas } from '../docs/payment-routes';
import { ecommerceSchemas } from '../docs/ecommerce-swagger';
import { businessToolsSchemas } from '../docs/business-tools-routes';
import { cleanArchAuthSchemas } from '../docs/clean-architecture-auth';
import { subscriptionSchemas } from '../docs/clean-architecture-subscription';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'QR Code SaaS Platform API',
    version: '1.0.0',
    description: `
# QR Code SaaS Platform API Gateway

Complete microservices-based QR code generation and analytics platform.

## 🚀 Revolutionary Advanced QR Features
**Dynamic Content Resolution** - Serve different content based on:
- 📱 **Device Type**: Mobile app links for phones, website for desktop
- � **Location**: Country/region-specific content and geo-fencing
- ⏰ **Time**: Business hours menus, event schedules, time-sensitive content
- 🗣️ **Language**: Automatic localization based on user's language preference

This puts you ahead of 90% of QR platforms with intelligent, context-aware QR codes!

## �🏗️ Architecture
This API Gateway routes requests to the following microservices:
- **User Service** (Port 3001) - User management, authentication, and payment processing
- **QR Service** (Port 3002) - QR code generation and management  
- **Analytics Service** (Port 3003) - Scan tracking and analytics
- **File Service** (Port 3004) - File upload and storage
- **Notification Service** (Port 3005) - Email/SMS with database persistence
- **Team Service** (Port 3006) - Team and organization management with member invitations
- **Landing Page Service** (Port 3010) - Landing pages with forms, A/B testing, and analytics

## 🇸🇪 Swedish Market Payment Integration
- **Swish Integration**: Complete payment processing with 60%+ market coverage
- **Multi-Provider Support**: Stripe, Klarna, PayPal framework ready
- **Real Payment Processing**: Actual API integration, not just QR generation
- **Webhook Handling**: Secure callback processing for all providers
- **Database Persistence**: Complete audit trail and transaction management

## 💳 Payment Processing Features
- **Swish**: Mobile payments dominating Swedish market (60% coverage)
- **Stripe**: International credit/debit card processing
- **Klarna**: Buy now, pay later solutions
- **PayPal**: Global digital wallet payments
- **Audit Trail**: Complete transaction logging and compliance

## 🗄️ Database Integration
- **PostgreSQL**: Complete persistence across all services
- **Connection Pooling**: Optimized database connections
- **JSONB Storage**: Flexible QR content and configuration storage
- **Foreign Key Constraints**: Data integrity across services

## 🔒 Authentication & Clean Architecture
JWT-based authentication system with Clean Architecture implementation:
- **✅ SOLID Principles**: Proper separation of concerns with routes, controllers, and services
- **✅ Dependency Inversion**: Clean abstractions for database operations and business logic
- **✅ JWT Security**: Proper token generation with API Gateway issuer compatibility
- **✅ Subscription Management**: Tier-based feature access with upgrade/downgrade capabilities
- **✅ Modular Routes**: Separated authentication, user management, and subscription endpoints

## 📊 Features
- ✅ Complete CRUD operations for all resources
- ✅ Database persistence with PostgreSQL
- ✅ File upload with metadata tracking
- ✅ Email/SMS notifications with database storage
- ✅ Comprehensive analytics and scan tracking
- ✅ **Clean Architecture with SOLID principles**
- ✅ **JWT Authentication with proper API Gateway integration**
- ✅ **Subscription Management System** - Multi-tier (free, starter, professional, enterprise)
- 🚀 **NEW: Advanced QR Features** - Dynamic content resolution engine

## 🧪 Testing
Import the included Postman collection for comprehensive API testing.
    `,
    contact: {
      name: 'Zohaib Zahid',
      email: 'zohaib.mir@gmail.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server (API Gateway)'
    },
    {
      url: 'https://api.generate-custom-qrcode.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique user identifier'
          },
          name: {
            type: 'string',
            description: 'User full name',
            example: 'John Doe'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'john.doe@example.com'
          },
          subscriptionPlan: {
            type: 'string',
            enum: ['free', 'pro', 'enterprise'],
            description: 'User subscription plan'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      QRCode: {
        type: 'object',
        required: ['data', 'type', 'title'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique QR code identifier'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Owner user ID'
          },
          shortId: {
            type: 'string',
            description: 'Short identifier for redirect URLs',
            example: 'abc123'
          },
          name: {
            type: 'string',
            description: 'QR code title',
            example: 'My Website QR'
          },
          description: {
            type: 'string',
            description: 'QR code description',
            example: 'QR code for my company website'
          },
          content: {
            type: 'object',
            description: 'QR code content (stored as JSONB)',
            properties: {
              data: {
                type: 'string',
                description: 'The actual data encoded in QR code'
              },
              type: {
                type: 'string',
                enum: ['url', 'text', 'email', 'sms', 'wifi', 'vcard'],
                description: 'Type of QR code content'
              }
            }
          },
          designConfig: {
            type: 'object',
            description: 'Advanced QR code design configuration with subscription-tier features',
            properties: {
              size: {
                type: 'number',
                minimum: 100,
                maximum: 1200,
                description: 'QR code size in pixels (max varies by subscription tier)'
              },
              format: {
                type: 'string',
                enum: ['png', 'svg', 'pdf', 'webp'],
                description: 'Output image format'
              },
              errorCorrectionLevel: {
                type: 'string',
                enum: ['L', 'M', 'Q', 'H'],
                description: 'Error correction level (L=Low, M=Medium, Q=Quartile, H=High)'
              },
              margin: {
                type: 'number',
                minimum: 0,
                maximum: 20,
                description: 'Margin around QR code in modules'
              },
              color: {
                type: 'object',
                description: 'Basic color configuration',
                properties: {
                  foreground: {
                    type: 'string',
                    pattern: '^#[0-9A-Fa-f]{6}$',
                    description: 'Foreground color (hex format)'
                  },
                  background: {
                    type: 'string',
                    pattern: '^#[0-9A-Fa-f]{6}$',
                    description: 'Background color (hex format)'
                  }
                }
              },
              gradient: {
                type: 'object',
                description: 'Gradient color configuration (Business tier+)',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['linear', 'radial'],
                    description: 'Gradient type'
                  },
                  colors: {
                    type: 'array',
                    items: {
                      type: 'string',
                      pattern: '^#[0-9A-Fa-f]{6}$'
                    },
                    minItems: 2,
                    description: 'Array of gradient colors in hex format'
                  },
                  direction: {
                    type: 'number',
                    minimum: 0,
                    maximum: 360,
                    description: 'Gradient direction in degrees (linear only)'
                  }
                }
              },
              logo: {
                type: 'object',
                description: 'Logo overlay configuration (Pro tier+)',
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    description: 'Logo image URL'
                  },
                  size: {
                    type: 'number',
                    minimum: 5,
                    maximum: 50,
                    description: 'Logo size as percentage of QR code size'
                  },
                  position: {
                    type: 'string',
                    enum: ['center', 'corner'],
                    description: 'Logo position'
                  },
                  borderRadius: {
                    type: 'number',
                    minimum: 0,
                    maximum: 50,
                    description: 'Logo border radius in pixels'
                  },
                  opacity: {
                    type: 'number',
                    minimum: 0.1,
                    maximum: 1.0,
                    description: 'Logo opacity (0.1 to 1.0)'
                  }
                }
              },
              pattern: {
                type: 'string',
                enum: ['square', 'dots', 'rounded', 'diamond', 'circular'],
                description: 'QR code pattern style (availability varies by tier)'
              },
              cornerRadius: {
                type: 'number',
                minimum: 0,
                maximum: 10,
                description: 'Corner radius for rounded patterns'
              },
              eyePattern: {
                type: 'object',
                description: 'Eye pattern customization (Business tier+)',
                properties: {
                  outer: {
                    type: 'string',
                    enum: ['square', 'rounded', 'circle', 'diamond'],
                    description: 'Outer eye pattern'
                  },
                  inner: {
                    type: 'string',
                    enum: ['square', 'rounded', 'circle', 'diamond'],
                    description: 'Inner eye pattern'
                  },
                  color: {
                    type: 'string',
                    pattern: '^#[0-9A-Fa-f]{6}$',
                    description: 'Eye pattern color'
                  }
                }
              },
              frame: {
                type: 'object',
                description: 'Frame design configuration (Pro tier+)',
                properties: {
                  style: {
                    type: 'string',
                    enum: ['none', 'square', 'rounded', 'circle', 'banner'],
                    description: 'Frame style'
                  },
                  text: {
                    type: 'string',
                    maxLength: 50,
                    description: 'Text to display in frame'
                  },
                  textColor: {
                    type: 'string',
                    pattern: '^#[0-9A-Fa-f]{6}$',
                    description: 'Frame text color'
                  },
                  color: {
                    type: 'string',
                    pattern: '^#[0-9A-Fa-f]{6}$',
                    description: 'Frame background color'
                  },
                  width: {
                    type: 'number',
                    minimum: 5,
                    maximum: 50,
                    description: 'Frame width in pixels'
                  },
                  padding: {
                    type: 'number',
                    minimum: 0,
                    maximum: 20,
                    description: 'Frame padding in pixels'
                  }
                }
              },
              backgroundTransparent: {
                type: 'boolean',
                description: 'Enable transparent background (Pro tier+)'
              },
              backgroundImage: {
                type: 'object',
                description: 'Background image configuration (Enterprise tier)',
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    description: 'Background image URL'
                  },
                  opacity: {
                    type: 'number',
                    minimum: 0.1,
                    maximum: 1.0,
                    description: 'Background image opacity'
                  },
                  blend: {
                    type: 'string',
                    enum: ['normal', 'multiply', 'overlay'],
                    description: 'Background image blend mode'
                  }
                }
              },
              shadow: {
                type: 'object',
                description: 'Shadow effect configuration (Enterprise tier)',
                properties: {
                  color: {
                    type: 'string',
                    pattern: '^#[0-9A-Fa-f]{6}$',
                    description: 'Shadow color'
                  },
                  blur: {
                    type: 'number',
                    minimum: 0,
                    maximum: 50,
                    description: 'Shadow blur radius'
                  },
                  offsetX: {
                    type: 'number',
                    minimum: -20,
                    maximum: 20,
                    description: 'Shadow horizontal offset'
                  },
                  offsetY: {
                    type: 'number',
                    minimum: -20,
                    maximum: 20,
                    description: 'Shadow vertical offset'
                  }
                }
              },
              quality: {
                type: 'number',
                minimum: 10,
                maximum: 100,
                description: 'Output image quality (10-100)'
              }
            },
            example: {
              size: 400,
              errorCorrectionLevel: 'M',
              pattern: 'rounded',
              color: {
                foreground: '#1f2937',
                background: '#ffffff'
              },
              logo: {
                url: 'https://example.com/logo.png',
                size: 20,
                position: 'center'
              },
              frame: {
                style: 'rounded',
                text: 'Scan Me!',
                color: '#e5e7eb',
                width: 15
              },
              backgroundTransparent: false,
              quality: 90
            }
          },
          targetUrl: {
            type: 'string',
            format: 'uri',
            description: 'Redirect URL for this QR code'
          },
          is_active: {
            type: 'boolean',
            description: 'Whether QR code is active'
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'QR code expiration date (null for no expiration)'
          },
          max_scans: {
            type: 'number',
            nullable: true,
            description: 'Maximum allowed scans (null for unlimited)'
          },
          current_scans: {
            type: 'number',
            description: 'Current scan count'
          },
          password_hash: {
            type: 'string',
            nullable: true,
            description: 'Password hash for protected QR codes (null if not protected)'
          },
          valid_schedule: {
            type: 'object',
            nullable: true,
            description: 'Schedule configuration for when QR code is active (stored as JSONB)',
            properties: {
              dailyHours: {
                type: 'object',
                properties: {
                  startHour: { type: 'number', minimum: 0, maximum: 23 },
                  startMinute: { type: 'number', minimum: 0, maximum: 59 },
                  endHour: { type: 'number', minimum: 0, maximum: 23 },
                  endMinute: { type: 'number', minimum: 0, maximum: 59 }
                }
              },
              weeklyDays: {
                type: 'array',
                items: { type: 'number', minimum: 0, maximum: 6 },
                description: 'Days of week (0=Sunday, 1=Monday, etc.)'
              },
              dateRange: {
                type: 'object',
                properties: {
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' }
                }
              }
            }
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      Notification: {
        type: 'object',
        required: ['type', 'recipient'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique notification identifier'
          },
          type: {
            type: 'string',
            enum: ['email', 'sms'],
            description: 'Notification type'
          },
          recipient: {
            type: 'string',
            description: 'Email address or phone number',
            example: 'user@example.com'
          },
          template: {
            type: 'string',
            description: 'Template name to use',
            example: 'welcome'
          },
          data: {
            type: 'object',
            description: 'Template data for personalization',
            example: {
              name: 'John Doe',
              message: 'Welcome to our platform!'
            }
          },
          status: {
            type: 'string',
            enum: ['pending', 'sent', 'failed'],
            description: 'Notification status'
          },
          sentAt: {
            type: 'string',
            format: 'date-time',
            description: 'When notification was sent'
          }
        }
      },
      FileUpload: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique file identifier'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Owner user ID'
          },
          originalName: {
            type: 'string',
            description: 'Original filename'
          },
          storedName: {
            type: 'string',
            description: 'Stored filename on server'
          },
          filePath: {
            type: 'string',
            description: 'File storage path'
          },
          fileSize: {
            type: 'number',
            description: 'File size in bytes'
          },
          mimeType: {
            type: 'string',
            description: 'MIME type of the file'
          },
          uploadType: {
            type: 'string',
            enum: ['qr-logo', 'avatar', 'document'],
            description: 'Type of upload'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Upload timestamp'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code'
              },
              message: {
                type: 'string',
                description: 'Error message'
              }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code'
              },
              message: {
                type: 'string',
                description: 'Error message'
              }
            }
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            description: 'Response data'
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata',
            properties: {
              timestamp: {
                type: 'string',
                format: 'date-time'
              },
              requestId: {
                type: 'string'
              }
            }
          }
        }
      },
      ...bulkQRSchemas,
      ...paymentSchemas,
      ...ecommerceSchemas,
      ...businessToolsSchemas,
      ...cleanArchAuthSchemas,
      ...subscriptionSchemas,
      // Advanced QR Features Schemas
      QRContentRule: {
        type: 'object',
        required: [
          'rule_name',
          'rule_type', 
          'rule_data',
          'content_type',
          'content_value'
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique content rule identifier'
          },
          qr_code_id: {
            type: 'string',
            format: 'uuid',
            description: 'Associated QR code ID'
          },
          rule_name: {
            type: 'string',
            description: 'Human-readable rule name',
            example: 'Mobile Users'
          },
          rule_type: {
            type: 'string',
            enum: ['time', 'location', 'language', 'device'],
            description: 'Type of content rule'
          },
          rule_data: {
            type: 'object',
            description: 'Rule configuration data (JSONB)',
            example: {
              device_types: ['mobile']
            }
          },
          content_type: {
            type: 'string',
            enum: ['url', 'text', 'landing_page'],
            description: 'Type of content to serve'
          },
          content_value: {
            type: 'string',
            description: 'The actual content (URL, text, or landing page ID)',
            example: 'https://mobile.example.com'
          },
          priority: {
            type: 'integer',
            default: 0,
            description: 'Rule priority (higher numbers = higher priority)'
          },
          is_active: {
            type: 'boolean',
            default: true,
            description: 'Whether the rule is currently active'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      QRContentRuleStats: {
        type: 'object',
        properties: {
          rule_id: {
            type: 'string',
            format: 'uuid'
          },
          rule_name: {
            type: 'string'
          },
          total_evaluations: {
            type: 'integer',
            description: 'Total times rule was evaluated'
          },
          successful_matches: {
            type: 'integer',
            description: 'Times rule matched and was used'
          },
          match_rate: {
            type: 'number',
            format: 'float',
            description: 'Percentage of evaluations that matched'
          },
          avg_execution_time: {
            type: 'number',
            format: 'float',
            description: 'Average execution time in milliseconds'
          }
        }
      },
      ResolutionRequest: {
        type: 'object',
        required: ['device_type'],
        properties: {
          device_type: {
            type: 'string',
            enum: ['mobile', 'desktop', 'tablet'],
            description: 'Type of device making the request',
            example: 'mobile'
          },
          country: {
            type: 'string',
            description: 'Country code (ISO 3166-1 alpha-2)',
            example: 'US'
          },
          language: {
            type: 'string',
            description: 'Language code (ISO 639-1)',
            example: 'en'
          },
          location: {
            type: 'object',
            description: 'Geographic coordinates',
            properties: {
              latitude: {
                type: 'number',
                minimum: -90,
                maximum: 90
              },
              longitude: {
                type: 'number',
                minimum: -180,
                maximum: 180
              }
            },
            example: {
              latitude: 40.7589,
              longitude: -73.9851
            }
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Request timestamp (defaults to current time)',
            example: '2025-11-10T15:30:00Z'
          },
          user_agent: {
            type: 'string',
            description: 'User agent string',
            example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
          }
        }
      },
      ResolutionResult: {
        type: 'object',
        properties: {
          matched_rule: {
            allOf: [
              { $ref: '#/components/schemas/QRContentRule' },
              {
                type: 'object',
                properties: {
                  match_score: {
                    type: 'number',
                    format: 'float',
                    description: 'How well the rule matched (0-1)'
                  }
                }
              }
            ]
          },
          content: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['url', 'text', 'landing_page']
              },
              value: {
                type: 'string'
              },
              metadata: {
                type: 'object',
                description: 'Additional content metadata'
              }
            }
          },
          fallback_used: {
            type: 'boolean',
            description: 'Whether fallback content was used'
          },
          execution_time_ms: {
            type: 'integer',
            description: 'Time taken to resolve content in milliseconds'
          },
          rules_evaluated: {
            type: 'integer',
            description: 'Number of rules evaluated'
          }
        }
      },
      LandingPage: {
        type: 'object',
        required: ['name', 'title', 'templateId'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique landing page identifier'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Owner user ID'
          },
          name: {
            type: 'string',
            description: 'Landing page name',
            example: 'Product Launch Campaign'
          },
          title: {
            type: 'string',
            description: 'Landing page title',
            example: 'Welcome to Our New Product'
          },
          description: {
            type: 'string',
            description: 'Landing page description',
            example: 'Convert QR visitors into customers'
          },
          slug: {
            type: 'string',
            description: 'URL-friendly identifier',
            example: 'product-launch-2024'
          },
          templateId: {
            type: 'string',
            description: 'Template identifier',
            example: 'modern-hero'
          },
          content: {
            type: 'string',
            description: 'HTML content of the landing page'
          },
          seoTitle: {
            type: 'string',
            description: 'SEO meta title'
          },
          seoDescription: {
            type: 'string',
            description: 'SEO meta description'
          },
          isPublished: {
            type: 'boolean',
            description: 'Whether the landing page is published'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      LandingPageForm: {
        type: 'object',
        required: ['name', 'fields'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique form identifier'
          },
          landingPageId: {
            type: 'string',
            format: 'uuid',
            description: 'Associated landing page ID'
          },
          name: {
            type: 'string',
            description: 'Form name',
            example: 'Lead Capture Form'
          },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox'] },
                label: { type: 'string' },
                required: { type: 'boolean' },
                placeholder: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          successMessage: {
            type: 'string',
            description: 'Message shown after successful submission'
          },
          errorMessage: {
            type: 'string',
            description: 'Message shown on form errors'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      SubscriptionPlan: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique plan identifier'
          },
          name: {
            type: 'string',
            description: 'Plan name',
            example: 'Pro Plan'
          },
          description: {
            type: 'string',
            description: 'Plan description',
            example: 'Perfect for growing businesses'
          },
          price: {
            type: 'number',
            description: 'Plan price in cents',
            example: 2999
          },
          billingCycle: {
            type: 'string',
            enum: ['monthly', 'yearly'],
            description: 'Billing cycle'
          },
          features: {
            type: 'object',
            description: 'Plan features (stored as JSONB)',
            example: {
              "custom_domains": true,
              "advanced_analytics": true,
              "priority_support": true
            }
          },
          maxQrCodes: {
            type: 'number',
            description: 'Maximum QR codes allowed',
            example: 1000
          },
          maxScansPerMonth: {
            type: 'number',
            description: 'Maximum scans per month',
            example: 50000
          },
          stripePriceId: {
            type: 'string',
            description: 'Stripe price ID for billing'
          },
          isActive: {
            type: 'boolean',
            description: 'Whether plan is active'
          },
          displayOrder: {
            type: 'number',
            description: 'Display order for sorting'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      UserSubscription: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique subscription identifier'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'User ID'
          },
          planId: {
            type: 'string',
            format: 'uuid',
            description: 'Subscription plan ID'
          },
          stripeSubscriptionId: {
            type: 'string',
            description: 'Stripe subscription ID'
          },
          status: {
            type: 'string',
            enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing'],
            description: 'Subscription status'
          },
          currentPeriodStart: {
            type: 'string',
            format: 'date-time',
            description: 'Current billing period start'
          },
          currentPeriodEnd: {
            type: 'string',
            format: 'date-time',
            description: 'Current billing period end'
          },
          trialEnd: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Trial period end date'
          },
          cancelAtPeriodEnd: {
            type: 'boolean',
            description: 'Whether subscription will cancel at period end'
          },
          prorationAmount: {
            type: 'number',
            nullable: true,
            description: 'Proration amount for plan changes'
          },
          metadata: {
            type: 'object',
            description: 'Additional subscription metadata'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      SubscriptionUsage: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique usage record identifier'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'User ID'
          },
          subscriptionId: {
            type: 'string',
            format: 'uuid',
            description: 'Subscription ID'
          },
          qrCodesCreated: {
            type: 'number',
            description: 'Number of QR codes created this period'
          },
          scansThisPeriod: {
            type: 'number',
            description: 'Number of scans this period'
          },
          periodStart: {
            type: 'string',
            format: 'date-time',
            description: 'Usage period start'
          },
          periodEnd: {
            type: 'string',
            format: 'date-time',
            description: 'Usage period end'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      SubscribeRequest: {
        type: 'object',
        required: ['planId', 'paymentMethodId'],
        properties: {
          planId: {
            type: 'string',
            format: 'uuid',
            description: 'Subscription plan ID'
          },
          paymentMethodId: {
            type: 'string',
            description: 'Stripe payment method ID'
          },
          trialPeriodDays: {
            type: 'number',
            minimum: 0,
            maximum: 365,
            description: 'Trial period in days (optional)'
          }
        }
      },
      UpdatePaymentMethodRequest: {
        type: 'object',
        required: ['paymentMethodId'],
        properties: {
          paymentMethodId: {
            type: 'string',
            description: 'New Stripe payment method ID'
          }
        }
      },
      BillingHistoryResponse: {
        type: 'object',
        properties: {
          invoices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Stripe invoice ID'
                },
                amount: {
                  type: 'number',
                  description: 'Invoice amount in cents'
                },
                currency: {
                  type: 'string',
                  description: 'Currency code'
                },
                status: {
                  type: 'string',
                  description: 'Invoice status'
                },
                created: {
                  type: 'number',
                  description: 'Creation timestamp'
                },
                paidAt: {
                  type: 'number',
                  nullable: true,
                  description: 'Payment timestamp'
                },
                invoiceUrl: {
                  type: 'string',
                  description: 'Invoice URL'
                }
              }
            }
          },
          hasMore: {
            type: 'boolean',
            description: 'Whether there are more invoices'
          },
          total: {
            type: 'number',
            description: 'Total number of invoices'
          }
        }
      },
      CustomizationValidationResult: {
        type: 'object',
        description: 'Result of QR customization validation',
        properties: {
          isValid: {
            type: 'boolean',
            description: 'Whether the customization is valid for the subscription tier'
          },
          errors: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of validation error messages'
          },
          warnings: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of validation warning messages'
          }
        },
        example: {
          isValid: false,
          errors: [
            'Logo integration not available for free tier. Upgrade to Pro or higher.',
            'QR code size cannot exceed 300px for free tier'
          ],
          warnings: [
            'Consider upgrading to unlock advanced customization features'
          ]
        }
      },
      CustomizationLimits: {
        type: 'object',
        description: 'Customization limits for a subscription tier',
        properties: {
          maxSize: {
            type: 'number',
            description: 'Maximum QR code size in pixels'
          },
          allowLogo: {
            type: 'boolean',
            description: 'Whether logo overlay is allowed'
          },
          allowFrames: {
            type: 'boolean',
            description: 'Whether frame designs are allowed'
          },
          allowPatterns: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of allowed pattern types'
          },
          allowEyePatterns: {
            type: 'boolean',
            description: 'Whether eye pattern customization is allowed'
          },
          allowTransparency: {
            type: 'boolean',
            description: 'Whether transparent backgrounds are allowed'
          },
          allowGradients: {
            type: 'boolean',
            description: 'Whether gradient colors are allowed'
          },
          allowEffects: {
            type: 'boolean',
            description: 'Whether advanced effects (shadows, background images) are allowed'
          }
        },
        example: {
          maxSize: 500,
          allowLogo: true,
          allowFrames: true,
          allowPatterns: ['square', 'rounded', 'dots'],
          allowEyePatterns: false,
          allowTransparency: true,
          allowGradients: false,
          allowEffects: false
        }
      },
      Organization: {
        type: 'object',
        required: ['name'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique organization identifier'
          },
          name: {
            type: 'string',
            description: 'Organization name',
            example: 'Acme Corp'
          },
          description: {
            type: 'string',
            description: 'Organization description',
            example: 'Leading software company'
          },
          ownerId: {
            type: 'string',
            format: 'uuid',
            description: 'Organization owner user ID'
          },
          settings: {
            type: 'object',
            description: 'Organization settings',
            properties: {
              allowMemberInvites: {
                type: 'boolean',
                description: 'Whether members can invite others'
              },
              requireApproval: {
                type: 'boolean',
                description: 'Whether invitations require approval'
              }
            }
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      Member: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique member identifier'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'User ID of the member'
          },
          organizationId: {
            type: 'string',
            format: 'uuid',
            description: 'Organization ID'
          },
          role: {
            type: 'string',
            enum: ['member', 'admin', 'owner'],
            description: 'Member role in organization'
          },
          joinedAt: {
            type: 'string',
            format: 'date-time',
            description: 'When member joined the organization'
          },
          user: {
            type: 'object',
            description: 'User details',
            properties: {
              name: {
                type: 'string',
                description: 'User name'
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'User email'
              }
            }
          }
        }
      },
      Invitation: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique invitation identifier'
          },
          organizationId: {
            type: 'string',
            format: 'uuid',
            description: 'Organization ID'
          },
          invitedBy: {
            type: 'string',
            format: 'uuid',
            description: 'User ID who sent the invitation'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email of invited user'
          },
          role: {
            type: 'string',
            enum: ['member', 'admin', 'owner'],
            description: 'Role to be assigned'
          },
          status: {
            type: 'string',
            enum: ['pending', 'accepted', 'rejected', 'expired'],
            description: 'Invitation status'
          },
          token: {
            type: 'string',
            description: 'Invitation token'
          },
          message: {
            type: 'string',
            description: 'Optional invitation message'
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Invitation expiration date'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          organization: {
            type: 'object',
            description: 'Organization details',
            properties: {
              name: {
                type: 'string',
                description: 'Organization name'
              },
              description: {
                type: 'string',
                description: 'Organization description'
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Health',
      description: 'System health and status endpoints'
    },
    {
      name: 'Users',
      description: 'User management operations'
    },
    {
      name: 'Authentication',
      description: 'Authentication and authorization'
    },
    {
      name: 'QR Codes',
      description: 'QR code generation and management'
    },
    {
      name: 'Advanced QR Features',
      description: '🚀 Dynamic content resolution based on device, location, time, and language - the revolutionary feature that sets your QR platform apart from 90% of competitors!'
    },
    {
      name: 'Analytics',
      description: 'Scan tracking and analytics'
    },
    {
      name: 'Custom Dashboards',
      description: '📊 Personalized analytics dashboards with drag-and-drop widgets, real-time data visualization, and customizable layouts for comprehensive QR performance monitoring'
    },
    {
      name: 'Real-time Alerts',
      description: '🚨 Intelligent alert system with threshold-based notifications, anomaly detection, and multi-channel delivery (email, SMS, webhooks) for proactive QR campaign monitoring'
    },
    {
      name: 'Predictive Analytics',
      description: '🤖 AI-powered prediction engine using ARIMA, LSTM, and Prophet algorithms for scan forecasting, trend analysis, and optimization recommendations'
    },
    {
      name: 'Cross-Campaign Analytics',
      description: '📊 Advanced cross-campaign analysis with A/B testing, attribution modeling, cohort analysis, statistical testing, and AI-powered optimization recommendations for enterprise-grade campaign management'
    },
    {
      name: 'Files',
      description: 'File upload and management'
    },
    {
      name: 'Notifications',
      description: 'Email and SMS notifications with database persistence'
    },
    {
      name: 'Templates',
      description: 'QR code templates for quick generation with pre-configured settings'
    },
    {
      name: 'Bulk QR Generation',
      description: 'Bulk QR code generation operations with CSV processing, batch management, and progress tracking'
    },
    {
      name: 'Subscriptions',
      description: 'Subscription management, billing, and payment processing with Stripe integration'
    },
    {
      name: 'Landing Pages',
      description: 'Landing page service for QR code campaigns with templates, forms, A/B testing, and analytics'
    },
    {
      name: 'Teams',
      description: 'Team and organization management with member invitations and role-based access control'
    },
    {
      name: 'Payments',
      description: 'Payment processing with multiple providers including Swish for Swedish market (60%+ coverage), Stripe, Klarna, and PayPal'
    },
    {
      name: 'E-commerce',
      description: 'E-commerce QR functionality including inventory integrations, product QR codes, coupon codes, payment links, and comprehensive analytics'
    },
    {
      name: 'Content Management',
      description: 'Complete CMS with blog posts, testimonials, static pages, rich text editing with Quill integration, SEO management, and media handling'
    },
    {
      name: 'Public Content',
      description: 'Public endpoints for serving published content including posts, categories, and tags for website integration'
    },
    {
      name: 'Marketing Tools', 
      description: 'Comprehensive marketing tools including campaign management, UTM parameter tracking, conversion tracking, and retargeting pixel management'
    },
    {
      name: 'Custom Domains',
      description: 'Custom domain management, DNS verification, and SSL certificate provisioning'
    },
    {
      name: 'White Label',
      description: 'White label branding, customization, and brand asset management'
    },
    {
      name: 'GDPR',
      description: 'GDPR compliance, data protection, consent management, and privacy controls'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
    './src/docs/*.ts',
    './src/docs/auth-routes.ts',
    './src/docs/subscription-routes.ts',
    './src/docs/payment-routes.ts',
    './src/docs/team-routes.ts',
    './src/docs/analytics-files-routes.ts',
    './src/docs/cross-campaign-analytics-routes.ts',
    './src/docs/custom-dashboards-routes.ts',
    './src/docs/real-time-alerts-routes.ts',
    './src/docs/predictive-analytics-routes.ts',
    './src/docs/landing-page-routes.ts',
    './src/docs/ecommerce-swagger.ts',
    './src/docs/content-routes.ts',
    './src/docs/business-tools-routes.ts',
    '../analytics-service/src/docs/marketing-routes.ts',
    './src/index.ts',
    './src/app.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);