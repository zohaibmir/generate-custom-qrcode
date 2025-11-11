/**
 * @swagger
 * tags:
 *   - name: E-commerce
 *     description: E-commerce QR code functionality including inventory integrations, product QR codes, coupon codes, payment links, and analytics
 */

/**
 * E-commerce service Swagger schemas
 */
export const ecommerceSchemas = {
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
        description: 'Platform identifier (same as type for compatibility)'
      },
      platform_version: {
        type: 'string',
        description: 'Platform version',
        example: '2023-10'
      },
      credentials: {
        type: 'object',
        description: 'Encrypted platform credentials',
        example: {
          store_name: 'my-store.myshopify.com',
          access_token: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        }
      },
      sync_settings: {
        type: 'object',
        description: 'Synchronization settings',
        properties: {
          auto_sync: {
            type: 'boolean',
            description: 'Enable automatic synchronization'
          },
          sync_interval: {
            type: 'string',
            description: 'Sync interval',
            example: '1h'
          },
          product_fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Product fields to synchronize'
          }
        }
      },
      is_active: {
        type: 'boolean',
        description: 'Whether integration is active'
      },
      created_at: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    }
  },

  EcommerceQRCode: {
    type: 'object',
    required: ['qr_code_id', 'type'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique E-commerce QR code identifier'
      },
      qr_code_id: {
        type: 'string',
        format: 'uuid',
        description: 'Reference to main QR code'
      },
      type: {
        type: 'string',
        enum: ['product', 'coupon', 'payment', 'inventory'],
        description: 'Type of E-commerce QR code'
      },
      product_data: {
        type: 'object',
        description: 'Product-specific data',
        properties: {
          product_id: { type: 'string', description: 'External product ID' },
          variant_id: { type: 'string', description: 'Product variant ID' },
          custom_title: { type: 'string', description: 'Custom product title' },
          custom_description: { type: 'string', description: 'Custom product description' },
          price_override: { type: 'number', format: 'float', description: 'Override price' },
          landing_page_url: { type: 'string', format: 'uri', description: 'Custom landing page' }
        }
      },
      coupon_data: {
        type: 'object',
        description: 'Coupon-specific data',
        properties: {
          code: { type: 'string', description: 'Coupon code' },
          name: { type: 'string', description: 'Coupon name' },
          description: { type: 'string', description: 'Coupon description' },
          type: { 
            type: 'string', 
            enum: ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'],
            description: 'Coupon type' 
          },
          value: { type: 'number', format: 'float', description: 'Coupon value' },
          minimum_order_amount: { type: 'number', format: 'float', description: 'Minimum order amount' },
          usage_limit: { type: 'integer', description: 'Maximum usage limit' },
          expires_at: { type: 'string', format: 'date-time', description: 'Expiration date' }
        }
      },
      payment_data: {
        type: 'object',
        description: 'Payment-specific data',
        properties: {
          amount: { type: 'number', format: 'float', description: 'Payment amount' },
          currency: { type: 'string', description: 'Currency code', example: 'USD' },
          description: { type: 'string', description: 'Payment description' },
          payment_processor: { 
            type: 'string', 
            enum: ['stripe', 'paypal', 'square', 'manual'],
            description: 'Payment processor' 
          },
          success_url: { type: 'string', format: 'uri', description: 'Success redirect URL' },
          cancel_url: { type: 'string', format: 'uri', description: 'Cancel redirect URL' }
        }
      },
      inventory_integration_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated inventory integration'
      },
      views: {
        type: 'integer',
        description: 'Number of views'
      },
      scans: {
        type: 'integer',
        description: 'Number of scans'
      },
      conversions: {
        type: 'integer',
        description: 'Number of conversions'
      },
      revenue: {
        type: 'number',
        format: 'float',
        description: 'Total revenue generated'
      },
      is_active: {
        type: 'boolean',
        description: 'Whether QR code is active'
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
        format: 'uuid',
        description: 'Unique inventory item identifier'
      },
      integration_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated integration ID'
      },
      external_id: {
        type: 'string',
        description: 'Product ID from external system'
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
        format: 'float',
        description: 'Product price'
      },
      currency: {
        type: 'string',
        description: 'Price currency',
        example: 'USD'
      },
      stock_count: {
        type: 'integer',
        description: 'Current stock count'
      },
      low_stock_threshold: {
        type: 'integer',
        description: 'Low stock alert threshold'
      },
      category: {
        type: 'string',
        description: 'Product category'
      },
      brand: {
        type: 'string',
        description: 'Product brand'
      },
      image_url: {
        type: 'string',
        format: 'uri',
        description: 'Product image URL'
      },
      product_url: {
        type: 'string',
        format: 'uri',
        description: 'Product page URL'
      },
      weight: {
        type: 'number',
        format: 'float',
        description: 'Product weight'
      },
      dimensions: {
        type: 'object',
        description: 'Product dimensions',
        properties: {
          length: { type: 'number', format: 'float' },
          width: { type: 'number', format: 'float' },
          height: { type: 'number', format: 'float' },
          unit: { type: 'string', example: 'cm' }
        }
      },
      variants: {
        type: 'array',
        description: 'Product variants',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number', format: 'float' },
            sku: { type: 'string' },
            stock_count: { type: 'integer' }
          }
        }
      },
      sync_status: {
        type: 'string',
        enum: ['synced', 'error', 'pending'],
        description: 'Synchronization status'
      },
      last_synced_at: {
        type: 'string',
        format: 'date-time',
        description: 'Last synchronization timestamp'
      },
      is_active: {
        type: 'boolean',
        description: 'Whether item is active'
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
    required: ['qr_code_id', 'code', 'name', 'type'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique coupon identifier'
      },
      qr_code_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated QR code ID'
      },
      code: {
        type: 'string',
        description: 'Coupon code',
        example: 'SAVE20'
      },
      name: {
        type: 'string',
        description: 'Coupon name',
        example: '20% Off Everything'
      },
      description: {
        type: 'string',
        description: 'Coupon description'
      },
      type: {
        type: 'string',
        enum: ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'],
        description: 'Type of discount'
      },
      value: {
        type: 'number',
        format: 'float',
        description: 'Discount value'
      },
      minimum_order_amount: {
        type: 'number',
        format: 'float',
        description: 'Minimum order amount required'
      },
      maximum_discount_amount: {
        type: 'number',
        format: 'float',
        description: 'Maximum discount amount'
      },
      usage_limit: {
        type: 'integer',
        description: 'Total usage limit'
      },
      usage_count: {
        type: 'integer',
        description: 'Current usage count'
      },
      per_customer_usage_limit: {
        type: 'integer',
        description: 'Per-customer usage limit'
      },
      applies_to: {
        type: 'string',
        enum: ['all', 'specific_products', 'specific_categories'],
        description: 'What the coupon applies to'
      },
      applicable_products: {
        type: 'array',
        items: { type: 'string' },
        description: 'Product IDs the coupon applies to'
      },
      applicable_categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Category IDs the coupon applies to'
      },
      starts_at: {
        type: 'string',
        format: 'date-time',
        description: 'Coupon start date'
      },
      ends_at: {
        type: 'string',
        format: 'date-time',
        description: 'Coupon end date'
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
    required: ['qr_code_id', 'amount', 'payment_processor'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique payment link identifier'
      },
      qr_code_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated QR code ID'
      },
      amount: {
        type: 'number',
        format: 'float',
        description: 'Payment amount'
      },
      currency: {
        type: 'string',
        description: 'Currency code',
        example: 'USD'
      },
      description: {
        type: 'string',
        description: 'Payment description'
      },
      payment_processor: {
        type: 'string',
        enum: ['stripe', 'paypal', 'square', 'manual'],
        description: 'Payment processor'
      },
      processor_payment_id: {
        type: 'string',
        description: 'Payment ID from processor'
      },
      status: {
        type: 'string',
        enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
        description: 'Payment status'
      },
      payment_method: {
        type: 'string',
        description: 'Payment method used'
      },
      transaction_fee: {
        type: 'number',
        format: 'float',
        description: 'Transaction fee'
      },
      net_amount: {
        type: 'number',
        format: 'float',
        description: 'Net amount received'
      },
      customer_email: {
        type: 'string',
        format: 'email',
        description: 'Customer email address'
      },
      customer_name: {
        type: 'string',
        description: 'Customer name'
      },
      billing_address: {
        type: 'object',
        description: 'Customer billing address',
        properties: {
          line1: { type: 'string' },
          line2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postal_code: { type: 'string' },
          country: { type: 'string' }
        }
      },
      expires_at: {
        type: 'string',
        format: 'date-time',
        description: 'Payment link expiration'
      },
      paid_at: {
        type: 'string',
        format: 'date-time',
        description: 'Payment completion timestamp'
      },
      refunded_at: {
        type: 'string',
        format: 'date-time',
        description: 'Refund timestamp'
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
        format: 'uuid',
        description: 'Unique analytics event identifier'
      },
      qr_code_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated QR code ID'
      },
      event_type: {
        type: 'string',
        enum: ['view', 'scan', 'conversion', 'payment'],
        description: 'Type of analytics event'
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
        description: 'IP address of the user'
      },
      referrer: {
        type: 'string',
        description: 'Referrer URL'
      },
      location_data: {
        type: 'object',
        description: 'Geographic location data',
        properties: {
          country: { type: 'string' },
          region: { type: 'string' },
          city: { type: 'string' },
          latitude: { type: 'number', format: 'float' },
          longitude: { type: 'number', format: 'float' }
        }
      },
      device_info: {
        type: 'object',
        description: 'Device and browser information',
        properties: {
          device_type: { type: 'string' },
          browser: { type: 'string' },
          os: { type: 'string' }
        }
      },
      session_id: {
        type: 'string',
        description: 'Session identifier'
      },
      product_id: {
        type: 'string',
        description: 'Product ID (for product-related events)'
      },
      variant_id: {
        type: 'string',
        description: 'Product variant ID'
      },
      quantity: {
        type: 'integer',
        description: 'Quantity involved in event'
      },
      unit_price: {
        type: 'number',
        format: 'float',
        description: 'Unit price'
      },
      total_amount: {
        type: 'number',
        format: 'float',
        description: 'Total amount'
      },
      currency: {
        type: 'string',
        description: 'Currency code'
      },
      coupon_code: {
        type: 'string',
        description: 'Coupon code used'
      },
      discount_amount: {
        type: 'number',
        format: 'float',
        description: 'Discount amount applied'
      },
      created_at: {
        type: 'string',
        format: 'date-time'
      }
    }
  },

  PriceRule: {
    type: 'object',
    required: ['name', 'type', 'value', 'conditions'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique price rule identifier'
      },
      integration_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated integration ID'
      },
      qr_code_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated QR code ID'
      },
      name: {
        type: 'string',
        description: 'Rule name',
        example: 'Bulk Discount'
      },
      type: {
        type: 'string',
        enum: ['percentage', 'fixed', 'bulk_discount'],
        description: 'Type of price rule'
      },
      value: {
        type: 'number',
        format: 'float',
        description: 'Rule value (percentage or fixed amount)'
      },
      conditions: {
        type: 'array',
        description: 'Rule conditions',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Field to evaluate' },
            operator: { type: 'string', enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] },
            value: { type: 'string', description: 'Value to compare against' }
          }
        }
      },
      priority: {
        type: 'integer',
        description: 'Rule priority (higher = more important)'
      },
      valid_from: {
        type: 'string',
        format: 'date-time',
        description: 'Rule start date'
      },
      valid_to: {
        type: 'string',
        format: 'date-time',
        description: 'Rule end date'
      },
      is_active: {
        type: 'boolean',
        description: 'Whether rule is active'
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

  WebhookEvent: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique webhook event identifier'
      },
      integration_id: {
        type: 'string',
        format: 'uuid',
        description: 'Associated integration ID'
      },
      event_type: {
        type: 'string',
        description: 'Type of webhook event',
        example: 'order_created'
      },
      event_source: {
        type: 'string',
        description: 'Source platform',
        example: 'shopify'
      },
      payload: {
        type: 'object',
        description: 'Raw webhook payload'
      },
      headers: {
        type: 'object',
        description: 'Request headers'
      },
      signature: {
        type: 'string',
        description: 'Webhook signature for verification'
      },
      processed: {
        type: 'boolean',
        description: 'Whether event has been processed'
      },
      processed_at: {
        type: 'string',
        format: 'date-time',
        description: 'Processing timestamp'
      },
      error_message: {
        type: 'string',
        description: 'Error message if processing failed'
      },
      retry_count: {
        type: 'integer',
        description: 'Number of retry attempts'
      },
      created_at: {
        type: 'string',
        format: 'date-time'
      }
    }
  },

  // Request/Response schemas
  CreateIntegrationRequest: {
    type: 'object',
    required: ['name', 'type', 'credentials'],
    properties: {
      name: {
        type: 'string',
        description: 'Integration name'
      },
      type: {
        type: 'string',
        enum: ['shopify', 'woocommerce', 'magento', 'bigcommerce', 'custom', 'manual']
      },
      credentials: {
        type: 'object',
        description: 'Platform-specific credentials'
      },
      sync_settings: {
        type: 'object',
        description: 'Sync configuration'
      }
    }
  },

  CreateProductQRRequest: {
    type: 'object',
    required: ['qr_code_id', 'product_data'],
    properties: {
      qr_code_id: {
        type: 'string',
        format: 'uuid'
      },
      inventory_integration_id: {
        type: 'string',
        format: 'uuid'
      },
      product_data: {
        type: 'object',
        required: ['product_id'],
        properties: {
          product_id: { type: 'string' },
          variant_id: { type: 'string' },
          custom_title: { type: 'string' },
          custom_description: { type: 'string' },
          price_override: { type: 'number', format: 'float' },
          landing_page_url: { type: 'string', format: 'uri' }
        }
      }
    }
  },

  CreateCouponQRRequest: {
    type: 'object',
    required: ['qr_code_id', 'coupon_data'],
    properties: {
      qr_code_id: {
        type: 'string',
        format: 'uuid'
      },
      coupon_data: {
        type: 'object',
        required: ['code', 'name', 'type'],
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          type: { 
            type: 'string', 
            enum: ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'] 
          },
          value: { type: 'number', format: 'float' },
          minimum_order_amount: { type: 'number', format: 'float' },
          maximum_discount_amount: { type: 'number', format: 'float' },
          usage_limit: { type: 'integer' },
          per_customer_usage_limit: { type: 'integer' },
          applies_to: { 
            type: 'string', 
            enum: ['all', 'specific_products', 'specific_categories'] 
          },
          applicable_products: { type: 'array', items: { type: 'string' } },
          applicable_categories: { type: 'array', items: { type: 'string' } },
          starts_at: { type: 'string', format: 'date-time' },
          ends_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  },

  CreatePaymentQRRequest: {
    type: 'object',
    required: ['qr_code_id', 'payment_data'],
    properties: {
      qr_code_id: {
        type: 'string',
        format: 'uuid'
      },
      payment_data: {
        type: 'object',
        required: ['amount', 'payment_processor'],
        properties: {
          amount: { type: 'number', format: 'float' },
          currency: { type: 'string', default: 'USD' },
          description: { type: 'string' },
          payment_processor: { 
            type: 'string', 
            enum: ['stripe', 'paypal', 'square', 'manual'] 
          },
          success_url: { type: 'string', format: 'uri' },
          cancel_url: { type: 'string', format: 'uri' }
        }
      }
    }
  },

  ValidateCouponRequest: {
    type: 'object',
    required: ['cart_total'],
    properties: {
      cart_total: {
        type: 'number',
        format: 'float',
        description: 'Total cart amount'
      },
      customer_id: {
        type: 'string',
        description: 'Customer identifier'
      },
      items: {
        type: 'array',
        description: 'Cart items',
        items: {
          type: 'object',
          properties: {
            product_id: { type: 'string' },
            category_id: { type: 'string' },
            quantity: { type: 'integer' },
            price: { type: 'number', format: 'float' }
          }
        }
      }
    }
  },

  ValidateCouponResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      valid: { type: 'boolean', description: 'Whether coupon is valid' },
      discount_amount: { 
        type: 'number', 
        format: 'float', 
        description: 'Calculated discount amount' 
      },
      final_total: { 
        type: 'number', 
        format: 'float', 
        description: 'Final total after discount' 
      },
      message: { type: 'string', description: 'Validation message' },
      coupon: { $ref: '#/components/schemas/Coupon' }
    }
  },

  AnalyticsEventRequest: {
    type: 'object',
    required: ['qr_code_id', 'event_type'],
    properties: {
      qr_code_id: {
        type: 'string',
        format: 'uuid'
      },
      event_type: {
        type: 'string',
        enum: ['view', 'scan', 'conversion', 'payment']
      },
      event_data: {
        type: 'object',
        description: 'Event-specific data'
      },
      user_agent: { type: 'string' },
      ip_address: { type: 'string' },
      referrer: { type: 'string' },
      location_data: { type: 'object' },
      device_info: { type: 'object' },
      session_id: { type: 'string' },
      product_id: { type: 'string' },
      variant_id: { type: 'string' },
      quantity: { type: 'integer' },
      unit_price: { type: 'number', format: 'float' },
      total_amount: { type: 'number', format: 'float' },
      currency: { type: 'string' },
      coupon_code: { type: 'string' },
      discount_amount: { type: 'number', format: 'float' }
    }
  },

  EcommerceAnalyticsResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          overview: {
            type: 'object',
            properties: {
              total_views: { type: 'integer' },
              total_scans: { type: 'integer' },
              total_conversions: { type: 'integer' },
              total_revenue: { type: 'number', format: 'float' },
              conversion_rate: { type: 'number', format: 'float' },
              average_order_value: { type: 'number', format: 'float' }
            }
          },
          top_products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string' },
                product_name: { type: 'string' },
                scans: { type: 'integer' },
                revenue: { type: 'number', format: 'float' }
              }
            }
          },
          revenue_by_period: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date' },
                revenue: { type: 'number', format: 'float' },
                orders: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }
};

/**
 * @swagger
 * /api/ecommerce/health:
 *   get:
 *     summary: Health check for E-commerce service
 *     tags: [E-commerce]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: healthy
 *                         service:
 *                           type: string
 *                           example: ecommerce-service
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 */

/**
 * @swagger
 * /api/ecommerce/integrations:
 *   get:
 *     summary: Get all inventory integrations
 *     description: Retrieve all inventory integrations for the authenticated user
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [shopify, woocommerce, magento, bigcommerce, custom, manual]
 *         description: Filter by integration type
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of inventory integrations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryIntegration'
 *   post:
 *     summary: Create a new inventory integration
 *     description: Connect to an e-commerce platform for inventory synchronization
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateIntegrationRequest'
 *           examples:
 *             shopify:
 *               summary: Shopify Integration
 *               value:
 *                 name: "My Shopify Store"
 *                 type: "shopify"
 *                 credentials:
 *                   store_name: "my-store.myshopify.com"
 *                   access_token: "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                   api_version: "2023-10"
 *                 sync_settings:
 *                   auto_sync: true
 *                   sync_interval: "1h"
 *                   product_fields: ["title", "price", "inventory_quantity"]
 *             woocommerce:
 *               summary: WooCommerce Integration  
 *               value:
 *                 name: "My WooCommerce Store"
 *                 type: "woocommerce"
 *                 credentials:
 *                   site_url: "https://mystore.com"
 *                   consumer_key: "ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                   consumer_secret: "cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                 sync_settings:
 *                   auto_sync: true
 *                   sync_interval: "30m"
 *     responses:
 *       201:
 *         description: Integration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InventoryIntegration'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/ecommerce/integrations/{integrationId}:
 *   get:
 *     summary: Get integration by ID
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: integrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Integration ID
 *     responses:
 *       200:
 *         description: Integration details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InventoryIntegration'
 *   put:
 *     summary: Update integration
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: integrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               credentials:
 *                 type: object
 *               sync_settings:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Integration updated successfully
 *   delete:
 *     summary: Delete integration
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: integrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Integration deleted successfully
 */

/**
 * @swagger
 * /api/ecommerce/qr/product:
 *   post:
 *     summary: Create a product QR code
 *     description: Generate a QR code that links to a specific product with dynamic pricing and custom landing pages
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductQRRequest'
 *           example:
 *             qr_code_id: "550e8400-e29b-41d4-a716-446655440001"
 *             inventory_integration_id: "550e8400-e29b-41d4-a716-446655440002"
 *             product_data:
 *               product_id: "gid://shopify/Product/123456789"
 *               variant_id: "gid://shopify/ProductVariant/987654321"
 *               custom_title: "Limited Time Special Offer"
 *               custom_description: "Get 20% off this amazing product!"
 *               price_override: 79.99
 *               landing_page_url: "https://mystore.com/special-offer"
 *     responses:
 *       201:
 *         description: Product QR code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/EcommerceQRCode'
 */

/**
 * @swagger
 * /api/ecommerce/qr/coupon:
 *   post:
 *     summary: Create a coupon QR code
 *     description: Generate a QR code for discount coupons with usage tracking and validation
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCouponQRRequest'
 *           example:
 *             qr_code_id: "550e8400-e29b-41d4-a716-446655440001"
 *             coupon_data:
 *               code: "SAVE20"
 *               name: "20% Off Everything"
 *               description: "Limited time discount for all products"
 *               type: "percentage"
 *               value: 20
 *               minimum_order_amount: 50.00
 *               usage_limit: 100
 *               per_customer_usage_limit: 1
 *               starts_at: "2024-01-01T00:00:00Z"
 *               ends_at: "2024-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Coupon QR code created successfully
 */

/**
 * @swagger
 * /api/ecommerce/qr/payment:
 *   post:
 *     summary: Create a payment QR code
 *     description: Generate a QR code for direct payments with multiple processor support
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentQRRequest'
 *           example:
 *             qr_code_id: "550e8400-e29b-41d4-a716-446655440001"
 *             payment_data:
 *               amount: 100.00
 *               currency: "USD"
 *               description: "Product purchase payment"
 *               payment_processor: "stripe"
 *               success_url: "https://mystore.com/payment/success"
 *               cancel_url: "https://mystore.com/payment/cancel"
 *     responses:
 *       201:
 *         description: Payment QR code created successfully
 */

/**
 * @swagger
 * /api/ecommerce/coupons/{couponId}/validate:
 *   post:
 *     summary: Validate a coupon
 *     description: Check if a coupon is valid and calculate discount amount
 *     tags: [E-commerce]
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Coupon ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidateCouponRequest'
 *           example:
 *             cart_total: 150.00
 *             customer_id: "cust_123456789"
 *             items:
 *               - product_id: "prod_123"
 *                 quantity: 2
 *                 price: 75.00
 *     responses:
 *       200:
 *         description: Coupon validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateCouponResponse'
 */

/**
 * @swagger
 * /api/ecommerce/analytics:
 *   get:
 *     summary: Get E-commerce analytics overview
 *     description: Retrieve comprehensive analytics for E-commerce QR codes including revenue, conversions, and performance metrics
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Analytics period
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [product, coupon, payment, all]
 *           default: all
 *         description: QR code type filter
 *       - in: query
 *         name: integration_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by integration ID
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EcommerceAnalyticsResponse'
 */

/**
 * @swagger
 * /api/ecommerce/analytics/events:
 *   post:
 *     summary: Track analytics event
 *     description: Record an analytics event for E-commerce QR code tracking
 *     tags: [E-commerce]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyticsEventRequest'
 *           example:
 *             qr_code_id: "550e8400-e29b-41d4-a716-446655440001"
 *             event_type: "conversion"
 *             event_data:
 *               order_id: "order_123456789"
 *               payment_method: "stripe"
 *             product_id: "prod_123"
 *             quantity: 2
 *             unit_price: 29.99
 *             total_amount: 59.98
 *             currency: "USD"
 *             user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
 *             ip_address: "192.168.1.100"
 *     responses:
 *       201:
 *         description: Analytics event recorded successfully
 */

/**
 * @swagger
 * /api/ecommerce/webhooks/{integration}:
 *   post:
 *     summary: Receive webhook from external platform
 *     description: Handle incoming webhooks from e-commerce platforms for real-time synchronization
 *     tags: [E-commerce]
 *     parameters:
 *       - in: path
 *         name: integration
 *         required: true
 *         schema:
 *           type: string
 *           enum: [shopify, woocommerce, magento, bigcommerce]
 *         description: Integration platform type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Platform-specific webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 *       401:
 *         description: Webhook signature verification failed
 */