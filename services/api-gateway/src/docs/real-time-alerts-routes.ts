/**
 * @swagger
 * components:
 *   schemas:
 *     AlertRule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique alert rule identifier
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: Owner user ID
 *         name:
 *           type: string
 *           description: Alert rule name
 *           example: "High Scan Volume Alert"
 *         description:
 *           type: string
 *           description: Alert rule description
 *           example: "Trigger when QR scans exceed 1000 per hour"
 *         metric_type:
 *           type: string
 *           enum: [scan_count, conversion_rate, error_rate, unique_visitors, revenue]
 *           description: Metric to monitor
 *         threshold_value:
 *           type: number
 *           description: Threshold value that triggers alert
 *           example: 1000
 *         comparison_operator:
 *           type: string
 *           enum: [greater_than, less_than, equal_to, not_equal_to, greater_than_or_equal, less_than_or_equal]
 *         time_window:
 *           type: integer
 *           description: Time window in minutes for evaluation
 *           example: 60
 *         conditions:
 *           type: object
 *           description: Additional conditions and filters
 *           properties:
 *             qr_codes:
 *               type: array
 *               items:
 *                 type: string
 *                 format: uuid
 *               description: Specific QR codes to monitor
 *             campaigns:
 *               type: array
 *               items:
 *                 type: string
 *                 format: uuid
 *               description: Specific campaigns to monitor
 *             geographic_filters:
 *               type: object
 *               properties:
 *                 countries:
 *                   type: array
 *                   items:
 *                     type: string
 *                 regions:
 *                   type: array
 *                   items:
 *                     type: string
 *         notification_channels:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, sms, webhook, slack, teams]
 *               config:
 *                 type: object
 *                 description: Channel-specific configuration
 *         is_active:
 *           type: boolean
 *           description: Whether alert rule is active
 *         cooldown_period:
 *           type: integer
 *           description: Minimum time between alerts in minutes
 *           example: 30
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     AlertInstance:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         alert_rule_id:
 *           type: string
 *           format: uuid
 *         triggered_at:
 *           type: string
 *           format: date-time
 *         metric_value:
 *           type: number
 *           description: Actual value that triggered the alert
 *         threshold_value:
 *           type: number
 *           description: Threshold that was exceeded
 *         status:
 *           type: string
 *           enum: [active, acknowledged, resolved, suppressed]
 *         message:
 *           type: string
 *           description: Generated alert message
 *         context_data:
 *           type: object
 *           description: Additional context about the alert
 *         acknowledged_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         acknowledged_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         resolved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         notifications_sent:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               channel_type:
 *                 type: string
 *               sent_at:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [sent, failed, pending]
 * 
 *     AlertMetrics:
 *       type: object
 *       properties:
 *         total_alerts:
 *           type: integer
 *           description: Total number of alerts triggered
 *         alerts_by_severity:
 *           type: object
 *           properties:
 *             low:
 *               type: integer
 *             medium:
 *               type: integer
 *             high:
 *               type: integer
 *             critical:
 *               type: integer
 *         average_resolution_time:
 *           type: number
 *           description: Average time to resolve alerts in minutes
 *         false_positive_rate:
 *           type: number
 *           description: Percentage of alerts that were false positives
 *         top_triggered_rules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               rule_name:
 *                 type: string
 *               count:
 *                 type: integer
 */

/**
 * @swagger
 * /api/analytics/alerts/rules:
 *   get:
 *     summary: Get user's alert rules
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by rule status
 *       - in: query
 *         name: metric_type
 *         schema:
 *           type: string
 *           enum: [scan_count, conversion_rate, error_rate, unique_visitors, revenue]
 *         description: Filter by metric type
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity level
 *     responses:
 *       200:
 *         description: List of alert rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AlertRule'
 *   post:
 *     summary: Create new alert rule
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - metric_type
 *               - threshold_value
 *               - comparison_operator
 *               - notification_channels
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Conversion Rate Drop Alert"
 *               description:
 *                 type: string
 *                 example: "Alert when conversion rate drops below 2%"
 *               metric_type:
 *                 type: string
 *                 enum: [scan_count, conversion_rate, error_rate, unique_visitors, revenue]
 *               threshold_value:
 *                 type: number
 *                 example: 2.0
 *               comparison_operator:
 *                 type: string
 *                 enum: [greater_than, less_than, equal_to, not_equal_to, greater_than_or_equal, less_than_or_equal]
 *               time_window:
 *                 type: integer
 *                 default: 60
 *                 description: Time window in minutes
 *               conditions:
 *                 type: object
 *               notification_channels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [email, sms, webhook, slack, teams]
 *                     config:
 *                       type: object
 *               cooldown_period:
 *                 type: integer
 *                 default: 30
 *                 description: Cooldown period in minutes
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Alert rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertRule'
 */

/**
 * @swagger
 * /api/analytics/alerts/rules/{ruleId}:
 *   get:
 *     summary: Get alert rule details
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alert rule ID
 *     responses:
 *       200:
 *         description: Alert rule details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertRule'
 *   put:
 *     summary: Update alert rule
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               threshold_value:
 *                 type: number
 *               comparison_operator:
 *                 type: string
 *                 enum: [greater_than, less_than, equal_to, not_equal_to, greater_than_or_equal, less_than_or_equal]
 *               time_window:
 *                 type: integer
 *               conditions:
 *                 type: object
 *               notification_channels:
 *                 type: array
 *                 items:
 *                   type: object
 *               is_active:
 *                 type: boolean
 *               cooldown_period:
 *                 type: integer
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: Alert rule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertRule'
 *   delete:
 *     summary: Delete alert rule
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Alert rule deleted successfully
 */

/**
 * @swagger
 * /api/analytics/alerts:
 *   get:
 *     summary: Get active alerts
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, acknowledged, resolved, suppressed]
 *         description: Filter by alert status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter alerts from this date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter alerts until this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Number of alerts to return
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AlertInstance'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */

/**
 * @swagger
 * /api/analytics/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Acknowledge an alert
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alert instance ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional acknowledgment notes
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertInstance'
 */

/**
 * @swagger
 * /api/analytics/alerts/{alertId}/resolve:
 *   post:
 *     summary: Resolve an alert
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alert instance ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution_notes:
 *                 type: string
 *                 description: Optional resolution notes
 *               root_cause:
 *                 type: string
 *                 description: Identified root cause
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertInstance'
 */

/**
 * @swagger
 * /api/analytics/alerts/metrics:
 *   get:
 *     summary: Get alert system metrics
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d]
 *           default: 7d
 *         description: Time range for metrics
 *     responses:
 *       200:
 *         description: Alert system metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertMetrics'
 */

/**
 * @swagger
 * /api/analytics/alerts/test:
 *   post:
 *     summary: Test alert rule configuration
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metric_type
 *               - threshold_value
 *               - comparison_operator
 *               - notification_channels
 *             properties:
 *               metric_type:
 *                 type: string
 *                 enum: [scan_count, conversion_rate, error_rate, unique_visitors, revenue]
 *               threshold_value:
 *                 type: number
 *               comparison_operator:
 *                 type: string
 *                 enum: [greater_than, less_than, equal_to, not_equal_to, greater_than_or_equal, less_than_or_equal]
 *               time_window:
 *                 type: integer
 *                 default: 60
 *               conditions:
 *                 type: object
 *               notification_channels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [email, sms, webhook, slack, teams]
 *                     config:
 *                       type: object
 *     responses:
 *       200:
 *         description: Test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     would_trigger:
 *                       type: boolean
 *                       description: Whether rule would trigger with current data
 *                     current_value:
 *                       type: number
 *                       description: Current metric value
 *                     threshold_comparison:
 *                       type: string
 *                       description: Result of threshold comparison
 *                     test_notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           channel_type:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [success, failed, not_configured]
 *                           message:
 *                             type: string
 */