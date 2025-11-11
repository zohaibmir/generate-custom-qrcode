import { 
  EcommerceQRCode,
  EcommerceQRResponse, 
  CreateProductQRRequest, 
  CreateCouponQRRequest, 
  CreatePaymentQRRequest,
  EcommerceDashboard,
  ProductQRData,
  CouponQRData,
  PaymentQRData
} from '@qr-saas/shared';
import { 
  IEcommerceService, 
  IEcommerceRepository, 
  IInventoryIntegrationRepository,
  ILogger, 
  ServiceResponse, 
  ValidationError, 
  NotFoundError, 
  BusinessLogicError 
} from '../interfaces';
import { PricingEngine } from '../utils/pricing-engine';

export class EcommerceService implements IEcommerceService {
  constructor(
    private readonly ecommerceRepository: IEcommerceRepository,
    private readonly inventoryRepository: IInventoryIntegrationRepository,
    private readonly pricingEngine: PricingEngine,
    private readonly logger: ILogger
  ) {}

  async createProductQR(userId: string, request: CreateProductQRRequest): Promise<ServiceResponse<EcommerceQRCode>> {
    try {
      this.logger.info('Creating product QR', {
        userId,
        qrCodeId: request.qrCodeId,
        productId: request.productData.productId
      });

      // Validate product data
      const validation = this.validateProductData(request.productData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product data',
            statusCode: 400,
            details: validation.errors
          }
        };
      }

      // Check inventory integration if specified
      if (request.inventoryIntegrationId) {
        const integration = await this.inventoryRepository.findIntegrationById(request.inventoryIntegrationId);
        if (!integration) {
          return {
            success: false,
            error: {
              code: 'INVENTORY_INTEGRATION_NOT_FOUND',
              message: 'Inventory integration not found',
              statusCode: 404
            }
          };
        }
      }

      // Apply dynamic pricing if enabled
      let finalProductData = { ...request.productData };
      if (request.productData.enableDynamicPricing && request.productData.priceRules && request.productData.price) {
        const calculatedPrice = await this.pricingEngine.calculatePrice(
          request.productData.price,
          request.productData.priceRules,
          {
            quantity: 1, // Default quantity for initial price calculation
            currentTime: new Date()
          }
        );
        
        finalProductData.price = calculatedPrice;
      }

      // Create e-commerce QR record
      const ecommerceQR = await this.ecommerceRepository.createEcommerceQR({
        qrCodeId: request.qrCodeId,
        type: 'product',
        productData: finalProductData,
        inventoryIntegrationId: request.inventoryIntegrationId
      });

      this.logger.info('Product QR created successfully', {
        id: ecommerceQR.id,
        qrCodeId: request.qrCodeId,
        productId: request.productData.productId
      });

      return {
        success: true,
        data: ecommerceQR,
        message: 'Product QR created successfully'
      };
    } catch (error) {
      this.logger.error('Failed to create product QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        qrCodeId: request.qrCodeId
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create product QR',
          statusCode: 500
        }
      };
    }
  }

  async createCouponQR(userId: string, request: CreateCouponQRRequest): Promise<ServiceResponse<EcommerceQRCode>> {
    try {
      this.logger.info('Creating coupon QR', {
        userId,
        qrCodeId: request.qrCodeId,
        couponCode: request.couponData.couponCode
      });

      // Validate coupon data
      const validation = this.validateCouponData(request.couponData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid coupon data',
            statusCode: 400,
            details: validation.errors
          }
        };
      }

      // Initialize current usage to 0
      const couponData = {
        ...request.couponData,
        currentUsage: 0
      };

      // Create e-commerce QR record
      const ecommerceQR = await this.ecommerceRepository.createEcommerceQR({
        qrCodeId: request.qrCodeId,
        type: 'coupon',
        couponData
      });

      this.logger.info('Coupon QR created successfully', {
        id: ecommerceQR.id,
        qrCodeId: request.qrCodeId,
        couponCode: request.couponData.couponCode
      });

      return {
        success: true,
        data: ecommerceQR,
        message: 'Coupon QR created successfully'
      };
    } catch (error) {
      this.logger.error('Failed to create coupon QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        qrCodeId: request.qrCodeId
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create coupon QR',
          statusCode: 500
        }
      };
    }
  }

  async createPaymentQR(userId: string, request: CreatePaymentQRRequest): Promise<ServiceResponse<EcommerceQRCode>> {
    try {
      this.logger.info('Creating payment QR', {
        userId,
        qrCodeId: request.qrCodeId,
        paymentType: request.paymentData.type
      });

      // Validate payment data
      const validation = this.validatePaymentData(request.paymentData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payment data',
            statusCode: 400,
            details: validation.errors
          }
        };
      }

      // Apply dynamic pricing if enabled
      let finalPaymentData = { ...request.paymentData };
      if (request.paymentData.enableDynamicPricing && request.paymentData.priceRules && request.paymentData.amount) {
        const calculatedAmount = await this.pricingEngine.calculatePrice(
          request.paymentData.amount,
          request.paymentData.priceRules,
          {
            quantity: 1,
            currentTime: new Date()
          }
        );
        
        finalPaymentData.amount = calculatedAmount;
      }

      // Create e-commerce QR record
      const ecommerceQR = await this.ecommerceRepository.createEcommerceQR({
        qrCodeId: request.qrCodeId,
        type: 'payment',
        paymentData: finalPaymentData
      });

      this.logger.info('Payment QR created successfully', {
        id: ecommerceQR.id,
        qrCodeId: request.qrCodeId,
        paymentType: request.paymentData.type
      });

      return {
        success: true,
        data: ecommerceQR,
        message: 'Payment QR created successfully'
      };
    } catch (error) {
      this.logger.error('Failed to create payment QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        qrCodeId: request.qrCodeId
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create payment QR',
          statusCode: 500
        }
      };
    }
  }

  async getEcommerceQR(id: string): Promise<ServiceResponse<EcommerceQRResponse>> {
    try {
      const ecommerceQR = await this.ecommerceRepository.findEcommerceQRById(id);
      
      if (!ecommerceQR) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'E-commerce QR not found',
            statusCode: 404
          }
        };
      }

      // Get analytics data
      const analytics = await this.ecommerceRepository.getAnalytics(ecommerceQR.qrCodeId);

      const response: EcommerceQRResponse = {
        id: ecommerceQR.id,
        qrCodeId: ecommerceQR.qrCodeId,
        type: ecommerceQR.type,
        data: this.getDataByType(ecommerceQR),
        analytics,
        isActive: ecommerceQR.isActive,
        createdAt: ecommerceQR.createdAt,
        updatedAt: ecommerceQR.updatedAt
      };

      return {
        success: true,
        data: response
      };
    } catch (error) {
      this.logger.error('Failed to get e-commerce QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get e-commerce QR',
          statusCode: 500
        }
      };
    }
  }

  async getUserEcommerceQRs(userId: string, type?: 'product' | 'coupon' | 'payment'): Promise<ServiceResponse<EcommerceQRResponse[]>> {
    try {
      let ecommerceQRs: EcommerceQRCode[];

      if (type) {
        ecommerceQRs = await this.ecommerceRepository.findEcommerceQRsByType(type, userId);
      } else {
        // Get all types
        const [products, coupons, payments] = await Promise.all([
          this.ecommerceRepository.findEcommerceQRsByType('product', userId),
          this.ecommerceRepository.findEcommerceQRsByType('coupon', userId),
          this.ecommerceRepository.findEcommerceQRsByType('payment', userId)
        ]);
        
        ecommerceQRs = [...products, ...coupons, ...payments]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      // Get analytics for each QR
      const responses: EcommerceQRResponse[] = await Promise.all(
        ecommerceQRs.map(async (qr) => {
          const analytics = await this.ecommerceRepository.getAnalytics(qr.qrCodeId);
          
          return {
            id: qr.id,
            qrCodeId: qr.qrCodeId,
            type: qr.type,
            data: this.getDataByType(qr),
            analytics,
            isActive: qr.isActive,
            createdAt: qr.createdAt,
            updatedAt: qr.updatedAt
          };
        })
      );

      return {
        success: true,
        data: responses,
        metadata: {
          total: responses.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user e-commerce QRs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get e-commerce QRs',
          statusCode: 500
        }
      };
    }
  }

  async updateEcommerceQR(id: string, data: {
    productData?: ProductQRData;
    couponData?: CouponQRData;
    paymentData?: PaymentQRData;
    inventoryIntegrationId?: string;
    isActive?: boolean;
  }): Promise<ServiceResponse<EcommerceQRCode>> {
    try {
      // Validate data based on type
      if (data.productData) {
        const validation = this.validateProductData(data.productData);
        if (!validation.isValid) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid product data',
              statusCode: 400,
              details: validation.errors
            }
          };
        }
      }

      if (data.couponData) {
        const validation = this.validateCouponData(data.couponData);
        if (!validation.isValid) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid coupon data',
              statusCode: 400,
              details: validation.errors
            }
          };
        }
      }

      if (data.paymentData) {
        const validation = this.validatePaymentData(data.paymentData);
        if (!validation.isValid) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid payment data',
              statusCode: 400,
              details: validation.errors
            }
          };
        }
      }

      const updatedQR = await this.ecommerceRepository.updateEcommerceQR(id, data);

      return {
        success: true,
        data: updatedQR,
        message: 'E-commerce QR updated successfully'
      };
    } catch (error) {
      this.logger.error('Failed to update e-commerce QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update e-commerce QR',
          statusCode: 500
        }
      };
    }
  }

  async deleteEcommerceQR(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const deleted = await this.ecommerceRepository.deleteEcommerceQR(id);

      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'E-commerce QR not found',
            statusCode: 404
          }
        };
      }

      return {
        success: true,
        data: true,
        message: 'E-commerce QR deleted successfully'
      };
    } catch (error) {
      this.logger.error('Failed to delete e-commerce QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete e-commerce QR',
          statusCode: 500
        }
      };
    }
  }

  async getDashboard(userId: string): Promise<ServiceResponse<EcommerceDashboard>> {
    try {
      const dashboard = await this.ecommerceRepository.getDashboard(userId);

      return {
        success: true,
        data: dashboard
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get dashboard',
          statusCode: 500
        }
      };
    }
  }

  async validateCoupon(couponCode: string): Promise<ServiceResponse<{
    isValid: boolean;
    couponData?: CouponQRData;
    reason?: string;
  }>> {
    try {
      // This is a simplified validation - in a real implementation,
      // you would query the database for the coupon
      // For now, we'll implement basic validation logic

      return {
        success: true,
        data: {
          isValid: true,
          reason: 'Coupon validation not fully implemented'
        }
      };
    } catch (error) {
      this.logger.error('Failed to validate coupon', {
        error: error instanceof Error ? error.message : 'Unknown error',
        couponCode
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate coupon',
          statusCode: 500
        }
      };
    }
  }

  async processPayment(paymentData: any): Promise<ServiceResponse<{
    success: boolean;
    transactionId?: string;
    redirectUrl?: string;
  }>> {
    try {
      // This is a placeholder for payment processing
      // In a real implementation, you would integrate with payment providers
      
      return {
        success: true,
        data: {
          success: true,
          transactionId: 'PLACEHOLDER_TX_ID'
        }
      };
    } catch (error) {
      this.logger.error('Failed to process payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentData
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process payment',
          statusCode: 500
        }
      };
    }
  }

  private validateProductData(data: ProductQRData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.productId) {
      errors.push('Product ID is required');
    }

    if (!data.name) {
      errors.push('Product name is required');
    }

    if (!data.productUrl) {
      errors.push('Product URL is required');
    }

    if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
      errors.push('Price must be a positive number');
    }

    if (data.stockCount !== undefined && (typeof data.stockCount !== 'number' || data.stockCount < 0)) {
      errors.push('Stock count must be a non-negative number');
    }

    if (data.lowStockThreshold !== undefined && (typeof data.lowStockThreshold !== 'number' || data.lowStockThreshold < 0)) {
      errors.push('Low stock threshold must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateCouponData(data: CouponQRData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.couponCode) {
      errors.push('Coupon code is required');
    }

    if (!data.name) {
      errors.push('Coupon name is required');
    }

    if (!data.discountType || !['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'].includes(data.discountType)) {
      errors.push('Valid discount type is required');
    }

    if (typeof data.discountValue !== 'number' || data.discountValue <= 0) {
      errors.push('Discount value must be a positive number');
    }

    if (data.discountType === 'percentage' && data.discountValue > 100) {
      errors.push('Percentage discount cannot exceed 100%');
    }

    if (!data.validFrom || !data.validTo) {
      errors.push('Valid from and valid to dates are required');
    }

    if (data.validFrom && data.validTo && new Date(data.validFrom) >= new Date(data.validTo)) {
      errors.push('Valid from date must be before valid to date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validatePaymentData(data: PaymentQRData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.type || !['stripe', 'paypal', 'klarna', 'swish', 'generic'].includes(data.type)) {
      errors.push('Valid payment type is required');
    }

    if (!data.currency) {
      errors.push('Currency is required');
    }

    if (data.amount !== undefined && (typeof data.amount !== 'number' || data.amount <= 0)) {
      errors.push('Amount must be a positive number');
    }

    // Type-specific validations
    if (data.type === 'stripe' && !data.stripePublishableKey) {
      errors.push('Stripe publishable key is required for Stripe payments');
    }

    if (data.type === 'paypal' && !data.paypalClientId) {
      errors.push('PayPal client ID is required for PayPal payments');
    }

    if (data.type === 'swish' && !data.swishRecipient) {
      errors.push('Swish recipient is required for Swish payments');
    }

    if (data.type === 'generic' && !data.paymentUrl) {
      errors.push('Payment URL is required for generic payments');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getDataByType(qr: EcommerceQRCode): ProductQRData | CouponQRData | PaymentQRData {
    switch (qr.type) {
      case 'product':
        return qr.productData!;
      case 'coupon':
        return qr.couponData!;
      case 'payment':
        return qr.paymentData!;
      default:
        throw new Error('Invalid QR type');
    }
  }
}