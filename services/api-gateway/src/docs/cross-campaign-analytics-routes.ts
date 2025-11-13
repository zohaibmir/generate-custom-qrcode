/**
 * @swagger
 * components:
 *   schemas:
 *     CampaignGroup:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique campaign group identifier
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: Owner user ID
 *         name:
 *           type: string
 *           description: Campaign group name
 *           example: "Summer 2024 Campaign"
 *         description:
 *           type: string
 *           description: Campaign group description
 *           example: "Summer marketing campaign with multiple channels"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     CampaignVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         campaign_group_id:
 *           type: string
 *           format: uuid
 *         qr_code_id:
 *           type: string
 *           format: uuid
 *         variant_name:
 *           type: string
 *           example: "QR_V1"
 *         variant_type:
 *           type: string
 *           enum: [control, test]
 *         traffic_allocation:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of traffic allocated to this variant
 *         status:
 *           type: string
 *           enum: [active, paused, completed]
 *         created_at:
 *           type: string
 *           format: date-time
 * 
 *     ABExperiment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         campaign_group_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Landing Page A/B Test"
 *         hypothesis:
 *           type: string
 *           description: Experiment hypothesis
 *         control_variant_id:
 *           type: string
 *           format: uuid
 *         test_variant_id:
 *           type: string
 *           format: uuid
 *         metric_type:
 *           type: string
 *           enum: [conversion_rate, click_rate, engagement_rate, revenue]
 *         target_sample_size:
 *           type: integer
 *         confidence_level:
 *           type: number
 *           default: 0.95
 *         status:
 *           type: string
 *           enum: [draft, running, completed, paused]
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 * 
 *     CohortAnalysis:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         campaign_group_id:
 *           type: string
 *           format: uuid
 *         cohort_period:
 *           type: string
 *           enum: [weekly, monthly, quarterly]
 *         retention_periods:
 *           type: array
 *           items:
 *             type: integer
 *           description: Number of periods to track retention
 *         baseline_metric:
 *           type: string
 *           enum: [first_scan, conversion, signup]
 *         created_at:
 *           type: string
 *           format: date-time
 * 
 *     AttributionModel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Last Touch Attribution"
 *         model_type:
 *           type: string
 *           enum: [first_touch, last_touch, linear, time_decay, position_based, data_driven]
 *         lookback_window_days:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         weights:
 *           type: object
 *           description: Attribution weights configuration
 *         status:
 *           type: string
 *           enum: [active, inactive]
 * 
 *     CrossCampaignComparison:
 *       type: object
 *       properties:
 *         campaign_groups:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               metrics:
 *                 type: object
 *                 properties:
 *                   total_scans:
 *                     type: integer
 *                   unique_visitors:
 *                     type: integer
 *                   conversion_rate:
 *                     type: number
 *                   cost_per_acquisition:
 *                     type: number
 *                   return_on_investment:
 *                     type: number
 *         comparison_metrics:
 *           type: object
 *           properties:
 *             best_performing:
 *               type: string
 *               format: uuid
 *               description: ID of best performing campaign
 *             performance_gaps:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   metric:
 *                     type: string
 *                   gap_percentage:
 *                     type: number
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *           description: Performance improvement recommendations
 * 
 *     StatisticalTestResult:
 *       type: object
 *       properties:
 *         test_type:
 *           type: string
 *           enum: [chi_square, t_test, mann_whitney, anova]
 *         p_value:
 *           type: number
 *           description: P-value of the statistical test
 *         confidence_interval:
 *           type: object
 *           properties:
 *             lower_bound:
 *               type: number
 *             upper_bound:
 *               type: number
 *             confidence_level:
 *               type: number
 *         effect_size:
 *           type: number
 *           description: Effect size measure
 *         is_significant:
 *           type: boolean
 *           description: Whether the result is statistically significant
 *         interpretation:
 *           type: string
 *           description: Human-readable interpretation of the test result
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/groups:
 *   get:
 *     summary: Get all campaign groups for the user
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of groups per page
 *     responses:
 *       200:
 *         description: List of campaign groups
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
 *                     $ref: '#/components/schemas/CampaignGroup'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *   post:
 *     summary: Create a new campaign group
 *     tags: [Cross-Campaign Analytics]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Holiday 2024 Campaign"
 *               description:
 *                 type: string
 *                 example: "Holiday season marketing campaign"
 *     responses:
 *       201:
 *         description: Campaign group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CampaignGroup'
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/groups/{groupId}/variants:
 *   get:
 *     summary: Get variants for a campaign group
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Campaign group ID
 *     responses:
 *       200:
 *         description: List of campaign variants
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
 *                     $ref: '#/components/schemas/CampaignVariant'
 *   post:
 *     summary: Add a QR code variant to campaign group
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *             required:
 *               - qr_code_id
 *               - variant_name
 *               - variant_type
 *             properties:
 *               qr_code_id:
 *                 type: string
 *                 format: uuid
 *               variant_name:
 *                 type: string
 *                 example: "QR_V1_Mobile"
 *               variant_type:
 *                 type: string
 *                 enum: [control, test]
 *               traffic_allocation:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 50
 *     responses:
 *       201:
 *         description: Variant added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CampaignVariant'
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/compare:
 *   post:
 *     summary: Compare performance across multiple campaigns
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_group_ids
 *               - metrics
 *               - date_range
 *             properties:
 *               campaign_group_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 2
 *                 maxItems: 10
 *                 description: Campaign group IDs to compare
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [scans, conversions, click_rate, conversion_rate, cost_per_acquisition, return_on_investment]
 *                 description: Metrics to compare
 *               date_range:
 *                 type: object
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *               include_recommendations:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to include optimization recommendations
 *     responses:
 *       200:
 *         description: Campaign comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CrossCampaignComparison'
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/experiments:
 *   get:
 *     summary: Get A/B experiments for user
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, running, completed, paused]
 *         description: Filter by experiment status
 *       - in: query
 *         name: campaign_group_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by campaign group
 *     responses:
 *       200:
 *         description: List of A/B experiments
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
 *                     $ref: '#/components/schemas/ABExperiment'
 *   post:
 *     summary: Create a new A/B experiment
 *     tags: [Cross-Campaign Analytics]
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
 *               - campaign_group_id
 *               - control_variant_id
 *               - test_variant_id
 *               - metric_type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Landing Page CTA Test"
 *               hypothesis:
 *                 type: string
 *                 example: "Red CTA button will increase conversions by 15%"
 *               campaign_group_id:
 *                 type: string
 *                 format: uuid
 *               control_variant_id:
 *                 type: string
 *                 format: uuid
 *               test_variant_id:
 *                 type: string
 *                 format: uuid
 *               metric_type:
 *                 type: string
 *                 enum: [conversion_rate, click_rate, engagement_rate, revenue]
 *               target_sample_size:
 *                 type: integer
 *                 minimum: 100
 *               confidence_level:
 *                 type: number
 *                 minimum: 0.8
 *                 maximum: 0.99
 *                 default: 0.95
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: A/B experiment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ABExperiment'
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/experiments/{experimentId}/results:
 *   get:
 *     summary: Get A/B experiment results with statistical analysis
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experimentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: A/B experiment ID
 *     responses:
 *       200:
 *         description: Experiment results with statistical analysis
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
 *                     experiment:
 *                       $ref: '#/components/schemas/ABExperiment'
 *                     control_metrics:
 *                       type: object
 *                       properties:
 *                         participants:
 *                           type: integer
 *                         conversions:
 *                           type: integer
 *                         conversion_rate:
 *                           type: number
 *                         revenue:
 *                           type: number
 *                     test_metrics:
 *                       type: object
 *                       properties:
 *                         participants:
 *                           type: integer
 *                         conversions:
 *                           type: integer
 *                         conversion_rate:
 *                           type: number
 *                         revenue:
 *                           type: number
 *                     statistical_analysis:
 *                       $ref: '#/components/schemas/StatisticalTestResult'
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                     sample_size_analysis:
 *                       type: object
 *                       properties:
 *                         current_size:
 *                           type: integer
 *                         target_size:
 *                           type: integer
 *                         completion_percentage:
 *                           type: number
 *                         estimated_days_remaining:
 *                           type: integer
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/cohort:
 *   post:
 *     summary: Generate cohort analysis for campaign groups
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_group_ids
 *               - cohort_period
 *               - retention_periods
 *             properties:
 *               campaign_group_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               cohort_period:
 *                 type: string
 *                 enum: [weekly, monthly, quarterly]
 *               retention_periods:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *                 maxItems: 12
 *                 description: Number of periods to analyze
 *               baseline_metric:
 *                 type: string
 *                 enum: [first_scan, conversion, signup]
 *                 default: first_scan
 *     responses:
 *       200:
 *         description: Cohort analysis results
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
 *                     cohort_analysis:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cohort_period:
 *                             type: string
 *                             format: date
 *                           initial_size:
 *                             type: integer
 *                           retention_rates:
 *                             type: array
 *                             items:
 *                               type: number
 *                           campaign_breakdown:
 *                             type: object
 *                             additionalProperties:
 *                               type: object
 *                               properties:
 *                                 size:
 *                                   type: integer
 *                                 retention_rates:
 *                                   type: array
 *                                   items:
 *                                     type: number
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/attribution:
 *   get:
 *     summary: Get attribution models
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of attribution models
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
 *                     $ref: '#/components/schemas/AttributionModel'
 *   post:
 *     summary: Create custom attribution model
 *     tags: [Cross-Campaign Analytics]
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
 *               - model_type
 *               - lookback_window_days
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Custom Time Decay Model"
 *               model_type:
 *                 type: string
 *                 enum: [first_touch, last_touch, linear, time_decay, position_based, data_driven]
 *               lookback_window_days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *               weights:
 *                 type: object
 *                 description: Attribution weights configuration
 *     responses:
 *       201:
 *         description: Attribution model created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AttributionModel'
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/attribution/{modelId}/analysis:
 *   post:
 *     summary: Run attribution analysis using specified model
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Attribution model ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_group_ids
 *               - conversion_events
 *               - date_range
 *             properties:
 *               campaign_group_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               conversion_events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [scan, click, signup, purchase, download]
 *               date_range:
 *                 type: object
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Attribution analysis results
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
 *                     attribution_results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           campaign_group_id:
 *                             type: string
 *                             format: uuid
 *                           attributed_conversions:
 *                             type: number
 *                           attribution_percentage:
 *                             type: number
 *                           contribution_by_touchpoint:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 touchpoint_position:
 *                                   type: integer
 *                                 attribution_weight:
 *                                   type: number
 *                     model_performance:
 *                       type: object
 *                       properties:
 *                         total_conversions_analyzed:
 *                           type: integer
 *                         average_path_length:
 *                           type: number
 *                         model_confidence:
 *                           type: number
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/funnel:
 *   post:
 *     summary: Analyze conversion funnel across campaigns
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_group_ids
 *               - funnel_steps
 *               - date_range
 *             properties:
 *               campaign_group_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               funnel_steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     step_name:
 *                       type: string
 *                       example: "QR Scan"
 *                     event_type:
 *                       type: string
 *                       enum: [scan, click, signup, purchase, download]
 *                     step_order:
 *                       type: integer
 *               date_range:
 *                 type: object
 *                 properties:
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   end_date:
 *                     type: string
 *                     format: date
 *               segment_by:
 *                 type: string
 *                 enum: [device, location, source, campaign]
 *                 description: Optional segmentation dimension
 *     responses:
 *       200:
 *         description: Funnel analysis results
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
 *                     funnel_analysis:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           campaign_group_id:
 *                             type: string
 *                             format: uuid
 *                           campaign_name:
 *                             type: string
 *                           funnel_steps:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 step_name:
 *                                   type: string
 *                                 users:
 *                                   type: integer
 *                                 conversion_rate:
 *                                   type: number
 *                                 drop_off_rate:
 *                                   type: number
 *                     optimization_opportunities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           campaign_group_id:
 *                             type: string
 *                             format: uuid
 *                           step_name:
 *                             type: string
 *                           issue_type:
 *                             type: string
 *                             enum: [high_drop_off, low_conversion, bottleneck]
 *                           improvement_potential:
 *                             type: number
 *                           recommendations:
 *                             type: array
 *                             items:
 *                               type: string
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/optimization:
 *   post:
 *     summary: Get AI-powered campaign optimization recommendations
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_group_ids
 *               - optimization_goals
 *             properties:
 *               campaign_group_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               optimization_goals:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [increase_conversions, reduce_costs, improve_engagement, maximize_roi]
 *               constraints:
 *                 type: object
 *                 properties:
 *                   budget_limit:
 *                     type: number
 *                   time_frame:
 *                     type: string
 *                     enum: [1_week, 1_month, 3_months, 6_months]
 *                   min_confidence_level:
 *                     type: number
 *                     minimum: 0.8
 *                     maximum: 0.99
 *     responses:
 *       200:
 *         description: Optimization recommendations
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
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           campaign_group_id:
 *                             type: string
 *                             format: uuid
 *                           recommendation_type:
 *                             type: string
 *                             enum: [budget_reallocation, variant_optimization, audience_targeting, timing_adjustment]
 *                           priority:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           expected_impact:
 *                             type: object
 *                             properties:
 *                               metric:
 *                                 type: string
 *                               improvement_percentage:
 *                                 type: number
 *                           implementation_effort:
 *                             type: string
 *                             enum: [low, medium, high]
 *                           description:
 *                             type: string
 *                           action_items:
 *                             type: array
 *                             items:
 *                               type: string
 *                           confidence_score:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                     overall_strategy:
 *                       type: object
 *                       properties:
 *                         recommended_focus:
 *                           type: string
 *                         expected_roi_improvement:
 *                           type: number
 *                         timeline:
 *                           type: string
 *                         key_success_metrics:
 *                           type: array
 *                           items:
 *                             type: string
 */

/**
 * @swagger
 * /api/analytics/cross-campaign/statistical-tests:
 *   post:
 *     summary: Run statistical significance tests between campaigns
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - test_type
 *               - campaign_data
 *               - metric
 *             properties:
 *               test_type:
 *                 type: string
 *                 enum: [chi_square, t_test, mann_whitney, anova]
 *               campaign_data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     campaign_group_id:
 *                       type: string
 *                       format: uuid
 *                     sample_size:
 *                       type: integer
 *                     success_events:
 *                       type: integer
 *                     metric_values:
 *                       type: array
 *                       items:
 *                         type: number
 *               metric:
 *                 type: string
 *                 enum: [conversion_rate, click_rate, revenue_per_visitor, engagement_rate]
 *               confidence_level:
 *                 type: number
 *                 minimum: 0.8
 *                 maximum: 0.99
 *                 default: 0.95
 *     responses:
 *       200:
 *         description: Statistical test results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StatisticalTestResult'
 */