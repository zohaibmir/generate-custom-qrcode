import { Pool } from 'pg';
import { IDependencyContainer, ServiceResponse, AppError } from '../interfaces';
import { ILogger } from '../interfaces';
import { 
  DashboardWidget, 
  AnalyticsDashboard, 
  DashboardTemplate,
  DashboardLayout,
  WidgetDataSource,
  DashboardTheme
} from '../../../../shared/src/types/analytics.types';

/**
 * Custom Dashboard Service - Advanced Dashboard Builder
 * 
 * Features:
 * - Drag & Drop Dashboard Builder
 * - Real-time Widget Data Binding
 * - Cross-Service Data Integration
 * - Custom Widget Library
 * - Dashboard Templates
 * - Responsive Layouts
 * - Theme Customization
 * - Export & Sharing
 */
export class CustomDashboardService {
  private pool: Pool;
  private logger: ILogger;

  constructor(
    private container: IDependencyContainer
  ) {
    this.pool = container.resolve<Pool>('dbPool');
    this.logger = container.resolve<ILogger>('logger');
  }

  /**
   * Create a new custom dashboard
   */
  async createDashboard(
    userId: string,
    dashboardData: Partial<AnalyticsDashboard>
  ): Promise<ServiceResponse<AnalyticsDashboard>> {
    try {
      this.logger.info('Creating custom dashboard', { userId, dashboardName: dashboardData.name });

      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Create dashboard record
        const dashboardQuery = `
          INSERT INTO analytics_dashboards (
            id, user_id, name, description, layout, theme, is_public, 
            is_template, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
          ) RETURNING *
        `;

        const dashboardId = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const dashboardResult = await client.query(dashboardQuery, [
          dashboardId,
          userId,
          dashboardData.name || 'My Dashboard',
          dashboardData.description || 'Custom analytics dashboard',
          JSON.stringify(dashboardData.layout || this.getDefaultLayout()),
          JSON.stringify(dashboardData.theme || this.getDefaultTheme()),
          dashboardData.isPublic || false,
          dashboardData.isTemplate || false
        ]);

        // Create default widgets if none provided
        const widgets = dashboardData.widgets || this.getDefaultWidgets(dashboardId);
        
        // Insert widgets
        for (const widget of widgets) {
          await this.createWidget(client, dashboardId, widget);
        }

        await client.query('COMMIT');

        const dashboard = dashboardResult.rows[0];
        dashboard.widgets = widgets;

        this.logger.info('Dashboard created successfully', { dashboardId, userId });

        return {
          success: true,
          data: dashboard,
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('Failed to create dashboard:', error);
      return {
        success: false,
        error: {
          code: 'DASHBOARD_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get user dashboards with pagination
   */
  async getUserDashboards(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      includeTemplates?: boolean;
      category?: string;
    } = {}
  ): Promise<ServiceResponse<{ dashboards: AnalyticsDashboard[]; total: number }>> {
    try {
      const { page = 1, limit = 20, includeTemplates = false, category } = options;
      const offset = (page - 1) * limit;

      let whereConditions = ['user_id = $1'];
      let queryParams: any[] = [userId];
      let paramIndex = 1;

      if (!includeTemplates) {
        paramIndex++;
        whereConditions.push(`is_template = $${paramIndex}`);
        queryParams.push(false);
      }

      if (category) {
        paramIndex++;
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(category);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get dashboards
      const dashboardsQuery = `
        SELECT 
          d.*,
          COUNT(w.id) as widget_count
        FROM analytics_dashboards d
        LEFT JOIN dashboard_widgets w ON d.id = w.dashboard_id
        WHERE ${whereClause}
        GROUP BY d.id
        ORDER BY d.updated_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      queryParams.push(limit, offset);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM analytics_dashboards
        WHERE ${whereClause}
      `;

      const [dashboardsResult, countResult] = await Promise.all([
        this.pool.query(dashboardsQuery, queryParams),
        this.pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset
      ]);

      // Load widgets for each dashboard
      const dashboards = await Promise.all(
        dashboardsResult.rows.map(async (dashboard) => {
          const widgets = await this.getDashboardWidgets(dashboard.id);
          return {
            ...dashboard,
            widgets
          };
        })
      );

      return {
        success: true,
        data: {
          dashboards,
          total: parseInt(countResult.rows[0].total)
        },
        metadata: {
          timestamp: new Date().toISOString(),
          pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].total),
            totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
          }
        }
      };

    } catch (error) {
      this.logger.error('Failed to get user dashboards:', error);
      return {
        success: false,
        error: {
          code: 'DASHBOARDS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Update dashboard layout and configuration
   */
  async updateDashboard(
    dashboardId: string,
    userId: string,
    updates: Partial<AnalyticsDashboard>
  ): Promise<ServiceResponse<AnalyticsDashboard>> {
    try {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        // Update dashboard
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

        if (updates.isPublic !== undefined) {
          paramIndex++;
          updateFields.push(`is_public = $${paramIndex}`);
          params.push(updates.isPublic.toString());
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
          throw new AppError('DASHBOARD_NOT_FOUND', 'Dashboard not found or access denied', 404);
        }

        // Update widgets if provided
        if (updates.widgets) {
          await this.updateDashboardWidgets(client, dashboardId, updates.widgets);
        }

        await client.query('COMMIT');

        const dashboard = result.rows[0];
        dashboard.widgets = await this.getDashboardWidgets(dashboardId);

        return {
          success: true,
          data: dashboard,
          metadata: {
            timestamp: new Date().toISOString()
          }
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('Failed to update dashboard:', error);
      return {
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'DASHBOARD_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: error instanceof AppError ? error.statusCode : 500
        }
      };
    }
  }

  /**
   * Create a new widget
   */
  async createWidget(
    client: any,
    dashboardId: string,
    widget: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    const widgetQuery = `
      INSERT INTO dashboard_widgets (
        id, dashboard_id, type, title, position, configuration, 
        data_source, refresh_interval, is_visible, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *
    `;

    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(widgetQuery, [
      widgetId,
      dashboardId,
      widget.type || 'metric',
      widget.title || 'New Widget',
      JSON.stringify(widget.position || { x: 0, y: 0, width: 4, height: 3 }),
      JSON.stringify(widget.configuration || {}),
      widget.dataSource || 'analytics',
      widget.refreshInterval || 30,
      widget.isVisible !== undefined ? widget.isVisible : true
    ]);

    return result.rows[0];
  }

  /**
   * Get dashboard widgets
   */
  async getDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]> {
    const query = `
      SELECT * FROM dashboard_widgets 
      WHERE dashboard_id = $1 
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(query, [dashboardId]);
    return result.rows.map(row => ({
      ...row,
      position: JSON.parse(row.position),
      configuration: JSON.parse(row.configuration)
    }));
  }

  /**
   * Update dashboard widgets
   */
  async updateDashboardWidgets(
    client: any,
    dashboardId: string,
    widgets: DashboardWidget[]
  ): Promise<void> {
    // Delete existing widgets
    await client.query('DELETE FROM dashboard_widgets WHERE dashboard_id = $1', [dashboardId]);

    // Insert updated widgets
    for (const widget of widgets) {
      await this.createWidget(client, dashboardId, widget);
    }
  }

  /**
   * Get widget data with real-time updates
   */
  async getWidgetData(
    widgetId: string,
    userId: string,
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<ServiceResponse<any>> {
    try {
      // Get widget configuration
      const widgetQuery = `
        SELECT w.*, d.user_id 
        FROM dashboard_widgets w
        JOIN analytics_dashboards d ON w.dashboard_id = d.id
        WHERE w.id = $1 AND d.user_id = $2
      `;

      const widgetResult = await this.pool.query(widgetQuery, [widgetId, userId]);

      if (widgetResult.rows.length === 0) {
        throw new AppError('WIDGET_NOT_FOUND', 'Widget not found or access denied', 404);
      }

      const widget = widgetResult.rows[0];
      const config = JSON.parse(widget.configuration);

      // Fetch data based on widget type and data source
      let data;
      
      switch (widget.data_source) {
        case 'analytics':
          data = await this.getAnalyticsData(widget.type, config, timeRange);
          break;
        case 'qr_codes':
          data = await this.getQRCodeData(widget.type, config, userId, timeRange);
          break;
        case 'campaigns':
          data = await this.getCampaignData(widget.type, config, userId, timeRange);
          break;
        case 'ecommerce':
          data = await this.getEcommerceData(widget.type, config, userId, timeRange);
          break;
        case 'content':
          data = await this.getContentData(widget.type, config, userId, timeRange);
          break;
        default:
          data = await this.getCustomData(widget.data_source, widget.type, config, userId, timeRange);
      }

      return {
        success: true,
        data: {
          widget: {
            ...widget,
            configuration: config
          },
          data,
          lastUpdated: new Date().toISOString()
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: widget.data_source,
          refreshInterval: widget.refresh_interval
        }
      };

    } catch (error) {
      this.logger.error('Failed to get widget data:', error);
      return {
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'WIDGET_DATA_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: error instanceof AppError ? error.statusCode : 500
        }
      };
    }
  }

  /**
   * Get available widget templates
   */
  async getWidgetTemplates(): Promise<ServiceResponse<any[]>> {
    try {
      const templates = [
        // Metric Widgets
        {
          id: 'total_scans',
          type: 'metric',
          category: 'analytics',
          title: 'Total Scans',
          description: 'Total number of QR code scans',
          icon: '📊',
          dataSource: 'analytics',
          defaultConfig: {
            metric: 'total_scans',
            format: 'number',
            showTrend: true,
            trendPeriod: '7d'
          },
          position: { x: 0, y: 0, width: 3, height: 2 }
        },
        {
          id: 'conversion_rate',
          type: 'metric',
          category: 'analytics',
          title: 'Conversion Rate',
          description: 'Overall conversion rate percentage',
          icon: '🎯',
          dataSource: 'analytics',
          defaultConfig: {
            metric: 'conversion_rate',
            format: 'percentage',
            showTrend: true,
            threshold: { warning: 5, critical: 2 }
          },
          position: { x: 3, y: 0, width: 3, height: 2 }
        },
        
        // Chart Widgets
        {
          id: 'scans_timeline',
          type: 'chart',
          category: 'analytics',
          title: 'Scans Timeline',
          description: 'Time series chart of QR code scans',
          icon: '📈',
          dataSource: 'analytics',
          defaultConfig: {
            chartType: 'line',
            metric: 'scans',
            groupBy: 'day',
            timeRange: '30d'
          },
          position: { x: 0, y: 2, width: 6, height: 4 }
        },
        {
          id: 'top_countries',
          type: 'chart',
          category: 'geographic',
          title: 'Top Countries',
          description: 'Bar chart of top countries by scans',
          icon: '🌍',
          dataSource: 'analytics',
          defaultConfig: {
            chartType: 'bar',
            metric: 'scans',
            groupBy: 'country',
            limit: 10
          },
          position: { x: 6, y: 0, width: 3, height: 4 }
        },

        // Table Widgets
        {
          id: 'top_qr_codes',
          type: 'table',
          category: 'qr_codes',
          title: 'Top QR Codes',
          description: 'Table of best performing QR codes',
          icon: '📋',
          dataSource: 'qr_codes',
          defaultConfig: {
            columns: ['name', 'scans', 'conversions', 'created_at'],
            sortBy: 'scans',
            sortOrder: 'desc',
            limit: 10
          },
          position: { x: 0, y: 6, width: 6, height: 4 }
        },

        // Map Widgets
        {
          id: 'geographic_heatmap',
          type: 'map',
          category: 'geographic',
          title: 'Geographic Heatmap',
          description: 'World map showing scan distribution',
          icon: '🗺️',
          dataSource: 'analytics',
          defaultConfig: {
            mapType: 'world',
            metric: 'scans',
            colorScheme: 'viridis'
          },
          position: { x: 6, y: 4, width: 6, height: 6 }
        },

        // Campaign Widgets
        {
          id: 'campaign_performance',
          type: 'chart',
          category: 'campaigns',
          title: 'Campaign Performance',
          description: 'Multi-line chart comparing campaign metrics',
          icon: '🎯',
          dataSource: 'campaigns',
          defaultConfig: {
            chartType: 'line',
            metrics: ['scans', 'conversions', 'click_rate'],
            groupBy: 'campaign',
            compareMode: true
          },
          position: { x: 0, y: 10, width: 8, height: 4 }
        },

        // E-commerce Widgets
        {
          id: 'revenue_metrics',
          type: 'metric',
          category: 'ecommerce',
          title: 'Revenue',
          description: 'Total revenue from QR code conversions',
          icon: '💰',
          dataSource: 'ecommerce',
          defaultConfig: {
            metric: 'total_revenue',
            format: 'currency',
            currency: 'USD',
            showTrend: true
          },
          position: { x: 8, y: 10, width: 4, height: 2 }
        }
      ];

      return {
        success: true,
        data: templates,
        metadata: {
          timestamp: new Date().toISOString(),
          totalTemplates: templates.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to get widget templates:', error);
      return {
        success: false,
        error: {
          code: 'WIDGET_TEMPLATES_FAILED',
          message: 'Failed to load widget templates',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get dashboard templates
   */
  async getDashboardTemplates(): Promise<ServiceResponse<DashboardTemplate[]>> {
    try {
      const templates = [
        {
          id: 'analytics_overview',
          name: 'Analytics Overview',
          description: 'Comprehensive analytics dashboard with key metrics and charts',
          category: 'analytics',
          thumbnailUrl: '/assets/templates/analytics_overview.png',
          widgetConfigs: [
            { id: 'total_scans', type: 'metric', title: 'Total Scans' },
            { id: 'conversion_rate', type: 'metric', title: 'Conversion Rate' },
            { id: 'scans_timeline', type: 'chart', title: 'Scans Timeline' },
            { id: 'top_countries', type: 'table', title: 'Top Countries' },
            { id: 'top_qr_codes', type: 'table', title: 'Top QR Codes' },
            { id: 'geographic_heatmap', type: 'map', title: 'Geographic Heatmap' }
          ],
          tags: ['analytics', 'overview', 'comprehensive'],
          layout: this.getTemplateLayout('analytics_overview'),
          theme: this.getDefaultTheme(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'marketing_dashboard',
          name: 'Marketing Dashboard',
          description: 'Campaign performance and marketing analytics',
          category: 'marketing',
          thumbnailUrl: '/assets/templates/marketing_dashboard.png',
          widgetConfigs: [
            { id: 'campaign_performance', type: 'chart', title: 'Campaign Performance' },
            { id: 'conversion_rate', type: 'metric', title: 'Conversion Rate' },
            { id: 'top_countries', type: 'table', title: 'Top Countries' },
            { id: 'scans_timeline', type: 'chart', title: 'Scans Timeline' }
          ],
          tags: ['marketing', 'campaign', 'performance'],
          layout: this.getTemplateLayout('marketing_dashboard'),
          theme: { ...this.getDefaultTheme(), primaryColor: '#e74c3c' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'ecommerce_insights',
          name: 'E-commerce Insights',
          description: 'Revenue tracking and product performance',
          category: 'ecommerce',
          thumbnailUrl: '/assets/templates/ecommerce_insights.png',
          widgetConfigs: [
            { id: 'revenue_metrics', type: 'metric', title: 'Revenue Metrics' },
            { id: 'conversion_rate', type: 'metric', title: 'Conversion Rate' },
            { id: 'top_qr_codes', type: 'table', title: 'Top QR Codes' },
            { id: 'geographic_heatmap', type: 'map', title: 'Geographic Heatmap' }
          ],
          tags: ['ecommerce', 'revenue', 'insights'],
          layout: this.getTemplateLayout('ecommerce_insights'),
          theme: { ...this.getDefaultTheme(), primaryColor: '#27ae60' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'executive_summary',
          name: 'Executive Summary',
          description: 'High-level KPIs and trends for leadership',
          category: 'executive',
          thumbnailUrl: '/assets/templates/executive_summary.png',
          widgetConfigs: [
            { id: 'total_scans', type: 'metric', title: 'Total Scans' },
            { id: 'conversion_rate', type: 'metric', title: 'Conversion Rate' },
            { id: 'revenue_metrics', type: 'metric', title: 'Revenue Metrics' },
            { id: 'scans_timeline', type: 'chart', title: 'Scans Timeline' }
          ],
          tags: ['executive', 'summary', 'kpi'],
          layout: this.getTemplateLayout('executive_summary'),
          theme: { ...this.getDefaultTheme(), primaryColor: '#3498db' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      return {
        success: true,
        data: templates,
        metadata: {
          timestamp: new Date().toISOString(),
          totalTemplates: templates.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to get dashboard templates:', error);
      return {
        success: false,
        error: {
          code: 'DASHBOARD_TEMPLATES_FAILED',
          message: 'Failed to load dashboard templates',
          statusCode: 500
        }
      };
    }
  }

  // Private helper methods

  private getDefaultLayout(): DashboardLayout {
    return {
      columns: 12,
      rowHeight: 60,
      margin: [10, 10],
      containerPadding: [20, 20],
      compactType: 'vertical',
      preventCollision: false
    };
  }

  private getDefaultTheme(): DashboardTheme {
    return {
      mode: 'light',
      primaryColor: '#1890ff',
      backgroundColor: '#ffffff',
      cardBackground: '#fafafa',
      textColor: '#333333',
      borderColor: '#d9d9d9',
      fontFamily: 'Inter, system-ui, sans-serif'
    };
  }

  private getTemplateLayout(templateId: string): DashboardLayout {
    const layouts = {
      analytics_overview: {
        columns: 12,
        rowHeight: 60,
        margin: [10, 10],
        containerPadding: [20, 20]
      },
      marketing_dashboard: {
        columns: 12,
        rowHeight: 60,
        margin: [15, 15],
        containerPadding: [25, 25]
      },
      ecommerce_insights: {
        columns: 12,
        rowHeight: 60,
        margin: [12, 12],
        containerPadding: [20, 20]
      },
      executive_summary: {
        columns: 8,
        rowHeight: 80,
        margin: [20, 20],
        containerPadding: [30, 30]
      }
    };

    return (layouts as any)[templateId] || this.getDefaultLayout();
  }

  private getDefaultWidgets(dashboardId: string): Partial<DashboardWidget>[] {
    return [
      {
        type: 'metric',
        title: 'Total Scans',
        position: { x: 0, y: 0, width: 3, height: 2 },
        configuration: { metric: 'total_scans', format: 'number' },
        dataSource: 'analytics',
        refreshInterval: 30,
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Scans Timeline',
        position: { x: 3, y: 0, width: 6, height: 4 },
        configuration: { chartType: 'line', metric: 'scans', groupBy: 'day' },
        dataSource: 'analytics',
        refreshInterval: 60,
        isVisible: true
      },
      {
        type: 'table',
        title: 'Top QR Codes',
        position: { x: 0, y: 4, width: 9, height: 4 },
        configuration: { columns: ['name', 'scans', 'conversions'], limit: 5 },
        dataSource: 'qr_codes',
        refreshInterval: 120,
        isVisible: true
      }
    ];
  }

  /**
   * Get dashboard by ID with access control
   */
  async getDashboardById(
    dashboardId: string,
    userId: string
  ): Promise<AnalyticsDashboard | null> {
    try {
      const repository = this.container.resolve<any>('customDashboardRepository');
      return await repository.getDashboardById(dashboardId, userId);
    } catch (error) {
      this.logger.error('Failed to get dashboard by ID:', error);
      return null;
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(
    dashboardId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const repository = this.container.resolve<any>('customDashboardRepository');
      return await repository.deleteDashboard(dashboardId, userId);
    } catch (error) {
      this.logger.error('Failed to delete dashboard:', error);
      return false;
    }
  }

  // Data fetching methods for different services
  private async getAnalyticsData(widgetType: string, config: any, timeRange?: any): Promise<any> {
    // Integration with existing analytics service
    // This will fetch data from your current analytics infrastructure
    return { placeholder: 'Analytics data integration' };
  }

  private async getQRCodeData(widgetType: string, config: any, userId: string, timeRange?: any): Promise<any> {
    // Integration with QR service
    return { placeholder: 'QR code data integration' };
  }

  private async getCampaignData(widgetType: string, config: any, userId: string, timeRange?: any): Promise<any> {
    // Integration with campaign management
    return { placeholder: 'Campaign data integration' };
  }

  private async getEcommerceData(widgetType: string, config: any, userId: string, timeRange?: any): Promise<any> {
    // Integration with e-commerce service
    return { placeholder: 'E-commerce data integration' };
  }

  private async getContentData(widgetType: string, config: any, userId: string, timeRange?: any): Promise<any> {
    // Integration with content service
    return { placeholder: 'Content data integration' };
  }

  private async getCustomData(dataSource: string, widgetType: string, config: any, userId: string, timeRange?: any): Promise<any> {
    // Integration with custom data sources
    return { placeholder: 'Custom data integration' };
  }
}