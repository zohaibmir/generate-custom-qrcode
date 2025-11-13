import { Request, Response } from 'express';
import { PredictiveAnalyticsService } from '../services/predictive-analytics.service';

export class PredictiveAnalyticsController {
    constructor(
        private predictiveService: PredictiveAnalyticsService
    ) {}

    // Model Management
    async createPredictionModel(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const {
                model_name,
                algorithm,
                parameters,
                qr_code_id,
                training_data_period = 90
            } = req.body;

            const modelId = await this.predictiveService.createPredictionModel({
                user_id: userId,
                model_name,
                model_type: 'time_series',
                algorithm,
                target_metric: 'scans',
                model_config: parameters || {},
                training_data_config: { period_days: training_data_period },
                model_metadata: {},
                qr_code_id,
                model_status: 'training',
                prediction_horizon_days: 30,
                retrain_frequency_days: 7,
                is_active: true
            });

            res.status(201).json({
                success: true,
                message: 'Prediction model created successfully',
                data: { modelId, name: model_name, algorithm }
            });
        } catch (error: any) {
            console.error('Error creating prediction model:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    async trainModel(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const { modelId } = req.params;
            const { trainingData, config } = req.body;

            await this.predictiveService.trainModel(modelId, trainingData || [], config);

            res.status(200).json({
                success: true,
                message: 'Model training completed successfully'
            });
        } catch (error: any) {
            console.error('Error training model:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Prediction Generation
    async generatePredictions(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const { modelId } = req.params;
            const { targetDates = [] } = req.body;

            const predictions = await this.predictiveService.generatePredictions(modelId, targetDates);

            res.status(200).json({
                success: true,
                message: 'Predictions generated successfully',
                data: predictions
            });
        } catch (error: any) {
            console.error('Error generating predictions:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Analytics
    async analyzePatterns(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const { qrCodeId } = req.params;
            const { 
                pattern_types = ['daily', 'weekly', 'monthly'],
                lookback_days = 90
            } = req.body;

            const patterns = await this.predictiveService.analyzePatterns(qrCodeId, {
                pattern_types,
                lookback_days
            });

            res.status(200).json({
                success: true,
                message: 'Pattern analysis completed',
                data: patterns
            });
        } catch (error: any) {
            console.error('Error analyzing patterns:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    async analyzeTrends(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const { qrCodeId } = req.params;
            const { 
                metricType = 'scans',
                lookback_days = 90,
                min_data_points = 10
            } = req.body;

            const trends = await this.predictiveService.analyzeTrends(qrCodeId, metricType, {
                lookback_days,
                min_data_points
            });

            res.status(200).json({
                success: true,
                message: 'Trend analysis completed',
                data: trends
            });
        } catch (error: any) {
            console.error('Error analyzing trends:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    async analyzeSeasonality(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const { qrCodeId } = req.params;
            const { metricType = 'scans' } = req.body;

            const seasonality = await this.predictiveService.analyzeSeasonality(qrCodeId, metricType);

            res.status(200).json({
                success: true,
                message: 'Seasonality analysis completed',
                data: seasonality
            });
        } catch (error: any) {
            console.error('Error analyzing seasonality:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Optimization Recommendations
    async generateOptimizationRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const { qrCodeId } = req.params;
            const { 
                priority_threshold = 'medium'
            } = req.body;

            const recommendations = await this.predictiveService.generateOptimizationRecommendations(
                userId, 
                qrCodeId, 
                { priority_threshold }
            );

            res.status(200).json({
                success: true,
                message: 'Optimization recommendations generated',
                data: recommendations
            });
        } catch (error: any) {
            console.error('Error generating optimization recommendations:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}