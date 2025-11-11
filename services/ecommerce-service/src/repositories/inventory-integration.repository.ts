import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { InventoryIntegration, ManualInventoryItem, InventoryStatus } from '@qr-saas/shared';
import { IInventoryIntegrationRepository, ILogger, AppError } from '../interfaces';

class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class InventoryIntegrationRepository implements IInventoryIntegrationRepository {
  constructor(
    private readonly db: Pool,
    private readonly logger: ILogger
  ) {}

  async createIntegration(data: {
    userId: string;
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
  }): Promise<InventoryIntegration> {
    const client = await this.db.connect();
    
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO inventory_integrations (
          id, user_id, name, type, api_endpoint, api_key, api_secret,
          shopify_store_name, shopify_access_token, woocommerce_url,
          woocommerce_consumer_key, woocommerce_consumer_secret,
          products, auto_sync, sync_frequency, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16, $17)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        id,
        data.userId,
        data.name,
        data.type,
        data.apiEndpoint || null,
        data.apiKey || null,
        data.apiSecret || null,
        data.shopifyStoreName || null,
        data.shopifyAccessToken || null,
        data.wooCommerceUrl || null,
        data.wooCommerceConsumerKey || null,
        data.wooCommerceConsumerSecret || null,
        JSON.stringify(data.products || []),
        data.autoSync || false,
        data.syncFrequency || 60,
        now,
        now
      ]);

      const integration = this.mapRowToIntegration(result.rows[0]);
      
      this.logger.info('Inventory integration created successfully', {
        id,
        userId: data.userId,
        type: data.type,
        name: data.name
      });
      
      return integration;
    } catch (error) {
      this.logger.error('Failed to create inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        type: data.type,
        name: data.name
      });
      
      throw new DatabaseError('Failed to create inventory integration', { originalError: error });
    } finally {
      client.release();
    }
  }

  async findIntegrationById(id: string): Promise<InventoryIntegration | null> {
    const client = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM inventory_integrations WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToIntegration(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to find inventory integration by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      
      throw new DatabaseError('Failed to find inventory integration');
    } finally {
      client.release();
    }
  }

  async findUserIntegrations(userId: string): Promise<InventoryIntegration[]> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM inventory_integrations 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => this.mapRowToIntegration(row));
    } catch (error) {
      this.logger.error('Failed to find user integrations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      throw new DatabaseError('Failed to find user integrations');
    } finally {
      client.release();
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
    lastSyncAt?: Date;
  }): Promise<InventoryIntegration> {
    const client = await this.db.connect();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let valueIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${valueIndex++}`);
        values.push(data.name);
      }

      if (data.apiEndpoint !== undefined) {
        updates.push(`api_endpoint = $${valueIndex++}`);
        values.push(data.apiEndpoint);
      }

      if (data.apiKey !== undefined) {
        updates.push(`api_key = $${valueIndex++}`);
        values.push(data.apiKey);
      }

      if (data.apiSecret !== undefined) {
        updates.push(`api_secret = $${valueIndex++}`);
        values.push(data.apiSecret);
      }

      if (data.shopifyStoreName !== undefined) {
        updates.push(`shopify_store_name = $${valueIndex++}`);
        values.push(data.shopifyStoreName);
      }

      if (data.shopifyAccessToken !== undefined) {
        updates.push(`shopify_access_token = $${valueIndex++}`);
        values.push(data.shopifyAccessToken);
      }

      if (data.wooCommerceUrl !== undefined) {
        updates.push(`woocommerce_url = $${valueIndex++}`);
        values.push(data.wooCommerceUrl);
      }

      if (data.wooCommerceConsumerKey !== undefined) {
        updates.push(`woocommerce_consumer_key = $${valueIndex++}`);
        values.push(data.wooCommerceConsumerKey);
      }

      if (data.wooCommerceConsumerSecret !== undefined) {
        updates.push(`woocommerce_consumer_secret = $${valueIndex++}`);
        values.push(data.wooCommerceConsumerSecret);
      }

      if (data.products !== undefined) {
        updates.push(`products = $${valueIndex++}`);
        values.push(JSON.stringify(data.products));
      }

      if (data.autoSync !== undefined) {
        updates.push(`auto_sync = $${valueIndex++}`);
        values.push(data.autoSync);
      }

      if (data.syncFrequency !== undefined) {
        updates.push(`sync_frequency = $${valueIndex++}`);
        values.push(data.syncFrequency);
      }

      if (data.isActive !== undefined) {
        updates.push(`is_active = $${valueIndex++}`);
        values.push(data.isActive);
      }

      if (data.lastSyncAt !== undefined) {
        updates.push(`last_sync_at = $${valueIndex++}`);
        values.push(data.lastSyncAt.toISOString());
      }

      updates.push(`updated_at = $${valueIndex++}`);
      values.push(new Date().toISOString());

      values.push(id);

      const query = `
        UPDATE inventory_integrations 
        SET ${updates.join(', ')} 
        WHERE id = $${valueIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new DatabaseError('Inventory integration not found');
      }

      const integration = this.mapRowToIntegration(result.rows[0]);
      
      this.logger.info('Inventory integration updated successfully', {
        id,
        updates: Object.keys(data)
      });
      
      return integration;
    } catch (error) {
      this.logger.error('Failed to update inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      
      throw new DatabaseError('Failed to update inventory integration');
    } finally {
      client.release();
    }
  }

  async deleteIntegration(id: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      const query = 'UPDATE inventory_integrations SET is_active = false, updated_at = $1 WHERE id = $2';
      const result = await client.query(query, [new Date().toISOString(), id]);
      
      const deleted = result.rowCount !== null && result.rowCount > 0;
      
      if (deleted) {
        this.logger.info('Inventory integration marked as inactive', { id });
      }
      
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      
      throw new DatabaseError('Failed to delete inventory integration');
    } finally {
      client.release();
    }
  }

  async updateProductInventory(integrationId: string, products: ManualInventoryItem[]): Promise<void> {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE inventory_integrations 
        SET products = $1, last_sync_at = $2, updated_at = $3
        WHERE id = $4
      `;
      
      const now = new Date().toISOString();
      await client.query(query, [
        JSON.stringify(products),
        now,
        now,
        integrationId
      ]);
      
      this.logger.info('Product inventory updated successfully', {
        integrationId,
        productCount: products.length
      });
    } catch (error) {
      this.logger.error('Failed to update product inventory', {
        error: error instanceof Error ? error.message : 'Unknown error',
        integrationId
      });
      
      throw new DatabaseError('Failed to update product inventory');
    } finally {
      client.release();
    }
  }

  async getInventoryStatus(productId: string, integrationId?: string): Promise<InventoryStatus | null> {
    const client = await this.db.connect();
    
    try {
      let query = '';
      let queryParams: any[] = [];
      
      if (integrationId) {
        // Search in specific integration
        query = `
          SELECT i.name as source, i.type, i.products
          FROM inventory_integrations i
          WHERE i.id = $1 AND i.is_active = true
        `;
        queryParams = [integrationId];
      } else {
        // Search across all integrations for the product
        query = `
          SELECT i.name as source, i.type, i.products
          FROM inventory_integrations i
          WHERE i.is_active = true 
            AND i.products::text LIKE '%"productId":"' || $1 || '"%'
          ORDER BY i.updated_at DESC
          LIMIT 1
        `;
        queryParams = [productId];
      }
      
      const result = await client.query(query, queryParams);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const integration = result.rows[0];
      const products: ManualInventoryItem[] = JSON.parse(integration.products || '[]');
      
      const product = products.find(p => p.productId === productId);
      
      if (!product) {
        return null;
      }
      
      let availability: 'in_stock' | 'out_of_stock' | 'limited' | 'pre_order' = 'out_of_stock';
      
      if (product.stockCount > 10) {
        availability = 'in_stock';
      } else if (product.stockCount > 0) {
        availability = 'limited';
      } else {
        availability = 'out_of_stock';
      }
      
      return {
        productId: product.productId,
        sku: product.sku,
        stockCount: product.stockCount,
        availability,
        lastUpdated: new Date(product.updatedAt),
        source: integration.source
      };
    } catch (error) {
      this.logger.error('Failed to get inventory status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        integrationId
      });
      
      throw new DatabaseError('Failed to get inventory status');
    } finally {
      client.release();
    }
  }

  private mapRowToIntegration(row: any): InventoryIntegration {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      apiEndpoint: row.api_endpoint,
      apiKey: row.api_key,
      apiSecret: row.api_secret,
      shopifyStoreName: row.shopify_store_name,
      shopifyAccessToken: row.shopify_access_token,
      wooCommerceUrl: row.woocommerce_url,
      wooCommerceConsumerKey: row.woocommerce_consumer_key,
      wooCommerceConsumerSecret: row.woocommerce_consumer_secret,
      products: row.products ? JSON.parse(row.products) : [],
      autoSync: row.auto_sync,
      syncFrequency: row.sync_frequency,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}