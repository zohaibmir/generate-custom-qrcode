import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface PredictionModel {
    id: string;
    user_id: string;
    qr_code_id?: string;
    model_name: string;
    model_type: 'time_series' | 'trend_analysis' | 'seasonality' | 'anomaly_detection';
    algorithm: 'linear_regression' | 'arima' | 'lstm' | 'prophet' | 'moving_average';
    target_metric: string;
    model_config: any;
    training_data_config: any;
    model_metadata: any;
    model_status: 'training' | 'trained' | 'deployed' | 'deprecated';
    accuracy_score?: number;
    prediction_horizon_days: number;
    retrain_frequency_days: number;
    is_active: boolean;
}

interface PredictionResult {
    model_id: string;
    qr_code_id?: string;
    prediction_date: string;
    target_date: string;
    predicted_value: number;
    confidence_interval_lower?: number;
    confidence_interval_upper?: number;
    confidence_score?: number;
    prediction_metadata?: any;
    seasonal_component?: number;
    trend_component?: number;
}

interface Pattern {
    id?: number;
    qr_code_id?: string;
    pattern_type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'event_driven';
    pattern_name: string;
    pattern_description?: string;
    pattern_data: any;
    pattern_strength: number;
    confidence_level: number;
    occurrences: number;
    next_predicted_occurrence?: string;
    recommendations: any[];
}

interface TrendAnalysis {
    qr_code_id?: string;
    metric_type: string;
    trend_type: 'upward' | 'downward' | 'stable' | 'volatile' | 'cyclical';
    trend_strength: number;
    trend_direction: number;
    trend_start_date: string;
    trend_duration_days?: number;
    r_squared?: number;
    trend_equation?: string;
    volatility_score?: number;
    business_significance: 'high' | 'medium' | 'low' | 'negligible';
}

interface SeasonalityAnalysis {
    qr_code_id?: string;
    metric_type: string;
    seasonality_type: 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
    season_period: number;
    seasonal_components: any;
    seasonal_strength: number;
    seasonal_amplitude: number;
    year_over_year_growth?: number;
    is_statistically_significant: boolean;
}

interface OptimizationRecommendation {
    qr_code_id?: string;
    user_id: string;
    recommendation_type: 'timing' | 'content' | 'placement' | 'campaign' | 'technical';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    predicted_impact?: any;
    implementation_effort: 'low' | 'medium' | 'high';
    confidence_score?: number;
    expected_roi?: number;
    time_sensitivity: string;
}

interface TimeSeriesData {
    date: string;
    value: number;
    metadata?: any;
}

interface MLModelConfig {
    algorithm: string;
    hyperparameters: any;
    validation_split: number;
    cross_validation_folds: number;
    feature_engineering: any;
}

interface SeasonalDecomposition {
    trend: number[];
    seasonal: number[];
    residual: number[];
    original: number[];
}

interface SeasonalityResult {
    type: 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
    period: number;
    strength: number;
    amplitude: number;
    components: any;
    pValue?: number;
}

export class PredictiveAnalyticsService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    private log(message: string, data?: any): void {
        console.log(`[PredictiveAnalyticsService] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }

    private logError(message: string, error: any): void {
        console.error(`[PredictiveAnalyticsService] ${message}`, error);
    }

    // ============ PREDICTION MODELS MANAGEMENT ============
    
    async createPredictionModel(modelData: Omit<PredictionModel, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
        const query = `
            INSERT INTO prediction_models (
                id, user_id, qr_code_id, model_name, model_type, algorithm, target_metric,
                model_config, training_data_config, model_metadata, model_status,
                accuracy_score, prediction_horizon_days, retrain_frequency_days, is_active
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            ) RETURNING id;
        `;

        const modelId = `model_${uuidv4()}`;
        const values = [
            modelId,
            modelData.user_id,
            modelData.qr_code_id,
            modelData.model_name,
            modelData.model_type,
            modelData.algorithm,
            modelData.target_metric,
            JSON.stringify(modelData.model_config),
            JSON.stringify(modelData.training_data_config),
            JSON.stringify(modelData.model_metadata || {}),
            modelData.model_status,
            modelData.accuracy_score,
            modelData.prediction_horizon_days,
            modelData.retrain_frequency_days,
            modelData.is_active
        ];

        try {
            const result = await this.db.query(query, values);
            this.log('Created prediction model', { modelId, modelType: modelData.model_type });
            return modelId;
        } catch (error) {
            this.logError('Error creating prediction model', error);
            throw error;
        }
    }

    async trainModel(modelId: string, historicalData: TimeSeriesData[], config?: MLModelConfig): Promise<void> {
        const model = await this.getPredictionModel(modelId);
        if (!model) {
            throw new Error('Model not found');
        }

        // Record training start
        const trainingId = await this.recordTrainingStart(modelId, historicalData.length, config);

        try {
            // Update model status to training
            await this.updateModelStatus(modelId, 'training');

            // Perform training based on algorithm
            const trainingResult = await this.performTraining(model, historicalData, config);

            // Record training completion
            await this.recordTrainingCompletion(trainingId, trainingResult);

            // Update model with training results
            await this.updateModelAfterTraining(modelId, trainingResult);

            this.log('Model training completed', { modelId, accuracy: trainingResult.accuracy });
        } catch (error) {
            await this.recordTrainingFailure(trainingId, error);
            await this.updateModelStatus(modelId, 'deprecated');
            this.logError('Model training failed', error);
            throw error;
        }
    }

    private async performTraining(model: PredictionModel, data: TimeSeriesData[], config?: MLModelConfig): Promise<any> {
        // Simulate ML training with different algorithms
        const trainingResult = {
            accuracy: 0.8 + Math.random() * 0.15, // 80-95% accuracy
            mae: Math.random() * 10,
            rmse: Math.random() * 15,
            r_squared: 0.7 + Math.random() * 0.25,
            feature_importance: {},
            hyperparameters: config?.hyperparameters || {},
            training_samples: data.length,
            model_size_mb: Math.random() * 50 + 10
        };

        // Algorithm-specific logic
        switch (model.algorithm) {
            case 'arima':
                trainingResult.feature_importance = { 'lag_1': 0.4, 'lag_7': 0.3, 'trend': 0.3 };
                break;
            case 'lstm':
                trainingResult.feature_importance = { 'sequence_patterns': 0.6, 'seasonal': 0.25, 'trend': 0.15 };
                break;
            case 'prophet':
                trainingResult.feature_importance = { 'trend': 0.4, 'seasonal': 0.35, 'holidays': 0.25 };
                break;
            case 'linear_regression':
                trainingResult.feature_importance = { 'time': 0.5, 'day_of_week': 0.3, 'month': 0.2 };
                break;
        }

        // Simulate training time
        await new Promise(resolve => setTimeout(resolve, 1000));

        return trainingResult;
    }

    // ============ PREDICTION GENERATION ============

    async generatePredictions(modelId: string, targetDates: string[]): Promise<PredictionResult[]> {
        const model = await this.getPredictionModel(modelId);
        if (!model || model.model_status !== 'trained' && model.model_status !== 'deployed') {
            throw new Error('Model not available for predictions');
        }

        const predictions: PredictionResult[] = [];
        const predictionDate = new Date().toISOString().split('T')[0];

        for (const targetDate of targetDates) {
            const prediction = await this.generateSinglePrediction(model, targetDate);
            predictions.push({
                model_id: modelId,
                qr_code_id: model.qr_code_id,
                prediction_date: predictionDate,
                target_date: targetDate,
                ...prediction
            });
        }

        // Store predictions in database
        await this.storePredictions(predictions);

        this.log('Generated predictions', { modelId, count: predictions.length });
        return predictions;
    }

    private async generateSinglePrediction(model: PredictionModel, targetDate: string): Promise<any> {
        const today = new Date();
        const target = new Date(targetDate);
        const daysAhead = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Get historical baseline
        const baseline = await this.calculateHistoricalBaseline(model.qr_code_id, model.target_metric);
        
        // Apply algorithm-specific prediction logic
        let predictedValue = baseline;
        let seasonal_component = 0;
        let trend_component = 0;

        switch (model.algorithm) {
            case 'arima':
                // ARIMA prediction with trend and seasonality
                trend_component = baseline * 0.02 * Math.log(daysAhead + 1); // Log trend
                seasonal_component = this.calculateSeasonalComponent(target, baseline);
                predictedValue = baseline + trend_component + seasonal_component;
                break;

            case 'prophet':
                // Prophet-style decomposition
                trend_component = this.calculateProphetTrend(baseline, daysAhead);
                seasonal_component = this.calculateSeasonalComponent(target, baseline);
                const holiday_effect = this.calculateHolidayEffect(target);
                predictedValue = baseline + trend_component + seasonal_component + holiday_effect;
                break;

            case 'lstm':
                // LSTM sequence prediction
                predictedValue = baseline * (1 + 0.1 * Math.sin(daysAhead * 0.1)) * (1 + Math.random() * 0.1 - 0.05);
                break;

            case 'linear_regression':
                // Linear trend prediction
                trend_component = baseline * 0.03 * daysAhead / 30; // 3% monthly growth
                predictedValue = baseline + trend_component;
                break;
        }

        // Add noise and ensure non-negative values
        predictedValue = Math.max(0, predictedValue * (1 + (Math.random() - 0.5) * 0.1));

        // Calculate confidence interval
        const uncertainty = predictedValue * 0.15 * Math.sqrt(daysAhead); // Uncertainty grows with time
        const confidence_interval_lower = Math.max(0, predictedValue - uncertainty);
        const confidence_interval_upper = predictedValue + uncertainty;
        const confidence_score = Math.max(0.5, 1.0 - (daysAhead * 0.01)); // Decrease confidence over time

        return {
            predicted_value: Math.round(predictedValue * 100) / 100,
            confidence_interval_lower: Math.round(confidence_interval_lower * 100) / 100,
            confidence_interval_upper: Math.round(confidence_interval_upper * 100) / 100,
            confidence_score: Math.round(confidence_score * 100) / 100,
            seasonal_component: Math.round(seasonal_component * 100) / 100,
            trend_component: Math.round(trend_component * 100) / 100,
            prediction_metadata: {
                algorithm: model.algorithm,
                days_ahead: daysAhead,
                baseline_value: baseline
            }
        };
    }

    // ============ PATTERN ANALYSIS ============

    async analyzePatterns(qrCodeId?: string, options?: { 
        pattern_types?: string[], 
        min_strength?: number,
        lookback_days?: number 
    }): Promise<Pattern[]> {
        const lookbackDays = options?.lookback_days || 90;
        const minStrength = options?.min_strength || 0.3;
        
        const historicalData = await this.getHistoricalData(qrCodeId, lookbackDays);
        const patterns: Pattern[] = [];

        // Detect different types of patterns
        if (!options?.pattern_types || options.pattern_types.includes('daily')) {
            const dailyPatterns = await this.detectDailyPatterns(historicalData);
            patterns.push(...dailyPatterns);
        }

        if (!options?.pattern_types || options.pattern_types.includes('weekly')) {
            const weeklyPatterns = await this.detectWeeklyPatterns(historicalData);
            patterns.push(...weeklyPatterns);
        }

        if (!options?.pattern_types || options.pattern_types.includes('monthly')) {
            const monthlyPatterns = await this.detectMonthlyPatterns(historicalData);
            patterns.push(...monthlyPatterns);
        }

        if (!options?.pattern_types || options.pattern_types.includes('seasonal')) {
            const seasonalPatterns = await this.detectSeasonalPatterns(historicalData);
            patterns.push(...seasonalPatterns);
        }

        // Filter by minimum strength and store in database
        const strongPatterns = patterns.filter(p => p.pattern_strength >= minStrength);
        await this.storePatterns(strongPatterns, qrCodeId);

        this.log('Pattern analysis completed', { 
            qrCodeId, 
            totalPatterns: strongPatterns.length,
            averageStrength: strongPatterns.reduce((sum, p) => sum + p.pattern_strength, 0) / strongPatterns.length
        });

        return strongPatterns;
    }

    private async detectDailyPatterns(data: TimeSeriesData[]): Promise<Pattern[]> {
        const hourlyData = this.groupByHour(data);
        const patterns: Pattern[] = [];

        // Detect peak hours
        const peakHours = this.findPeakPeriods(hourlyData, 'hour');
        if (peakHours.strength > 0.5) {
            patterns.push({
                id: 0, // Will be set by database
                pattern_type: 'daily',
                pattern_name: 'Peak Hours Pattern',
                pattern_description: `Consistent peak activity during hours: ${peakHours.periods.join(', ')}`,
                pattern_data: peakHours,
                pattern_strength: peakHours.strength,
                confidence_level: peakHours.confidence,
                occurrences: peakHours.occurrences,
                recommendations: [
                    {
                        type: 'timing',
                        action: 'schedule_campaigns',
                        details: `Focus campaigns during peak hours: ${peakHours.periods.join(', ')}`
                    }
                ]
            });
        }

        return patterns;
    }

    private async detectWeeklyPatterns(data: TimeSeriesData[]): Promise<Pattern[]> {
        const dailyData = this.groupByDayOfWeek(data);
        const patterns: Pattern[] = [];

        // Detect weekday vs weekend patterns
        const weekdayAvg = this.calculateAverageForDays(dailyData, [1, 2, 3, 4, 5]); // Monday-Friday
        const weekendAvg = this.calculateAverageForDays(dailyData, [0, 6]); // Sunday, Saturday
        
        const weekdayWeekendRatio = weekdayAvg / (weekendAvg + 0.1); // Avoid division by zero
        if (Math.abs(weekdayWeekendRatio - 1) > 0.3) { // 30% difference threshold
            patterns.push({
                id: 0,
                pattern_type: 'weekly',
                pattern_name: weekdayWeekendRatio > 1 ? 'Weekday Preference' : 'Weekend Preference',
                pattern_description: `${weekdayWeekendRatio > 1 ? 'Higher' : 'Lower'} activity on weekdays compared to weekends`,
                pattern_data: {
                    weekday_avg: weekdayAvg,
                    weekend_avg: weekendAvg,
                    ratio: weekdayWeekendRatio,
                    daily_breakdown: dailyData
                },
                pattern_strength: Math.min(0.95, Math.abs(weekdayWeekendRatio - 1)),
                confidence_level: 0.8,
                occurrences: Math.floor(data.length / 7),
                recommendations: [
                    {
                        type: 'timing',
                        action: 'optimize_schedule',
                        details: `Focus campaigns on ${weekdayWeekendRatio > 1 ? 'weekdays' : 'weekends'} for better performance`
                    }
                ]
            });
        }

        return patterns;
    }

    private async detectMonthlyPatterns(data: TimeSeriesData[]): Promise<Pattern[]> {
        const monthlyData = this.groupByMonth(data);
        const patterns: Pattern[] = [];

        // Detect month-of-year seasonality
        const monthlyVariance = this.calculateVariance(Object.values(monthlyData));
        const monthlyMean = Object.values(monthlyData).reduce((sum, val) => sum + val, 0) / Object.keys(monthlyData).length;
        const coefficientOfVariation = Math.sqrt(monthlyVariance) / monthlyMean;

        if (coefficientOfVariation > 0.2) { // Significant monthly variation
            const peakMonths = Object.entries(monthlyData)
                .filter(([month, value]) => value > monthlyMean * 1.2)
                .map(([month, value]) => ({ month: parseInt(month), value }));

            patterns.push({
                id: 0,
                pattern_type: 'monthly',
                pattern_name: 'Monthly Seasonality',
                pattern_description: `Consistent monthly patterns with peaks in: ${peakMonths.map(p => this.getMonthName(p.month)).join(', ')}`,
                pattern_data: {
                    monthly_averages: monthlyData,
                    peak_months: peakMonths,
                    coefficient_of_variation: coefficientOfVariation
                },
                pattern_strength: Math.min(0.95, coefficientOfVariation),
                confidence_level: 0.75,
                occurrences: Math.floor(data.length / 30),
                recommendations: [
                    {
                        type: 'campaign',
                        action: 'seasonal_planning',
                        details: `Plan major campaigns for peak months: ${peakMonths.map(p => this.getMonthName(p.month)).join(', ')}`
                    }
                ]
            });
        }

        return patterns;
    }

    // ============ TREND ANALYSIS ============

    async analyzeTrends(qrCodeId?: string, metricType: string = 'scans', options?: {
        lookback_days?: number,
        min_data_points?: number
    }): Promise<TrendAnalysis> {
        const lookbackDays = options?.lookback_days || 90;
        const minDataPoints = options?.min_data_points || 30;

        const historicalData = await this.getHistoricalData(qrCodeId, lookbackDays);
        
        if (historicalData.length < minDataPoints) {
            throw new Error('Insufficient data for trend analysis');
        }

        // Calculate linear regression
        const regression = this.calculateLinearRegression(historicalData);
        
        // Determine trend type and strength
        const trendType = this.determineTrendType(regression.slope, regression.r_squared);
        const trendStrength = this.calculateTrendStrength(regression.r_squared, regression.slope);
        const volatility = this.calculateVolatility(historicalData, regression);
        
        // Detect trend breakpoints
        const breakpoints = await this.detectTrendBreakpoints(historicalData);
        
        const trendAnalysis: TrendAnalysis = {
            qr_code_id: qrCodeId,
            metric_type: metricType,
            trend_type: trendType,
            trend_strength: trendStrength,
            trend_direction: regression.slope,
            trend_start_date: historicalData[0].date,
            trend_duration_days: historicalData.length,
            r_squared: regression.r_squared,
            trend_equation: `y = ${regression.slope.toFixed(4)}x + ${regression.intercept.toFixed(2)}`,
            volatility_score: volatility,
            business_significance: this.determineBusinessSignificance(trendStrength, regression.slope)
        };

        // Store trend analysis
        await this.storeTrendAnalysis(trendAnalysis);

        this.log('Trend analysis completed', { 
            qrCodeId, 
            trendType, 
            trendStrength,
            rSquared: regression.r_squared 
        });

        return trendAnalysis;
    }

    // ============ SEASONALITY ANALYSIS ============

    async analyzeSeasonality(qrCodeId?: string, metricType: string = 'scans'): Promise<SeasonalityAnalysis> {
        const historicalData = await this.getHistoricalData(qrCodeId, 365); // Need full year for seasonality

        if (historicalData.length < 365) {
            throw new Error('Insufficient data for seasonality analysis (need at least 1 year)');
        }

        // Decompose time series into trend, seasonal, and residual components
        const decomposition = this.decomposeTimeSeries(historicalData);
        
        // Analyze different seasonal periods
        const yearlySeasonality = this.analyzeYearlySeasonality(decomposition.seasonal);
        const weeklySeasonality = this.analyzeWeeklySeasonality(historicalData);
        const dailySeasonality = this.analyzeDailySeasonality(historicalData);

        // Choose dominant seasonality
        const dominantSeasonality = this.selectDominantSeasonality([
            yearlySeasonality,
            weeklySeasonality,
            dailySeasonality
        ]);

        const seasonalityAnalysis: SeasonalityAnalysis = {
            qr_code_id: qrCodeId,
            metric_type: metricType,
            seasonality_type: dominantSeasonality.type,
            season_period: dominantSeasonality.period,
            seasonal_components: dominantSeasonality.components,
            seasonal_strength: dominantSeasonality.strength,
            seasonal_amplitude: dominantSeasonality.amplitude,
            year_over_year_growth: this.calculateYearOverYearGrowth(historicalData),
            is_statistically_significant: dominantSeasonality.strength > 0.3 && (dominantSeasonality.pValue || 0) < 0.05
        };

        // Store seasonality analysis
        await this.storeSeasonalityAnalysis(seasonalityAnalysis);

        this.log('Seasonality analysis completed', { 
            qrCodeId, 
            seasonalityType: dominantSeasonality.type,
            strength: dominantSeasonality.strength 
        });

        return seasonalityAnalysis;
    }

    // ============ OPTIMIZATION RECOMMENDATIONS ============

    async generateOptimizationRecommendations(
        userId: string,
        qrCodeId?: string,
        options?: { focus_areas?: string[], priority_threshold?: string }
    ): Promise<OptimizationRecommendation[]> {
        
        // Gather analysis data
        const patterns = await this.getActivePatterns(qrCodeId);
        const trends = await this.getLatestTrendAnalysis(qrCodeId);
        const seasonality = await this.getLatestSeasonalityAnalysis(qrCodeId);
        const predictions = await this.getLatestPredictions(qrCodeId);

        const recommendations: OptimizationRecommendation[] = [];

        // Generate timing recommendations
        if (patterns.some(p => p.pattern_type === 'daily' || p.pattern_type === 'weekly')) {
            recommendations.push(...this.generateTimingRecommendations(patterns, userId, qrCodeId));
        }

        // Generate content recommendations based on trends
        if (trends && trends.trend_type === 'downward') {
            recommendations.push(...this.generateContentRecommendations(trends, userId, qrCodeId));
        }

        // Generate campaign recommendations based on seasonality
        if (seasonality && seasonality.is_statistically_significant) {
            recommendations.push(...this.generateCampaignRecommendations(seasonality, userId, qrCodeId));
        }

        // Generate technical optimization recommendations
        if (predictions.length > 0) {
            recommendations.push(...this.generateTechnicalRecommendations(predictions, userId, qrCodeId));
        }

        // Store recommendations
        await this.storeOptimizationRecommendations(recommendations);

        // Filter by priority if specified
        const priorityThreshold = options?.priority_threshold || 'low';
        const priorityOrder = ['low', 'medium', 'high', 'critical'];
        const minPriorityIndex = priorityOrder.indexOf(priorityThreshold);

        const filteredRecommendations = recommendations.filter(r => 
            priorityOrder.indexOf(r.priority) >= minPriorityIndex
        );

        console.log('Generated optimization recommendations:', { 
            userId, 
            qrCodeId, 
            totalRecommendations: recommendations.length,
            filteredRecommendations: filteredRecommendations.length 
        });

        return filteredRecommendations;
    }

    // ============ HELPER METHODS ============

    private async getPredictionModel(modelId: string): Promise<PredictionModel | null> {
        const query = 'SELECT * FROM prediction_models WHERE id = $1';
        const result = await this.db.query(query, [modelId]);
        return result.rows[0] || null;
    }

    private async updateModelStatus(modelId: string, status: string): Promise<void> {
        const query = 'UPDATE prediction_models SET model_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
        await this.db.query(query, [status, modelId]);
    }

    private async recordTrainingStart(modelId: string, sampleCount: number, config?: MLModelConfig): Promise<number> {
        const query = `
            INSERT INTO model_training_history (
                model_id, training_version, training_start_time, training_samples,
                hyperparameters, training_status
            ) VALUES ($1, 
                COALESCE((SELECT MAX(training_version) + 1 FROM model_training_history WHERE model_id = $1), 1),
                CURRENT_TIMESTAMP, $2, $3, 'in_progress'
            ) RETURNING id;
        `;
        
        const result = await this.db.query(query, [
            modelId,
            sampleCount,
            JSON.stringify(config?.hyperparameters || {})
        ]);
        
        return result.rows[0].id;
    }

    private async recordTrainingCompletion(trainingId: number, trainingResult: any): Promise<void> {
        const query = `
            UPDATE model_training_history 
            SET training_end_time = CURRENT_TIMESTAMP,
                training_duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - training_start_time)),
                performance_metrics = $1,
                feature_importance = $2,
                model_size_mb = $3,
                training_status = 'completed'
            WHERE id = $4;
        `;
        
        await this.db.query(query, [
            JSON.stringify({
                mae: trainingResult.mae,
                rmse: trainingResult.rmse,
                r_squared: trainingResult.r_squared,
                accuracy: trainingResult.accuracy
            }),
            JSON.stringify(trainingResult.feature_importance),
            trainingResult.model_size_mb,
            trainingId
        ]);
    }

    private async updateModelAfterTraining(modelId: string, trainingResult: any): Promise<void> {
        const query = `
            UPDATE prediction_models 
            SET model_status = 'trained',
                accuracy_score = $1,
                model_metadata = model_metadata || $2,
                last_trained = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3;
        `;
        
        await this.db.query(query, [
            trainingResult.accuracy,
            JSON.stringify({
                last_training_performance: {
                    mae: trainingResult.mae,
                    rmse: trainingResult.rmse,
                    r_squared: trainingResult.r_squared
                },
                feature_importance: trainingResult.feature_importance
            }),
            modelId
        ]);
    }

    private async recordTrainingFailure(trainingId: number, error: any): Promise<void> {
        const query = `
            UPDATE model_training_history 
            SET training_end_time = CURRENT_TIMESTAMP,
                training_error_log = $1,
                training_status = 'failed'
            WHERE id = $2;
        `;
        
        await this.db.query(query, [
            error.message || error.toString(),
            trainingId
        ]);
    }

    private async storePredictions(predictions: PredictionResult[]): Promise<void> {
        if (predictions.length === 0) return;

        const query = `
            INSERT INTO prediction_results (
                model_id, qr_code_id, prediction_date, target_date, predicted_value,
                confidence_interval_lower, confidence_interval_upper, confidence_score,
                prediction_metadata, seasonal_component, trend_component
            ) VALUES ${predictions.map((_, i) => 
                `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, 
                 $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`
            ).join(', ')};
        `;

        const values = predictions.flatMap(p => [
            p.model_id, p.qr_code_id, p.prediction_date, p.target_date, p.predicted_value,
            p.confidence_interval_lower, p.confidence_interval_upper, p.confidence_score,
            JSON.stringify(p.prediction_metadata), p.seasonal_component, p.trend_component
        ]);

        await this.db.query(query, values);
    }

    private calculateHistoricalBaseline(qrCodeId?: string, metric: string = 'scans'): Promise<number> {
        // Mock calculation - in real implementation, this would query actual scan data
        return Promise.resolve(100 + Math.random() * 200);
    }

    private calculateSeasonalComponent(targetDate: Date, baseline: number): number {
        const month = targetDate.getMonth();
        const dayOfWeek = targetDate.getDay();
        
        // Simple seasonal adjustments
        const monthlyMultiplier = [
            0.8, 0.9, 1.1, 1.0, 1.2, 1.3, // Jan-Jun
            1.1, 1.0, 1.1, 1.2, 1.0, 1.4  // Jul-Dec (holiday boost)
        ][month];
        
        const weeklyMultiplier = [0.7, 1.1, 1.1, 1.1, 1.1, 1.2, 0.9][dayOfWeek]; // Sun-Sat
        
        return baseline * (monthlyMultiplier * weeklyMultiplier - 1) * 0.3;
    }

    private calculateProphetTrend(baseline: number, daysAhead: number): number {
        // Prophet-style logistic trend with saturation
        const growthRate = 0.02;
        const carryingCapacity = baseline * 3; // Market saturation at 3x current
        
        return carryingCapacity * (1 / (1 + Math.exp(-growthRate * daysAhead))) - baseline;
    }

    private calculateHolidayEffect(targetDate: Date): number {
        // Simple holiday detection (Christmas, New Year, etc.)
        const month = targetDate.getMonth();
        const day = targetDate.getDate();
        
        if ((month === 11 && day >= 20) || (month === 0 && day <= 5)) {
            return 50; // Holiday boost
        }
        
        return 0;
    }

    private async getHistoricalData(qrCodeId?: string, lookbackDays: number = 90): Promise<TimeSeriesData[]> {
        // Mock historical data - in real implementation, query actual scan events
        const data: TimeSeriesData[] = [];
        const today = new Date();
        
        for (let i = lookbackDays; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const baseValue = 100;
            const trend = i * 0.5; // Slight upward trend
            const seasonal = 30 * Math.sin(2 * Math.PI * i / 7); // Weekly seasonality
            const noise = (Math.random() - 0.5) * 20;
            
            data.push({
                date: date.toISOString().split('T')[0],
                value: Math.max(0, baseValue + trend + seasonal + noise)
            });
        }
        
        return data;
    }

    // Additional helper methods for pattern detection, mathematical calculations, etc.
    // ... (continuing with the remaining helper methods)

    private groupByHour(data: TimeSeriesData[]): { [hour: number]: number } {
        const hourlyData: { [hour: number]: number[] } = {};
        
        data.forEach(point => {
            const date = new Date(point.date);
            const hour = date.getHours();
            if (!hourlyData[hour]) hourlyData[hour] = [];
            hourlyData[hour].push(point.value);
        });

        // Calculate averages
        const result: { [hour: number]: number } = {};
        Object.keys(hourlyData).forEach(hour => {
            const values = hourlyData[parseInt(hour)];
            result[parseInt(hour)] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        return result;
    }

    private groupByDayOfWeek(data: TimeSeriesData[]): { [day: number]: number } {
        const dailyData: { [day: number]: number[] } = {};
        
        data.forEach(point => {
            const date = new Date(point.date);
            const day = date.getDay();
            if (!dailyData[day]) dailyData[day] = [];
            dailyData[day].push(point.value);
        });

        // Calculate averages
        const result: { [day: number]: number } = {};
        Object.keys(dailyData).forEach(day => {
            const values = dailyData[parseInt(day)];
            result[parseInt(day)] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        return result;
    }

    private groupByMonth(data: TimeSeriesData[]): { [month: number]: number } {
        const monthlyData: { [month: number]: number[] } = {};
        
        data.forEach(point => {
            const date = new Date(point.date);
            const month = date.getMonth();
            if (!monthlyData[month]) monthlyData[month] = [];
            monthlyData[month].push(point.value);
        });

        // Calculate averages
        const result: { [month: number]: number } = {};
        Object.keys(monthlyData).forEach(month => {
            const values = monthlyData[parseInt(month)];
            result[parseInt(month)] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        return result;
    }

    private findPeakPeriods(data: { [key: number]: number }, periodType: 'hour' | 'day' | 'month'): any {
        const values = Object.values(data);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const threshold = mean * 1.2; // 20% above average

        const peaks = Object.entries(data)
            .filter(([period, value]) => value > threshold)
            .map(([period, value]) => parseInt(period));

        return {
            periods: peaks,
            strength: Math.min(0.95, peaks.length / Object.keys(data).length),
            confidence: 0.8,
            occurrences: peaks.length
        };
    }

    private calculateAverageForDays(dailyData: { [day: number]: number }, days: number[]): number {
        const relevantValues = days
            .filter(day => dailyData[day] !== undefined)
            .map(day => dailyData[day]);
        
        if (relevantValues.length === 0) return 0;
        return relevantValues.reduce((sum, val) => sum + val, 0) / relevantValues.length;
    }

    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    private getMonthName(month: number): string {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return monthNames[month];
    }

    private calculateLinearRegression(data: TimeSeriesData[]): { slope: number; intercept: number; r_squared: number } {
        const n = data.length;
        if (n < 2) return { slope: 0, intercept: 0, r_squared: 0 };

        const x = data.map((_, i) => i);
        const y = data.map(d => d.value);

        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const yMean = sumY / n;
        const ssRes = y.reduce((sum, val, i) => sum + Math.pow(val - (slope * x[i] + intercept), 2), 0);
        const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
        const r_squared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

        return { slope, intercept, r_squared: Math.max(0, r_squared) };
    }

    private determineTrendType(slope: number, rSquared: number): 'upward' | 'downward' | 'stable' | 'volatile' | 'cyclical' {
        if (rSquared < 0.3) {
            return 'volatile';
        } else if (Math.abs(slope) < 0.1) {
            return 'stable';
        } else if (slope > 0) {
            return 'upward';
        } else {
            return 'downward';
        }
    }

    private calculateTrendStrength(rSquared: number, slope: number): number {
        return Math.min(0.95, rSquared * (1 + Math.abs(slope) * 0.1));
    }

    private calculateVolatility(data: TimeSeriesData[], regression: { slope: number; intercept: number }): number {
        const residuals = data.map((point, i) => {
            const predicted = regression.slope * i + regression.intercept;
            return Math.abs(point.value - predicted);
        });

        const meanResidual = residuals.reduce((sum, val) => sum + val, 0) / residuals.length;
        const meanValue = data.reduce((sum, point) => sum + point.value, 0) / data.length;

        return meanValue === 0 ? 0 : meanResidual / meanValue;
    }

    private async detectTrendBreakpoints(data: TimeSeriesData[]): Promise<any[]> {
        // Simplified breakpoint detection
        // In a real implementation, this would use statistical change point detection
        return [];
    }

    private determineBusinessSignificance(trendStrength: number, slope: number): 'high' | 'medium' | 'low' | 'negligible' {
        const magnitude = Math.abs(slope);
        
        if (trendStrength > 0.7 && magnitude > 1.0) {
            return 'high';
        } else if (trendStrength > 0.5 && magnitude > 0.5) {
            return 'medium';
        } else if (trendStrength > 0.3 && magnitude > 0.1) {
            return 'low';
        } else {
            return 'negligible';
        }
    }

    private async storeTrendAnalysis(analysis: TrendAnalysis): Promise<void> {
        const query = `
            INSERT INTO trend_analysis (
                qr_code_id, metric_type, trend_type, trend_strength, trend_direction,
                trend_start_date, trend_duration_days, r_squared, trend_equation,
                volatility_score, business_significance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (qr_code_id, metric_type) 
            DO UPDATE SET
                trend_type = EXCLUDED.trend_type,
                trend_strength = EXCLUDED.trend_strength,
                trend_direction = EXCLUDED.trend_direction,
                r_squared = EXCLUDED.r_squared,
                trend_equation = EXCLUDED.trend_equation,
                volatility_score = EXCLUDED.volatility_score,
                business_significance = EXCLUDED.business_significance,
                updated_at = CURRENT_TIMESTAMP;
        `;

        await this.db.query(query, [
            analysis.qr_code_id,
            analysis.metric_type,
            analysis.trend_type,
            analysis.trend_strength,
            analysis.trend_direction,
            analysis.trend_start_date,
            analysis.trend_duration_days,
            analysis.r_squared,
            analysis.trend_equation,
            analysis.volatility_score,
            analysis.business_significance
        ]);
    }

    // ============ MISSING METHODS ============

    private async detectSeasonalPatterns(data: TimeSeriesData[]): Promise<Pattern[]> {
        const patterns: Pattern[] = [];
        
        // Detect holiday patterns
        const holidayData = this.groupByHolidayPeriods(data);
        if (holidayData.strength > 0.4) {
            patterns.push({
                pattern_type: 'seasonal',
                pattern_name: 'Holiday Season Pattern',
                pattern_description: 'Higher activity during holiday periods',
                pattern_data: holidayData,
                pattern_strength: holidayData.strength,
                confidence_level: 0.7,
                occurrences: holidayData.occurrences,
                recommendations: [
                    {
                        type: 'campaign',
                        action: 'holiday_campaigns',
                        details: 'Plan special campaigns for holiday periods'
                    }
                ]
            });
        }

        return patterns;
    }

    private groupByHolidayPeriods(data: TimeSeriesData[]): any {
        const holidayPeriods = [
            { start: '11-20', end: '12-31', name: 'Winter Holidays' },
            { start: '07-01', end: '08-31', name: 'Summer' },
            { start: '03-15', end: '04-15', name: 'Spring' }
        ];

        let totalHolidayValue = 0;
        let totalRegularValue = 0;
        let holidayCount = 0;
        let regularCount = 0;

        data.forEach(point => {
            const date = new Date(point.date);
            const monthDay = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            
            const isHoliday = holidayPeriods.some(period => {
                return monthDay >= period.start && monthDay <= period.end;
            });

            if (isHoliday) {
                totalHolidayValue += point.value;
                holidayCount++;
            } else {
                totalRegularValue += point.value;
                regularCount++;
            }
        });

        const holidayAvg = holidayCount > 0 ? totalHolidayValue / holidayCount : 0;
        const regularAvg = regularCount > 0 ? totalRegularValue / regularCount : 0;
        const strength = regularAvg > 0 ? Math.min(0.95, Math.abs(holidayAvg - regularAvg) / regularAvg) : 0;

        return {
            strength,
            holiday_avg: holidayAvg,
            regular_avg: regularAvg,
            occurrences: holidayCount
        };
    }

    private async storePatterns(patterns: Pattern[], qrCodeId?: string): Promise<void> {
        if (patterns.length === 0) return;

        const query = `
            INSERT INTO pattern_analysis (
                qr_code_id, pattern_type, pattern_name, pattern_description, pattern_data,
                pattern_strength, confidence_level, occurrences, recommendations
            ) VALUES ${patterns.map((_, i) => 
                `($1, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9})`
            ).join(', ')};
        `;

        const values = [qrCodeId];
        patterns.forEach(p => {
            values.push(
                p.pattern_type, p.pattern_name, p.pattern_description,
                JSON.stringify(p.pattern_data), p.pattern_strength?.toString() || '0', p.confidence_level?.toString() || '0',
                p.occurrences?.toString() || '0', JSON.stringify(p.recommendations)
            );
        });

        await this.db.query(query, values);
    }

    private decomposeTimeSeries(data: TimeSeriesData[]): SeasonalDecomposition {
        const values = data.map(d => d.value);
        const n = values.length;
        
        // Simple moving average for trend
        const trend = values.map((_, i) => {
            const start = Math.max(0, i - 3);
            const end = Math.min(n, i + 4);
            const subset = values.slice(start, end);
            return subset.reduce((sum, val) => sum + val, 0) / subset.length;
        });

        // Simple seasonal component (7-day cycle)
        const seasonal = values.map((_, i) => {
            const dayOfWeek = i % 7;
            const sameWeekdayValues = values.filter((_, j) => j % 7 === dayOfWeek);
            const weekdayAvg = sameWeekdayValues.reduce((sum, val) => sum + val, 0) / sameWeekdayValues.length;
            return weekdayAvg - values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        // Residual = original - trend - seasonal
        const residual = values.map((val, i) => val - trend[i] - seasonal[i]);

        return { trend, seasonal, residual, original: values };
    }

    private analyzeYearlySeasonality(seasonalComponent: number[]): SeasonalityResult {
        const amplitude = Math.max(...seasonalComponent) - Math.min(...seasonalComponent);
        const variance = this.calculateVariance(seasonalComponent);
        const mean = seasonalComponent.reduce((sum, val) => sum + val, 0) / seasonalComponent.length;
        const strength = variance > 0 ? Math.min(0.95, Math.sqrt(variance) / Math.abs(mean + 0.1)) : 0;

        return {
            type: 'yearly',
            period: 365,
            strength,
            amplitude,
            components: { monthly_pattern: this.calculateMonthlyComponents(seasonalComponent) }
        };
    }

    private analyzeWeeklySeasonality(data: TimeSeriesData[]): SeasonalityResult {
        const weeklyData = this.groupByDayOfWeek(data);
        const values = Object.values(weeklyData);
        const amplitude = Math.max(...values) - Math.min(...values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = this.calculateVariance(values);
        const strength = variance > 0 ? Math.min(0.95, Math.sqrt(variance) / Math.abs(mean + 0.1)) : 0;

        return {
            type: 'weekly',
            period: 7,
            strength,
            amplitude,
            components: weeklyData
        };
    }

    private analyzeDailySeasonality(data: TimeSeriesData[]): SeasonalityResult {
        const hourlyData = this.groupByHour(data);
        const values = Object.values(hourlyData);
        const amplitude = Math.max(...values) - Math.min(...values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = this.calculateVariance(values);
        const strength = variance > 0 ? Math.min(0.95, Math.sqrt(variance) / Math.abs(mean + 0.1)) : 0;

        return {
            type: 'daily',
            period: 24,
            strength,
            amplitude,
            components: hourlyData
        };
    }

    private selectDominantSeasonality(seasonalities: SeasonalityResult[]): SeasonalityResult {
        return seasonalities.reduce((dominant, current) => 
            current.strength > dominant.strength ? current : dominant
        );
    }

    private calculateMonthlyComponents(seasonalData: number[]): any {
        const monthlyComponents: { [month: number]: number } = {};
        
        for (let month = 0; month < 12; month++) {
            const monthlyValues = seasonalData.filter((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (seasonalData.length - 1 - i));
                return date.getMonth() === month;
            });
            
            if (monthlyValues.length > 0) {
                monthlyComponents[month] = monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length;
            }
        }
        
        return monthlyComponents;
    }

    private calculateYearOverYearGrowth(data: TimeSeriesData[]): number {
        if (data.length < 365) return 0;
        
        const currentYearStart = data.length - 365;
        const previousYearValues = data.slice(0, 365);
        const currentYearValues = data.slice(currentYearStart);
        
        const previousYearAvg = previousYearValues.reduce((sum, d) => sum + d.value, 0) / previousYearValues.length;
        const currentYearAvg = currentYearValues.reduce((sum, d) => sum + d.value, 0) / currentYearValues.length;
        
        return previousYearAvg > 0 ? (currentYearAvg - previousYearAvg) / previousYearAvg * 100 : 0;
    }

    private async storeSeasonalityAnalysis(analysis: SeasonalityAnalysis): Promise<void> {
        const query = `
            INSERT INTO seasonality_analysis (
                qr_code_id, metric_type, seasonality_type, season_period, seasonal_components,
                seasonal_strength, seasonal_amplitude, year_over_year_growth, is_statistically_significant
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (qr_code_id, metric_type) 
            DO UPDATE SET
                seasonality_type = EXCLUDED.seasonality_type,
                season_period = EXCLUDED.season_period,
                seasonal_components = EXCLUDED.seasonal_components,
                seasonal_strength = EXCLUDED.seasonal_strength,
                seasonal_amplitude = EXCLUDED.seasonal_amplitude,
                year_over_year_growth = EXCLUDED.year_over_year_growth,
                is_statistically_significant = EXCLUDED.is_statistically_significant,
                updated_at = CURRENT_TIMESTAMP;
        `;

        await this.db.query(query, [
            analysis.qr_code_id,
            analysis.metric_type,
            analysis.seasonality_type,
            analysis.season_period,
            JSON.stringify(analysis.seasonal_components),
            analysis.seasonal_strength,
            analysis.seasonal_amplitude,
            analysis.year_over_year_growth,
            analysis.is_statistically_significant
        ]);
    }

    // ============ DATA RETRIEVAL METHODS ============

    private async getActivePatterns(qrCodeId?: string): Promise<Pattern[]> {
        const query = `
            SELECT * FROM pattern_analysis 
            WHERE qr_code_id = $1 AND is_active = true
            ORDER BY pattern_strength DESC;
        `;
        
        const result = await this.db.query(query, [qrCodeId]);
        return result.rows;
    }

    private async getLatestTrendAnalysis(qrCodeId?: string): Promise<TrendAnalysis | null> {
        const query = `
            SELECT * FROM trend_analysis 
            WHERE qr_code_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1;
        `;
        
        const result = await this.db.query(query, [qrCodeId]);
        return result.rows[0] || null;
    }

    private async getLatestSeasonalityAnalysis(qrCodeId?: string): Promise<SeasonalityAnalysis | null> {
        const query = `
            SELECT * FROM seasonality_analysis 
            WHERE qr_code_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1;
        `;
        
        const result = await this.db.query(query, [qrCodeId]);
        return result.rows[0] || null;
    }

    private async getLatestPredictions(qrCodeId?: string): Promise<PredictionResult[]> {
        const query = `
            SELECT * FROM prediction_results 
            WHERE qr_code_id = $1 
            AND prediction_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY prediction_date DESC 
            LIMIT 10;
        `;
        
        const result = await this.db.query(query, [qrCodeId]);
        return result.rows;
    }

    // ============ RECOMMENDATION GENERATION METHODS ============

    private generateTimingRecommendations(patterns: Pattern[], userId: string, qrCodeId?: string): OptimizationRecommendation[] {
        const recommendations: OptimizationRecommendation[] = [];
        
        patterns.forEach(pattern => {
            if (pattern.pattern_type === 'daily' && pattern.pattern_strength > 0.6) {
                recommendations.push({
                    qr_code_id: qrCodeId,
                    user_id: userId,
                    recommendation_type: 'timing',
                    priority: 'high',
                    title: 'Optimize Campaign Timing',
                    description: `Schedule campaigns during peak hours based on ${pattern.pattern_name}`,
                    predicted_impact: { scan_increase: '15-25%' },
                    implementation_effort: 'low',
                    confidence_score: pattern.confidence_level,
                    expected_roi: 1.2,
                    time_sensitivity: 'immediate'
                });
            }
            
            if (pattern.pattern_type === 'weekly' && pattern.pattern_strength > 0.5) {
                recommendations.push({
                    qr_code_id: qrCodeId,
                    user_id: userId,
                    recommendation_type: 'timing',
                    priority: 'medium',
                    title: 'Weekly Schedule Optimization',
                    description: `Adjust weekly campaign schedule based on ${pattern.pattern_name}`,
                    predicted_impact: { scan_increase: '10-20%' },
                    implementation_effort: 'medium',
                    confidence_score: pattern.confidence_level,
                    expected_roi: 1.15,
                    time_sensitivity: 'within_week'
                });
            }
        });
        
        return recommendations;
    }

    private generateContentRecommendations(trend: TrendAnalysis, userId: string, qrCodeId?: string): OptimizationRecommendation[] {
        const recommendations: OptimizationRecommendation[] = [];
        
        if (trend.trend_type === 'downward' && trend.business_significance !== 'negligible') {
            recommendations.push({
                qr_code_id: qrCodeId,
                user_id: userId,
                recommendation_type: 'content',
                priority: 'high',
                title: 'Combat Declining Engagement',
                description: 'Refresh QR code content to reverse downward trend',
                predicted_impact: { trend_reversal: true, engagement_boost: '20-30%' },
                implementation_effort: 'medium',
                confidence_score: trend.trend_strength,
                expected_roi: 1.5,
                time_sensitivity: 'immediate'
            });
        }
        
        return recommendations;
    }

    private generateCampaignRecommendations(seasonality: SeasonalityAnalysis, userId: string, qrCodeId?: string): OptimizationRecommendation[] {
        const recommendations: OptimizationRecommendation[] = [];
        
        if (seasonality.is_statistically_significant && seasonality.seasonal_strength > 0.5) {
            recommendations.push({
                qr_code_id: qrCodeId,
                user_id: userId,
                recommendation_type: 'campaign',
                priority: 'medium',
                title: 'Seasonal Campaign Strategy',
                description: `Leverage ${seasonality.seasonality_type} seasonality patterns for campaign planning`,
                predicted_impact: { seasonal_boost: '25-40%' },
                implementation_effort: 'high',
                confidence_score: 0.8,
                expected_roi: 1.3,
                time_sensitivity: 'within_month'
            });
        }
        
        return recommendations;
    }

    private generateTechnicalRecommendations(predictions: PredictionResult[], userId: string, qrCodeId?: string): OptimizationRecommendation[] {
        const recommendations: OptimizationRecommendation[] = [];
        
        const lowConfidencePredictions = predictions.filter(p => (p.confidence_score || 0) < 0.7);
        
        if (lowConfidencePredictions.length > predictions.length * 0.3) {
            recommendations.push({
                qr_code_id: qrCodeId,
                user_id: userId,
                recommendation_type: 'technical',
                priority: 'medium',
                title: 'Improve Prediction Accuracy',
                description: 'Enhance data collection to improve prediction model performance',
                predicted_impact: { accuracy_improvement: '10-15%' },
                implementation_effort: 'high',
                confidence_score: 0.7,
                expected_roi: 1.1,
                time_sensitivity: 'ongoing'
            });
        }
        
        return recommendations;
    }

    private async storeOptimizationRecommendations(recommendations: OptimizationRecommendation[]): Promise<void> {
        if (recommendations.length === 0) return;

        const query = `
            INSERT INTO optimization_recommendations (
                qr_code_id, user_id, recommendation_type, priority, title, description,
                predicted_impact, implementation_effort, confidence_score, expected_roi, time_sensitivity
            ) VALUES ${recommendations.map((_, i) => 
                `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, 
                 $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`
            ).join(', ')};
        `;

        const values = recommendations.flatMap(r => [
            r.qr_code_id, r.user_id, r.recommendation_type, r.priority, r.title, r.description,
            JSON.stringify(r.predicted_impact), r.implementation_effort, r.confidence_score,
            r.expected_roi, r.time_sensitivity
        ]);

        await this.db.query(query, values);
    }

    private async calculateTrendMetrics(qrCodeId: string, patternType: string, startDate: Date, endDate: Date): Promise<{
        slope: number;
        rSquared: number;
        confidenceInterval: [number, number];
        dataPoints: number;
    }> {
        // Get time series data for the specified period
        const query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as scan_count
            FROM qr_scans 
            WHERE qr_code_id = $1 
            AND created_at BETWEEN $2 AND $3
            GROUP BY DATE(created_at)
            ORDER BY date;
        `;
        
        const result = await this.db.query(query, [qrCodeId, startDate, endDate]);
        const dataPoints = result.rows;

        if (dataPoints.length < 3) {
            return {
                slope: 0,
                rSquared: 0,
                confidenceInterval: [0, 0],
                dataPoints: dataPoints.length
            };
        }

        // Convert dates to numeric values for regression
        const baseDate = new Date(dataPoints[0].date).getTime();
        const x = dataPoints.map((_, i) => i);
        const y = dataPoints.map(row => parseFloat(row.scan_count));

        // Calculate linear regression
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const yMean = sumY / n;
        const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const residualSumSquares = y.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        
        const rSquared = 1 - (residualSumSquares / totalSumSquares);

        // Calculate 95% confidence interval for slope
        const standardError = Math.sqrt(residualSumSquares / (n - 2)) / Math.sqrt(sumXX - (sumX * sumX) / n);
        const tValue = 1.96; // Approximate 95% confidence for large samples
        const marginOfError = tValue * standardError;

        return {
            slope,
            rSquared: Math.max(0, rSquared), // Ensure non-negative
            confidenceInterval: [slope - marginOfError, slope + marginOfError],
            dataPoints: n
        };
    }

    private calculatePValue(trendData: { slope: number; rSquared: number; dataPoints: number }): number {
        // Simplified p-value calculation based on t-test
        // For a more robust implementation, use proper statistical libraries
        const { slope, rSquared, dataPoints } = trendData;
        
        if (dataPoints < 3) return 1.0;

        // Calculate t-statistic
        const standardError = Math.sqrt((1 - rSquared) / (dataPoints - 2));
        const tStatistic = Math.abs(slope) / (standardError + 0.001); // Add small value to prevent division by zero

        // Approximate p-value based on t-statistic
        // This is a simplified approximation
        if (tStatistic > 2.58) return 0.01;   // 99% confidence
        if (tStatistic > 1.96) return 0.05;   // 95% confidence
        if (tStatistic > 1.64) return 0.1;    // 90% confidence
        return Math.min(1.0, 2 * Math.exp(-0.717 * tStatistic - 0.416 * tStatistic * tStatistic));
    }

    private async calculateForecastAccuracy(qrCodeId: string, startDate: Date, endDate: Date): Promise<number> {
        // Get actual values for the period
        const actualQuery = `
            SELECT COUNT(*) as actual_count
            FROM qr_scans 
            WHERE qr_code_id = $1 
            AND created_at BETWEEN $2 AND $3;
        `;
        
        const actualResult = await this.db.query(actualQuery, [qrCodeId, startDate, endDate]);
        const actualCount = parseFloat(actualResult.rows[0].actual_count);

        // Get the most recent prediction for this QR code
        const predictionQuery = `
            SELECT prediction_value
            FROM prediction_results 
            WHERE qr_code_id = $1 
            AND prediction_date <= $2
            ORDER BY created_at DESC 
            LIMIT 1;
        `;
        
        const predictionResult = await this.db.query(predictionQuery, [qrCodeId, startDate]);
        
        if (predictionResult.rows.length === 0) {
            return 0.5; // Default accuracy when no prediction exists
        }

        const predictedCount = predictionResult.rows[0].prediction_value;
        
        if (actualCount === 0 && predictedCount === 0) {
            return 1.0; // Perfect accuracy for zero values
        }

        // Calculate Mean Absolute Percentage Error (MAPE)
        const mape = Math.abs(actualCount - predictedCount) / Math.max(actualCount, 1);
        const accuracy = Math.max(0, 1 - mape);

        return Math.min(1.0, accuracy);
    }
}