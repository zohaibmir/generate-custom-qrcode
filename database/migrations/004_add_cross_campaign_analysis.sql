-- Cross-campaign Analysis Database Schema
-- Advanced analytics for campaign comparison, A/B testing, and optimization

-- ============================================
-- 1. CAMPAIGN GROUPS AND EXPERIMENTS
-- ============================================

-- Campaign Groups for organizing related campaigns
CREATE TABLE IF NOT EXISTS campaign_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objective VARCHAR(100) NOT NULL CHECK (objective IN ('awareness', 'engagement', 'conversion', 'retention')),
    target_metrics JSONB DEFAULT '[]'::jsonb, -- Array of key metrics to track
    budget_total DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Variants for A/B testing
CREATE TABLE IF NOT EXISTS campaign_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    qr_code_id VARCHAR(255) NOT NULL, -- Links to QR code in main system
    variant_name VARCHAR(255) NOT NULL,
    variant_type VARCHAR(50) NOT NULL CHECK (variant_type IN ('control', 'variant_a', 'variant_b', 'variant_c')),
    traffic_allocation DECIMAL(5,2) DEFAULT 100.00 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
    configuration JSONB DEFAULT '{}'::jsonb, -- Stores variant-specific settings
    hypothesis TEXT, -- What we're testing
    expected_outcome TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- A/B Test Experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    experiment_name VARCHAR(255) NOT NULL,
    hypothesis TEXT NOT NULL,
    primary_metric VARCHAR(100) NOT NULL, -- Main metric to optimize
    secondary_metrics JSONB DEFAULT '[]'::jsonb,
    statistical_power DECIMAL(5,2) DEFAULT 0.80, -- Desired statistical power
    significance_level DECIMAL(5,2) DEFAULT 0.05, -- Alpha level
    minimum_detectable_effect DECIMAL(5,2) DEFAULT 0.05, -- MDE percentage
    sample_size_per_variant INTEGER,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'stopped', 'inconclusive')),
    winner_variant_id UUID REFERENCES campaign_variants(id),
    confidence_level DECIMAL(5,2),
    results_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CROSS-CAMPAIGN METRICS AND PERFORMANCE
-- ============================================

-- Campaign Performance Snapshots
CREATE TABLE IF NOT EXISTS campaign_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES campaign_variants(id) ON DELETE CASCADE,
    date_recorded DATE NOT NULL,
    
    -- Core Metrics
    total_scans INTEGER DEFAULT 0,
    unique_scans INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(8,4) DEFAULT 0.00,
    bounce_rate DECIMAL(8,4) DEFAULT 0.00,
    
    -- Engagement Metrics
    avg_session_duration DECIMAL(8,2) DEFAULT 0.00,
    page_views INTEGER DEFAULT 0,
    clicks_per_scan DECIMAL(8,4) DEFAULT 0.00,
    
    -- Business Metrics
    revenue DECIMAL(12,2) DEFAULT 0.00,
    cost DECIMAL(12,2) DEFAULT 0.00,
    roas DECIMAL(8,4) DEFAULT 0.00, -- Return on Ad Spend
    cpa DECIMAL(8,2) DEFAULT 0.00, -- Cost Per Acquisition
    ltv DECIMAL(12,2) DEFAULT 0.00, -- Lifetime Value
    
    -- Geographic and Demographic
    top_countries JSONB DEFAULT '[]'::jsonb,
    device_breakdown JSONB DEFAULT '{}'::jsonb,
    platform_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Time-based Performance
    peak_hours JSONB DEFAULT '[]'::jsonb,
    day_of_week_performance JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cohort Analysis Data
CREATE TABLE IF NOT EXISTS cohort_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    cohort_date DATE NOT NULL, -- When users first scanned
    period_number INTEGER NOT NULL, -- Days/weeks/months since first scan
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Cohort Metrics
    initial_users INTEGER NOT NULL,
    returning_users INTEGER DEFAULT 0,
    retention_rate DECIMAL(8,4) DEFAULT 0.00,
    cumulative_revenue DECIMAL(12,2) DEFAULT 0.00,
    avg_revenue_per_user DECIMAL(8,2) DEFAULT 0.00,
    
    -- Engagement Metrics
    avg_scans_per_user DECIMAL(8,2) DEFAULT 0.00,
    avg_session_duration DECIMAL(8,2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_group_id, cohort_date, period_number, period_type)
);

-- ============================================
-- 3. ATTRIBUTION AND FUNNEL ANALYSIS
-- ============================================

-- Attribution Models
CREATE TABLE IF NOT EXISTS attribution_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('first_touch', 'last_touch', 'linear', 'time_decay', 'position_based', 'data_driven')),
    configuration JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Attribution Results
CREATE TABLE IF NOT EXISTS attribution_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribution_model_id UUID REFERENCES attribution_models(id) ON DELETE CASCADE,
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    conversion_id VARCHAR(255) NOT NULL, -- Links to conversion event
    
    -- Attribution Details
    touchpoint_sequence JSONB NOT NULL, -- Array of touchpoints leading to conversion
    attribution_weights JSONB NOT NULL, -- Credit assigned to each touchpoint
    total_attribution_value DECIMAL(12,2) DEFAULT 0.00,
    
    -- Conversion Details
    conversion_type VARCHAR(100) NOT NULL,
    conversion_value DECIMAL(12,2) DEFAULT 0.00,
    conversion_timestamp TIMESTAMPTZ NOT NULL,
    time_to_conversion INTERVAL,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Conversion Funnel Stages
CREATE TABLE IF NOT EXISTS funnel_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    stage_description TEXT,
    success_criteria JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_group_id, stage_order)
);

-- Funnel Performance
CREATE TABLE IF NOT EXISTS funnel_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES campaign_variants(id) ON DELETE CASCADE,
    funnel_stage_id UUID REFERENCES funnel_stages(id) ON DELETE CASCADE,
    date_recorded DATE NOT NULL,
    
    -- Funnel Metrics
    stage_entries INTEGER DEFAULT 0,
    stage_completions INTEGER DEFAULT 0,
    stage_exits INTEGER DEFAULT 0,
    completion_rate DECIMAL(8,4) DEFAULT 0.00,
    avg_time_in_stage DECIMAL(8,2) DEFAULT 0.00,
    
    -- Segment Analysis
    segments_breakdown JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_group_id, variant_id, funnel_stage_id, date_recorded)
);

-- ============================================
-- 4. STATISTICAL ANALYSIS AND TESTING
-- ============================================

-- Statistical Test Results
CREATE TABLE IF NOT EXISTS statistical_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ab_experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('t_test', 'chi_square', 'mann_whitney', 'bayesian')),
    metric_name VARCHAR(100) NOT NULL,
    
    -- Test Configuration
    alpha DECIMAL(5,4) DEFAULT 0.05,
    power DECIMAL(5,4) DEFAULT 0.80,
    two_tailed BOOLEAN DEFAULT true,
    
    -- Test Results
    test_statistic DECIMAL(12,6),
    p_value DECIMAL(12,10),
    confidence_interval_lower DECIMAL(12,6),
    confidence_interval_upper DECIMAL(12,6),
    effect_size DECIMAL(8,6),
    
    -- Sample Data
    control_sample_size INTEGER,
    treatment_sample_size INTEGER,
    control_mean DECIMAL(12,6),
    treatment_mean DECIMAL(12,6),
    control_variance DECIMAL(12,6),
    treatment_variance DECIMAL(12,6),
    
    -- Conclusions
    is_significant BOOLEAN DEFAULT false,
    recommendation VARCHAR(500),
    
    test_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cross-Campaign Comparisons
CREATE TABLE IF NOT EXISTS campaign_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    comparison_name VARCHAR(255) NOT NULL,
    compared_groups JSONB NOT NULL, -- Array of campaign_group_ids
    
    -- Comparison Configuration
    comparison_metrics JSONB DEFAULT '[]'::jsonb,
    time_range_start DATE,
    time_range_end DATE,
    normalization_method VARCHAR(50) DEFAULT 'none' CHECK (normalization_method IN ('none', 'per_day', 'per_budget', 'per_impression')),
    
    -- Results
    performance_summary JSONB DEFAULT '{}'::jsonb,
    insights JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. OPTIMIZATION RECOMMENDATIONS
-- ============================================

-- Campaign Optimization Recommendations
CREATE TABLE IF NOT EXISTS campaign_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_group_id UUID REFERENCES campaign_groups(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL CHECK (recommendation_type IN (
        'budget_reallocation', 'traffic_split', 'creative_optimization', 
        'targeting_adjustment', 'timing_optimization', 'bidding_strategy',
        'audience_expansion', 'funnel_improvement'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Recommendation Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rationale TEXT NOT NULL,
    
    -- Impact Predictions
    predicted_lift_percentage DECIMAL(8,4),
    confidence_score DECIMAL(5,4) DEFAULT 0.00,
    expected_roi DECIMAL(8,4),
    implementation_effort VARCHAR(20) CHECK (implementation_effort IN ('low', 'medium', 'high')),
    time_to_impact_days INTEGER,
    
    -- Implementation Details
    action_items JSONB DEFAULT '[]'::jsonb,
    required_resources JSONB DEFAULT '[]'::jsonb,
    success_metrics JSONB DEFAULT '[]'::jsonb,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'implemented', 'rejected', 'expired')),
    implemented_at TIMESTAMPTZ,
    actual_impact JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

-- Campaign Groups Indexes
CREATE INDEX idx_campaign_groups_user_id ON campaign_groups(user_id);
CREATE INDEX idx_campaign_groups_status ON campaign_groups(status);
CREATE INDEX idx_campaign_groups_date_range ON campaign_groups(start_date, end_date);

-- Campaign Variants Indexes
CREATE INDEX idx_campaign_variants_group_id ON campaign_variants(campaign_group_id);
CREATE INDEX idx_campaign_variants_qr_code_id ON campaign_variants(qr_code_id);
CREATE INDEX idx_campaign_variants_type ON campaign_variants(variant_type);

-- Performance Indexes
CREATE INDEX idx_campaign_performance_group_id ON campaign_performance(campaign_group_id);
CREATE INDEX idx_campaign_performance_variant_id ON campaign_performance(variant_id);
CREATE INDEX idx_campaign_performance_date ON campaign_performance(date_recorded);
CREATE INDEX idx_campaign_performance_composite ON campaign_performance(campaign_group_id, variant_id, date_recorded);

-- Cohort Analysis Indexes
CREATE INDEX idx_cohort_analysis_group_id ON cohort_analysis(campaign_group_id);
CREATE INDEX idx_cohort_analysis_date_period ON cohort_analysis(cohort_date, period_number, period_type);

-- Attribution Indexes
CREATE INDEX idx_attribution_results_model_id ON attribution_results(attribution_model_id);
CREATE INDEX idx_attribution_results_campaign_id ON attribution_results(campaign_group_id);
CREATE INDEX idx_attribution_results_timestamp ON attribution_results(conversion_timestamp);

-- Statistical Tests Indexes
CREATE INDEX idx_statistical_tests_experiment_id ON statistical_tests(ab_experiment_id);
CREATE INDEX idx_statistical_tests_metric ON statistical_tests(metric_name);
CREATE INDEX idx_statistical_tests_significant ON statistical_tests(is_significant);

-- Recommendations Indexes
CREATE INDEX idx_campaign_recommendations_group_id ON campaign_recommendations(campaign_group_id);
CREATE INDEX idx_campaign_recommendations_type ON campaign_recommendations(recommendation_type);
CREATE INDEX idx_campaign_recommendations_priority ON campaign_recommendations(priority);
CREATE INDEX idx_campaign_recommendations_status ON campaign_recommendations(status);

-- ============================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================

-- Campaign Performance Summary View
CREATE OR REPLACE VIEW campaign_performance_summary AS
SELECT 
    cg.id as campaign_group_id,
    cg.name as campaign_name,
    cg.objective,
    cv.id as variant_id,
    cv.variant_name,
    cv.variant_type,
    
    -- Aggregated Metrics (Last 30 days)
    SUM(cp.total_scans) as total_scans,
    SUM(cp.unique_scans) as unique_scans,
    SUM(cp.conversion_count) as total_conversions,
    AVG(cp.conversion_rate) as avg_conversion_rate,
    SUM(cp.revenue) as total_revenue,
    SUM(cp.cost) as total_cost,
    CASE 
        WHEN SUM(cp.cost) > 0 THEN SUM(cp.revenue) / SUM(cp.cost)
        ELSE 0 
    END as roas,
    
    -- Performance Trends
    COUNT(cp.date_recorded) as days_active,
    MIN(cp.date_recorded) as first_active_date,
    MAX(cp.date_recorded) as last_active_date
    
FROM campaign_groups cg
JOIN campaign_variants cv ON cg.id = cv.campaign_group_id
LEFT JOIN campaign_performance cp ON cv.id = cp.variant_id 
    AND cp.date_recorded >= CURRENT_DATE - INTERVAL '30 days'
WHERE cg.status = 'active'
GROUP BY cg.id, cg.name, cg.objective, cv.id, cv.variant_name, cv.variant_type;

-- A/B Test Results View
CREATE OR REPLACE VIEW ab_test_results_summary AS
SELECT 
    ae.id as experiment_id,
    ae.experiment_name,
    ae.hypothesis,
    ae.primary_metric,
    ae.status,
    ae.confidence_level,
    
    -- Statistical Significance
    st.p_value,
    st.is_significant,
    st.effect_size,
    st.recommendation,
    
    -- Variant Performance
    cv_control.variant_name as control_variant,
    cv_treatment.variant_name as treatment_variant,
    st.control_mean,
    st.treatment_mean,
    
    -- Sample Sizes
    st.control_sample_size,
    st.treatment_sample_size,
    
    ae.start_date,
    ae.end_date
    
FROM ab_experiments ae
LEFT JOIN statistical_tests st ON ae.id = st.ab_experiment_id
LEFT JOIN campaign_variants cv_control ON ae.campaign_group_id = cv_control.campaign_group_id 
    AND cv_control.variant_type = 'control'
LEFT JOIN campaign_variants cv_treatment ON ae.campaign_group_id = cv_treatment.campaign_group_id 
    AND cv_treatment.id = ae.winner_variant_id
WHERE st.metric_name = ae.primary_metric OR st.metric_name IS NULL;

-- Campaign ROI Comparison View
CREATE OR REPLACE VIEW campaign_roi_comparison AS
SELECT 
    cg.user_id,
    cg.id as campaign_group_id,
    cg.name as campaign_name,
    cg.objective,
    
    -- Financial Metrics
    SUM(cp.revenue) as total_revenue,
    SUM(cp.cost) as total_cost,
    SUM(cp.revenue) - SUM(cp.cost) as profit,
    CASE 
        WHEN SUM(cp.cost) > 0 THEN (SUM(cp.revenue) - SUM(cp.cost)) / SUM(cp.cost) * 100
        ELSE 0 
    END as roi_percentage,
    
    -- Efficiency Metrics  
    CASE 
        WHEN SUM(cp.total_scans) > 0 THEN SUM(cp.cost) / SUM(cp.total_scans)
        ELSE 0 
    END as cost_per_scan,
    CASE 
        WHEN SUM(cp.conversion_count) > 0 THEN SUM(cp.cost) / SUM(cp.conversion_count)
        ELSE 0 
    END as cost_per_conversion,
    
    -- Performance Ranking
    RANK() OVER (PARTITION BY cg.user_id ORDER BY 
        CASE 
            WHEN SUM(cp.cost) > 0 THEN SUM(cp.revenue) / SUM(cp.cost)
            ELSE 0 
        END DESC
    ) as roi_rank
    
FROM campaign_groups cg
LEFT JOIN campaign_variants cv ON cg.id = cv.campaign_group_id
LEFT JOIN campaign_performance cp ON cv.id = cp.variant_id
WHERE cp.date_recorded >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cg.user_id, cg.id, cg.name, cg.objective
HAVING SUM(cp.cost) > 0;

-- ============================================
-- 8. TRIGGER FUNCTIONS FOR AUTO-UPDATES
-- ============================================

-- Function to update campaign group status based on dates
CREATE OR REPLACE FUNCTION update_campaign_group_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-complete campaigns that have passed end date
    UPDATE campaign_groups 
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE end_date < CURRENT_DATE AND status = 'active';
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update campaign status daily
CREATE OR REPLACE TRIGGER trigger_update_campaign_status
    AFTER INSERT OR UPDATE ON campaign_groups
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_campaign_group_status();

-- Function to calculate cohort metrics
CREATE OR REPLACE FUNCTION calculate_cohort_metrics(
    p_campaign_group_id UUID,
    p_cohort_date DATE,
    p_period_type VARCHAR(20) DEFAULT 'weekly'
)
RETURNS TABLE (
    period_number INTEGER,
    retention_rate DECIMAL(8,4),
    revenue_per_user DECIMAL(8,2)
) AS $$
DECLARE
    initial_users INTEGER;
    interval_text TEXT;
BEGIN
    -- Set interval based on period type
    CASE p_period_type
        WHEN 'daily' THEN interval_text := '1 day';
        WHEN 'weekly' THEN interval_text := '1 week';
        WHEN 'monthly' THEN interval_text := '1 month';
        ELSE interval_text := '1 week';
    END CASE;
    
    -- Get initial cohort size
    SELECT COUNT(DISTINCT user_id) INTO initial_users
    FROM qr_scans qs
    JOIN campaign_variants cv ON qs.qr_code_id = cv.qr_code_id
    WHERE cv.campaign_group_id = p_campaign_group_id
    AND DATE(qs.created_at) = p_cohort_date;
    
    -- Return cohort metrics for each period
    RETURN QUERY
    WITH periods AS (
        SELECT generate_series(0, 12) as period_num
    ),
    cohort_data AS (
        SELECT 
            p.period_num,
            COUNT(DISTINCT qs.user_id) as returning_users,
            SUM(qs.revenue) as total_revenue
        FROM periods p
        LEFT JOIN qr_scans qs ON DATE(qs.created_at) BETWEEN 
            p_cohort_date + (p.period_num || ' ' || interval_text)::INTERVAL
            AND p_cohort_date + ((p.period_num + 1) || ' ' || interval_text)::INTERVAL - INTERVAL '1 day'
        LEFT JOIN campaign_variants cv ON qs.qr_code_id = cv.qr_code_id
        WHERE cv.campaign_group_id = p_campaign_group_id
        GROUP BY p.period_num
    )
    SELECT 
        cd.period_num::INTEGER,
        CASE 
            WHEN initial_users > 0 THEN (cd.returning_users::DECIMAL / initial_users * 100)::DECIMAL(8,4)
            ELSE 0::DECIMAL(8,4)
        END,
        CASE 
            WHEN cd.returning_users > 0 THEN (cd.total_revenue / cd.returning_users)::DECIMAL(8,2)
            ELSE 0::DECIMAL(8,2)
        END
    FROM cohort_data cd
    ORDER BY cd.period_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample attribution model
INSERT INTO attribution_models (user_id, model_name, model_type, is_default)
VALUES ('user-123', 'Default Linear Attribution', 'linear', true);

-- Insert sample campaign group
INSERT INTO campaign_groups (id, user_id, name, description, objective, target_metrics, budget_total, start_date, end_date)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'user-123', 'Summer Sale Campaign', 'Promotional campaign for summer products', 'conversion', 
     '["conversion_rate", "roas", "cpa"]'::jsonb, 5000.00, '2024-06-01', '2024-08-31'),
    ('550e8400-e29b-41d4-a716-446655440002', 'user-123', 'Brand Awareness Campaign', 'Building brand recognition', 'awareness',
     '["reach", "impressions", "engagement"]'::jsonb, 3000.00, '2024-07-01', '2024-09-30');

-- Insert sample campaign variants
INSERT INTO campaign_variants (campaign_group_id, qr_code_id, variant_name, variant_type, traffic_allocation, hypothesis)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'qr-summer-control', 'Original Design', 'control', 50.00, 'Current design performs well'),
    ('550e8400-e29b-41d4-a716-446655440001', 'qr-summer-variant', 'New Call-to-Action', 'variant_a', 50.00, 'Stronger CTA will increase conversions');

COMMIT;