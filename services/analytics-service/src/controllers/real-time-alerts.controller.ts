import { Request, Response } from 'express';
import { 
  IAlertEngineService,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  ILogger,
  ValidationError,
  AppError 
} from '../interfaces';

export class RealTimeAlertsController {
  constructor(
    private alertEngineService: IAlertEngineService,
    private logger: ILogger
  ) {}

  // Alert Rules Management
  async createAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const createRequest: CreateAlertRuleRequest = {
        userId: req.user?.id || '',
        qrCodeId: req.body.qrCodeId,
        name: req.body.name,
        description: req.body.description,
        ruleType: req.body.ruleType,
        metricType: req.body.metricType,
        conditions: req.body.conditions,
        severity: req.body.severity,
        isActive: req.body.isActive,
        cooldownMinutes: req.body.cooldownMinutes,
        aggregationWindow: req.body.aggregationWindow,
        notificationChannels: req.body.notificationChannels,
        notificationSettings: req.body.notificationSettings
      };

      this.logger.info('Creating alert rule', { 
        userId: createRequest.userId,
        ruleName: createRequest.name,
        metricType: createRequest.metricType
      });

      const result = await this.alertEngineService.createAlertRule(createRequest);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to create alert rule', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create alert rule',
            statusCode: 500
          }
        });
      }
    }
  }

  async updateAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const alertRuleId = req.params.alertRuleId;
      const updates: UpdateAlertRuleRequest = req.body;

      this.logger.info('Updating alert rule', { 
        alertRuleId,
        userId: req.user?.id
      });

      const result = await this.alertEngineService.updateAlertRule(alertRuleId, updates);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to update alert rule', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertRuleId: req.params.alertRuleId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update alert rule',
          statusCode: 500
        }
      });
    }
  }

  async deleteAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const alertRuleId = req.params.alertRuleId;

      this.logger.info('Deleting alert rule', { 
        alertRuleId,
        userId: req.user?.id
      });

      const result = await this.alertEngineService.deleteAlertRule(alertRuleId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Alert rule deleted successfully',
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to delete alert rule', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertRuleId: req.params.alertRuleId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete alert rule',
          statusCode: 500
        }
      });
    }
  }

  // Alert Instances Management
  async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const filters = {
        qrCodeId: req.query.qrCodeId as string,
        severity: req.query.severity as string
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => 
        filters[key as keyof typeof filters] === undefined && delete filters[key as keyof typeof filters]
      );

      this.logger.info('Getting active alerts', { userId, filters });

      const result = await this.alertEngineService.getActiveAlerts(userId, filters);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to get active alerts', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get active alerts',
          statusCode: 500
        }
      });
    }
  }

  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const alertInstanceId = req.params.alertInstanceId;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const notes = req.body.notes;

      this.logger.info('Acknowledging alert', { 
        alertInstanceId,
        userId,
        hasNotes: !!notes
      });

      const result = await this.alertEngineService.acknowledgeAlert(alertInstanceId, userId, notes);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Alert acknowledged successfully',
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to acknowledge alert', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertInstanceId: req.params.alertInstanceId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to acknowledge alert',
          statusCode: 500
        }
      });
    }
  }

  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const alertInstanceId = req.params.alertInstanceId;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const resolutionNotes = req.body.resolutionNotes;

      this.logger.info('Resolving alert', { 
        alertInstanceId,
        userId,
        hasNotes: !!resolutionNotes
      });

      const result = await this.alertEngineService.resolveAlert(alertInstanceId, userId, resolutionNotes);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Alert resolved successfully',
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to resolve alert', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertInstanceId: req.params.alertInstanceId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resolve alert',
          statusCode: 500
        }
      });
    }
  }

  // Alert Engine Management
  async startAlertEngine(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Starting alert engine', { userId: req.user?.id });

      const result = await this.alertEngineService.startAlertEngine();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Alert engine started successfully',
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to start alert engine', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to start alert engine',
          statusCode: 500
        }
      });
    }
  }

  async stopAlertEngine(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Stopping alert engine', { userId: req.user?.id });

      const result = await this.alertEngineService.stopAlertEngine();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Alert engine stopped successfully',
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to stop alert engine', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to stop alert engine',
          statusCode: 500
        }
      });
    }
  }

  // Alert Testing and Simulation
  async testAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const { metricType, metricValue, qrCodeId } = req.body;
      const userId = req.user?.id;

      this.logger.info('Testing alert rule', { 
        metricType,
        metricValue,
        qrCodeId,
        userId
      });

      const context = {
        qrCodeId,
        userId,
        metricValue: parseFloat(metricValue),
        metricType,
        timestamp: new Date(),
        additionalData: { isTest: true }
      };

      const result = await this.alertEngineService.evaluateMetric(context);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            evaluations: result.data,
            testContext: context,
            message: 'Alert rule test completed'
          },
          metadata: result.metadata
        });
      } else {
        res.status(result.error?.statusCode || 500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      this.logger.error('Failed to test alert rule', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to test alert rule',
          statusCode: 500
        }
      });
    }
  }

  // Alert Templates and Presets
  async getAlertTemplates(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Getting alert templates', { userId: req.user?.id });

      const templates = [
        {
          id: 'high_volume_template',
          name: 'High Scan Volume',
          description: 'Alert when QR code receives unusually high scan volume',
          ruleType: 'threshold',
          metricType: 'scans_per_minute',
          conditions: { operator: 'greater_than', threshold: 100, window_minutes: 5 },
          severity: 'medium',
          notificationChannels: ['email'],
          category: 'volume'
        },
        {
          id: 'error_rate_template',
          name: 'High Error Rate',
          description: 'Alert when QR code error rate exceeds threshold',
          ruleType: 'threshold',
          metricType: 'error_rate',
          conditions: { operator: 'greater_than', threshold: 5.0, window_minutes: 10 },
          severity: 'high',
          notificationChannels: ['email', 'sms'],
          category: 'performance'
        },
        {
          id: 'anomaly_detection_template',
          name: 'Anomaly Detection',
          description: 'Alert when scan patterns show anomalous behavior',
          ruleType: 'anomaly',
          metricType: 'scans',
          conditions: { sensitivity: 0.8, algorithm: 'zscore', window_size: 100 },
          severity: 'medium',
          notificationChannels: ['email'],
          category: 'anomaly'
        },
        {
          id: 'conversion_drop_template',
          name: 'Conversion Rate Drop',
          description: 'Alert when conversion rate drops significantly',
          ruleType: 'threshold',
          metricType: 'conversion_rate',
          conditions: { operator: 'less_than', threshold: 2.0, window_minutes: 30 },
          severity: 'high',
          notificationChannels: ['email', 'slack'],
          category: 'conversion'
        },
        {
          id: 'response_time_template',
          name: 'Slow Response Time',
          description: 'Alert when QR response time is too slow',
          ruleType: 'threshold',
          metricType: 'response_time',
          conditions: { operator: 'greater_than', threshold: 2000, window_minutes: 15 },
          severity: 'medium',
          notificationChannels: ['email'],
          category: 'performance'
        }
      ];

      res.status(200).json({
        success: true,
        data: templates,
        metadata: {
          timestamp: new Date().toISOString(),
          count: templates.length
        }
      });

    } catch (error) {
      this.logger.error('Failed to get alert templates', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get alert templates',
          statusCode: 500
        }
      });
    }
  }
}