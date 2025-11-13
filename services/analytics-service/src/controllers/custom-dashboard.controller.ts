import { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { CustomDashboardService } from '../services/custom-dashboard.service';
import { IDependencyContainer } from '../interfaces';
import { AppError } from '../../../../shared/src/utils/errors';

// Extended Request interface with user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
  };
}

/**
 * Custom Dashboard Controller
 * 
 * Handles HTTP requests for dashboard management
 * - Dashboard CRUD operations
 * - Widget management
 * - Template management
 * - Real-time data
 * - Sharing and collaboration
 */
export class CustomDashboardController {
  private dashboardService: CustomDashboardService;

  constructor(private container: IDependencyContainer) {
    this.dashboardService = container.resolve<CustomDashboardService>('customDashboardService');
  }

  /**
   * Create a new dashboard
   * POST /analytics/dashboards
   */
  createDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const dashboardData = {
        ...req.body,
        userId
      };

      const result = await this.dashboardService.createDashboard(userId, dashboardData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create dashboard'
        }
      });
    }
  };

  /**
   * Get user dashboards with pagination and filtering
   * GET /analytics/dashboards
   */
  getUserDashboards = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        category: req.query.category as string,
        includeTemplates: req.query.includeTemplates === 'true'
      };

      const result = await this.dashboardService.getUserDashboards(userId, options);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get dashboards'
        }
      });
    }
  };

  /**
   * Get dashboard by ID
   * GET /analytics/dashboards/:id
   */
  getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Get dashboard with access control
      const dashboard = await this.dashboardService.getDashboardById(id, userId);

      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DASHBOARD_NOT_FOUND',
            message: 'Dashboard not found or access denied'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: dashboard,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get dashboard'
        }
      });
    }
  };

  /**
   * Update dashboard
   * PUT /analytics/dashboards/:id
   */
  updateDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const result = await this.dashboardService.updateDashboard(id, userId, req.body);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update dashboard'
        }
      });
    }
  };

  /**
   * Delete dashboard
   * DELETE /analytics/dashboards/:id
   */
  deleteDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const success = await this.dashboardService.deleteDashboard(id, userId);

      if (success) {
        res.json({
          success: true,
          message: 'Dashboard deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'DASHBOARD_NOT_FOUND',
            message: 'Dashboard not found or access denied'
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete dashboard'
        }
      });
    }
  };

  /**
   * Get widget data
   * GET /analytics/dashboards/widgets/:widgetId/data
   */
  getWidgetData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { widgetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Parse time range if provided
      let timeRange;
      if (req.query.startDate && req.query.endDate) {
        timeRange = {
          startDate: new Date(req.query.startDate as string),
          endDate: new Date(req.query.endDate as string)
        };
      }

      const result = await this.dashboardService.getWidgetData(widgetId, userId, timeRange);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get widget data'
        }
      });
    }
  };

  /**
   * Get widget templates
   * GET /analytics/dashboards/widget-templates
   */
  getWidgetTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.dashboardService.getWidgetTemplates();

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get widget templates'
        }
      });
    }
  };

  /**
   * Get dashboard templates
   * GET /analytics/dashboards/templates
   */
  getDashboardTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.dashboardService.getDashboardTemplates();

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get dashboard templates'
        }
      });
    }
  };

  /**
   * Create dashboard from template
   * POST /analytics/dashboards/templates/:templateId/create
   */
  createFromTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Get template and create dashboard
      const templateResult = await this.dashboardService.getDashboardTemplates();
      
      if (!templateResult.success) {
        res.status(500).json(templateResult);
        return;
      }

      const template = templateResult.data?.find(t => t.id === templateId);
      
      if (!template) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Dashboard template not found'
          }
        });
        return;
      }

      // Create dashboard from template
      const dashboardData = {
        name: req.body.name || `${template.name} - Copy`,
        description: req.body.description || template.description,
        layout: template.layout,
        theme: template.theme,
        category: template.category,
        widgets: template.widgetConfigs.map((config: any) => ({
          ...config,
          id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      const result = await this.dashboardService.createDashboard(userId, dashboardData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create dashboard from template'
        }
      });
    }
  };

  /**
   * Duplicate dashboard
   * POST /analytics/dashboards/:id/duplicate
   */
  duplicateDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Get original dashboard
      const originalDashboard = await this.dashboardService.getDashboardById(id, userId);
      
      if (!originalDashboard) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DASHBOARD_NOT_FOUND',
            message: 'Dashboard not found or access denied'
          }
        });
        return;
      }

      // Create duplicate
      const duplicateData = {
        name: req.body.name || `${originalDashboard.name} - Copy`,
        description: originalDashboard.description,
        layout: originalDashboard.layout,
        theme: originalDashboard.theme,
        category: originalDashboard.category,
        widgets: originalDashboard.widgets.map(widget => ({
          ...widget,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate new ID
        }))
      };

      const result = await this.dashboardService.createDashboard(userId, duplicateData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(result.error?.statusCode || 500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to duplicate dashboard'
        }
      });
    }
  };

  /**
   * Export dashboard data
   * GET /analytics/dashboards/:id/export
   */
  exportDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const dashboard = await this.dashboardService.getDashboardById(id, userId);
      
      if (!dashboard) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DASHBOARD_NOT_FOUND',
            message: 'Dashboard not found or access denied'
          }
        });
        return;
      }

      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="dashboard-${id}.json"`);
          res.json({
            dashboard,
            exportedAt: new Date().toISOString(),
            version: '1.0'
          });
          break;

        default:
          res.status(400).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: 'Export format not supported'
            }
          });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export dashboard'
        }
      });
    }
  };

  /**
   * Get dashboard analytics
   * GET /analytics/dashboards/:id/analytics
   */
  getDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Implementation for dashboard usage analytics
      const analytics = {
        dashboardId: id,
        usage: {
          totalViews: 0,
          averageViewTime: 0,
          uniqueUsers: 0,
          lastAccessed: new Date()
        },
        widgets: {
          mostUsed: [],
          averageRefreshRate: 0,
          errorRate: 0
        },
        performance: {
          averageLoadTime: 0,
          cacheHitRate: 0,
          dataFreshness: 0
        }
      };

      res.json({
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get dashboard analytics'
        }
      });
    }
  };
}

// Validation middleware
export const dashboardValidation = {
  create: [
    body('name').notEmpty().isLength({ min: 1, max: 255 }).withMessage('Dashboard name is required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
    body('layout').optional().isObject().withMessage('Layout must be an object'),
    body('theme').optional().isObject().withMessage('Theme must be an object'),
    body('category').optional().isString().withMessage('Category must be a string'),
    body('widgets').optional().isArray().withMessage('Widgets must be an array')
  ],

  update: [
    param('id').notEmpty().withMessage('Dashboard ID is required'),
    body('name').optional().isLength({ min: 1, max: 255 }).withMessage('Invalid dashboard name'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
    body('layout').optional().isObject().withMessage('Layout must be an object'),
    body('theme').optional().isObject().withMessage('Theme must be an object'),
    body('widgets').optional().isArray().withMessage('Widgets must be an array')
  ],

  get: [
    param('id').notEmpty().withMessage('Dashboard ID is required')
  ],

  list: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().isString().withMessage('Category must be a string')
  ]
};