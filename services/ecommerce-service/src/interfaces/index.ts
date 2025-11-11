export interface ILogger {
  info(message: string, metadata?: any): void;
  error(message: string, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  debug(message: string, metadata?: any): void;
}

export interface IEcommerceRepository {
  createEcommerceQR(data: any): Promise<any>;
  findEcommerceQRById(id: string): Promise<any | null>;
  findEcommerceQRsByType(type: string, userId: string): Promise<any[]>;
  updateEcommerceQR(id: string, data: any): Promise<any>;
  deleteEcommerceQR(id: string): Promise<boolean>;
  trackAnalytics(data: any): Promise<void>;
  getAnalytics(qrCodeId: string): Promise<any>;
  getDashboard(userId: string): Promise<any>;
}

export interface IInventoryIntegrationRepository {
  createIntegration(data: any): Promise<any>;
  findIntegrationById(id: string): Promise<any | null>;
  findUserIntegrations(userId: string): Promise<any[]>;
  updateIntegration(id: string, data: any): Promise<any>;
  deleteIntegration(id: string): Promise<boolean>;
  updateProductInventory(integrationId: string, products: any[]): Promise<void>;
  getInventoryStatus(productId: string, integrationId?: string): Promise<any>;
}

export interface IEcommerceService {
  createProductQR(userId: string, request: any): Promise<ServiceResponse<any>>;
  createCouponQR(userId: string, request: any): Promise<ServiceResponse<any>>;
  createPaymentQR(userId: string, request: any): Promise<ServiceResponse<any>>;
  getEcommerceQR(id: string): Promise<ServiceResponse<any>>;
  getUserEcommerceQRs(userId: string, type?: string): Promise<ServiceResponse<any[]>>;
  updateEcommerceQR(id: string, data: any): Promise<ServiceResponse<any>>;
  deleteEcommerceQR(id: string): Promise<ServiceResponse<boolean>>;
  getDashboard(userId: string): Promise<ServiceResponse<any>>;
  validateCoupon(couponCode: string): Promise<ServiceResponse<any>>;
  processPayment(paymentData: any): Promise<ServiceResponse<any>>;
}

export interface IInventoryIntegrationService {
  createIntegration(userId: string, data: any): Promise<ServiceResponse<any>>;
  getUserIntegrations(userId: string): Promise<ServiceResponse<any[]>>;
  updateIntegration(id: string, data: any): Promise<ServiceResponse<any>>;
  deleteIntegration(id: string): Promise<ServiceResponse<boolean>>;
  syncInventory(integrationId: string): Promise<ServiceResponse<any>>;
  getInventoryStatus(productId: string, integrationId?: string): Promise<ServiceResponse<any>>;
  setupShopifyIntegration(userId: string, config: any): Promise<ServiceResponse<any>>;
  setupWooCommerceIntegration(userId: string, config: any): Promise<ServiceResponse<any>>;
}

export interface IHealthChecker {
  checkHealth(): Promise<any>;
  checkDatabaseHealth(): Promise<boolean>;
  checkExternalServicesHealth(): Promise<any>;
}

export interface IPricingEngine {
  calculatePrice(basePrice: number, rules: any[]): Promise<number>;
  validatePriceRules(rules: any[]): Promise<boolean>;
  evaluateConditions(conditions: any[], context: any): Promise<boolean>;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
  metadata?: {
    requestId?: string;
    timestamp?: string;
    total?: number;
  };
}

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', details);
    this.name = 'BusinessLogicError';
  }
}