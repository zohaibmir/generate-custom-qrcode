# E-commerce QR Service

A comprehensive microservice for generating and managing E-commerce specific QR codes, including product QR codes, coupon codes, payment links, and inventory integrations.

## Features

### 🛍️ **Product QR Codes**
- Generate QR codes for specific products with dynamic pricing
- Support for product variants and custom titles
- Integration with external inventory systems
- Real-time pricing and stock updates

### 🎫 **Coupon QR Codes**
- Create discount coupons with various types (percentage, fixed amount, free shipping)
- Usage tracking and limits
- Advanced conditions and targeting
- Automatic validation and redemption

### 💳 **Payment QR Codes**
- Generate payment links with QR codes
- Support for multiple payment processors (Stripe, PayPal, Square)
- Real-time payment status tracking
- Customizable success/failure redirects

### 📊 **Inventory Integrations**
- Connect to popular e-commerce platforms:
  - Shopify
  - WooCommerce
  - Magento
  - BigCommerce
  - Custom APIs
  - Manual inventory management
- Real-time sync with external systems
- Webhook support for automatic updates

### 📈 **Analytics & Reporting**
- Track QR code views, scans, and conversions
- Revenue tracking and attribution
- Customer behavior analysis
- Export capabilities for reporting

## Architecture

The service follows Clean Architecture principles with clear separation of concerns:

```
src/
├── config/           # Configuration management
├── interfaces/       # TypeScript interfaces and contracts
├── repositories/     # Data access layer
├── services/         # Business logic layer
├── routes/           # HTTP route handlers
├── utils/           # Shared utilities
└── tests/           # Test suites
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd services/ecommerce-service
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   # Database tables are created automatically via database/schema.sql
   # Ensure your PostgreSQL database is running and accessible
   ```

4. **Start the service**:
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3011`

### Docker Setup

```bash
# Start only databases
docker-compose up -d

# Start all services including E-commerce
docker-compose -f docker-compose-all.yml up -d
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Service port | `3011` | No |
| `NODE_ENV` | Environment | `development` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_URL` | Redis connection string | - | Yes |
| `ENCRYPTION_KEY` | 32-character encryption key | - | Yes |
| `ENCRYPTION_ALGORITHM` | Encryption algorithm | `aes-256-cbc` | No |
| `STRIPE_API_KEY` | Stripe secret key | - | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | - | No |
| `PAYPAL_CLIENT_ID` | PayPal client ID | - | No |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret | - | No |
| `SHOPIFY_WEBHOOK_SECRET` | Shopify webhook secret | - | No |
| `WOOCOMMERCE_WEBHOOK_SECRET` | WooCommerce webhook secret | - | No |
| `ECOMMERCE_RATE_LIMIT_AUTH` | Rate limit for authenticated users | `1000` | No |
| `ECOMMERCE_RATE_LIMIT_ANON` | Rate limit for anonymous users | `100` | No |

### Database Configuration

The service requires PostgreSQL with the following tables:
- `inventory_integrations` - External platform connections
- `ecommerce_qr_codes` - E-commerce QR code metadata
- `inventory_items` - Cached product data
- `coupons` - Coupon definitions
- `payment_links` - Payment link data
- `ecommerce_analytics` - Event tracking
- `webhook_events` - Webhook processing logs

## API Documentation

### Base URL
```
http://localhost:3011/api
```

### Authentication
Most endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Health Check
```http
GET /health
```

#### Inventory Integrations
```http
GET    /integrations              # List integrations
POST   /integrations              # Create integration  
GET    /integrations/:id          # Get integration details
PUT    /integrations/:id          # Update integration
DELETE /integrations/:id          # Delete integration
POST   /integrations/:id/sync     # Trigger sync
```

#### E-commerce QR Codes
```http
GET    /qr                        # List E-commerce QR codes
POST   /qr                        # Create QR code
GET    /qr/:id                    # Get QR code details
PUT    /qr/:id                    # Update QR code
DELETE /qr/:id                    # Delete QR code
```

#### Product QR Codes
```http
POST   /qr/product                # Create product QR code
```

#### Coupon QR Codes
```http
POST   /qr/coupon                 # Create coupon QR code
GET    /coupons                   # List coupons
GET    /coupons/:id               # Get coupon details
POST   /coupons/:id/validate      # Validate coupon
```

#### Payment QR Codes
```http
POST   /qr/payment                # Create payment QR code
GET    /payments                  # List payments
GET    /payments/:id              # Get payment details
GET    /payments/:id/status       # Get payment status
```

#### Analytics
```http
GET    /analytics                 # Get analytics overview
POST   /analytics/events          # Track event
GET    /analytics/:qrId           # Get QR-specific analytics
```

## Integration Examples

### 1. Creating a Product QR Code

```javascript
const response = await fetch('/api/ecommerce/qr/product', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    qr_code_id: 'uuid-from-main-qr-service',
    inventory_integration_id: 'shopify-integration-id',
    product_data: {
      product_id: 'gid://shopify/Product/123',
      variant_id: 'gid://shopify/ProductVariant/456',
      custom_title: 'Limited Time Offer',
      price_override: 29.99,
      landing_page_url: 'https://mystore.com/special-offer'
    }
  })
});
```

### 2. Creating a Coupon QR Code

```javascript
const response = await fetch('/api/ecommerce/qr/coupon', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    qr_code_id: 'uuid-from-main-qr-service',
    coupon_data: {
      code: 'SAVE20',
      name: '20% Off Everything',
      type: 'percentage',
      value: 20,
      minimum_order_amount: 50,
      usage_limit: 100,
      expires_at: '2024-12-31T23:59:59Z'
    }
  })
});
```

### 3. Setting Up Shopify Integration

```javascript
const response = await fetch('/api/ecommerce/integrations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Shopify Store',
    type: 'shopify',
    credentials: {
      store_name: 'my-store.myshopify.com',
      access_token: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      api_version: '2023-10'
    },
    sync_settings: {
      auto_sync: true,
      sync_interval: '1h',
      product_fields: ['title', 'price', 'inventory_quantity']
    }
  })
});
```

## Payment Processor Setup

### Stripe Configuration

1. Get your Stripe API keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Set up webhooks for payment events:
   ```bash
   STRIPE_API_KEY=sk_test_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### PayPal Configuration

1. Create a PayPal app in the [PayPal Developer Console](https://developer.paypal.com/developer/applications/)
2. Configure environment variables:
   ```bash
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   ```

## Webhook Integration

The service supports webhooks from various e-commerce platforms for real-time data synchronization.

### Shopify Webhooks

Configure webhooks in your Shopify admin:

```http
POST https://your-domain.com/api/ecommerce/webhooks/shopify
```

Supported events:
- `products/create`
- `products/update`
- `products/delete`
- `orders/create`
- `orders/updated`

### WooCommerce Webhooks

Configure in WooCommerce Settings > Advanced > Webhooks:

```http
POST https://your-domain.com/api/ecommerce/webhooks/woocommerce
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="EcommerceService"

# Run in watch mode
npm run test:watch
```

### Test Structure

```
src/tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/
│   ├── routes/
│   └── database/
└── fixtures/
    └── test-data.ts
```

## Security

### Encryption
- All sensitive credentials are encrypted using AES-256-CBC
- Encryption keys should be rotated regularly
- Never store encryption keys in version control

### Rate Limiting
- Authenticated users: 1000 requests/hour
- Anonymous users: 100 requests/hour
- Rate limits are configurable via environment variables

### Input Validation
- All inputs are validated using Joi schemas
- SQL injection protection via parameterized queries
- XSS protection through input sanitization

## Monitoring & Logging

### Health Checks
```http
GET /health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "ecommerce-service",
    "timestamp": "2024-01-01T00:00:00Z",
    "database": "connected",
    "redis": "connected"
  }
}
```

### Logging

The service uses structured logging with different log levels:
- `error` - Error conditions
- `warn` - Warning conditions  
- `info` - Informational messages
- `debug` - Debug-level messages

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:5432
   ```
   - Ensure PostgreSQL is running
   - Check DATABASE_URL configuration
   - Verify database user permissions

2. **Encryption Key Error**
   ```
   Error: Invalid encryption key length
   ```
   - Ensure ENCRYPTION_KEY is exactly 32 characters
   - Generate a new key: `openssl rand -hex 16`

3. **Webhook Verification Failed**
   ```
   Error: Invalid webhook signature
   ```
   - Check webhook secrets in environment variables
   - Ensure webhook URLs are correctly configured

4. **Redis Connection Error**
   ```
   Error: Redis connection failed
   ```
   - Ensure Redis is running
   - Check REDIS_URL configuration

### Debugging

Enable debug logging:
```bash
NODE_ENV=development DEBUG=ecommerce:* npm run dev
```

Check service health:
```bash
curl http://localhost:3011/health
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Commit changes: `git commit -am 'Add new feature'`
6. Push to branch: `git push origin feature/new-feature`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:
- Check the [API documentation](http://localhost:3000/api-docs)
- Review existing [GitHub issues](https://github.com/your-org/qr-saas/issues)
- Create a new issue for bug reports or feature requests

## Changelog

### v1.0.0 (2024-01-01)
- Initial release
- Product QR codes with inventory integration
- Coupon QR codes with usage tracking
- Payment QR codes with multiple processors
- Shopify and WooCommerce integration
- Real-time analytics and reporting