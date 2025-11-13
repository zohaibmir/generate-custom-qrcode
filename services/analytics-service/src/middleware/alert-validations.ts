import { body, param, query, ValidationChain } from 'express-validator';

// Alert Rule Validations
export const createAlertRuleValidation: ValidationChain[] = [
  body('name')
    .notEmpty()
    .withMessage('Alert rule name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Alert rule name must be between 3 and 255 characters'),

  body('ruleType')
    .isIn(['threshold', 'anomaly', 'trend', 'custom'])
    .withMessage('Rule type must be one of: threshold, anomaly, trend, custom'),

  body('metricType')
    .notEmpty()
    .withMessage('Metric type is required')
    .isLength({ max: 100 })
    .withMessage('Metric type must be less than 100 characters'),

  body('conditions')
    .isObject()
    .withMessage('Conditions must be a valid object')
    .custom((value, { req }) => {
      const ruleType = req.body.ruleType;
      
      if (ruleType === 'threshold') {
        if (!value.operator || !value.threshold) {
          throw new Error('Threshold rules require operator and threshold in conditions');
        }
        
        const validOperators = ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equals', 'not_equals'];
        if (!validOperators.includes(value.operator)) {
          throw new Error('Invalid operator for threshold rule');
        }
        
        if (typeof value.threshold !== 'number') {
          throw new Error('Threshold value must be a number');
        }
      }
      
      if (ruleType === 'anomaly') {
        if (value.sensitivity && (typeof value.sensitivity !== 'number' || value.sensitivity < 0 || value.sensitivity > 1)) {
          throw new Error('Anomaly sensitivity must be a number between 0 and 1');
        }
      }
      
      return true;
    }),

  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be one of: low, medium, high, critical'),

  body('cooldownMinutes')
    .optional()
    .isInt({ min: 1, max: 10080 }) // Max 1 week
    .withMessage('Cooldown must be between 1 and 10080 minutes'),

  body('aggregationWindow')
    .optional()
    .isInt({ min: 1, max: 1440 }) // Max 24 hours
    .withMessage('Aggregation window must be between 1 and 1440 minutes'),

  body('notificationChannels')
    .optional()
    .isArray()
    .withMessage('Notification channels must be an array')
    .custom((channels) => {
      const validChannels = ['email', 'sms', 'slack', 'webhook'];
      if (!Array.isArray(channels) || !channels.every(channel => validChannels.includes(channel))) {
        throw new Error('Invalid notification channels');
      }
      return true;
    }),

  body('qrCodeId')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('QR Code ID must be between 1 and 255 characters'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('notificationSettings')
    .optional()
    .isObject()
    .withMessage('Notification settings must be a valid object')
];

export const updateAlertRuleValidation: ValidationChain[] = [
  param('alertRuleId')
    .notEmpty()
    .withMessage('Alert rule ID is required'),

  body('name')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('Alert rule name must be between 3 and 255 characters'),

  body('ruleType')
    .optional()
    .isIn(['threshold', 'anomaly', 'trend', 'custom'])
    .withMessage('Rule type must be one of: threshold, anomaly, trend, custom'),

  body('metricType')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Metric type must be less than 100 characters'),

  body('conditions')
    .optional()
    .isObject()
    .withMessage('Conditions must be a valid object'),

  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be one of: low, medium, high, critical'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('cooldownMinutes')
    .optional()
    .isInt({ min: 1, max: 10080 })
    .withMessage('Cooldown must be between 1 and 10080 minutes'),

  body('aggregationWindow')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Aggregation window must be between 1 and 1440 minutes'),

  body('notificationChannels')
    .optional()
    .isArray()
    .withMessage('Notification channels must be an array'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('notificationSettings')
    .optional()
    .isObject()
    .withMessage('Notification settings must be a valid object')
];

export const testAlertRuleValidation: ValidationChain[] = [
  body('metricType')
    .notEmpty()
    .withMessage('Metric type is required for testing'),

  body('metricValue')
    .isNumeric()
    .withMessage('Metric value must be a number'),

  body('qrCodeId')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('QR Code ID must be between 1 and 255 characters')
];

export const getActiveAlertsValidation: ValidationChain[] = [
  query('qrCodeId')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('QR Code ID must be between 1 and 255 characters'),

  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be one of: low, medium, high, critical'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export const acknowledgeAlertValidation: ValidationChain[] = [
  param('alertInstanceId')
    .notEmpty()
    .withMessage('Alert instance ID is required'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

export const resolveAlertValidation: ValidationChain[] = [
  param('alertInstanceId')
    .notEmpty()
    .withMessage('Alert instance ID is required'),

  body('resolutionNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Resolution notes must be less than 1000 characters')
];