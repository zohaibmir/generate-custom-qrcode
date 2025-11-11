import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  EcommerceQRCode, 
  CreateProductQRRequest, 
  CreateCouponQRRequest, 
  CreatePaymentQRRequest,
  EcommerceAnalytics,
  EcommerceDashboard,
  InventoryIntegration
} from '@qr-saas/shared';
import { IEcommerceRepository, ILogger, AppError, ValidationError, NotFoundError } from '../interfaces';

class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class EcommerceRepository implements IEcommerceRepository {
  constructor(
    private readonly db: Pool,
    private readonly logger: ILogger
  ) {}

  async createEcommerceQR(data: {
    qrCodeId: string;
    type: 'product' | 'coupon' | 'payment';
    productData?: any;
    couponData?: any;
    paymentData?: any;
    inventoryIntegrationId?: string;
  }): Promise<EcommerceQRCode> {
    const client = await this.db.connect();
    
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO ecommerce_qr_codes (
          id, qr_code_id, type, product_data, coupon_data, payment_data,
          inventory_integration_id, views, scans, conversions, revenue,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, true, $8, $9)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        id,
        data.qrCodeId,
        data.type,
        JSON.stringify(data.productData || null),
        JSON.stringify(data.couponData || null),
        JSON.stringify(data.paymentData || null),
        data.inventoryIntegrationId || null,
        now,
        now
      ]);

      const ecommerceQR = this.mapRowToEcommerceQR(result.rows[0]);
      
      this.logger.info('E-commerce QR created successfully', {
        id,
        qrCodeId: data.qrCodeId,
        type: data.type
      });
      
      return ecommerceQR;
    } catch (error) {
      this.logger.error('Failed to create e-commerce QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId: data.qrCodeId,
        type: data.type
      });
      
      throw new DatabaseError('Failed to create e-commerce QR code', { originalError: error });
    } finally {
      client.release();
    }
  }

  async findEcommerceQRById(id: string): Promise<EcommerceQRCode | null> {
    const client = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM ecommerce_qr_codes WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToEcommerceQR(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to find e-commerce QR by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      
      throw new DatabaseError('Failed to find e-commerce QR code');
    } finally {
      client.release();
    }
  }

  async findEcommerceQRsByQRCodeId(qrCodeId: string): Promise<EcommerceQRCode | null> {
    const client = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM ecommerce_qr_codes WHERE qr_code_id = $1 AND is_active = true';
      const result = await client.query(query, [qrCodeId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToEcommerceQR(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to find e-commerce QR by QR code ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId
      });
      
      throw new DatabaseError('Failed to find e-commerce QR code');
    } finally {
      client.release();
    }
  }

  async findEcommerceQRsByType(type: 'product' | 'coupon' | 'payment', userId: string): Promise<EcommerceQRCode[]> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT e.* FROM ecommerce_qr_codes e
        INNER JOIN qr_codes q ON e.qr_code_id = q.id
        WHERE e.type = $1 AND q.user_id = $2 AND e.is_active = true
        ORDER BY e.created_at DESC
      `;
      const result = await client.query(query, [type, userId]);
      
      return result.rows.map(row => this.mapRowToEcommerceQR(row));
    } catch (error) {
      this.logger.error('Failed to find e-commerce QRs by type', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        userId
      });
      
      throw new DatabaseError('Failed to find e-commerce QR codes');
    } finally {
      client.release();
    }
  }

  async updateEcommerceQR(id: string, data: {
    productData?: any;
    couponData?: any;
    paymentData?: any;
    inventoryIntegrationId?: string;
    isActive?: boolean;
  }): Promise<EcommerceQRCode> {
    const client = await this.db.connect();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let valueIndex = 1;

      if (data.productData !== undefined) {
        updates.push(`product_data = $${valueIndex++}`);
        values.push(JSON.stringify(data.productData));
      }

      if (data.couponData !== undefined) {
        updates.push(`coupon_data = $${valueIndex++}`);
        values.push(JSON.stringify(data.couponData));
      }

      if (data.paymentData !== undefined) {
        updates.push(`payment_data = $${valueIndex++}`);
        values.push(JSON.stringify(data.paymentData));
      }

      if (data.inventoryIntegrationId !== undefined) {
        updates.push(`inventory_integration_id = $${valueIndex++}`);
        values.push(data.inventoryIntegrationId);
      }

      if (data.isActive !== undefined) {
        updates.push(`is_active = $${valueIndex++}`);
        values.push(data.isActive);
      }

      updates.push(`updated_at = $${valueIndex++}`);
      values.push(new Date().toISOString());

      values.push(id);

      const query = `
        UPDATE ecommerce_qr_codes 
        SET ${updates.join(', ')} 
        WHERE id = $${valueIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new DatabaseError('E-commerce QR code not found');
      }

      const ecommerceQR = this.mapRowToEcommerceQR(result.rows[0]);
      
      this.logger.info('E-commerce QR updated successfully', {
        id,
        updates: Object.keys(data)
      });
      
      return ecommerceQR;
    } catch (error) {
      this.logger.error('Failed to update e-commerce QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      
      throw new DatabaseError('Failed to update e-commerce QR code');
    } finally {
      client.release();
    }
  }

  async deleteEcommerceQR(id: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      const query = 'UPDATE ecommerce_qr_codes SET is_active = false, updated_at = $1 WHERE id = $2';
      const result = await client.query(query, [new Date().toISOString(), id]);
      
      const deleted = result.rowCount !== null && result.rowCount > 0;
      
      if (deleted) {
        this.logger.info('E-commerce QR marked as inactive', { id });
      }
      
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete e-commerce QR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      
      throw new DatabaseError('Failed to delete e-commerce QR code');
    } finally {
      client.release();
    }
  }

  async trackAnalytics(analyticsData: {
    qrCodeId: string;
    type: 'view' | 'scan' | 'click' | 'add_to_cart' | 'purchase';
    productId?: string;
    couponCode?: string;
    amount?: number;
    currency?: string;
    userAgent?: string;
    ipHash?: string;
    country?: string;
    city?: string;
    cartValue?: number;
    itemsCount?: number;
    customerType?: 'new' | 'returning';
  }): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert analytics record
      const analyticsQuery = `
        INSERT INTO ecommerce_analytics (
          id, qr_code_id, type, product_id, coupon_code, amount, currency,
          user_agent, ip_hash, country, city, cart_value, items_count,
          customer_type, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      
      await client.query(analyticsQuery, [
        uuidv4(),
        analyticsData.qrCodeId,
        analyticsData.type,
        analyticsData.productId || null,
        analyticsData.couponCode || null,
        analyticsData.amount || null,
        analyticsData.currency || null,
        analyticsData.userAgent || null,
        analyticsData.ipHash || null,
        analyticsData.country || null,
        analyticsData.city || null,
        analyticsData.cartValue || null,
        analyticsData.itemsCount || null,
        analyticsData.customerType || null,
        new Date().toISOString()
      ]);

      // Update aggregated stats in ecommerce_qr_codes table
      let updateField = '';
      let amountField = '';
      
      switch (analyticsData.type) {
        case 'view':
          updateField = 'views = views + 1';
          break;
        case 'scan':
          updateField = 'scans = scans + 1';
          break;
        case 'purchase':
          updateField = 'conversions = conversions + 1';
          if (analyticsData.amount) {
            amountField = ', revenue = revenue + $1';
          }
          break;
      }

      if (updateField) {
        let updateQuery = `
          UPDATE ecommerce_qr_codes 
          SET ${updateField}${amountField}, updated_at = $${amountField ? '3' : '2'}
          WHERE qr_code_id = $${amountField ? '2' : '1'}
        `;
        
        const updateValues = amountField 
          ? [analyticsData.amount, analyticsData.qrCodeId, new Date().toISOString()]
          : [analyticsData.qrCodeId, new Date().toISOString()];
        
        await client.query(updateQuery, updateValues);
      }

      await client.query('COMMIT');
      
      this.logger.info('Analytics tracked successfully', {
        qrCodeId: analyticsData.qrCodeId,
        type: analyticsData.type,
        amount: analyticsData.amount
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error('Failed to track analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId: analyticsData.qrCodeId,
        type: analyticsData.type
      });
      
      throw new DatabaseError('Failed to track analytics');
    } finally {
      client.release();
    }
  }

  async getAnalytics(qrCodeId: string): Promise<{
    views: number;
    scans: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
    averageOrderValue: number;
    recentActivity: EcommerceAnalytics[];
  }> {
    const client = await this.db.connect();
    
    try {
      // Get aggregated stats
      const statsQuery = `
        SELECT views, scans, conversions, revenue
        FROM ecommerce_qr_codes 
        WHERE qr_code_id = $1
      `;
      const statsResult = await client.query(statsQuery, [qrCodeId]);
      
      if (statsResult.rows.length === 0) {
        throw new DatabaseError('E-commerce QR code not found');
      }
      
      const stats = statsResult.rows[0];
      
      // Get recent activity
      const activityQuery = `
        SELECT * FROM ecommerce_analytics 
        WHERE qr_code_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 100
      `;
      const activityResult = await client.query(activityQuery, [qrCodeId]);
      
      const conversionRate = stats.scans > 0 ? (stats.conversions / stats.scans) * 100 : 0;
      const averageOrderValue = stats.conversions > 0 ? stats.revenue / stats.conversions : 0;
      
      return {
        views: parseInt(stats.views),
        scans: parseInt(stats.scans),
        conversions: parseInt(stats.conversions),
        revenue: parseFloat(stats.revenue),
        conversionRate,
        averageOrderValue,
        recentActivity: activityResult.rows.map(row => ({
          id: row.id,
          qrCodeId: row.qr_code_id,
          type: row.type,
          productId: row.product_id,
          couponCode: row.coupon_code,
          amount: row.amount ? parseFloat(row.amount) : undefined,
          currency: row.currency,
          userAgent: row.user_agent,
          ipHash: row.ip_hash,
          country: row.country,
          city: row.city,
          cartValue: row.cart_value ? parseFloat(row.cart_value) : undefined,
          itemsCount: row.items_count,
          customerType: row.customer_type,
          timestamp: new Date(row.timestamp)
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId
      });
      
      throw new DatabaseError('Failed to get analytics');
    } finally {
      client.release();
    }
  }

  async getDashboard(userId: string): Promise<EcommerceDashboard> {
    const client = await this.db.connect();
    
    try {
      // Get overall stats
      const overallStatsQuery = `
        SELECT 
          COUNT(CASE WHEN e.type = 'product' THEN 1 END) as total_products,
          COUNT(CASE WHEN e.type = 'coupon' THEN 1 END) as total_coupons,
          COUNT(CASE WHEN e.type = 'payment' THEN 1 END) as total_payments,
          SUM(e.revenue) as total_revenue,
          SUM(e.conversions) as total_conversions,
          SUM(e.scans) as total_scans
        FROM ecommerce_qr_codes e
        INNER JOIN qr_codes q ON e.qr_code_id = q.id
        WHERE q.user_id = $1 AND e.is_active = true
      `;
      const overallResult = await client.query(overallStatsQuery, [userId]);
      const overall = overallResult.rows[0];
      
      // Get top products
      const topProductsQuery = `
        SELECT 
          (e.product_data->>'productId')::text as product_id,
          (e.product_data->>'name')::text as name,
          e.scans,
          e.conversions,
          e.revenue
        FROM ecommerce_qr_codes e
        INNER JOIN qr_codes q ON e.qr_code_id = q.id
        WHERE q.user_id = $1 AND e.type = 'product' AND e.is_active = true
        ORDER BY e.scans DESC
        LIMIT 10
      `;
      const topProductsResult = await client.query(topProductsQuery, [userId]);
      
      // Get top coupons
      const topCouponsQuery = `
        SELECT 
          (e.coupon_data->>'couponCode')::text as coupon_code,
          (e.coupon_data->>'name')::text as name,
          e.scans as usage,
          (e.coupon_data->>'discountValue')::numeric * e.conversions as discount_given
        FROM ecommerce_qr_codes e
        INNER JOIN qr_codes q ON e.qr_code_id = q.id
        WHERE q.user_id = $1 AND e.type = 'coupon' AND e.is_active = true
        ORDER BY e.scans DESC
        LIMIT 10
      `;
      const topCouponsResult = await client.query(topCouponsQuery, [userId]);
      
      // Get revenue by day (last 30 days)
      const revenueByDayQuery = `
        SELECT 
          DATE(a.timestamp) as date,
          SUM(CASE WHEN a.amount IS NOT NULL THEN a.amount ELSE 0 END) as revenue,
          COUNT(CASE WHEN a.type = 'purchase' THEN 1 END) as conversions
        FROM ecommerce_analytics a
        INNER JOIN ecommerce_qr_codes e ON a.qr_code_id = e.qr_code_id
        INNER JOIN qr_codes q ON e.qr_code_id = q.id
        WHERE q.user_id = $1 
          AND a.timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(a.timestamp)
        ORDER BY date DESC
      `;
      const revenueByDayResult = await client.query(revenueByDayQuery, [userId]);
      
      // Get inventory alerts (products with low stock)
      const inventoryAlertsQuery = `
        SELECT 
          (e.product_data->>'productId')::text as product_id,
          (e.product_data->>'name')::text as name,
          (e.product_data->>'stockCount')::integer as current_stock,
          (e.product_data->>'lowStockThreshold')::integer as threshold
        FROM ecommerce_qr_codes e
        INNER JOIN qr_codes q ON e.qr_code_id = q.id
        WHERE q.user_id = $1 
          AND e.type = 'product' 
          AND e.is_active = true
          AND (e.product_data->>'trackInventory')::boolean = true
          AND (
            (e.product_data->>'stockCount')::integer <= (e.product_data->>'lowStockThreshold')::integer
            OR (e.product_data->>'stockCount')::integer = 0
          )
        ORDER BY current_stock ASC
      `;
      const inventoryAlertsResult = await client.query(inventoryAlertsQuery, [userId]);
      
      const totalRevenue = parseFloat(overall.total_revenue || '0');
      const totalScans = parseInt(overall.total_scans || '0');
      const totalConversions = parseInt(overall.total_conversions || '0');
      const conversionRate = totalScans > 0 ? (totalConversions / totalScans) * 100 : 0;
      const averageOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;
      
      return {
        totalProducts: parseInt(overall.total_products || '0'),
        totalCoupons: parseInt(overall.total_coupons || '0'),
        totalPayments: parseInt(overall.total_payments || '0'),
        totalRevenue,
        totalConversions,
        conversionRate,
        averageOrderValue,
        
        topProducts: topProductsResult.rows.map(row => ({
          productId: row.product_id,
          name: row.name,
          scans: parseInt(row.scans),
          conversions: parseInt(row.conversions),
          revenue: parseFloat(row.revenue)
        })),
        
        topCoupons: topCouponsResult.rows.map(row => ({
          couponCode: row.coupon_code,
          name: row.name,
          usage: parseInt(row.usage),
          discountGiven: parseFloat(row.discount_given || '0')
        })),
        
        revenueByDay: revenueByDayResult.rows.map(row => ({
          date: row.date,
          revenue: parseFloat(row.revenue || '0'),
          conversions: parseInt(row.conversions || '0')
        })),
        
        inventoryAlerts: inventoryAlertsResult.rows.map(row => ({
          productId: row.product_id,
          name: row.name,
          currentStock: parseInt(row.current_stock || '0'),
          threshold: parseInt(row.threshold || '0'),
          status: parseInt(row.current_stock || '0') === 0 ? 'out_of_stock' as const : 'low_stock' as const
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      throw new DatabaseError('Failed to get dashboard data');
    } finally {
      client.release();
    }
  }

  private mapRowToEcommerceQR(row: any): EcommerceQRCode {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      type: row.type,
      productData: row.product_data ? JSON.parse(row.product_data) : undefined,
      couponData: row.coupon_data ? JSON.parse(row.coupon_data) : undefined,
      paymentData: row.payment_data ? JSON.parse(row.payment_data) : undefined,
      inventoryIntegrationId: row.inventory_integration_id,
      views: parseInt(row.views),
      scans: parseInt(row.scans),
      conversions: parseInt(row.conversions),
      revenue: parseFloat(row.revenue),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Inventory Integration Methods
  async createInventoryIntegration(integration: Omit<InventoryIntegration, 'id'>): Promise<InventoryIntegration> {
    const client = await this.db.connect();
    
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO inventory_integrations (
          id, user_id, name, type, platform, platform_version, credentials, 
          api_endpoint, api_key, api_secret, shopify_store_name, shopify_access_token,
          woo_commerce_url, woo_commerce_consumer_key, woo_commerce_consumer_secret,
          sync_settings, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
        RETURNING *
      `;
      
      const values = [
        id,
        integration.userId,
        integration.name,
        integration.type,
        integration.platform,
        integration.platformVersion,
        integration.credentials,
        integration.apiEndpoint,
        integration.apiKey,
        integration.apiSecret,
        integration.shopifyStoreName,
        integration.shopifyAccessToken,
        integration.wooCommerceUrl,
        integration.wooCommerceConsumerKey,
        integration.wooCommerceConsumerSecret,
        JSON.stringify(integration.syncSettings),
        integration.isActive,
        now
      ];
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create inventory integration');
      }
      
      this.logger.info('Inventory integration created successfully', { id });
      return this.mapRowToInventoryIntegration(result.rows[0]);
      
    } catch (error) {
      this.logger.error('Failed to create inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        integration
      });
      
      throw new DatabaseError('Failed to create inventory integration');
    } finally {
      client.release();
    }
  }

  async getInventoryIntegration(integrationId: string): Promise<InventoryIntegration | null> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM inventory_integrations 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [integrationId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToInventoryIntegration(result.rows[0]);
      
    } catch (error) {
      this.logger.error('Failed to get inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        integrationId
      });
      
      throw new DatabaseError('Failed to get inventory integration');
    } finally {
      client.release();
    }
  }

  async getUserInventoryIntegrations(userId: string): Promise<InventoryIntegration[]> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM inventory_integrations 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map((row: any) => this.mapRowToInventoryIntegration(row));
      
    } catch (error) {
      this.logger.error('Failed to get user inventory integrations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      
      throw new DatabaseError('Failed to get user inventory integrations');
    } finally {
      client.release();
    }
  }

  async updateInventoryIntegration(
    integrationId: string, 
    updateData: Partial<InventoryIntegration>
  ): Promise<InventoryIntegration> {
    const client = await this.db.connect();
    
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      // Handle each possible field
      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      
      if (updateData.type !== undefined) {
        updateFields.push(`type = $${paramCount++}`);
        values.push(updateData.type);
      }
      
      if (updateData.platform !== undefined) {
        updateFields.push(`platform = $${paramCount++}`);
        values.push(updateData.platform);
      }
      
      if (updateData.platformVersion !== undefined) {
        updateFields.push(`platform_version = $${paramCount++}`);
        values.push(updateData.platformVersion);
      }
      
      if (updateData.credentials !== undefined) {
        updateFields.push(`credentials = $${paramCount++}`);
        values.push(updateData.credentials);
      }
      
      if (updateData.syncSettings !== undefined) {
        updateFields.push(`sync_settings = $${paramCount++}`);
        values.push(JSON.stringify(updateData.syncSettings));
      }
      
      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updateData.isActive);
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(integrationId); // Add ID as the last parameter
      
      if (updateFields.length === 1) { // Only updated_at was added
        throw new ValidationError('No fields to update');
      }
      
      const query = `
        UPDATE inventory_integrations 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Integration not found');
      }
      
      this.logger.info('Inventory integration updated successfully', { integrationId });
      return this.mapRowToInventoryIntegration(result.rows[0]);
      
    } catch (error) {
      this.logger.error('Failed to update inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        integrationId,
        updateData
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to update inventory integration');
    } finally {
      client.release();
    }
  }

  async deleteInventoryIntegration(integrationId: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      const query = `
        DELETE FROM inventory_integrations 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [integrationId]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Integration not found');
      }
      
      this.logger.info('Inventory integration deleted successfully', { integrationId });
      return true;
      
    } catch (error) {
      this.logger.error('Failed to delete inventory integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        integrationId
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to delete inventory integration');
    } finally {
      client.release();
    }
  }

  private mapRowToInventoryIntegration(row: any): InventoryIntegration {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      platform: row.platform,
      platformVersion: row.platform_version,
      credentials: row.credentials,
      apiEndpoint: row.api_endpoint,
      apiKey: row.api_key,
      apiSecret: row.api_secret,
      shopifyStoreName: row.shopify_store_name,
      shopifyAccessToken: row.shopify_access_token,
      wooCommerceUrl: row.woo_commerce_url,
      wooCommerceConsumerKey: row.woo_commerce_consumer_key,
      wooCommerceConsumerSecret: row.woo_commerce_consumer_secret,
      syncSettings: row.sync_settings ? JSON.parse(row.sync_settings) : undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}