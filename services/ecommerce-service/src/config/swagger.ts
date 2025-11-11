import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'E-commerce QR Service API',
    version: '1.0.0',
    description: `
# E-commerce QR Service

Complete E-commerce QR functionality including:

## 🛍️ Core Features
- **Inventory Integrations**: Connect with Shopify, WooCommerce, Magento, BigCommerce
- **Product QR Codes**: Direct-to-product QR generation with inventory sync
- **Smart Coupons**: QR-based coupon codes with usage tracking
- **Payment Links**: Instant payment QR codes with multiple providers
- **Advanced Analytics**: Comprehensive e-commerce scan tracking

## 🔌 Platform Integrations
- **Shopify**: Full API integration with webhook support
- **WooCommerce**: REST API integration with real-time sync
- **Magento**: GraphQL and REST API support
- **BigCommerce**: Storefront and management API integration
- **Manual**: Custom product management for any platform

## 📊 Analytics & Intelligence
- Real-time purchase tracking through QR scans
- Customer journey analytics from scan to purchase
- Product performance metrics and conversion rates
- A/B testing capabilities for QR campaigns
- Geographic and demographic insights

## 💳 Payment Processing
- Multi-provider payment link generation
- QR-based instant checkout flows
- Subscription and recurring payment support
- Comprehensive transaction tracking

## 🎯 Advanced Features
- Dynamic pricing rules based on conditions
- Geo-fenced coupons and promotions
- Time-sensitive offers and flash sales
- Customer segmentation for targeted campaigns
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
      url: 'http://localhost:3007',
      description: 'Development server (E-commerce Service)'
    },
    {
      url: 'http://localhost:3000/api/ecommerce',
      description: 'Development server via API Gateway'
    },
    {
      url: 'https://api.generate-custom-qrcode.com/api/ecommerce',
      description: 'Production server via API Gateway'
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
      InventoryIntegration: {
        type: 'object',
        required: ['name', 'type', 'credentials'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique integration identifier'
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID of the integration owner'
          },
          name: {
            type: 'string',
            description: 'Integration name',
            example: 'My Shopify Store'
          },
          type: {
            type: 'string',
            enum: ['shopify', 'woocommerce', 'magento', 'bigcommerce', 'custom', 'manual'],
            description: 'E-commerce platform type'
          },
          platform: {
            type: 'string',
            enum: ['shopify', 'woocommerce', 'magento', 'bigcommerce', 'custom', 'manual'],
            description: 'Platform identifier'
          },
          platform_version: {
            type: 'string',
            description: 'Platform version'
          },
          credentials: {
            type: 'object',
            description: 'Encrypted platform credentials'
          },
          settings: {
            type: 'object',
            description: 'Integration settings and preferences'
          },
          last_sync: {
            type: 'string',
            format: 'date-time',
            description: 'Last synchronization timestamp'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'error', 'syncing'],
            description: 'Integration status'
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
      EcommerceQRCode: {
        type: 'object',
        required: ['integration_id', 'product_id', 'name'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          integration_id: {
            type: 'string',
            format: 'uuid'
          },
          product_id: {
            type: 'string',
            description: 'External product ID'
          },
          name: {
            type: 'string',
            description: 'QR code name'
          },
          product_data: {
            type: 'object',
            description: 'Cached product information'
          },
          qr_config: {
            type: 'object',
            description: 'QR generation configuration'
          },
          qr_image_url: {
            type: 'string',
            description: 'Generated QR code image URL'
          },
          target_url: {
            type: 'string',
            description: 'Product URL for QR redirect'
          },
          analytics_enabled: {
            type: 'boolean',
            description: 'Whether analytics tracking is enabled'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'expired'],
            description: 'QR code status'
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
      InventoryItem: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          integration_id: {
            type: 'string',
            format: 'uuid'
          },
          external_id: {
            type: 'string',
            description: 'External platform product ID'
          },
          sku: {
            type: 'string',
            description: 'Product SKU'
          },
          name: {
            type: 'string',
            description: 'Product name'
          },
          description: {
            type: 'string',
            description: 'Product description'
          },
          price: {
            type: 'number',
            description: 'Product price'
          },
          currency: {
            type: 'string',
            description: 'Price currency code'
          },
          stock_quantity: {
            type: 'integer',
            description: 'Available stock quantity'
          },
          images: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Product image URLs'
          },
          category: {
            type: 'string',
            description: 'Product category'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Product tags'
          },
          product_data: {
            type: 'object',
            description: 'Additional product metadata'
          },
          is_active: {
            type: 'boolean',
            description: 'Whether product is active'
          },
          last_synced: {
            type: 'string',
            format: 'date-time'
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
      Coupon: {
        type: 'object',
        required: ['code', 'type', 'value'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          integration_id: {
            type: 'string',
            format: 'uuid'
          },
          code: {
            type: 'string',
            description: 'Coupon code'
          },
          name: {
            type: 'string',
            description: 'Coupon display name'
          },
          description: {
            type: 'string',
            description: 'Coupon description'
          },
          type: {
            type: 'string',
            enum: ['percentage', 'fixed_amount', 'free_shipping', 'bogo'],
            description: 'Coupon type'
          },
          value: {
            type: 'number',
            description: 'Discount value'
          },
          currency: {
            type: 'string',
            description: 'Currency for fixed amount discounts'
          },
          minimum_amount: {
            type: 'number',
            description: 'Minimum order amount'
          },
          maximum_discount: {
            type: 'number',
            description: 'Maximum discount amount'
          },
          usage_limit: {
            type: 'integer',
            description: 'Maximum usage limit'
          },
          usage_count: {
            type: 'integer',
            description: 'Current usage count'
          },
          valid_from: {
            type: 'string',
            format: 'date-time',
            description: 'Coupon valid from date'
          },
          valid_to: {
            type: 'string',
            format: 'date-time',
            description: 'Coupon expiration date'
          },
          applicable_products: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of applicable product IDs'
          },
          restrictions: {
            type: 'object',
            description: 'Additional coupon restrictions'
          },
          qr_enabled: {
            type: 'boolean',
            description: 'Whether QR code is enabled for this coupon'
          },
          qr_config: {
            type: 'object',
            description: 'QR generation configuration'
          },
          qr_image_url: {
            type: 'string',
            description: 'Generated QR code URL'
          },
          is_active: {
            type: 'boolean',
            description: 'Whether coupon is active'
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
      PaymentLink: {
        type: 'object',
        required: ['name', 'amount', 'currency'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          integration_id: {
            type: 'string',
            format: 'uuid'
          },
          name: {
            type: 'string',
            description: 'Payment link name'
          },
          description: {
            type: 'string',
            description: 'Payment description'
          },
          amount: {
            type: 'number',
            description: 'Payment amount'
          },
          currency: {
            type: 'string',
            description: 'Payment currency'
          },
          payment_provider: {
            type: 'string',
            enum: ['stripe', 'paypal', 'square', 'razorpay'],
            description: 'Payment provider'
          },
          provider_payment_id: {
            type: 'string',
            description: 'Provider-specific payment ID'
          },
          payment_url: {
            type: 'string',
            description: 'Payment checkout URL'
          },
          qr_config: {
            type: 'object',
            description: 'QR generation configuration'
          },
          qr_image_url: {
            type: 'string',
            description: 'Payment QR code URL'
          },
          collect_shipping: {
            type: 'boolean',
            description: 'Whether to collect shipping information'
          },
          collect_taxes: {
            type: 'boolean',
            description: 'Whether to calculate taxes'
          },
          success_url: {
            type: 'string',
            description: 'Redirect URL after successful payment'
          },
          cancel_url: {
            type: 'string',
            description: 'Redirect URL for cancelled payment'
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
            description: 'Payment link expiration'
          },
          metadata: {
            type: 'object',
            description: 'Additional payment metadata'
          },
          is_active: {
            type: 'boolean',
            description: 'Whether payment link is active'
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
      EcommerceAnalytics: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          integration_id: {
            type: 'string',
            format: 'uuid'
          },
          qr_id: {
            type: 'string',
            format: 'uuid',
            description: 'Associated QR code ID'
          },
          event_type: {
            type: 'string',
            enum: ['scan', 'view', 'add_to_cart', 'purchase', 'coupon_used'],
            description: 'Event type'
          },
          event_data: {
            type: 'object',
            description: 'Event-specific data'
          },
          user_agent: {
            type: 'string',
            description: 'User agent string'
          },
          ip_address: {
            type: 'string',
            description: 'User IP address'
          },
          location_data: {
            type: 'object',
            description: 'Geographic location data'
          },
          conversion_value: {
            type: 'number',
            description: 'Conversion value if applicable'
          },
          session_id: {
            type: 'string',
            description: 'User session identifier'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
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
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Health',
      description: 'Service health endpoints'
    },
    {
      name: 'Integrations',
      description: 'E-commerce platform integrations'
    },
    {
      name: 'Products',
      description: 'Product management and QR generation'
    },
    {
      name: 'Inventory',
      description: 'Inventory synchronization and management'
    },
    {
      name: 'Coupons',
      description: 'Coupon management and QR generation'
    },
    {
      name: 'Payments',
      description: 'Payment link generation and processing'
    },
    {
      name: 'Analytics',
      description: 'E-commerce analytics and tracking'
    },
    {
      name: 'Webhooks',
      description: 'Platform webhook handling'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/index.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);