/**
 * E-commerce QR Service Routes Documentation
 * 
 * This file documents all routes related to E-commerce QR functionality
 * including inventory integrations, product QR codes, coupon QR codes,
 * payment QR codes, and analytics.
 */

export const ecommerceRouteConfig = {
  basePath: '/api/ecommerce',
  targetService: 'ecommerce-service',
  pathRewrite: '/api',
  requiresAuth: true,
  description: 'E-commerce QR functionality including inventory integrations and specialized QR codes'
};

export const ecommerceRoutes = [
  {
    path: '/api/ecommerce/health',
    method: 'GET',
    description: 'Health check for E-commerce service',
    requiresAuth: false,
    response: {
      success: true,
      status: 'healthy',
      timestamp: '2024-01-01T00:00:00Z'
    }
  },

  // Inventory Integrations
  {
    path: '/api/ecommerce/integrations',
    method: 'GET',
    description: 'Get all inventory integrations for the authenticated user',
    requiresAuth: true,
    response: {
      success: true,
      data: [
        {
          id: 'uuid',
          name: 'My Shopify Store',
          type: 'shopify',
          platform: 'shopify',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
    }
  },
  {
    path: '/api/ecommerce/integrations',
    method: 'POST',
    description: 'Create a new inventory integration',
    requiresAuth: true,
    body: {
      name: 'My Store',
      type: 'shopify',
      credentials: {
        store_name: 'mystore',
        access_token: 'token123'
      }
    }
  },
  {
    path: '/api/ecommerce/integrations/:integrationId',
    method: 'GET',
    description: 'Get specific inventory integration details',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/integrations/:integrationId',
    method: 'PUT',
    description: 'Update inventory integration',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/integrations/:integrationId',
    method: 'DELETE',
    description: 'Delete inventory integration',
    requiresAuth: true
  },

  // Inventory Items
  {
    path: '/api/ecommerce/integrations/:integrationId/items',
    method: 'GET',
    description: 'Get inventory items for an integration',
    requiresAuth: true,
    queryParams: {
      page: 1,
      limit: 20,
      category: 'electronics',
      search: 'product name'
    }
  },
  {
    path: '/api/ecommerce/integrations/:integrationId/items/:itemId',
    method: 'GET',
    description: 'Get specific inventory item details',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/integrations/:integrationId/sync',
    method: 'POST',
    description: 'Trigger inventory sync for an integration',
    requiresAuth: true
  },

  // E-commerce QR Codes
  {
    path: '/api/ecommerce/qr',
    method: 'GET',
    description: 'Get all E-commerce QR codes for the authenticated user',
    requiresAuth: true,
    queryParams: {
      type: 'product|coupon|payment|inventory',
      page: 1,
      limit: 20
    }
  },
  {
    path: '/api/ecommerce/qr',
    method: 'POST',
    description: 'Create a new E-commerce QR code',
    requiresAuth: true,
    body: {
      type: 'product',
      qr_code_id: 'uuid',
      product_data: {
        product_id: 'prod_123',
        variant_id: 'var_456',
        price_override: 29.99,
        custom_title: 'Special Product'
      }
    }
  },
  {
    path: '/api/ecommerce/qr/:qrId',
    method: 'GET',
    description: 'Get specific E-commerce QR code details',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/qr/:qrId',
    method: 'PUT',
    description: 'Update E-commerce QR code',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/qr/:qrId',
    method: 'DELETE',
    description: 'Delete E-commerce QR code',
    requiresAuth: true
  },

  // Product QR Codes
  {
    path: '/api/ecommerce/qr/product',
    method: 'POST',
    description: 'Create a product QR code',
    requiresAuth: true,
    body: {
      qr_code_id: 'uuid',
      inventory_integration_id: 'uuid',
      product_data: {
        product_id: 'prod_123',
        variant_id: 'var_456',
        custom_title: 'Special Product',
        custom_description: 'Limited time offer',
        price_override: 29.99,
        landing_page_url: 'https://example.com/product'
      }
    }
  },

  // Coupon QR Codes  
  {
    path: '/api/ecommerce/qr/coupon',
    method: 'POST',
    description: 'Create a coupon QR code',
    requiresAuth: true,
    body: {
      qr_code_id: 'uuid',
      coupon_data: {
        code: 'SAVE20',
        name: '20% Off Everything',
        description: 'Limited time discount',
        type: 'percentage',
        value: 20,
        minimum_order_amount: 50,
        usage_limit: 100,
        expires_at: '2024-12-31T23:59:59Z'
      }
    }
  },

  // Payment QR Codes
  {
    path: '/api/ecommerce/qr/payment',
    method: 'POST',
    description: 'Create a payment QR code',
    requiresAuth: true,
    body: {
      qr_code_id: 'uuid',
      payment_data: {
        amount: 100.00,
        currency: 'USD',
        description: 'Product purchase',
        payment_processor: 'stripe',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }
    }
  },

  // Coupons Management
  {
    path: '/api/ecommerce/coupons',
    method: 'GET',
    description: 'Get all coupons for the authenticated user',
    requiresAuth: true,
    queryParams: {
      active: true,
      type: 'percentage|fixed_amount|free_shipping',
      page: 1,
      limit: 20
    }
  },
  {
    path: '/api/ecommerce/coupons/:couponId',
    method: 'GET',
    description: 'Get specific coupon details',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/coupons/:couponId/usage',
    method: 'GET',
    description: 'Get coupon usage analytics',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/coupons/:couponId/validate',
    method: 'POST',
    description: 'Validate a coupon code',
    requiresAuth: false,
    body: {
      cart_total: 150.00,
      customer_id: 'cust_123'
    }
  },

  // Payment Links
  {
    path: '/api/ecommerce/payments',
    method: 'GET',
    description: 'Get all payment links for the authenticated user',
    requiresAuth: true,
    queryParams: {
      status: 'pending|completed|failed',
      page: 1,
      limit: 20
    }
  },
  {
    path: '/api/ecommerce/payments/:paymentId',
    method: 'GET',
    description: 'Get specific payment link details',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/payments/:paymentId/status',
    method: 'GET',
    description: 'Get payment status from processor',
    requiresAuth: false
  },

  // Analytics
  {
    path: '/api/ecommerce/analytics',
    method: 'GET',
    description: 'Get E-commerce analytics overview',
    requiresAuth: true,
    queryParams: {
      period: '7d|30d|90d|1y',
      type: 'product|coupon|payment|all'
    }
  },
  {
    path: '/api/ecommerce/analytics/events',
    method: 'POST',
    description: 'Track E-commerce analytics event',
    requiresAuth: false,
    body: {
      qr_code_id: 'uuid',
      event_type: 'view|scan|conversion|payment',
      event_data: {
        product_id: 'prod_123',
        quantity: 1,
        total_amount: 29.99,
        currency: 'USD'
      },
      user_agent: 'Mozilla/5.0...',
      ip_address: '192.168.1.1'
    }
  },
  {
    path: '/api/ecommerce/analytics/:qrId',
    method: 'GET',
    description: 'Get analytics for specific E-commerce QR code',
    requiresAuth: true,
    queryParams: {
      period: '7d|30d|90d|1y'
    }
  },

  // Price Rules
  {
    path: '/api/ecommerce/price-rules',
    method: 'GET',
    description: 'Get all price rules',
    requiresAuth: true
  },
  {
    path: '/api/ecommerce/price-rules',
    method: 'POST',
    description: 'Create a new price rule',
    requiresAuth: true,
    body: {
      name: 'Bulk Discount',
      type: 'bulk_discount',
      value: 10,
      conditions: [
        {
          field: 'quantity',
          operator: 'gte',
          value: 5
        }
      ],
      valid_from: '2024-01-01T00:00:00Z',
      valid_to: '2024-12-31T23:59:59Z'
    }
  },

  // Webhooks
  {
    path: '/api/ecommerce/webhooks/:integration',
    method: 'POST',
    description: 'Receive webhook from external platform (Shopify, WooCommerce, etc.)',
    requiresAuth: false,
    body: {
      // Webhook payload varies by platform
    }
  },
  {
    path: '/api/ecommerce/webhooks/events',
    method: 'GET',
    description: 'Get webhook event history',
    requiresAuth: true,
    queryParams: {
      integration_id: 'uuid',
      event_type: 'order_created|product_updated',
      processed: true,
      page: 1,
      limit: 20
    }
  }
];

export const ecommerceRoutesDescription = `
## E-commerce QR Service Routes

The E-commerce QR service provides specialized QR code functionality for retail and online commerce applications. It includes:

### Features
- **Inventory Integrations**: Connect to popular e-commerce platforms (Shopify, WooCommerce, etc.)
- **Product QR Codes**: Generate QR codes for specific products with dynamic pricing
- **Coupon QR Codes**: Create discount coupons with usage tracking
- **Payment QR Codes**: Generate payment links with multiple processor support
- **Analytics**: Track conversions, revenue, and customer engagement
- **Webhooks**: Real-time sync with external platforms

### Authentication
Most endpoints require authentication via JWT token in the Authorization header:
\`Authorization: Bearer <jwt_token>\`

### Error Handling
All endpoints return standardized error responses:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
\`\`\`

### Rate Limiting
API endpoints are rate limited to prevent abuse:
- Authenticated users: 1000 requests/hour
- Anonymous users: 100 requests/hour
`;