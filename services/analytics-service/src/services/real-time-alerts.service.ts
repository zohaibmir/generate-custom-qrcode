import { 
  IAlertEngineService,
  IAnalyticsRepository,
  INotificationService,
  ILogger,
  ServiceResponse,
  ValidationError,
  AppError,
  AlertRule,
  AlertInstance,
  AlertNotification,
  AlertMetric,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertRuleEvaluation,
  NotificationChannel
} from '../interfaces';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

interface AlertContext {
  qrCodeId?: string;
  userId: string;
  metricValue: number;
  metricType: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

interface AnomalyDetectionConfig {
  windowSize: number; // Number of data points to analyze
  sensitivity: number; // Sensitivity threshold (0.0 - 1.0)
  algorithm: 'zscore' | 'isolation_forest' | 'moving_average';
}

interface WebhookPayload {
  alertId: string;
  ruleName: string;
  severity: string;
  qrCodeId?: string;
  metricType: string;
  triggerValue: number;
  thresholdValue?: number;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class RealTimeAlertsService extends EventEmitter implements IAlertEngineService {
  private redis: Redis;
  private evaluationInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private httpClient: AxiosInstance;
  private alertRulesCache: Map<string, AlertRule> = new Map();
  private anomalyDetectionCache: Map<string, number[]> = new Map();

  private readonly EVALUATION_INTERVAL_MS = 30000; // 30 seconds
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes
  private readonly MAX_WEBHOOK_RETRIES = 3;
  private readonly ANOMALY_WINDOW_SIZE = 100;

  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private notificationService: INotificationService,
    private logger: ILogger,
    private redisConfig: { host: string; port: number; password?: string }
  ) {
    super();
    
    this.redis = new Redis({
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password,
      maxRetriesPerRequest: 3
    });

    this.httpClient = axios.create({
      timeout: 10000, // 10 seconds
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QR-SaaS-Alerts-Engine/1.0'
      }
    });

    this.setupEventListeners();
  }

  async startAlertEngine(): Promise<ServiceResponse<void>> {
    try {
      if (this.isRunning) {
        return {
          success: false,
          error: {
            code: 'ALERT_ENGINE_ALREADY_RUNNING',
            message: 'Alert engine is already running',
            statusCode: 409
          }
        };
      }

      this.logger.info('Starting Real-time Alerts Engine');

      // Load alert rules into cache
      await this.refreshAlertRulesCache();

      // Start periodic evaluation
      this.evaluationInterval = setInterval(() => {
        this.evaluateAllAlertRules().catch(error => {
          this.logger.error('Alert evaluation failed', { error: error.message });
        });
      }, this.EVALUATION_INTERVAL_MS);

      // Subscribe to real-time metric updates
      await this.subscribeToMetricUpdates();

      this.isRunning = true;

      this.logger.info('Real-time Alerts Engine started successfully');

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          evaluationInterval: this.EVALUATION_INTERVAL_MS
        }
      };

    } catch (error) {
      this.logger.error('Failed to start alert engine', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'ALERT_ENGINE_START_FAILED',
          message: 'Failed to start alert engine',
          statusCode: 500
        }
      };
    }
  }

  async stopAlertEngine(): Promise<ServiceResponse<void>> {
    try {
      if (!this.isRunning) {
        return {
          success: false,
          error: {
            code: 'ALERT_ENGINE_NOT_RUNNING',
            message: 'Alert engine is not running',
            statusCode: 409
          }
        };
      }

      this.logger.info('Stopping Real-time Alerts Engine');

      // Clear evaluation interval
      if (this.evaluationInterval) {
        clearInterval(this.evaluationInterval);
        this.evaluationInterval = null;
      }

      // Unsubscribe from Redis channels
      await this.redis.unsubscribe();

      this.isRunning = false;

      this.logger.info('Real-time Alerts Engine stopped successfully');

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to stop alert engine', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'ALERT_ENGINE_STOP_FAILED',
          message: 'Failed to stop alert engine',
          statusCode: 500
        }
      };
    }
  }

  async createAlertRule(request: CreateAlertRuleRequest): Promise<ServiceResponse<AlertRule>> {
    try {
      this.logger.info('Creating alert rule', { 
        name: request.name,
        metricType: request.metricType,
        ruleType: request.ruleType
      });

      // Validate request
      const validation = this.validateAlertRuleRequest(request);
      if (!validation.isValid) {
        throw new ValidationError(validation.error!);
      }

      const alertRule: AlertRule = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: request.userId,
        qrCodeId: request.qrCodeId,
        name: request.name,
        description: request.description,
        ruleType: request.ruleType,
        metricType: request.metricType,
        conditions: request.conditions,
        severity: request.severity || 'medium',
        isActive: request.isActive !== false,
        cooldownMinutes: request.cooldownMinutes || 15,
        aggregationWindow: request.aggregationWindow || 5,
        notificationChannels: request.notificationChannels || ['email'],
        notificationSettings: request.notificationSettings || {},
        triggeredCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.saveAlertRule(alertRule);

      // Update cache
      this.alertRulesCache.set(alertRule.id, alertRule);

      this.logger.info('Alert rule created successfully', { alertRuleId: alertRule.id });

      return {
        success: true,
        data: alertRule,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to create alert rule', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'ALERT_RULE_CREATION_FAILED',
          message: 'Failed to create alert rule',
          statusCode: 500
        }
      };
    }
  }

  async updateAlertRule(alertRuleId: string, updates: UpdateAlertRuleRequest): Promise<ServiceResponse<AlertRule>> {
    try {
      this.logger.info('Updating alert rule', { alertRuleId });

      // Get existing rule
      const existingRule = await this.getAlertRuleById(alertRuleId);
      if (!existingRule) {
        return {
          success: false,
          error: {
            code: 'ALERT_RULE_NOT_FOUND',
            message: 'Alert rule not found',
            statusCode: 404
          }
        };
      }

      // Apply updates
      const updatedRule: AlertRule = {
        ...existingRule,
        ...updates,
        id: alertRuleId, // Preserve ID
        updatedAt: new Date()
      };

      // Validate updated rule
      const validation = this.validateAlertRuleRequest(updatedRule);
      if (!validation.isValid) {
        throw new ValidationError(validation.error!);
      }

      // Save to database
      await this.updateAlertRuleInDatabase(updatedRule);

      // Update cache
      this.alertRulesCache.set(alertRuleId, updatedRule);

      this.logger.info('Alert rule updated successfully', { alertRuleId });

      return {
        success: true,
        data: updatedRule,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to update alert rule', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertRuleId
      });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'ALERT_RULE_UPDATE_FAILED',
          message: 'Failed to update alert rule',
          statusCode: 500
        }
      };
    }
  }

  async deleteAlertRule(alertRuleId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Deleting alert rule', { alertRuleId });

      // Check if rule exists
      const existingRule = await this.getAlertRuleById(alertRuleId);
      if (!existingRule) {
        return {
          success: false,
          error: {
            code: 'ALERT_RULE_NOT_FOUND',
            message: 'Alert rule not found',
            statusCode: 404
          }
        };
      }

      // Delete from database (cascades to related tables)
      await this.deleteAlertRuleFromDatabase(alertRuleId);

      // Remove from cache
      this.alertRulesCache.delete(alertRuleId);

      this.logger.info('Alert rule deleted successfully', { alertRuleId });

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to delete alert rule', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertRuleId
      });

      return {
        success: false,
        error: {
          code: 'ALERT_RULE_DELETION_FAILED',
          message: 'Failed to delete alert rule',
          statusCode: 500
        }
      };
    }
  }

  async evaluateMetric(context: AlertContext): Promise<ServiceResponse<AlertRuleEvaluation[]>> {
    try {
      this.logger.debug('Evaluating metric', { 
        metricType: context.metricType,
        metricValue: context.metricValue,
        qrCodeId: context.qrCodeId
      });

      const evaluations: AlertRuleEvaluation[] = [];

      // Get relevant alert rules
      const relevantRules = Array.from(this.alertRulesCache.values())
        .filter(rule => 
          rule.isActive &&
          rule.metricType === context.metricType &&
          (!rule.qrCodeId || rule.qrCodeId === context.qrCodeId)
        );

      for (const rule of relevantRules) {
        const evaluation = await this.evaluateRule(rule, context);
        evaluations.push(evaluation);

        if (evaluation.triggered) {
          await this.handleTriggeredAlert(rule, context, evaluation);
        }
      }

      return {
        success: true,
        data: evaluations,
        metadata: {
          timestamp: new Date().toISOString(),
          rulesEvaluated: evaluations.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to evaluate metric', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        metricType: context.metricType
      });

      return {
        success: false,
        error: {
          code: 'METRIC_EVALUATION_FAILED',
          message: 'Failed to evaluate metric',
          statusCode: 500
        }
      };
    }
  }

  async getActiveAlerts(userId: string, filters?: { qrCodeId?: string; severity?: string }): Promise<ServiceResponse<AlertInstance[]>> {
    try {
      this.logger.info('Getting active alerts', { userId, filters });

      const alerts = await this.getActiveAlertsFromDatabase(userId, filters);

      return {
        success: true,
        data: alerts,
        metadata: {
          timestamp: new Date().toISOString(),
          count: alerts.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to get active alerts', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      return {
        success: false,
        error: {
          code: 'GET_ALERTS_FAILED',
          message: 'Failed to get active alerts',
          statusCode: 500
        }
      };
    }
  }

  async acknowledgeAlert(alertInstanceId: string, userId: string, notes?: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Acknowledging alert', { alertInstanceId, userId });

      await this.updateAlertAcknowledgment(alertInstanceId, userId, notes);

      this.emit('alert_acknowledged', { alertInstanceId, userId, notes, timestamp: new Date() });

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to acknowledge alert', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertInstanceId
      });

      return {
        success: false,
        error: {
          code: 'ALERT_ACKNOWLEDGMENT_FAILED',
          message: 'Failed to acknowledge alert',
          statusCode: 500
        }
      };
    }
  }

  async resolveAlert(alertInstanceId: string, userId: string, resolutionNotes?: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Resolving alert', { alertInstanceId, userId });

      await this.updateAlertResolution(alertInstanceId, userId, resolutionNotes);

      this.emit('alert_resolved', { alertInstanceId, userId, resolutionNotes, timestamp: new Date() });

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to resolve alert', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        alertInstanceId
      });

      return {
        success: false,
        error: {
          code: 'ALERT_RESOLUTION_FAILED',
          message: 'Failed to resolve alert',
          statusCode: 500
        }
      };
    }
  }

  // Private helper methods
  private async evaluateRule(rule: AlertRule, context: AlertContext): Promise<AlertRuleEvaluation> {
    const evaluation: AlertRuleEvaluation = {
      ruleId: rule.id,
      triggered: false,
      metricValue: context.metricValue,
      thresholdValue: undefined,
      evaluatedAt: new Date(),
      reason: ''
    };

    try {
      // Check cooldown period
      if (!await this.isRuleOutOfCooldown(rule)) {
        evaluation.reason = 'Rule is in cooldown period';
        return evaluation;
      }

      // Evaluate based on rule type
      switch (rule.ruleType) {
        case 'threshold':
          evaluation.triggered = await this.evaluateThresholdRule(rule, context, evaluation);
          break;
        case 'anomaly':
          evaluation.triggered = await this.evaluateAnomalyRule(rule, context, evaluation);
          break;
        case 'trend':
          evaluation.triggered = await this.evaluateTrendRule(rule, context, evaluation);
          break;
        default:
          evaluation.reason = `Unsupported rule type: ${rule.ruleType}`;
      }

      return evaluation;

    } catch (error) {
      this.logger.error('Rule evaluation error', { 
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      evaluation.reason = 'Evaluation error occurred';
      return evaluation;
    }
  }

  private async evaluateThresholdRule(rule: AlertRule, context: AlertContext, evaluation: AlertRuleEvaluation): Promise<boolean> {
    const conditions = rule.conditions as any;
    const threshold = parseFloat(conditions.threshold);
    const operator = conditions.operator;

    evaluation.thresholdValue = threshold;

    let triggered = false;
    switch (operator) {
      case 'greater_than':
        triggered = context.metricValue > threshold;
        break;
      case 'greater_than_or_equal':
        triggered = context.metricValue >= threshold;
        break;
      case 'less_than':
        triggered = context.metricValue < threshold;
        break;
      case 'less_than_or_equal':
        triggered = context.metricValue <= threshold;
        break;
      case 'equals':
        triggered = context.metricValue === threshold;
        break;
      case 'not_equals':
        triggered = context.metricValue !== threshold;
        break;
      default:
        evaluation.reason = `Unknown operator: ${operator}`;
        return false;
    }

    if (triggered) {
      evaluation.reason = `Value ${context.metricValue} ${operator} ${threshold}`;
    } else {
      evaluation.reason = `Value ${context.metricValue} does not meet condition ${operator} ${threshold}`;
    }

    return triggered;
  }

  private async evaluateAnomalyRule(rule: AlertRule, context: AlertContext, evaluation: AlertRuleEvaluation): Promise<boolean> {
    const cacheKey = `anomaly:${rule.id}:${context.qrCodeId || 'global'}`;
    
    // Get or initialize historical data
    if (!this.anomalyDetectionCache.has(cacheKey)) {
      const historicalData = await this.getHistoricalMetricData(
        context.metricType,
        context.qrCodeId,
        this.ANOMALY_WINDOW_SIZE
      );
      this.anomalyDetectionCache.set(cacheKey, historicalData);
    }

    const historicalData = this.anomalyDetectionCache.get(cacheKey)!;
    
    // Add current value
    historicalData.push(context.metricValue);
    if (historicalData.length > this.ANOMALY_WINDOW_SIZE) {
      historicalData.shift(); // Remove oldest value
    }

    // Detect anomaly using Z-score method
    const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) {
      evaluation.reason = 'Insufficient variance for anomaly detection';
      return false;
    }

    const zScore = Math.abs((context.metricValue - mean) / stdDev);
    const anomalyThreshold = (rule.conditions as any).sensitivity || 2.5; // Default Z-score threshold

    const isAnomaly = zScore > anomalyThreshold;

    if (isAnomaly) {
      evaluation.reason = `Z-score ${zScore.toFixed(2)} exceeds threshold ${anomalyThreshold}`;
    } else {
      evaluation.reason = `Z-score ${zScore.toFixed(2)} within normal range`;
    }

    return isAnomaly;
  }

  private async evaluateTrendRule(rule: AlertRule, context: AlertContext, evaluation: AlertRuleEvaluation): Promise<boolean> {
    const conditions = rule.conditions as any;
    const trendWindow = conditions.window_minutes || 30;
    const trendThreshold = conditions.trend_threshold || 0.2; // 20% change

    // Get trend data from the last window period
    const windowStart = new Date(Date.now() - trendWindow * 60 * 1000);
    const trendData = await this.getMetricTrendData(
      context.metricType,
      context.qrCodeId,
      windowStart,
      new Date()
    );

    if (trendData.length < 2) {
      evaluation.reason = 'Insufficient data for trend analysis';
      return false;
    }

    // Calculate trend slope
    const firstValue = trendData[0].value;
    const lastValue = trendData[trendData.length - 1].value;
    const trendChange = firstValue === 0 ? 0 : (lastValue - firstValue) / firstValue;

    const isSignificantTrend = Math.abs(trendChange) > trendThreshold;

    if (isSignificantTrend) {
      evaluation.reason = `Trend change ${(trendChange * 100).toFixed(2)}% exceeds threshold ${(trendThreshold * 100)}%`;
    } else {
      evaluation.reason = `Trend change ${(trendChange * 100).toFixed(2)}% within normal range`;
    }

    return isSignificantTrend;
  }

  private async handleTriggeredAlert(rule: AlertRule, context: AlertContext, evaluation: AlertRuleEvaluation): Promise<void> {
    try {
      this.logger.info('Handling triggered alert', { 
        ruleId: rule.id,
        ruleName: rule.name,
        metricValue: context.metricValue
      });

      // Create alert instance
      const alertInstance = await this.createAlertInstance(rule, context, evaluation);

      // Send notifications
      await this.sendAlertNotifications(alertInstance, rule);

      // Update rule trigger information
      await this.updateRuleTriggerInfo(rule.id);

      // Emit alert event
      this.emit('alert_triggered', {
        alertInstance,
        rule,
        context,
        evaluation,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to handle triggered alert', { 
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendAlertNotifications(alertInstance: AlertInstance, rule: AlertRule): Promise<void> {
    const notifications: Promise<void>[] = [];

    for (const channel of rule.notificationChannels) {
      switch (channel) {
        case 'email':
          notifications.push(this.sendEmailNotification(alertInstance, rule));
          break;
        case 'sms':
          notifications.push(this.sendSMSNotification(alertInstance, rule));
          break;
        case 'slack':
          notifications.push(this.sendSlackNotification(alertInstance, rule));
          break;
        case 'webhook':
          notifications.push(this.sendWebhookNotification(alertInstance, rule));
          break;
        default:
          this.logger.warn('Unknown notification channel', { channel, alertInstanceId: alertInstance.id });
      }
    }

    // Send all notifications in parallel
    const results = await Promise.allSettled(notifications);
    
    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error('Notification failed', { 
          alertInstanceId: alertInstance.id,
          channel: rule.notificationChannels[index],
          error: result.reason
        });
      }
    });
  }

  private async sendEmailNotification(alertInstance: AlertInstance, rule: AlertRule): Promise<void> {
    try {
      const user = await this.getUserById(rule.userId);
      if (!user || !user.email) {
        throw new Error('User email not found');
      }

      const emailSettings = rule.notificationSettings?.email || {};
      const template = emailSettings.template || 'alert_notification';

      await this.notificationService.sendEmail({
        to: user.email,
        subject: `🚨 Alert: ${alertInstance.title}`,
        template,
        templateData: {
          userName: user.full_name || user.email,
          alertTitle: alertInstance.title,
          alertMessage: alertInstance.message,
          severity: alertInstance.severity,
          triggerValue: alertInstance.triggerValue,
          thresholdValue: alertInstance.thresholdValue,
          qrCodeId: alertInstance.qrCodeId,
          triggeredAt: alertInstance.triggeredAt,
          ruleName: rule.name
        }
      });

      await this.recordNotification(alertInstance.id, 'email', user.email, 'sent');

    } catch (error) {
      await this.recordNotification(alertInstance.id, 'email', 'unknown', 'failed', 
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async sendSMSNotification(alertInstance: AlertInstance, rule: AlertRule): Promise<void> {
    try {
      const user = await this.getUserById(rule.userId);
      if (!user || !user.phone) {
        throw new Error('User phone number not found');
      }

      const message = `🚨 QR Alert: ${alertInstance.title}\n${alertInstance.message}\nValue: ${alertInstance.triggerValue}`;

      await this.notificationService.sendSMS({
        to: user.phone,
        message
      });

      await this.recordNotification(alertInstance.id, 'sms', user.phone, 'sent');

    } catch (error) {
      await this.recordNotification(alertInstance.id, 'sms', 'unknown', 'failed',
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async sendSlackNotification(alertInstance: AlertInstance, rule: AlertRule): Promise<void> {
    try {
      const slackSettings = rule.notificationSettings?.slack;
      if (!slackSettings?.webhook_url) {
        throw new Error('Slack webhook URL not configured');
      }

      const payload = {
        text: `🚨 QR Code Alert: ${alertInstance.title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Alert:* ${alertInstance.title}\n*Severity:* ${alertInstance.severity}\n*Message:* ${alertInstance.message}`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*QR Code:* ${alertInstance.qrCodeId || 'Global'}`
              },
              {
                type: 'mrkdwn',
                text: `*Value:* ${alertInstance.triggerValue}`
              },
              {
                type: 'mrkdwn',
                text: `*Threshold:* ${alertInstance.thresholdValue || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Time:* ${alertInstance.triggeredAt}`
              }
            ]
          }
        ]
      };

      await this.httpClient.post(slackSettings.webhook_url, payload);

      await this.recordNotification(alertInstance.id, 'slack', slackSettings.webhook_url, 'sent');

    } catch (error) {
      await this.recordNotification(alertInstance.id, 'slack', 'unknown', 'failed',
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async sendWebhookNotification(alertInstance: AlertInstance, rule: AlertRule): Promise<void> {
    try {
      const webhookSettings = rule.notificationSettings?.webhook;
      if (!webhookSettings?.url) {
        throw new Error('Webhook URL not configured');
      }

      const payload: WebhookPayload = {
        alertId: alertInstance.id,
        ruleName: rule.name,
        severity: alertInstance.severity,
        qrCodeId: alertInstance.qrCodeId,
        metricType: rule.metricType,
        triggerValue: alertInstance.triggerValue,
        thresholdValue: alertInstance.thresholdValue,
        message: alertInstance.message,
        timestamp: alertInstance.triggeredAt.toISOString(),
        context: alertInstance.contextData
      };

      const headers = webhookSettings.headers || {};
      if (webhookSettings.auth_token) {
        headers['Authorization'] = `Bearer ${webhookSettings.auth_token}`;
      }

      await this.httpClient.post(webhookSettings.url, payload, { headers });

      await this.recordNotification(alertInstance.id, 'webhook', webhookSettings.url, 'sent');

    } catch (error) {
      await this.recordNotification(alertInstance.id, 'webhook', 'unknown', 'failed',
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Listen for metric updates from Redis
    this.redis.on('message', async (channel: string, message: string) => {
      if (channel === 'analytics:metric_update') {
        try {
          const { qrCodeId, update } = JSON.parse(message);
          
          const context: AlertContext = {
            qrCodeId,
            userId: '', // Will be set based on alert rule
            metricValue: update.value,
            metricType: update.metricType,
            timestamp: new Date(update.timestamp),
            additionalData: update.metadata
          };

          await this.evaluateMetric(context);

        } catch (error) {
          this.logger.error('Failed to process metric update', { 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });
  }

  // Database operation methods (implementation depends on your database setup)
  private async saveAlertRule(rule: AlertRule): Promise<void> {
    // Implementation would save to alert_rules table
    // This is a placeholder - implement based on your database layer
  }

  private async getAlertRuleById(id: string): Promise<AlertRule | null> {
    // Implementation would query alert_rules table
    return null;
  }

  private async updateAlertRuleInDatabase(rule: AlertRule): Promise<void> {
    // Implementation would update alert_rules table
  }

  private async deleteAlertRuleFromDatabase(id: string): Promise<void> {
    // Implementation would delete from alert_rules table
  }

  private async createAlertInstance(rule: AlertRule, context: AlertContext, evaluation: AlertRuleEvaluation): Promise<AlertInstance> {
    const alertInstance: AlertInstance = {
      id: `alert_instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertRuleId: rule.id,
      qrCodeId: context.qrCodeId,
      status: 'active',
      severity: rule.severity,
      title: `${rule.name} Alert`,
      message: this.generateAlertMessage(rule, context, evaluation),
      triggerValue: context.metricValue,
      thresholdValue: evaluation.thresholdValue,
      metricData: { metricType: context.metricType, value: context.metricValue },
      contextData: context.additionalData || {},
      triggeredAt: new Date()
    };

    // Save to database
    // Implementation would save to alert_instances table

    return alertInstance;
  }

  private generateAlertMessage(rule: AlertRule, context: AlertContext, evaluation: AlertRuleEvaluation): string {
    const qrCodePart = context.qrCodeId ? `for QR Code ${context.qrCodeId}` : 'globally';
    return `${rule.metricType} alert triggered ${qrCodePart}. ${evaluation.reason}`;
  }

  private async refreshAlertRulesCache(): Promise<void> {
    // Implementation would load all active alert rules from database
    this.alertRulesCache.clear();
    // Load rules and populate cache
  }

  private async subscribeToMetricUpdates(): Promise<void> {
    await this.redis.subscribe('analytics:metric_update');
  }

  private async evaluateAllAlertRules(): Promise<void> {
    // Implementation would evaluate all cached rules against recent metrics
  }

  private async isRuleOutOfCooldown(rule: AlertRule): Promise<boolean> {
    if (!rule.lastTriggered) return true;
    
    const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000);
    return new Date() > cooldownEnd;
  }

  private async getHistoricalMetricData(metricType: string, qrCodeId?: string, limit: number = 100): Promise<number[]> {
    // Implementation would query historical metric data
    return [];
  }

  private async getMetricTrendData(metricType: string, qrCodeId: string | undefined, startTime: Date, endTime: Date): Promise<Array<{ timestamp: Date; value: number }>> {
    // Implementation would query trend data
    return [];
  }

  private async getUserById(userId: string): Promise<{ id: string; email: string; phone?: string; full_name?: string } | null> {
    // Implementation would query user data
    return null;
  }

  private async recordNotification(alertInstanceId: string, channel: string, recipient: string, status: string, errorMessage?: string): Promise<void> {
    // Implementation would save to alert_notifications table
  }

  private async updateRuleTriggerInfo(ruleId: string): Promise<void> {
    // Implementation would update last_triggered and triggered_count
  }

  private async getActiveAlertsFromDatabase(userId: string, filters?: any): Promise<AlertInstance[]> {
    // Implementation would query alert_instances table
    return [];
  }

  private async updateAlertAcknowledgment(alertInstanceId: string, userId: string, notes?: string): Promise<void> {
    // Implementation would update alert acknowledgment
  }

  private async updateAlertResolution(alertInstanceId: string, userId: string, resolutionNotes?: string): Promise<void> {
    // Implementation would update alert resolution
  }

  private validateAlertRuleRequest(request: any): { isValid: boolean; error?: string } {
    if (!request.name) return { isValid: false, error: 'Rule name is required' };
    if (!request.metricType) return { isValid: false, error: 'Metric type is required' };
    if (!request.ruleType) return { isValid: false, error: 'Rule type is required' };
    if (!request.conditions) return { isValid: false, error: 'Rule conditions are required' };
    if (!request.userId) return { isValid: false, error: 'User ID is required' };
    
    return { isValid: true };
  }
}