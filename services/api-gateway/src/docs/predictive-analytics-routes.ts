/**
 * @swagger
 * components:
 *   schemas:
 *     PredictiveModel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Model identifier
 *         name:
 *           type: string
 *           description: Model name
 *           example: "QR Scan Volume Predictor"
 *         type:
 *           type: string
 *           enum: [scan_volume, conversion_rate, user_engagement, revenue, trend_analysis]
 *           description: Type of prediction model
 *         status:
 *           type: string
 *           enum: [training, ready, updating, error]
 *           description: Current model status
 *         accuracy:
 *           type: number
 *           description: Model accuracy percentage
 *           example: 87.5
 *         last_trained:
 *           type: string
 *           format: date-time
 *           description: Last training date
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: Features used by the model
 *         metadata:
 *           type: object
 *           description: Model-specific metadata
 * 
 *     Prediction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         model_id:
 *           type: string
 *           format: uuid
 *         prediction_type:
 *           type: string
 *           enum: [scan_volume, conversion_rate, user_engagement, revenue, trend_analysis]
 *         target_date:
 *           type: string
 *           format: date
 *           description: Date for the prediction
 *         predicted_value:
 *           type: number
 *           description: Predicted value
 *         confidence_interval:
 *           type: object
 *           properties:
 *             lower:
 *               type: number
 *             upper:
 *               type: number
 *             confidence_level:
 *               type: number
 *               example: 0.95
 *         factors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               impact:
 *                 type: number
 *               description:
 *                 type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         expires_at:
 *           type: string
 *           format: date-time
 * 
 *     TrendAnalysis:
 *       type: object
 *       properties:
 *         metric:
 *           type: string
 *           enum: [scans, conversions, revenue, engagement]
 *         time_period:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         trend_direction:
 *           type: string
 *           enum: [increasing, decreasing, stable, volatile]
 *         trend_strength:
 *           type: number
 *           description: Trend strength from 0 to 1
 *           example: 0.73
 *         seasonal_patterns:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               pattern_type:
 *                 type: string
 *                 enum: [daily, weekly, monthly, quarterly]
 *               strength:
 *                 type: number
 *               description:
 *                 type: string
 *         anomalies:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high]
 *               description:
 *                 type: string
 *         forecast:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               predicted_value:
 *                 type: number
 *               confidence:
 *                 type: number
 * 
 *     ModelTrainingRequest:
 *       type: object
 *       properties:
 *         model_type:
 *           type: string
 *           enum: [scan_volume, conversion_rate, user_engagement, revenue, trend_analysis]
 *         training_data_range:
 *           type: object
 *           properties:
 *             start_date:
 *               type: string
 *               format: date
 *             end_date:
 *               type: string
 *               format: date
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: Features to include in training
 *         hyperparameters:
 *           type: object
 *           description: Model-specific hyperparameters
 *         validation_split:
 *           type: number
 *           default: 0.2
 *           description: Validation data percentage
 * 
 *     ModelPerformance:
 *       type: object
 *       properties:
 *         model_id:
 *           type: string
 *           format: uuid
 *         accuracy_metrics:
 *           type: object
 *           properties:
 *             mape:
 *               type: number
 *               description: Mean Absolute Percentage Error
 *             rmse:
 *               type: number
 *               description: Root Mean Square Error
 *             r2_score:
 *               type: number
 *               description: R-squared score
 *         cross_validation_scores:
 *           type: array
 *           items:
 *             type: number
 *         feature_importance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               feature:
 *                 type: string
 *               importance:
 *                 type: number
 *         confusion_matrix:
 *           type: array
 *           items:
 *             type: array
 *             items:
 *               type: number
 *         learning_curve:
 *           type: object
 *           properties:
 *             training_scores:
 *               type: array
 *               items:
 *                 type: number
 *             validation_scores:
 *               type: array
 *               items:
 *                 type: number
 */

/**
 * @swagger
 * /api/analytics/predictions/models:
 *   get:
 *     summary: Get available prediction models
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [scan_volume, conversion_rate, user_engagement, revenue, trend_analysis]
 *         description: Filter by model type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [training, ready, updating, error]
 *         description: Filter by model status
 *     responses:
 *       200:
 *         description: List of prediction models
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
 *                     $ref: '#/components/schemas/PredictiveModel'
 *   post:
 *     summary: Train new prediction model
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModelTrainingRequest'
 *     responses:
 *       202:
 *         description: Model training started
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
 *                     training_job_id:
 *                       type: string
 *                       format: uuid
 *                     estimated_completion:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/analytics/predictions/models/{modelId}:
 *   get:
 *     summary: Get model details
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Model ID
 *     responses:
 *       200:
 *         description: Model details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PredictiveModel'
 *   delete:
 *     summary: Delete prediction model
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Model deleted successfully
 */

/**
 * @swagger
 * /api/analytics/predictions/models/{modelId}/performance:
 *   get:
 *     summary: Get model performance metrics
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Model ID
 *     responses:
 *       200:
 *         description: Model performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ModelPerformance'
 */

/**
 * @swagger
 * /api/analytics/predictions:
 *   get:
 *     summary: Get recent predictions
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: model_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by model ID
 *       - in: query
 *         name: prediction_type
 *         schema:
 *           type: string
 *           enum: [scan_volume, conversion_rate, user_engagement, revenue, trend_analysis]
 *         description: Filter by prediction type
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter predictions from this date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter predictions until this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *     responses:
 *       200:
 *         description: List of predictions
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
 *                     $ref: '#/components/schemas/Prediction'
 *   post:
 *     summary: Generate new prediction
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model_id
 *               - target_date
 *             properties:
 *               model_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of model to use
 *               target_date:
 *                 type: string
 *                 format: date
 *                 description: Date to predict for
 *               input_features:
 *                 type: object
 *                 description: Optional input features for prediction
 *               confidence_level:
 *                 type: number
 *                 default: 0.95
 *                 description: Confidence level for intervals
 *     responses:
 *       201:
 *         description: Prediction generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Prediction'
 */

/**
 * @swagger
 * /api/analytics/predictions/trends:
 *   get:
 *     summary: Get trend analysis
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         required: true
 *         schema:
 *           type: string
 *           enum: [scans, conversions, revenue, engagement]
 *         description: Metric to analyze
 *       - in: query
 *         name: time_period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Time period for analysis
 *       - in: query
 *         name: date_range
 *         schema:
 *           type: string
 *           enum: [30d, 90d, 180d, 365d]
 *           default: 90d
 *         description: Date range for analysis
 *       - in: query
 *         name: qr_codes
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         style: form
 *         explode: true
 *         description: Filter by specific QR codes
 *       - in: query
 *         name: campaigns
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         style: form
 *         explode: true
 *         description: Filter by specific campaigns
 *       - in: query
 *         name: include_forecast
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include future forecast
 *       - in: query
 *         name: forecast_days
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 180
 *         description: Number of days to forecast
 *     responses:
 *       200:
 *         description: Trend analysis results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TrendAnalysis'
 */

/**
 * @swagger
 * /api/analytics/predictions/forecast:
 *   post:
 *     summary: Generate custom forecast
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metric
 *               - forecast_period
 *             properties:
 *               metric:
 *                 type: string
 *                 enum: [scan_volume, conversion_rate, user_engagement, revenue]
 *                 description: Metric to forecast
 *               forecast_period:
 *                 type: integer
 *                 description: Number of days to forecast
 *                 minimum: 1
 *                 maximum: 365
 *               filters:
 *                 type: object
 *                 properties:
 *                   qr_codes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: uuid
 *                   campaigns:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: uuid
 *                   geographic_regions:
 *                     type: array
 *                     items:
 *                       type: string
 *               seasonal_adjustments:
 *                 type: boolean
 *                 default: true
 *                 description: Apply seasonal adjustments
 *               confidence_intervals:
 *                 type: array
 *                 items:
 *                   type: number
 *                 default: [0.8, 0.95]
 *                 description: Confidence levels for intervals
 *               external_factors:
 *                 type: object
 *                 description: External factors to consider
 *                 properties:
 *                   marketing_campaigns:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         start_date:
 *                           type: string
 *                           format: date
 *                         end_date:
 *                           type: string
 *                           format: date
 *                         impact_multiplier:
 *                           type: number
 *                   seasonal_events:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         event_type:
 *                           type: string
 *                         date:
 *                           type: string
 *                           format: date
 *                         impact:
 *                           type: number
 *     responses:
 *       200:
 *         description: Custom forecast generated
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
 *                     forecast_id:
 *                       type: string
 *                       format: uuid
 *                     metric:
 *                       type: string
 *                     forecast_data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           predicted_value:
 *                             type: number
 *                           confidence_intervals:
 *                             type: object
 *                             additionalProperties:
 *                               type: object
 *                               properties:
 *                                 lower:
 *                                   type: number
 *                                 upper:
 *                                   type: number
 *                     model_metadata:
 *                       type: object
 *                       properties:
 *                         algorithm:
 *                           type: string
 *                         features_used:
 *                           type: array
 *                           items:
 *                             type: string
 *                         accuracy_score:
 *                           type: number
 *                     generated_at:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/analytics/predictions/accuracy:
 *   get:
 *     summary: Get prediction accuracy metrics
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: model_type
 *         schema:
 *           type: string
 *           enum: [scan_volume, conversion_rate, user_engagement, revenue, trend_analysis]
 *         description: Filter by model type
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 180d]
 *           default: 30d
 *         description: Time range for accuracy calculation
 *     responses:
 *       200:
 *         description: Prediction accuracy metrics
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
 *                     overall_accuracy:
 *                       type: number
 *                       description: Overall accuracy percentage
 *                     model_accuracies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           model_type:
 *                             type: string
 *                           accuracy:
 *                             type: number
 *                           predictions_count:
 *                             type: integer
 *                     accuracy_trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           accuracy:
 *                             type: number
 *                     improvement_suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           model_type:
 *                             type: string
 *                           suggestion:
 *                             type: string
 *                           priority:
 *                             type: string
 *                             enum: [low, medium, high]
 */