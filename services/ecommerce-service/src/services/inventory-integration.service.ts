import { 
  InventoryIntegration,
  ManualInventoryItem,
  InventoryStatus
} from '@qr-saas/shared';
import { 
  IInventoryIntegrationService, 
  IInventoryIntegrationRepository,
  ILogger, 
  ServiceResponse, 
  ValidationError, 
  NotFoundError 
} from '../interfaces';
import axios from 'axios';
import * as crypto from 'crypto';

interface ShopifyConfig {
  storeName: string;
  accessToken: string;
}

interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export class InventoryIntegrationService implements IInventoryIntegrationService {
  constructor(
    private readonly repository: IInventoryIntegrationRepository,
    private readonly logger: ILogger
  ) {}

  async createIntegration(userId: string, data: {
    name: string;
    type: 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'custom' | 'manual';
    apiEndpoint?: string;
    apiKey?: string;
    apiSecret?: string;
    shopifyStoreName?: string;
    shopifyAccessToken?: string;
    wooCommerceUrl?: string;
    wooCommerceConsumerKey?: string;
    wooCommerceConsumerSecret?: string;
    products?: ManualInventoryItem[];
    autoSync?: boolean;
    syncFrequency?: number;
  }): Promise<ServiceResponse<InventoryIntegration>> {
    try {
      this.logger.info('Creating inventory integration', {
        userId,
        name: data.name,
        type: data.type
      });

      // Validate integration data
      const validation = this.validateIntegrationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid integration data',
            statusCode: 400,
            details: validation.errors
          }
        };
      }

      // Test connection if it's an API-based integration
      if (data.type !== 'manual') {
        const connectionTest = await this.testConnection(data);
        if (!connectionTest.success) {
          return {
            success: false,
            error: {
              code: 'CONNECTION_FAILED',
              message: `Failed to connect to ${data.type}`,
              statusCode: 400,
              details: connectionTest.error
            }
          };
        }
      }

      // Encrypt sensitive data
      const encryptedData = this.encryptSensitiveData(data);

      // Create integration
      const integration = await this.repository.createIntegration({
        userId,
        ...encryptedData
      });

      this.logger.info('Inventory integration created successfully', {
        id: integration.id,
        userId,
        name: data.name,
        type: data.type
      });

      return {
        success: true,
        data: integration,
        message: 'Inventory integration created successfully'
      };
    } catch (error) {
      this.logger.error('Failed to create inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        name: data.name,
        type: data.type
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create inventory integration',
          statusCode: 500
        }
      };
    }
  }

  async getUserIntegrations(userId: string): Promise<ServiceResponse<InventoryIntegration[]>> {
    try {
      const integrations = await this.repository.findUserIntegrations(userId);

      // Remove sensitive data from response
      const sanitizedIntegrations = integrations.map(integration => ({
        ...integration,
        apiKey: integration.apiKey ? '***' : undefined,
        apiSecret: integration.apiSecret ? '***' : undefined,
        shopifyAccessToken: integration.shopifyAccessToken ? '***' : undefined,
        wooCommerceConsumerSecret: integration.wooCommerceConsumerSecret ? '***' : undefined
      }));

      return {
        success: true,
        data: sanitizedIntegrations,
        metadata: {
          total: integrations.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user integrations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get integrations',
          statusCode: 500
        }
      };
    }
  }

  async updateIntegration(id: string, data: {
    name?: string;
    apiEndpoint?: string;
    apiKey?: string;
    apiSecret?: string;
    shopifyStoreName?: string;
    shopifyAccessToken?: string;
    wooCommerceUrl?: string;
    wooCommerceConsumerKey?: string;
    wooCommerceConsumerSecret?: string;
    products?: ManualInventoryItem[];
    autoSync?: boolean;
    syncFrequency?: number;
    isActive?: boolean;
  }): Promise<ServiceResponse<InventoryIntegration>> {
    try {
      // Test connection if sensitive data is being updated
      if (data.apiKey || data.apiSecret || data.shopifyAccessToken || data.wooCommerceConsumerSecret) {
        const integration = await this.repository.findIntegrationById(id);
        if (!integration) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Integration not found',
              statusCode: 404
            }
          };
        }

        const testData = { ...integration, ...data };
        const connectionTest = await this.testConnection(testData);
        if (!connectionTest.success) {
          return {
            success: false,
            error: {
              code: 'CONNECTION_FAILED',
              message: `Failed to connect with updated credentials`,
              statusCode: 400,
              details: connectionTest.error
            }
          };
        }
      }

      // Encrypt sensitive data
      const encryptedData = this.encryptSensitiveData(data);

      const updatedIntegration = await this.repository.updateIntegration(id, encryptedData);

      return {
        success: true,
        data: updatedIntegration,
        message: 'Integration updated successfully'
      };
    } catch (error) {
      this.logger.error('Failed to update integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update integration',
          statusCode: 500
        }
      };
    }
  }

  async deleteIntegration(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const deleted = await this.repository.deleteIntegration(id);

      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Integration not found',
            statusCode: 404
          }
        };
      }

      return {
        success: true,
        data: true,
        message: 'Integration deleted successfully'
      };
    } catch (error) {
      this.logger.error('Failed to delete integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete integration',
          statusCode: 500
        }
      };
    }
  }

  async syncInventory(integrationId: string): Promise<ServiceResponse<{
    syncedProducts: number;
    errors: string[];
  }>> {
    try {
      const integration = await this.repository.findIntegrationById(integrationId);
      
      if (!integration) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Integration not found',
            statusCode: 404
          }
        };
      }

      let syncResult: { products: ManualInventoryItem[]; errors: string[] };

      switch (integration.type) {
        case 'shopify':
          syncResult = await this.syncShopifyProducts(integration);
          break;
        case 'woocommerce':
          syncResult = await this.syncWooCommerceProducts(integration);
          break;
        case 'manual':
          return {
            success: false,
            error: {
              code: 'INVALID_OPERATION',
              message: 'Cannot sync manual integration',
              statusCode: 400
            }
          };
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_INTEGRATION',
              message: `Sync not supported for integration type: ${integration.type}`,
              statusCode: 400
            }
          };
      }

      if (syncResult.products.length > 0) {
        await this.repository.updateProductInventory(integrationId, syncResult.products);
      }

      // Update last sync time
      await this.repository.updateIntegration(integrationId, {
        lastSyncAt: new Date()
      });

      this.logger.info('Inventory sync completed', {
        integrationId,
        syncedProducts: syncResult.products.length,
        errors: syncResult.errors.length
      });

      return {
        success: true,
        data: {
          syncedProducts: syncResult.products.length,
          errors: syncResult.errors
        },
        message: `Synced ${syncResult.products.length} products`
      };
    } catch (error) {
      this.logger.error('Failed to sync inventory', {
        error: error instanceof Error ? error.message : 'Unknown error',
        integrationId
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to sync inventory',
          statusCode: 500
        }
      };
    }
  }

  async getInventoryStatus(productId: string, integrationId?: string): Promise<ServiceResponse<InventoryStatus | null>> {
    try {
      const status = await this.repository.getInventoryStatus(productId, integrationId);

      return {
        success: true,
        data: status
      };
    } catch (error) {
      this.logger.error('Failed to get inventory status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        integrationId
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get inventory status',
          statusCode: 500
        }
      };
    }
  }

  async setupShopifyIntegration(userId: string, config: ShopifyConfig): Promise<ServiceResponse<InventoryIntegration>> {
    try {
      const integrationData = {
        name: `Shopify - ${config.storeName}`,
        type: 'shopify' as const,
        shopifyStoreName: config.storeName,
        shopifyAccessToken: config.accessToken,
        apiEndpoint: `https://${config.storeName}.myshopify.com`,
        autoSync: true,
        syncFrequency: 60 // 1 hour
      };

      return await this.createIntegration(userId, integrationData);
    } catch (error) {
      this.logger.error('Failed to setup Shopify integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        storeName: config.storeName
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to setup Shopify integration',
          statusCode: 500
        }
      };
    }
  }

  async setupWooCommerceIntegration(userId: string, config: WooCommerceConfig): Promise<ServiceResponse<InventoryIntegration>> {
    try {
      const integrationData = {
        name: `WooCommerce - ${new URL(config.storeUrl).hostname}`,
        type: 'woocommerce' as const,
        wooCommerceUrl: config.storeUrl,
        wooCommerceConsumerKey: config.consumerKey,
        wooCommerceConsumerSecret: config.consumerSecret,
        apiEndpoint: `${config.storeUrl}/wp-json/wc/v3`,
        autoSync: true,
        syncFrequency: 60 // 1 hour
      };

      return await this.createIntegration(userId, integrationData);
    } catch (error) {
      this.logger.error('Failed to setup WooCommerce integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        storeUrl: config.storeUrl
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to setup WooCommerce integration',
          statusCode: 500
        }
      };
    }
  }

  private validateIntegrationData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name) {
      errors.push('Integration name is required');
    }

    if (!data.type) {
      errors.push('Integration type is required');
    }

    // Type-specific validations
    if (data.type === 'shopify') {
      if (!data.shopifyStoreName) {
        errors.push('Shopify store name is required');
      }
      if (!data.shopifyAccessToken) {
        errors.push('Shopify access token is required');
      }
    }

    if (data.type === 'woocommerce') {
      if (!data.wooCommerceUrl) {
        errors.push('WooCommerce store URL is required');
      }
      if (!data.wooCommerceConsumerKey) {
        errors.push('WooCommerce consumer key is required');
      }
      if (!data.wooCommerceConsumerSecret) {
        errors.push('WooCommerce consumer secret is required');
      }
    }

    if (data.type === 'custom') {
      if (!data.apiEndpoint) {
        errors.push('API endpoint is required for custom integration');
      }
      if (!data.apiKey) {
        errors.push('API key is required for custom integration');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async testConnection(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      switch (data.type) {
        case 'shopify':
          return await this.testShopifyConnection(data);
        case 'woocommerce':
          return await this.testWooCommerceConnection(data);
        case 'custom':
          return await this.testCustomConnection(data);
        default:
          return { success: true }; // No test for manual or unsupported types
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testShopifyConnection(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.get(
        `https://${data.shopifyStoreName}.myshopify.com/admin/api/2023-10/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': data.shopifyAccessToken
          },
          timeout: 10000
        }
      );

      return { success: response.status === 200 };
    } catch (error) {
      return {
        success: false,
        error: `Shopify connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testWooCommerceConnection(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = Buffer.from(`${data.wooCommerceConsumerKey}:${data.wooCommerceConsumerSecret}`).toString('base64');
      
      const response = await axios.get(
        `${data.wooCommerceUrl}/wp-json/wc/v3/system_status`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          },
          timeout: 10000
        }
      );

      return { success: response.status === 200 };
    } catch (error) {
      return {
        success: false,
        error: `WooCommerce connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testCustomConnection(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const headers: any = {};
      if (data.apiKey) {
        headers['Authorization'] = `Bearer ${data.apiKey}`;
      }

      const response = await axios.get(data.apiEndpoint, {
        headers,
        timeout: 10000
      });

      return { success: response.status < 400 };
    } catch (error) {
      return {
        success: false,
        error: `Custom API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async syncShopifyProducts(integration: InventoryIntegration): Promise<{ products: ManualInventoryItem[]; errors: string[] }> {
    const products: ManualInventoryItem[] = [];
    const errors: string[] = [];

    try {
      const response = await axios.get(
        `https://${integration.shopifyStoreName}.myshopify.com/admin/api/2023-10/products.json?limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': integration.shopifyAccessToken!
          }
        }
      );

      const shopifyProducts = response.data.products;

      for (const product of shopifyProducts) {
        try {
          for (const variant of product.variants) {
            products.push({
              productId: variant.id.toString(),
              sku: variant.sku || `shopify-${variant.id}`,
              name: `${product.title}${variant.title !== 'Default Title' ? ` - ${variant.title}` : ''}`,
              stockCount: variant.inventory_quantity || 0,
              price: parseFloat(variant.price),
              currency: 'USD', // Default currency, should be configurable
              updatedAt: new Date()
            });
          }
        } catch (productError) {
          errors.push(`Failed to process product ${product.id}: ${productError instanceof Error ? productError.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch Shopify products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { products, errors };
  }

  private async syncWooCommerceProducts(integration: InventoryIntegration): Promise<{ products: ManualInventoryItem[]; errors: string[] }> {
    const products: ManualInventoryItem[] = [];
    const errors: string[] = [];

    try {
      const auth = Buffer.from(`${integration.wooCommerceConsumerKey}:${integration.wooCommerceConsumerSecret}`).toString('base64');
      
      const response = await axios.get(
        `${integration.wooCommerceUrl}/wp-json/wc/v3/products?per_page=100`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      const wooProducts = response.data;

      for (const product of wooProducts) {
        try {
          if (product.variations && product.variations.length > 0) {
            // Variable product - fetch variations
            const variationsResponse = await axios.get(
              `${integration.wooCommerceUrl}/wp-json/wc/v3/products/${product.id}/variations`,
              {
                headers: {
                  'Authorization': `Basic ${auth}`
                }
              }
            );

            for (const variation of variationsResponse.data) {
              products.push({
                productId: variation.id.toString(),
                sku: variation.sku || `woo-${variation.id}`,
                name: `${product.name} - ${variation.attributes.map((attr: any) => attr.option).join(', ')}`,
                stockCount: variation.stock_quantity || 0,
                price: parseFloat(variation.price),
                currency: 'USD', // Default currency, should be configurable
                updatedAt: new Date()
              });
            }
          } else {
            // Simple product
            products.push({
              productId: product.id.toString(),
              sku: product.sku || `woo-${product.id}`,
              name: product.name,
              stockCount: product.stock_quantity || 0,
              price: parseFloat(product.price),
              currency: 'USD', // Default currency, should be configurable
              updatedAt: new Date()
            });
          }
        } catch (productError) {
          errors.push(`Failed to process product ${product.id}: ${productError instanceof Error ? productError.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to fetch WooCommerce products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { products, errors };
  }

  private encryptSensitiveData(data: any): any {
    const encrypted = { ...data };
    
    // In a real implementation, you would use proper encryption
    // For this example, we'll just mark sensitive fields
    if (data.apiKey) {
      encrypted.apiKey = this.encrypt(data.apiKey);
    }
    if (data.apiSecret) {
      encrypted.apiSecret = this.encrypt(data.apiSecret);
    }
    if (data.shopifyAccessToken) {
      encrypted.shopifyAccessToken = this.encrypt(data.shopifyAccessToken);
    }
    if (data.wooCommerceConsumerSecret) {
      encrypted.wooCommerceConsumerSecret = this.encrypt(data.wooCommerceConsumerSecret);
    }

    return encrypted;
  }

  private encrypt(text: string): string {
    // Simple encryption for demo purposes
    // In production, use proper encryption with environment-based keys
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encryptedText: string): string {
    // Simple decryption for demo purposes
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}