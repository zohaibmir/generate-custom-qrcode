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
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, paused, completed]
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 *         created_by:
 *           type: string
 *         metadata:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
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
 *         description:
 *           type: string
 *         hypothesis:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, running, paused, completed]
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 *         sample_size_target:
 *           type: number
 *         confidence_level:
 *           type: number
 *         expected_improvement:
 *           type: number
 *         primary_metric:
 *           type: string
 *         secondary_metrics:
 *           type: array
 *           items:
 *             type: string
 *         created_by:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
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
 *         type:
 *           type: string
 *           enum: [first_touch, last_touch, linear, time_decay, position_based, data_driven]
 *         configuration:
 *           type: object
 *         description:
 *           type: string
 *         is_default:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     StatisticalTest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         experiment_id:
 *           type: string
 *           format: uuid
 *         test_type:
 *           type: string
 *           enum: [ttest, chi_square, mann_whitney, bayesian, anova]
 *         control_group_id:
 *           type: string
 *         test_group_id:
 *           type: string
 *         metric_name:
 *           type: string
 *         control_value:
 *           type: number
 *         test_value:
 *           type: number
 *         p_value:
 *           type: number
 *         confidence_interval_lower:
 *           type: number
 *         confidence_interval_upper:
 *           type: number
 *         effect_size:
 *           type: number
 *         statistical_power:
 *           type: number
 *         is_significant:
 *           type: boolean
 *         test_results:
 *           type: object
 *         calculated_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/cross-campaign/campaign-groups:
 *   post:
 *     summary: Create a new campaign group for cross-campaign analysis
 *     tags: [Cross-Campaign Analysis]
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
 *               - status
 *               - start_date
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Holiday Campaign 2024"
 *               description:
 *                 type: string
 *                 example: "Cross-channel holiday marketing campaign"
 *               status:
 *                 type: string
 *                 enum: [active, paused, completed]
 *                 example: "active"
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-01T00:00:00Z"
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T23:59:59Z"
 *               metadata:
 *                 type: object
 *                 example: { "budget": 10000, "target_audience": "millennials" }
 *     responses:
 *       201:
 *         description: Campaign group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CampaignGroup'
 *   get:
 *     summary: Get campaign groups with filtering and pagination
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, paused, completed]
 *         description: Filter by campaign status
 *       - in: query
 *         name: created_by
 *         schema:
 *           type: string
 *         description: Filter by creator
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date (from)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date (to)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of campaign groups
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         campaign_groups:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CampaignGroup'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             current_page:
 *                               type: integer
 *                             total_pages:
 *                               type: integer
 *                             total_items:
 *                               type: integer
 *                             items_per_page:
 *                               type: integer
 */

/**
 * @swagger
 * /api/cross-campaign/campaign-groups/{id}:
 *   get:
 *     summary: Get campaign group details with variants and experiments
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Campaign group ID
 *     responses:
 *       200:
 *         description: Campaign group details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         campaign_group:
 *                           $ref: '#/components/schemas/CampaignGroup'
 *                         variants:
 *                           type: array
 *                           items:
 *                             type: object
 *                         experiments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ABExperiment'
 *       404:
 *         description: Campaign group not found
 */

/**
 * @swagger
 * /api/cross-campaign/ab-experiments:
 *   post:
 *     summary: Create a new A/B experiment
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_group_id
 *               - name
 *               - hypothesis
 *               - start_date
 *               - confidence_level
 *               - primary_metric
 *             properties:
 *               campaign_group_id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 example: "Button Color Test"
 *               description:
 *                 type: string
 *                 example: "Testing red vs blue CTA buttons"
 *               hypothesis:
 *                 type: string
 *                 example: "Red button will increase conversion rate by 10%"
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               sample_size_target:
 *                 type: number
 *                 example: 1000
 *               confidence_level:
 *                 type: number
 *                 example: 0.95
 *               expected_improvement:
 *                 type: number
 *                 example: 0.1
 *               primary_metric:
 *                 type: string
 *                 example: "conversion_rate"
 *               secondary_metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["click_through_rate", "bounce_rate"]
 *     responses:
 *       201:
 *         description: A/B experiment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ABExperiment'
 */

/**
 * @swagger
 * /api/cross-campaign/ab-experiments/{experimentId}/results:
 *   get:
 *     summary: Get A/B experiment results with statistical analysis
 *     tags: [Cross-Campaign Analysis]
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
 *         description: A/B experiment results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         experiment:
 *                           $ref: '#/components/schemas/ABExperiment'
 *                         variants:
 *                           type: array
 *                           items:
 *                             type: object
 *                         performance:
 *                           type: array
 *                           items:
 *                             type: object
 *                         statisticalTests:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/StatisticalTest'
 *                         significance:
 *                           type: boolean
 *                         winner:
 *                           type: string
 *                         insights:
 *                           type: array
 *                           items:
 *                             type: string
 *       404:
 *         description: Experiment not found
 */

/**
 * @swagger
 * /api/cross-campaign/statistical-tests:
 *   post:
 *     summary: Perform statistical test on experiment data
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - experimentId
 *               - testType
 *               - controlGroupId
 *               - testGroupId
 *               - metricName
 *             properties:
 *               experimentId:
 *                 type: string
 *                 format: uuid
 *               testType:
 *                 type: string
 *                 enum: [ttest, chi_square, mann_whitney, bayesian, anova]
 *               controlGroupId:
 *                 type: string
 *               testGroupId:
 *                 type: string
 *               metricName:
 *                 type: string
 *                 example: "conversion_rate"
 *     responses:
 *       200:
 *         description: Statistical test completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/StatisticalTest'
 */

/**
 * @swagger
 * /api/cross-campaign/attribution-models:
 *   post:
 *     summary: Create a new attribution model
 *     tags: [Cross-Campaign Analysis]
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
 *               - type
 *               - configuration
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Time Decay Attribution"
 *               type:
 *                 type: string
 *                 enum: [first_touch, last_touch, linear, time_decay, position_based, data_driven]
 *               configuration:
 *                 type: object
 *                 example: { "decay_rate": 0.6, "lookback_window": 30 }
 *               description:
 *                 type: string
 *                 example: "Attribution model with exponential time decay"
 *               is_default:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Attribution model created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AttributionModel'
 *   get:
 *     summary: Get all attribution models
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of attribution models
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AttributionModel'
 */

/**
 * @swagger
 * /api/cross-campaign/campaign-groups/{campaignGroupId}/attribution-analysis:
 *   post:
 *     summary: Run attribution analysis for campaign group
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignGroupId
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
 *               - modelId
 *               - start_date
 *               - end_date
 *             properties:
 *               modelId:
 *                 type: string
 *                 format: uuid
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Attribution analysis results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         model:
 *                           $ref: '#/components/schemas/AttributionModel'
 *                         results:
 *                           type: array
 *                           items:
 *                             type: object
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalConversions:
 *                               type: number
 *                             totalRevenue:
 *                               type: number
 *                             topPerformingCampaigns:
 *                               type: array
 *                               items:
 *                                 type: object
 *                         insights:
 *                           type: array
 *                           items:
 *                             type: string
 */

/**
 * @swagger
 * /api/cross-campaign/campaign-groups/{campaignGroupId}/cohort-analysis:
 *   post:
 *     summary: Generate cohort analysis for campaign group
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignGroupId
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
 *               - start_date
 *               - end_date
 *             properties:
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               cohort_type:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 default: weekly
 *     responses:
 *       200:
 *         description: Cohort analysis results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         cohorts:
 *                           type: array
 *                           items:
 *                             type: object
 *                         retentionMatrix:
 *                           type: array
 *                           items:
 *                             type: array
 *                             items:
 *                               type: number
 *                         insights:
 *                           type: array
 *                           items:
 *                             type: string
 *   get:
 *     summary: Get existing cohort analysis for campaign group
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignGroupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Cohort analysis data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 */

/**
 * @swagger
 * /api/cross-campaign/campaign-groups/{campaignGroupId}/funnel-analysis:
 *   get:
 *     summary: Get funnel analysis for campaign group
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignGroupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Funnel analysis results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         stages:
 *                           type: array
 *                           items:
 *                             type: object
 *                         performance:
 *                           type: array
 *                           items:
 *                             type: object
 *                         conversionRates:
 *                           type: array
 *                           items:
 *                             type: number
 *                         dropoffPoints:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               fromStage:
 *                                 type: string
 *                               toStage:
 *                                 type: string
 *                               dropoffRate:
 *                                 type: number
 *                               usersLost:
 *                                 type: number
 *                         insights:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Missing required date parameters
 */

/**
 * @swagger
 * /api/cross-campaign/campaign-comparisons:
 *   post:
 *     summary: Compare two campaigns
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - primaryCampaignId
 *               - comparisonCampaignId
 *               - comparisonType
 *             properties:
 *               primaryCampaignId:
 *                 type: string
 *               comparisonCampaignId:
 *                 type: string
 *               comparisonType:
 *                 type: string
 *                 enum: [period_over_period, variant_comparison, cross_campaign]
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["impressions", "clicks", "conversions", "revenue"]
 *     responses:
 *       200:
 *         description: Campaign comparison results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         primary_campaign_id:
 *                           type: string
 *                         comparison_campaign_id:
 *                           type: string
 *                         comparison_type:
 *                           type: string
 *                         metric_comparisons:
 *                           type: object
 *                         significance_results:
 *                           type: object
 *                         insights:
 *                           type: array
 *                           items:
 *                             type: string
 */

/**
 * @swagger
 * /api/cross-campaign/campaign-groups/{campaignGroupId}/dashboard:
 *   get:
 *     summary: Get dashboard summary for campaign group
 *     tags: [Cross-Campaign Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignGroupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Campaign group dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         campaign_group:
 *                           $ref: '#/components/schemas/CampaignGroup'
 *                         metrics:
 *                           type: object
 *                           properties:
 *                             total_impressions:
 *                               type: number
 *                             total_clicks:
 *                               type: number
 *                             total_conversions:
 *                               type: number
 *                             total_revenue:
 *                               type: number
 *                             total_cost:
 *                               type: number
 *                             click_through_rate:
 *                               type: number
 *                             conversion_rate:
 *                               type: number
 *                             cost_per_conversion:
 *                               type: number
 *                             return_on_ad_spend:
 *                               type: number
 *                         active_experiments:
 *                           type: number
 *                         pending_recommendations:
 *                           type: number
 *                         performance_trend:
 *                           type: string
 *       404:
 *         description: Campaign group not found
 *       400:
 *         description: Missing required date parameters
 */