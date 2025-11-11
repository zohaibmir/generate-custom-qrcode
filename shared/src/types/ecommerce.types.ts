export interface ProductQRData {
  productId: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  productUrl: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  sku?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'limited' | 'pre_order';
  stockCount?: number;
  variants?: ProductVariant[];
  
  // Dynamic pricing
  enableDynamicPricing?: boolean;
  priceRules?: PriceRule[];
  
  // Inventory integration
  trackInventory?: boolean;
  lowStockThreshold?: number;
  
  // Analytics tracking
  trackViews?: boolean;
  trackClicks?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  stockCount?: number;
  attributes: { [key: string]: string }; // e.g., { "color": "red", "size": "medium" }
}

export interface PriceRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'bulk_discount';
  value: number;
  conditions: PriceCondition[];
  priority: number;
  validFrom?: Date;
  validTo?: Date;
  isActive: boolean;
}

export interface PriceCondition {
  type: 'quantity' | 'user_tier' | 'time_range' | 'location' | 'first_time_buyer';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface CouponQRData {
  couponCode: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  currency?: string;
  
  // Usage limits
  usageLimit?: number;
  usageLimitPerUser?: number;
  currentUsage: number;
  
  // Validity
  validFrom: Date;
  validTo: Date;
  
  // Conditions
  applicableProducts?: string[]; // Product IDs
  applicableCategories?: string[];
  excludedProducts?: string[];
  firstTimeOnly?: boolean;
  
  // Auto-apply settings
  autoApply?: boolean;
  redirectUrl?: string;
  
  // Buy X Get Y specific
  buyQuantity?: number;
  getQuantity?: number;
  getFreeProduct?: string;
}

export interface PaymentQRData {
  type: 'stripe' | 'paypal' | 'klarna' | 'swish' | 'generic';
  amount?: number;
  currency: string;
  description?: string;
  
  // Stripe specific
  stripePaymentIntentId?: string;
  stripePublishableKey?: string;
  
  // PayPal specific
  paypalOrderId?: string;
  paypalClientId?: string;
  
  // Klarna specific
  klarnaSessionId?: string;
  klarnaClientToken?: string;
  
  // Swish specific (already implemented in qr.types.ts)
  swishRecipient?: string;
  swishMessage?: string;
  
  // Generic payment link
  paymentUrl?: string;
  
  // Dynamic pricing
  enableDynamicPricing?: boolean;
  priceRules?: PriceRule[];
  
  // Success/Cancel URLs
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  
  // Customer info
  customerEmail?: string;
  customerId?: string;
  allowGuestCheckout?: boolean;
}

export interface InventoryIntegration {
  id: string;
  userId: string;
  name: string;
  type: 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'custom' | 'manual';
  platform: 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'custom' | 'manual';
  platformVersion?: string;
  credentials: string; // Encrypted credentials JSON
  
  // API Configuration (legacy - kept for compatibility)
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  
  // Shopify specific (legacy)
  shopifyStoreName?: string;
  shopifyAccessToken?: string;
  
  // WooCommerce specific (legacy)
  wooCommerceUrl?: string;
  wooCommerceConsumerKey?: string;
  wooCommerceConsumerSecret?: string;
  
  // Manual inventory
  products?: ManualInventoryItem[];
  
  // Sync settings
  syncSettings?: {
    autoSync?: boolean;
    syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'manual';
    lastSyncAt?: Date | null;
  };
  
  // Configuration
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
  webhookSecret?: string;
}

export interface WooCommerceConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
  verifySSL?: boolean;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  stockCount: number;
  price: number;
  currency: string;
  productUrl?: string;
  imageUrl?: string;
  category?: string;
  updatedAt: Date;
}

export interface ManualInventoryItem {
  productId: string;
  sku: string;
  name: string;
  stockCount: number;
  price: number;
  currency: string;
  updatedAt: Date;
}

export interface EcommerceQRCode {
  id: string;
  qrCodeId: string; // Foreign key to main QR codes table
  type: 'product' | 'coupon' | 'payment' | 'inventory';
  
  // Type-specific data
  productData?: ProductQRData;
  couponData?: CouponQRData;
  paymentData?: PaymentQRData;
  
  // Inventory integration
  inventoryIntegrationId?: string;
  
  // Analytics
  views: number;
  scans: number;
  conversions: number;
  revenue: number;
  
  // Settings
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EcommerceAnalytics {
  qrCodeId: string;
  type: 'view' | 'scan' | 'click' | 'add_to_cart' | 'purchase';
  productId?: string;
  couponCode?: string;
  amount?: number;
  currency?: string;
  
  // User context
  userAgent?: string;
  ipHash?: string;
  country?: string;
  city?: string;
  
  // E-commerce specific
  cartValue?: number;
  itemsCount?: number;
  customerType?: 'new' | 'returning';
  
  timestamp: Date;
}

export interface CreateProductQRRequest {
  qrCodeId: string;
  productData: ProductQRData;
  inventoryIntegrationId?: string;
}

export interface CreateCouponQRRequest {
  qrCodeId: string;
  couponData: CouponQRData;
}

export interface CreatePaymentQRRequest {
  qrCodeId: string;
  paymentData: PaymentQRData;
}

export interface EcommerceQRResponse {
  id: string;
  qrCodeId: string;
  type: 'product' | 'coupon' | 'payment' | 'inventory';
  data: ProductQRData | CouponQRData | PaymentQRData;
  analytics: {
    views: number;
    scans: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryStatus {
  productId: string;
  sku: string;
  stockCount: number;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'pre_order';
  lastUpdated: Date;
  source: string; // Integration name or 'manual'
}

export interface EcommerceDashboard {
  totalProducts: number;
  totalCoupons: number;
  totalPayments: number;
  totalRevenue: number;
  totalConversions: number;
  conversionRate: number;
  averageOrderValue: number;
  
  topProducts: Array<{
    productId: string;
    name: string;
    scans: number;
    conversions: number;
    revenue: number;
  }>;
  
  topCoupons: Array<{
    couponCode: string;
    name: string;
    usage: number;
    discountGiven: number;
  }>;
  
  revenueByDay: Array<{
    date: string;
    revenue: number;
    conversions: number;
  }>;
  
  inventoryAlerts: Array<{
    productId: string;
    name: string;
    currentStock: number;
    threshold: number;
    status: 'low_stock' | 'out_of_stock';
  }>;
}