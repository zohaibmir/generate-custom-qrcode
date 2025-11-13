-- ===============================================
-- PREDICTIVE ANALYTICS ENGINE MIGRATION
-- Migration: 003_add_predictive_analytics
-- Date: 13 November 2025
-- ===============================================

-- Prediction models table for storing ML model configurations and metadata
CREATE TABLE IF NOT EXISTS prediction_models (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id VARCHAR(255), -- NULL for global models
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL, -- 'time_series', 'trend_analysis', 'seasonality', 'anomaly_detection'
    algorithm VARCHAR(100) NOT NULL, -- 'linear_regression', 'arima', 'lstm', 'prophet', 'moving_average'
    target_metric VARCHAR(100) NOT NULL, -- 'scans', 'conversions', 'revenue', etc.
    model_config JSONB NOT NULL DEFAULT '{}', -- Algorithm-specific configuration
    training_data_config JSONB NOT NULL DEFAULT '{}', -- Data preprocessing and feature config
    model_metadata JSONB DEFAULT '{}', -- Model performance metrics, validation scores
    model_file_path VARCHAR(500), -- Path to serialized model file
    model_status VARCHAR(50) DEFAULT 'training', -- 'training', 'trained', 'deployed', 'deprecated'
    accuracy_score DECIMAL(5,4), -- Model accuracy/performance score
    training_samples INTEGER DEFAULT 0,
    feature_importance JSONB DEFAULT '{}', -- Feature importance scores
    last_trained TIMESTAMP WITH TIME ZONE,
    last_prediction TIMESTAMP WITH TIME ZONE,
    prediction_horizon_days INTEGER DEFAULT 30, -- How many days to predict forward
    retrain_frequency_days INTEGER DEFAULT 7, -- How often to retrain
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prediction results table for storing forecast outputs
CREATE TABLE IF NOT EXISTS prediction_results (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL REFERENCES prediction_models(id) ON DELETE CASCADE,
    qr_code_id VARCHAR(255), -- NULL for global predictions
    prediction_date DATE NOT NULL, -- Date the prediction was made
    target_date DATE NOT NULL, -- Date being predicted for
    predicted_value DECIMAL(15,2) NOT NULL,
    confidence_interval_lower DECIMAL(15,2),
    confidence_interval_upper DECIMAL(15,2),
    confidence_score DECIMAL(5,4), -- 0.0 to 1.0
    actual_value DECIMAL(15,2), -- Filled in later for validation
    prediction_error DECIMAL(15,2), -- Difference between predicted and actual
    prediction_metadata JSONB DEFAULT '{}', -- Additional prediction context
    seasonal_component DECIMAL(15,2), -- Seasonal component of prediction
    trend_component DECIMAL(15,2), -- Trend component of prediction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pattern analysis table for identifying recurring patterns
CREATE TABLE IF NOT EXISTS pattern_analysis (
    id SERIAL PRIMARY KEY,
    qr_code_id VARCHAR(255), -- NULL for global patterns
    pattern_type VARCHAR(100) NOT NULL, -- 'daily', 'weekly', 'monthly', 'seasonal', 'event_driven'
    pattern_name VARCHAR(255) NOT NULL,
    pattern_description TEXT,
    pattern_data JSONB NOT NULL, -- Pattern characteristics and parameters
    pattern_strength DECIMAL(5,4) NOT NULL, -- 0.0 to 1.0, how strong the pattern is
    confidence_level DECIMAL(5,4) NOT NULL, -- Statistical confidence in pattern
    occurrences INTEGER DEFAULT 1, -- How many times pattern was observed
    first_observed DATE,
    last_observed DATE,
    next_predicted_occurrence DATE,
    pattern_deviation DECIMAL(15,2) DEFAULT 0, -- How much variance from pattern
    impact_score DECIMAL(5,4), -- Business impact of this pattern
    recommendations JSONB DEFAULT '[]', -- Optimization recommendations
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trend analysis table for tracking long-term trends
CREATE TABLE IF NOT EXISTS trend_analysis (
    id SERIAL PRIMARY KEY,
    qr_code_id VARCHAR(255), -- NULL for global trends
    metric_type VARCHAR(100) NOT NULL,
    trend_type VARCHAR(50) NOT NULL, -- 'upward', 'downward', 'stable', 'volatile', 'cyclical'
    trend_strength DECIMAL(5,4) NOT NULL, -- 0.0 to 1.0
    trend_direction DECIMAL(10,6) NOT NULL, -- Slope of trend line
    trend_start_date DATE NOT NULL,
    trend_end_date DATE,
    trend_duration_days INTEGER,
    r_squared DECIMAL(5,4), -- Goodness of fit for trend line
    trend_equation VARCHAR(255), -- Mathematical representation of trend
    predicted_continuation JSONB, -- Future trend predictions
    trend_factors JSONB DEFAULT '[]', -- Factors influencing the trend
    breakpoint_detected BOOLEAN DEFAULT false, -- Whether trend changed significantly
    breakpoint_date DATE, -- When trend change occurred
    volatility_score DECIMAL(5,4), -- How stable the trend is
    business_significance VARCHAR(50), -- 'high', 'medium', 'low', 'negligible'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seasonality analysis table for identifying seasonal patterns
CREATE TABLE IF NOT EXISTS seasonality_analysis (
    id SERIAL PRIMARY KEY,
    qr_code_id VARCHAR(255), -- NULL for global seasonality
    metric_type VARCHAR(100) NOT NULL,
    seasonality_type VARCHAR(50) NOT NULL, -- 'yearly', 'quarterly', 'monthly', 'weekly', 'daily'
    season_period INTEGER NOT NULL, -- Period length (e.g., 365 for yearly)
    seasonal_components JSONB NOT NULL, -- Seasonal decomposition components
    peak_periods JSONB DEFAULT '[]', -- Peak seasonal periods
    trough_periods JSONB DEFAULT '[]', -- Low seasonal periods
    seasonal_amplitude DECIMAL(15,2), -- Magnitude of seasonal variation
    seasonal_strength DECIMAL(5,4), -- 0.0 to 1.0, how pronounced seasonality is
    detrended_data JSONB, -- Data with trend removed for seasonal analysis
    seasonal_forecast JSONB, -- Future seasonal predictions
    year_over_year_growth DECIMAL(10,4), -- YoY growth rate
    seasonal_adjustments JSONB DEFAULT '{}', -- Recommended seasonal adjustments
    is_statistically_significant BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimization recommendations table
CREATE TABLE IF NOT EXISTS optimization_recommendations (
    id SERIAL PRIMARY KEY,
    qr_code_id VARCHAR(255), -- NULL for global recommendations
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL, -- 'timing', 'content', 'placement', 'campaign', 'technical'
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation_data JSONB DEFAULT '{}', -- Structured recommendation details
    predicted_impact JSONB, -- Expected improvements (scans, conversions, etc.)
    implementation_effort VARCHAR(20), -- 'low', 'medium', 'high'
    implementation_steps JSONB DEFAULT '[]', -- Step-by-step implementation guide
    supporting_evidence JSONB DEFAULT '{}', -- Data supporting the recommendation
    related_patterns TEXT[], -- Related pattern IDs that support this recommendation
    confidence_score DECIMAL(5,4), -- Confidence in recommendation effectiveness
    expected_roi DECIMAL(10,4), -- Expected return on investment
    time_sensitivity VARCHAR(50), -- 'immediate', 'within_week', 'within_month', 'ongoing'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'implemented', 'rejected', 'expired'
    implemented_at TIMESTAMP WITH TIME ZONE,
    measured_impact JSONB, -- Actual impact after implementation
    feedback_score INTEGER, -- User feedback 1-5
    feedback_notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Model training history for tracking model performance over time
CREATE TABLE IF NOT EXISTS model_training_history (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL REFERENCES prediction_models(id) ON DELETE CASCADE,
    training_version INTEGER NOT NULL,
    training_start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    training_end_time TIMESTAMP WITH TIME ZONE,
    training_duration_seconds INTEGER,
    training_samples INTEGER,
    validation_samples INTEGER,
    test_samples INTEGER,
    hyperparameters JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}', -- MAE, RMSE, MAPE, R2, etc.
    cross_validation_scores JSONB DEFAULT '[]',
    feature_importance JSONB DEFAULT '{}',
    model_size_mb DECIMAL(10,4),
    training_error_log TEXT,
    training_status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    deployed_to_production BOOLEAN DEFAULT false,
    deployment_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prediction accuracy tracking
CREATE TABLE IF NOT EXISTS prediction_accuracy (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL REFERENCES prediction_models(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL,
    time_horizon_days INTEGER NOT NULL, -- How far ahead the prediction was for
    mae DECIMAL(15,6), -- Mean Absolute Error
    mape DECIMAL(5,4), -- Mean Absolute Percentage Error
    rmse DECIMAL(15,6), -- Root Mean Square Error
    r_squared DECIMAL(5,4), -- Coefficient of determination
    accuracy_percentage DECIMAL(5,2), -- Overall accuracy percentage
    samples_evaluated INTEGER,
    accuracy_by_horizon JSONB DEFAULT '{}', -- Accuracy breakdown by prediction horizon
    accuracy_by_season JSONB DEFAULT '{}', -- Seasonal accuracy variations
    outlier_count INTEGER DEFAULT 0,
    outlier_threshold_exceeded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_prediction_models_user_id ON prediction_models(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_models_qr_code_id ON prediction_models(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_prediction_models_model_type ON prediction_models(model_type);
CREATE INDEX IF NOT EXISTS idx_prediction_models_status ON prediction_models(model_status);
CREATE INDEX IF NOT EXISTS idx_prediction_models_is_active ON prediction_models(is_active);

CREATE INDEX IF NOT EXISTS idx_prediction_results_model_id ON prediction_results(model_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_qr_code_id ON prediction_results(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_date ON prediction_results(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_results_target_date ON prediction_results(target_date);

CREATE INDEX IF NOT EXISTS idx_pattern_analysis_qr_code_id ON pattern_analysis(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_pattern_analysis_pattern_type ON pattern_analysis(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_analysis_is_active ON pattern_analysis(is_active);
CREATE INDEX IF NOT EXISTS idx_pattern_analysis_strength ON pattern_analysis(pattern_strength DESC);

CREATE INDEX IF NOT EXISTS idx_trend_analysis_qr_code_id ON trend_analysis(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_metric_type ON trend_analysis(metric_type);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_trend_type ON trend_analysis(trend_type);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_start_date ON trend_analysis(trend_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_seasonality_analysis_qr_code_id ON seasonality_analysis(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_seasonality_analysis_metric_type ON seasonality_analysis(metric_type);
CREATE INDEX IF NOT EXISTS idx_seasonality_analysis_type ON seasonality_analysis(seasonality_type);
CREATE INDEX IF NOT EXISTS idx_seasonality_analysis_significant ON seasonality_analysis(is_statistically_significant);

CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_qr_code_id ON optimization_recommendations(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_user_id ON optimization_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_priority ON optimization_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_status ON optimization_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_type ON optimization_recommendations(recommendation_type);

CREATE INDEX IF NOT EXISTS idx_model_training_history_model_id ON model_training_history(model_id);
CREATE INDEX IF NOT EXISTS idx_model_training_history_version ON model_training_history(training_version);
CREATE INDEX IF NOT EXISTS idx_model_training_history_status ON model_training_history(training_status);

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_model_id ON prediction_accuracy(model_id);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_date ON prediction_accuracy(evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_horizon ON prediction_accuracy(time_horizon_days);

-- Functions for predictive analytics calculations
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy(
    p_predicted DECIMAL,
    p_actual DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    IF p_actual = 0 THEN
        RETURN CASE WHEN p_predicted = 0 THEN 100.0 ELSE 0.0 END;
    END IF;
    
    RETURN GREATEST(0, 100.0 - ABS(p_predicted - p_actual) / ABS(p_actual) * 100.0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_moving_average(
    p_qr_code_id VARCHAR,
    p_metric_type VARCHAR,
    p_window_days INTEGER DEFAULT 7
) RETURNS DECIMAL AS $$
DECLARE
    avg_value DECIMAL;
BEGIN
    -- Calculate moving average for the specified window
    -- This would typically query scan_events or similar table
    -- Mock implementation for now
    RETURN 100.0 * RANDOM();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_trend_breakpoint(
    p_qr_code_id VARCHAR,
    p_metric_type VARCHAR,
    p_sensitivity DECIMAL DEFAULT 0.05
) RETURNS TABLE(
    breakpoint_date DATE,
    significance_score DECIMAL,
    trend_before DECIMAL,
    trend_after DECIMAL
) AS $$
BEGIN
    -- Detect significant trend changes using statistical methods
    -- Mock implementation for now
    RETURN QUERY SELECT 
        CURRENT_DATE - INTERVAL '30 days',
        0.85::DECIMAL,
        5.2::DECIMAL,
        12.7::DECIMAL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_seasonal_strength(
    p_data JSONB,
    p_period INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    seasonal_variance DECIMAL;
    total_variance DECIMAL;
BEGIN
    -- Calculate seasonal strength using variance decomposition
    -- Mock implementation for now
    RETURN 0.75 + RANDOM() * 0.25;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE TRIGGER update_prediction_models_updated_at 
    BEFORE UPDATE ON prediction_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pattern_analysis_updated_at 
    BEFORE UPDATE ON pattern_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trend_analysis_updated_at 
    BEFORE UPDATE ON trend_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasonality_analysis_updated_at 
    BEFORE UPDATE ON seasonality_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimization_recommendations_updated_at 
    BEFORE UPDATE ON optimization_recommendations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for easier querying
CREATE OR REPLACE VIEW prediction_model_performance AS
SELECT 
    pm.id,
    pm.model_name,
    pm.model_type,
    pm.target_metric,
    pm.accuracy_score,
    pm.last_trained,
    pm.prediction_horizon_days,
    AVG(pa.accuracy_percentage) as avg_accuracy,
    COUNT(pr.id) as total_predictions,
    COUNT(CASE WHEN pr.actual_value IS NOT NULL THEN 1 END) as validated_predictions,
    AVG(ABS(pr.prediction_error)) as avg_prediction_error
FROM prediction_models pm
LEFT JOIN prediction_results pr ON pm.id = pr.model_id
LEFT JOIN prediction_accuracy pa ON pm.id = pa.model_id
WHERE pm.model_status = 'deployed'
GROUP BY pm.id, pm.model_name, pm.model_type, pm.target_metric, 
         pm.accuracy_score, pm.last_trained, pm.prediction_horizon_days;

CREATE OR REPLACE VIEW active_patterns AS
SELECT 
    pa.id,
    pa.qr_code_id,
    pa.pattern_type,
    pa.pattern_name,
    pa.pattern_strength,
    pa.confidence_level,
    pa.next_predicted_occurrence,
    pa.impact_score,
    ta.trend_type,
    ta.trend_strength,
    sa.seasonal_strength
FROM pattern_analysis pa
LEFT JOIN trend_analysis ta ON pa.qr_code_id = ta.qr_code_id
LEFT JOIN seasonality_analysis sa ON pa.qr_code_id = sa.qr_code_id
WHERE pa.is_active = true
  AND pa.pattern_strength > 0.5;

CREATE OR REPLACE VIEW optimization_opportunities AS
SELECT 
    orec.id,
    orec.qr_code_id,
    orec.recommendation_type,
    orec.title,
    orec.priority,
    orec.expected_roi,
    orec.confidence_score,
    orec.time_sensitivity,
    orec.implementation_effort,
    COUNT(pa.id) as supporting_patterns,
    MAX(pa.pattern_strength) as strongest_supporting_pattern
FROM optimization_recommendations orec
LEFT JOIN pattern_analysis pa ON pa.id = ANY(
    SELECT unnest(string_to_array(orec.related_patterns::text, ','))::integer
)
WHERE orec.status = 'pending'
  AND orec.expires_at > CURRENT_DATE
GROUP BY orec.id, orec.qr_code_id, orec.recommendation_type, orec.title, 
         orec.priority, orec.expected_roi, orec.confidence_score, 
         orec.time_sensitivity, orec.implementation_effort
ORDER BY orec.expected_roi DESC, orec.confidence_score DESC;

-- Insert sample prediction models for testing
INSERT INTO prediction_models (
    id, user_id, model_name, model_type, algorithm, target_metric, 
    model_config, training_data_config, model_status, accuracy_score,
    prediction_horizon_days, retrain_frequency_days
) SELECT 
    'default_scan_predictor_' || gen_random_uuid()::text,
    u.id,
    'Scan Volume Predictor',
    'time_series',
    'arima',
    'scans',
    '{"order": [1,1,1], "seasonal_order": [1,1,1,7], "trend": "additive"}',
    '{"window_size": 30, "features": ["day_of_week", "hour", "season"], "normalization": "min_max"}',
    'trained',
    0.847,
    30,
    7
FROM (SELECT id FROM users LIMIT 1) u
WHERE EXISTS (SELECT 1 FROM users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prediction_models (
    id, user_id, model_name, model_type, algorithm, target_metric, 
    model_config, training_data_config, model_status, accuracy_score,
    prediction_horizon_days, retrain_frequency_days
) SELECT 
    'default_trend_analyzer_' || gen_random_uuid()::text,
    u.id,
    'Trend Analysis Model',
    'trend_analysis',
    'linear_regression',
    'scans',
    '{"polynomial_degree": 2, "regularization": 0.1, "confidence_interval": 0.95}',
    '{"lookback_days": 90, "min_data_points": 30, "outlier_threshold": 2.5}',
    'trained',
    0.782,
    14,
    14
FROM (SELECT id FROM users LIMIT 1) u
WHERE EXISTS (SELECT 1 FROM users)
ON CONFLICT (id) DO NOTHING;

-- Migration complete
SELECT 'Predictive Analytics Engine migration completed successfully' as result;