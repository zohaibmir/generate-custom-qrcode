import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'QR Code SaaS Platform API',
    version: '1.0.0',
    description: `
# QR Code SaaS Platform API Gateway

Complete microservices-based QR code generation and analytics platform.

## 🏗️ Architecture
This API Gateway routes requests to the following microservices:
- **User Service** (Port 3001) - User management and authentication
- **QR Service** (Port 3002) - QR code generation and management  
- **Analytics Service** (Port 3003) - Scan tracking and analytics
- **File Service** (Port 3004) - File upload and storage
- **Notification Service** (Port 3005) - Email/SMS with database persistence

## 🗄️ Database Integration
- **PostgreSQL**: Complete persistence across all services
- **Connection Pooling**: Optimized database connections
- **JSONB Storage**: Flexible QR content and configuration storage
- **Foreign Key Constraints**: Data integrity across services

## 🔒 Authentication
JWT-based authentication system (ready for implementation).

## 📊 Features
- ✅ Complete CRUD operations for all resources
- ✅ Database persistence with PostgreSQL
- ✅ File upload with metadata tracking
- ✅ Email/SMS notifications with database storage
- ✅ Comprehensive analytics and scan tracking
- ✅ Clean Architecture with SOLID principles

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
            description: 'QR code design configuration (stored as JSONB)',
            properties: {
              size: {
                type: 'number',
                minimum: 100,
                maximum: 1000,
                description: 'QR code size in pixels'
              },
              format: {
                type: 'string',
                enum: ['png', 'jpg', 'svg'],
                description: 'Image format'
              },
              errorCorrectionLevel: {
                type: 'string',
                enum: ['L', 'M', 'Q', 'H'],
                description: 'Error correction level'
              }
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
      name: 'Analytics',
      description: 'Scan tracking and analytics'
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
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
    './src/docs/*.ts',
    './src/index.ts',
    './src/app.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);