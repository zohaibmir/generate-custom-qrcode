import { Router, Request, Response } from 'express';
import { PredictiveAnalyticsController } from '../controllers/predictive-analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import * as Joi from 'joi';

// Validation schemas
const createModelSchema = Joi.object({
    model_name: Joi.string().required().min(3).max(100),
    algorithm: Joi.string().valid('linear_regression', 'arima', 'lstm', 'prophet', 'moving_average').required(),
    parameters: Joi.object().optional(),
    qr_code_id: Joi.string().optional(),
    training_data_period: Joi.number().integer().min(7).max(365).optional().default(90)
});

const trainModelSchema = Joi.object({
    trainingData: Joi.array().optional(),
    config: Joi.object().optional()
});

const generatePredictionsSchema = Joi.object({
    targetDates: Joi.array().items(Joi.string().isoDate()).optional().default([])
});

const analyzePatternsSchema = Joi.object({
    pattern_types: Joi.array().items(
        Joi.string().valid('daily', 'weekly', 'monthly', 'seasonal')
    ).optional().default(['daily', 'weekly', 'monthly']),
    lookback_days: Joi.number().integer().min(7).max(365).optional().default(90)
});

const analyzeTrendsSchema = Joi.object({
    metricType: Joi.string().optional().default('scans'),
    lookback_days: Joi.number().integer().min(7).max(365).optional().default(90),
    min_data_points: Joi.number().integer().min(3).max(100).optional().default(10)
});

const analyzeSeasonalitySchema = Joi.object({
    metricType: Joi.string().optional().default('scans')
});

const optimizationRecommendationsSchema = Joi.object({
    priority_threshold: Joi.string().valid('low', 'medium', 'high', 'critical').optional().default('medium')
});

export function createPredictiveAnalyticsRoutes(
    predictiveController: PredictiveAnalyticsController
): Router {
    const router = Router();

    // Apply authentication middleware to all routes
    router.use(authMiddleware);

    // Model Management Routes
    router.post(
        '/models',
        validationMiddleware(createModelSchema),
        (req: Request, res: Response) => predictiveController.createPredictionModel(req, res)
    );

    router.post(
        '/models/:modelId/train',
        validationMiddleware(trainModelSchema),
        (req: Request, res: Response) => predictiveController.trainModel(req, res)
    );

    // Prediction Generation Routes
    router.post(
        '/models/:modelId/predict',
        validationMiddleware(generatePredictionsSchema),
        (req: Request, res: Response) => predictiveController.generatePredictions(req, res)
    );

    // Analytics Routes
    router.post(
        '/qr/:qrCodeId/patterns',
        validationMiddleware(analyzePatternsSchema),
        (req: Request, res: Response) => predictiveController.analyzePatterns(req, res)
    );

    router.post(
        '/qr/:qrCodeId/trends',
        validationMiddleware(analyzeTrendsSchema),
        (req: Request, res: Response) => predictiveController.analyzeTrends(req, res)
    );

    router.post(
        '/qr/:qrCodeId/seasonality',
        validationMiddleware(analyzeSeasonalitySchema),
        (req: Request, res: Response) => predictiveController.analyzeSeasonality(req, res)
    );

    // Optimization Recommendations Routes
    router.post(
        '/qr/:qrCodeId/recommendations',
        validationMiddleware(optimizationRecommendationsSchema),
        (req: Request, res: Response) => predictiveController.generateOptimizationRecommendations(req, res)
    );

    return router;
}