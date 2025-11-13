import { Pool, PoolClient } from 'pg';
import { 
  AnalyticsDashboard, 
  DashboardWidget, 
  DashboardTemplate,
  DashboardShare,
  DashboardActivity
} from '../../../../shared/src/types/analytics.types';

/**
 * Dashboard Repository - Data Access Layer
 * 
 * Handles all database operations for custom dashboards
 */
export class CustomDashboardRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new dashboard
   */
  async createDashboard(dashboard: Partial<AnalyticsDashboard>): Promise<AnalyticsDashboard> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const dashboardId = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await client.query(`
        INSERT INTO analytics_dashboards (
          id, user_id, name, description, layout, theme, category,
          is_public, is_template, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        dashboardId,
        dashboard.userId,
        dashboard.name,
        dashboard.description,
        JSON.stringify(dashboard.layout || {}),
        JSON.stringify(dashboard.theme || {}),
        dashboard.category,
        dashboard.isPublic || false,
        dashboard.isTemplate || false,
        dashboard.tags || []
      ]);

      // Create widgets if provided
      if (dashboard.widgets && dashboard.widgets.length > 0) {
        for (const widget of dashboard.widgets) {
          await this.createWidget(client, dashboardId, widget);
        }
      }

      await client.query('COMMIT');
      
      const createdDashboard = result.rows[0];
      createdDashboard.widgets = dashboard.widgets || [];
      
      return this.transformDashboard(createdDashboard);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboardById(
    dashboardId: string, 
    userId?: string
  ): Promise<AnalyticsDashboard | null> {
    const query = `
      SELECT d.*, u.email as owner_email, u.full_name as owner_name
      FROM analytics_dashboards d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = $1 ${userId ? 'AND (d.user_id = $2 OR d.is_public = true)' : ''}
    `;
    
    const params = userId ? [dashboardId, userId] : [dashboardId];
    const result = await this.pool.query(query, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    const dashboard = result.rows[0];
    dashboard.widgets = await this.getDashboardWidgets(dashboardId);
    
    return this.transformDashboard(dashboard);
  }

  /**
   * Get user dashboards with pagination and filtering
   */
  async getUserDashboards(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      isTemplate?: boolean;
      isFavorite?: boolean;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{
    dashboards: AnalyticsDashboard[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      category,
      isTemplate,
      isFavorite,
      search,
      sortBy = 'updated_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    // Build dynamic query
    const whereConditions = ['d.user_id = $1'];
    const queryParams: any[] = [userId];
    let paramIndex = 1;

    if (category) {
      paramIndex++;
      whereConditions.push(`d.category = $${paramIndex}`);
      queryParams.push(category);
    }

    if (isTemplate !== undefined) {
      paramIndex++;
      whereConditions.push(`d.is_template = $${paramIndex}`);
      queryParams.push(isTemplate);
    }

    if (isFavorite) {
      whereConditions.push('f.user_id IS NOT NULL');
    }

    if (search) {
      paramIndex++;
      whereConditions.push(`(d.name ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');
    
    // Get dashboards
    const dashboardsQuery = `
      SELECT 
        d.*,
        u.email as owner_email,
        u.full_name as owner_name,
        COUNT(w.id) as widget_count,
        COUNT(s.id) as share_count,
        CASE WHEN f.user_id IS NOT NULL THEN true ELSE false END as is_favorited
      FROM analytics_dashboards d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN dashboard_widgets w ON d.id = w.dashboard_id
      LEFT JOIN dashboard_shares s ON d.id = s.dashboard_id
      LEFT JOIN dashboard_favorites f ON d.id = f.dashboard_id AND f.user_id = $1
      WHERE ${whereClause}
      GROUP BY d.id, u.email, u.full_name, f.user_id
      ORDER BY d.${sortBy} ${sortOrder}
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    queryParams.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM analytics_dashboards d
      LEFT JOIN dashboard_favorites f ON d.id = f.dashboard_id AND f.user_id = $1
      WHERE ${whereClause}
    `;

    const [dashboardsResult, countResult] = await Promise.all([
      this.pool.query(dashboardsQuery, queryParams),
      this.pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const dashboards = await Promise.all(
      dashboardsResult.rows.map(async (dashboard) => {
        dashboard.widgets = await this.getDashboardWidgets(dashboard.id);
        return this.transformDashboard(dashboard);
      })
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return { dashboards, total, page, totalPages };
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    dashboardId: string, 
    userId: string, 
    updates: Partial<AnalyticsDashboard>
  ): Promise<AnalyticsDashboard | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields = [];
      const params = [dashboardId, userId];
      let paramIndex = 2;

      if (updates.name !== undefined) {
        paramIndex++;
        updateFields.push(`name = $${paramIndex}`);
        params.push(updates.name);
      }

      if (updates.description !== undefined) {
        paramIndex++;
        updateFields.push(`description = $${paramIndex}`);
        params.push(updates.description);
      }

      if (updates.layout !== undefined) {
        paramIndex++;
        updateFields.push(`layout = $${paramIndex}`);
        params.push(JSON.stringify(updates.layout));
      }

      if (updates.theme !== undefined) {
        paramIndex++;
        updateFields.push(`theme = $${paramIndex}`);
        params.push(JSON.stringify(updates.theme));
      }

      if (updates.category !== undefined) {
        paramIndex++;
        updateFields.push(`category = $${paramIndex}`);
        params.push(updates.category);
      }

      if (updates.isPublic !== undefined) {
        paramIndex++;
        updateFields.push(`is_public = $${paramIndex}`);
        params.push(updates.isPublic.toString());
      }

      if (updates.tags !== undefined) {
        paramIndex++;
        updateFields.push(`tags = $${paramIndex}`);
        params.push(JSON.stringify(updates.tags));
      }

      updateFields.push('updated_at = NOW()');

      const updateQuery = `
        UPDATE analytics_dashboards 
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await client.query(updateQuery, params);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update widgets if provided
      if (updates.widgets) {
        await this.updateDashboardWidgets(client, dashboardId, updates.widgets);
      }

      await client.query('COMMIT');

      const dashboard = result.rows[0];
      dashboard.widgets = await this.getDashboardWidgets(dashboardId);
      
      return this.transformDashboard(dashboard);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM analytics_dashboards WHERE id = $1 AND user_id = $2',
      [dashboardId, userId]
    );
    
    return result.rowCount! > 0;
  }

  /**
   * Create widget
   */
  async createWidget(
    client: PoolClient | Pool, 
    dashboardId: string, 
    widget: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await client.query(`
      INSERT INTO dashboard_widgets (
        id, dashboard_id, type, title, position, configuration, 
        data_source, data_filters, refresh_interval, is_visible, 
        is_real_time, cache_duration, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `, [
      widgetId,
      dashboardId,
      widget.type,
      widget.title,
      JSON.stringify(widget.position || {}),
      JSON.stringify(widget.configuration || {}),
      widget.dataSource,
      JSON.stringify(widget.dataFilters || {}),
      widget.refreshInterval || 30,
      widget.isVisible !== undefined ? widget.isVisible : true,
      widget.isRealTime || false,
      widget.cacheDuration || 300
    ]);

    return this.transformWidget(result.rows[0]);
  }

  /**
   * Get dashboard widgets
   */
  async getDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]> {
    const result = await this.pool.query(
      'SELECT * FROM dashboard_widgets WHERE dashboard_id = $1 ORDER BY created_at ASC',
      [dashboardId]
    );
    
    return result.rows.map(this.transformWidget);
  }

  /**
   * Update dashboard widgets
   */
  async updateDashboardWidgets(
    client: PoolClient,
    dashboardId: string,
    widgets: DashboardWidget[]
  ): Promise<void> {
    // Delete existing widgets
    await client.query('DELETE FROM dashboard_widgets WHERE dashboard_id = $1', [dashboardId]);
    
    // Insert new widgets
    for (const widget of widgets) {
      await this.createWidget(client, dashboardId, widget);
    }
  }

  /**
   * Get widget by ID
   */
  async getWidgetById(widgetId: string): Promise<DashboardWidget | null> {
    const result = await this.pool.query(
      'SELECT * FROM dashboard_widgets WHERE id = $1',
      [widgetId]
    );
    
    return result.rows.length > 0 ? this.transformWidget(result.rows[0]) : null;
  }

  /**
   * Update widget
   */
  async updateWidget(
    widgetId: string, 
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget | null> {
    const updateFields = [];
    const params = [widgetId];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        paramIndex++;
        if (key === 'position' || key === 'configuration' || key === 'dataFilters') {
          updateFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          params.push(typeof value === 'string' ? value : JSON.stringify(value));
        }
      }
    });

    if (updateFields.length === 0) {
      return null;
    }

    updateFields.push('updated_at = NOW()');

    const result = await this.pool.query(`
      UPDATE dashboard_widgets 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params);

    return result.rows.length > 0 ? this.transformWidget(result.rows[0]) : null;
  }

  /**
   * Delete widget
   */
  async deleteWidget(widgetId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM dashboard_widgets WHERE id = $1',
      [widgetId]
    );
    
    return result.rowCount! > 0;
  }

  /**
   * Get dashboard templates
   */
  async getDashboardTemplates(
    category?: string,
    isPremium?: boolean
  ): Promise<DashboardTemplate[]> {
    let query = 'SELECT * FROM dashboard_templates WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 0;

    if (category) {
      paramIndex++;
      query += ` AND category = $${paramIndex}`;
      params.push(category);
    }

    if (isPremium !== undefined) {
      paramIndex++;
      query += ` AND is_premium = $${paramIndex}`;
      params.push(isPremium);
    }

    query += ' ORDER BY usage_count DESC, created_at DESC';

    const result = await this.pool.query(query, params);
    
    return result.rows.map(this.transformDashboardTemplate);
  }

  /**
   * Get widget templates
   */
  async getWidgetTemplates(
    type?: string,
    category?: string,
    dataSource?: string
  ): Promise<any[]> {
    let query = 'SELECT * FROM widget_templates WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 0;

    if (type) {
      paramIndex++;
      query += ` AND type = $${paramIndex}`;
      params.push(type);
    }

    if (category) {
      paramIndex++;
      query += ` AND category = $${paramIndex}`;
      params.push(category);
    }

    if (dataSource) {
      paramIndex++;
      query += ` AND data_source = $${paramIndex}`;
      params.push(dataSource);
    }

    query += ' ORDER BY usage_count DESC, created_at DESC';

    const result = await this.pool.query(query, params);
    
    return result.rows.map(this.transformWidgetTemplate);
  }

  /**
   * Share dashboard
   */
  async shareDashboard(share: Partial<DashboardShare>): Promise<DashboardShare> {
    const result = await this.pool.query(`
      INSERT INTO dashboard_shares (
        dashboard_id, shared_by, shared_with, share_type, 
        access_token, expires_at, password_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [
      share.dashboardId,
      share.sharedBy,
      share.sharedWith,
      share.shareType,
      share.accessToken,
      share.expiresAt,
      share.passwordHash
    ]);

    return this.transformDashboardShare(result.rows[0]);
  }

  /**
   * Get dashboard shares
   */
  async getDashboardShares(dashboardId: string): Promise<DashboardShare[]> {
    const result = await this.pool.query(
      'SELECT * FROM dashboard_shares WHERE dashboard_id = $1',
      [dashboardId]
    );
    
    return result.rows.map(this.transformDashboardShare);
  }

  /**
   * Log dashboard activity
   */
  async logActivity(activity: Partial<DashboardActivity>): Promise<void> {
    await this.pool.query(`
      INSERT INTO dashboard_activity_logs (
        dashboard_id, user_id, action, details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      activity.dashboardId,
      activity.userId,
      activity.action,
      JSON.stringify(activity.details || {}),
      activity.ipAddress,
      activity.userAgent
    ]);
  }

  /**
   * Add/remove dashboard favorite
   */
  async toggleFavorite(userId: string, dashboardId: string): Promise<boolean> {
    const existingResult = await this.pool.query(
      'SELECT id FROM dashboard_favorites WHERE user_id = $1 AND dashboard_id = $2',
      [userId, dashboardId]
    );

    if (existingResult.rows.length > 0) {
      // Remove favorite
      await this.pool.query(
        'DELETE FROM dashboard_favorites WHERE user_id = $1 AND dashboard_id = $2',
        [userId, dashboardId]
      );
      return false;
    } else {
      // Add favorite
      await this.pool.query(
        'INSERT INTO dashboard_favorites (user_id, dashboard_id, created_at) VALUES ($1, $2, NOW())',
        [userId, dashboardId]
      );
      return true;
    }
  }

  /**
   * Get widget data cache
   */
  async getWidgetCache(widgetId: string, cacheKey: string): Promise<any | null> {
    const result = await this.pool.query(
      'SELECT data FROM widget_data_cache WHERE widget_id = $1 AND cache_key = $2 AND expires_at > NOW()',
      [widgetId, cacheKey]
    );
    
    return result.rows.length > 0 ? result.rows[0].data : null;
  }

  /**
   * Set widget data cache
   */
  async setWidgetCache(
    widgetId: string, 
    cacheKey: string, 
    data: any, 
    ttlSeconds: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await this.pool.query(`
      INSERT INTO widget_data_cache (widget_id, cache_key, data, expires_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (widget_id, cache_key) 
      DO UPDATE SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at
    `, [widgetId, cacheKey, JSON.stringify(data), expiresAt]);
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM widget_data_cache WHERE expires_at < NOW()'
    );
    
    return result.rowCount || 0;
  }

  // Transform database rows to application models
  private transformDashboard(row: any): AnalyticsDashboard {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      layout: JSON.parse(row.layout || '{}'),
      theme: JSON.parse(row.theme || '{}'),
      category: row.category,
      isPublic: row.is_public,
      isTemplate: row.is_template,
      isFavorite: row.is_favorite,
      viewCount: row.view_count,
      tags: row.tags,
      widgets: row.widgets || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ownerEmail: row.owner_email,
      ownerName: row.owner_name,
      widgetCount: parseInt(row.widget_count || 0),
      shareCount: parseInt(row.share_count || 0),
      isFavorited: row.is_favorited
    };
  }

  private transformWidget(row: any): DashboardWidget {
    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      type: row.type,
      title: row.title,
      position: JSON.parse(row.position || '{}'),
      configuration: JSON.parse(row.configuration || '{}'),
      dataSource: row.data_source,
      dataFilters: JSON.parse(row.data_filters || '{}'),
      refreshInterval: row.refresh_interval,
      isVisible: row.is_visible,
      isRealTime: row.is_real_time,
      cacheDuration: row.cache_duration,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformDashboardTemplate(row: any): DashboardTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      thumbnailUrl: row.thumbnail_url,
      layout: JSON.parse(row.layout || '{}'),
      theme: JSON.parse(row.theme || '{}'),
      widgetConfigs: JSON.parse(row.widget_configs || '[]'),
      tags: row.tags,
      isPremium: row.is_premium,
      usageCount: row.usage_count,
      rating: parseFloat(row.rating || 0),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformWidgetTemplate(row: any): any {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      category: row.category,
      icon: row.icon,
      defaultConfig: JSON.parse(row.default_config || '{}'),
      defaultPosition: JSON.parse(row.default_position || '{}'),
      dataSource: row.data_source,
      supportedThemes: row.supported_themes,
      isPremium: row.is_premium,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformDashboardShare(row: any): DashboardShare {
    return {
      id: row.id,
      dashboardId: row.dashboard_id,
      sharedBy: row.shared_by,
      sharedWith: row.shared_with,
      shareType: row.share_type,
      accessToken: row.access_token,
      expiresAt: row.expires_at,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  }

  // Utility function to convert camelCase to snake_case
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}