import axios, { AxiosInstance } from 'axios';
import { EcommerceRepository } from '../repositories/ecommerce.repository';
import { EncryptionService } from './encryption.service';
import { WinstonLogger } from '../utils/logger';
import { 
  InventoryIntegration, 
  ShopifyConfig, 
  WooCommerceConfig,
  InventoryItem 
} from '@qr-saas/shared';

export interface InventoryServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export class InventoryService {
  private repository: EcommerceRepository;
  private encryption: EncryptionService;
  private logger: WinstonLogger;
  private httpClient: AxiosInstance;

  constructor(
    repository: EcommerceRepository,
    encryption: EncryptionService,
    logger: WinstonLogger
  ) {
    this.repository = repository;
    this.encryption = encryption;
    this.logger = logger;
    
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'QR-SaaS-Ecommerce-Service/1.0.0'
      }
    });
  }

  async createIntegration(
    userId: string, 
    integrationData: Omit<InventoryIntegration, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<InventoryServiceResponse<InventoryIntegration>> {
    try {
      this.logger.info('Creating inventory integration', { userId, platform: integrationData.platform });

      const integration: Omit<InventoryIntegration, 'id'> = {
        ...integrationData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.repository.createInventoryIntegration(integration);
      
      // Success case  
      const responseData = {
        ...result,
        credentials: '***encrypted***' // Don't expose encrypted credentials
      };

      this.logger.info('Inventory integration created successfully', { 
        integrationId: result.id,
        platform: result.platform 
      });

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      this.logger.error('Error creating inventory integration', { error, userId });
      return {
        success: false,
        error: {
          code: 'INTEGRATION_CREATION_ERROR',
          message: 'An error occurred while creating the integration',
          statusCode: 500
        }
      };
    }
  }

  async getIntegration(integrationId: string): Promise<InventoryServiceResponse<InventoryIntegration>> {
    try {
      const result = await this.repository.getInventoryIntegration(integrationId);
      
      if (result) {
        // Remove credentials for security
        const integration = { ...result };
        delete (integration as any).credentials;

        return {
          success: true,
          data: integration
        };
      } else {
        return {
          success: false,
          error: {
            code: 'INTEGRATION_NOT_FOUND',
            message: 'Integration not found',
            statusCode: 404
          }
        };
      }
    } catch (error) {
      this.logger.error('Error getting inventory integration', { error, integrationId });
      return {
        success: false,
        error: {
          code: 'INTEGRATION_FETCH_ERROR',
          message: 'An error occurred while fetching the integration',
          statusCode: 500
        }
      };
    }
  }

  async getUserIntegrations(userId: string): Promise<InventoryServiceResponse<InventoryIntegration[]>> {
    try {
      const result = await this.repository.getUserInventoryIntegrations(userId);
      
      // Remove credentials from all integrations
      const integrations = result.map((integration: InventoryIntegration) => {
        const safeIntegration = { ...integration };
        delete (safeIntegration as any).credentials;
        return safeIntegration;
      });

      return {
        success: true,
        data: integrations
      };
    } catch (error) {
      this.logger.error('Error getting user integrations', { error, userId });
      return {
        success: false,
        error: {
          code: 'INTEGRATIONS_FETCH_ERROR',
          message: 'An error occurred while fetching integrations',
          statusCode: 500
        }
      };
    }
  }

  async updateIntegration(
    integrationId: string, 
    updateData: Partial<InventoryIntegration>
  ): Promise<InventoryServiceResponse<InventoryIntegration>> {
    try {
      this.logger.info('Updating inventory integration', { integrationId });

      let processedUpdateData = { ...updateData };

      // Encrypt credentials if they're being updated
      if (updateData.credentials && typeof updateData.credentials === 'object') {
        processedUpdateData.credentials = this.encryption.encryptCredentials(updateData.credentials);
      }

      processedUpdateData.updatedAt = new Date();

      const result = await this.repository.updateInventoryIntegration(integrationId, processedUpdateData);
      
      // Success case
      const responseData = { ...result };
      delete (responseData as any).credentials;

      this.logger.info('Inventory integration updated successfully', { integrationId });

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      this.logger.error('Error updating inventory integration', { error, integrationId });
      return {
        success: false,
        error: {
          code: 'INTEGRATION_UPDATE_ERROR',
          message: 'An error occurred while updating the integration',
          statusCode: 500
        }
      };
    }
  }

  async deleteIntegration(integrationId: string): Promise<InventoryServiceResponse<boolean>> {
    try {
      this.logger.info('Deleting inventory integration', { integrationId });

      const result = await this.repository.deleteInventoryIntegration(integrationId);
      
      this.logger.info('Inventory integration deleted successfully', { integrationId });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Error deleting inventory integration', { error, integrationId });
      return {
        success: false,
        error: {
          code: 'INTEGRATION_DELETE_ERROR',
          message: 'An error occurred while deleting the integration',
          statusCode: 500
        }
      };
    }
  }

  async setupShopifyIntegration(
    userId: string,
    shopifyData: ShopifyConfig
  ): Promise<InventoryServiceResponse<InventoryIntegration>> {
    try {
      this.logger.info('Setting up Shopify integration', { userId, shop: shopifyData.shopDomain });

      // Validate Shopify credentials
      const isValid = await this.validateShopifyCredentials(shopifyData);
      if (!isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_SHOPIFY_CREDENTIALS',
            message: 'Invalid Shopify credentials provided',
            statusCode: 400
          }
        };
      }

      const integrationData = {
        name: `Shopify - ${shopifyData.shopDomain}`,
        type: 'shopify' as const,
        platform: 'shopify' as const,
        platformVersion: shopifyData.apiVersion || '2023-10',
        credentials: this.encryption.encryptCredentials(shopifyData),
        isActive: true,
        syncSettings: {
          autoSync: true,
          syncFrequency: 'hourly' as const,
          lastSyncAt: null
        }
      };

      return await this.createIntegration(userId, integrationData);
    } catch (error) {
      this.logger.error('Error setting up Shopify integration', { error, userId });
      return {
        success: false,
        error: {
          code: 'SHOPIFY_SETUP_ERROR',
          message: 'An error occurred while setting up Shopify integration',
          statusCode: 500
        }
      };
    }
  }

  async setupWooCommerceIntegration(
    userId: string,
    wooCommerceData: WooCommerceConfig
  ): Promise<InventoryServiceResponse<InventoryIntegration>> {
    try {
      this.logger.info('Setting up WooCommerce integration', { userId, baseUrl: wooCommerceData.baseUrl });

      // Validate WooCommerce credentials
      const isValid = await this.validateWooCommerceCredentials(wooCommerceData);
      if (!isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_WOOCOMMERCE_CREDENTIALS',
            message: 'Invalid WooCommerce credentials provided',
            statusCode: 400
          }
        };
      }

      const integrationData = {
        name: `WooCommerce - ${new URL(wooCommerceData.baseUrl).hostname}`,
        type: 'woocommerce' as const,
        platform: 'woocommerce' as const,
        platformVersion: wooCommerceData.version || '7.0',
        credentials: this.encryption.encryptCredentials(wooCommerceData),
        isActive: true,
        syncSettings: {
          autoSync: true,
          syncFrequency: 'hourly' as const,
          lastSyncAt: null
        }
      };

      return await this.createIntegration(userId, integrationData);
    } catch (error) {
      this.logger.error('Error setting up WooCommerce integration', { error, userId });
      return {
        success: false,
        error: {
          code: 'WOOCOMMERCE_SETUP_ERROR',
          message: 'An error occurred while setting up WooCommerce integration',
          statusCode: 500
        }
      };
    }
  }

  async syncInventory(integrationId: string): Promise<InventoryServiceResponse<{ itemsSynced: number }>> {
    try {
      this.logger.info('Starting inventory sync', { integrationId });

      const integrationResult = await this.repository.getInventoryIntegration(integrationId);
      if (!integrationResult) {
        return {
          success: false,
          error: {
            code: 'INTEGRATION_NOT_FOUND',
            message: 'Integration not found',
            statusCode: 404
          }
        };
      }

      const integration = integrationResult;
      const credentials = this.encryption.decryptCredentials(integration.credentials);

      let syncResult;
      switch (integration.platform) {
        case 'shopify':
          syncResult = await this.syncShopifyInventory(credentials as ShopifyConfig);
          break;
        case 'woocommerce':
          syncResult = await this.syncWooCommerceInventory(credentials as WooCommerceConfig);
          break;
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_PLATFORM',
              message: 'Unsupported platform for inventory sync',
              statusCode: 400
            }
          };
      }

      // Update last sync time
      await this.repository.updateInventoryIntegration(integrationId, {
        syncSettings: {
          ...integration.syncSettings,
          lastSyncAt: new Date()
        },
        updatedAt: new Date()
      });

      this.logger.info('Inventory sync completed', { integrationId, itemsSynced: syncResult });

      return {
        success: true,
        data: { itemsSynced: syncResult }
      };
    } catch (error) {
      this.logger.error('Error syncing inventory', { error, integrationId });
      return {
        success: false,
        error: {
          code: 'INVENTORY_SYNC_ERROR',
          message: 'An error occurred while syncing inventory',
          statusCode: 500
        }
      };
    }
  }

  private async validateShopifyCredentials(config: ShopifyConfig): Promise<boolean> {
    try {
      const response = await this.httpClient.get(
        `https://${config.shopDomain}.myshopify.com/admin/api/${config.apiVersion}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': config.accessToken
          }
        }
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error('Shopify credential validation failed', { error });
      return false;
    }
  }

  private async validateWooCommerceCredentials(config: WooCommerceConfig): Promise<boolean> {
    try {
      const response = await this.httpClient.get(
        `${config.baseUrl}/wp-json/wc/v3/system_status`,
        {
          auth: {
            username: config.consumerKey,
            password: config.consumerSecret
          }
        }
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error('WooCommerce credential validation failed', { error });
      return false;
    }
  }

  private async syncShopifyInventory(config: ShopifyConfig): Promise<number> {
    try {
      const response = await this.httpClient.get(
        `https://${config.shopDomain}.myshopify.com/admin/api/${config.apiVersion}/products.json`,
        {
          headers: {
            'X-Shopify-Access-Token': config.accessToken
          }
        }
      );

      const products = response.data.products || [];
      this.logger.info('Fetched Shopify products', { count: products.length });

      // Process and store inventory items
      // This would typically involve saving to database
      return products.length;
    } catch (error) {
      this.logger.error('Error syncing Shopify inventory', { error });
      throw error;
    }
  }

  private async syncWooCommerceInventory(config: WooCommerceConfig): Promise<number> {
    try {
      const response = await this.httpClient.get(
        `${config.baseUrl}/wp-json/wc/v3/products`,
        {
          auth: {
            username: config.consumerKey,
            password: config.consumerSecret
          }
        }
      );

      const products = response.data || [];
      this.logger.info('Fetched WooCommerce products', { count: products.length });

      // Process and store inventory items
      // This would typically involve saving to database
      return products.length;
    } catch (error) {
      this.logger.error('Error syncing WooCommerce inventory', { error });
      throw error;
    }
  }
}