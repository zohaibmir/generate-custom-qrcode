-- ===============================================
-- REAL-TIME ALERTS ENGINE MIGRATION
-- Migration: 002_add_alerts_system
-- Date: 13 November 2025
-- ===============================================

-- Alert rules table for defining alert conditions
CREATE TABLE IF NOT EXISTS alert_rules (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id VARCHAR(255), -- NULL for global alerts
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- 'threshold', 'anomaly', 'trend', 'custom'
    metric_type VARCHAR(100) NOT NULL, -- 'scans', 'conversion_rate', 'response_time', etc.
    conditions JSONB NOT NULL, -- Alert condition configuration
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    is_active BOOLEAN DEFAULT true,
    cooldown_minutes INTEGER DEFAULT 15, -- Cooldown period between alerts
    aggregation_window INTEGER DEFAULT 5, -- Minutes to aggregate data
    notification_channels TEXT[] DEFAULT ARRAY['email'], -- 'email', 'sms', 'slack', 'webhook'
    notification_settings JSONB DEFAULT '{}', -- Channel-specific settings
    last_triggered TIMESTAMP WITH TIME ZONE,
    triggered_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert instances table for tracking triggered alerts
CREATE TABLE IF NOT EXISTS alert_instances (
    id VARCHAR(255) PRIMARY KEY,
    alert_rule_id VARCHAR(255) NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    qr_code_id VARCHAR(255), -- NULL for global alerts
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'muted'
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    trigger_value DECIMAL(15,2),
    threshold_value DECIMAL(15,2),
    metric_data JSONB DEFAULT '{}', -- Raw metric data that triggered alert
    context_data JSONB DEFAULT '{}', -- Additional context (location, device, etc.)
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    muted_until TIMESTAMP WITH TIME ZONE,
    acknowledgment JSONB DEFAULT '{}', -- User acknowledgment data
    resolution_notes TEXT
);

-- Alert notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS alert_notifications (
    id SERIAL PRIMARY KEY,
    alert_instance_id VARCHAR(255) NOT NULL REFERENCES alert_instances(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'slack', 'webhook'
    recipient VARCHAR(500) NOT NULL, -- Email, phone, webhook URL, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert escalations table for escalation rules
CREATE TABLE IF NOT EXISTS alert_escalations (
    id SERIAL PRIMARY KEY,
    alert_rule_id VARCHAR(255) NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    delay_minutes INTEGER NOT NULL DEFAULT 30, -- Delay before escalation
    notification_channels TEXT[] NOT NULL, -- Additional channels for escalation
    recipients JSONB NOT NULL, -- Additional recipients
    escalation_message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert metrics table for tracking alert performance
CREATE TABLE IF NOT EXISTS alert_metrics (
    id SERIAL PRIMARY KEY,
    alert_rule_id VARCHAR(255) NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    date_bucket DATE NOT NULL, -- Daily aggregation bucket
    triggers_count INTEGER DEFAULT 0,
    false_positive_count INTEGER DEFAULT 0,
    average_resolution_time INTERVAL,
    notifications_sent INTEGER DEFAULT 0,
    notifications_failed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (alert_rule_id, date_bucket)
);

-- Alert suppression rules table for managing noise
CREATE TABLE IF NOT EXISTS alert_suppressions (
    id SERIAL PRIMARY KEY,
    alert_rule_id VARCHAR(255) REFERENCES alert_rules(id) ON DELETE CASCADE,
    suppression_type VARCHAR(50) NOT NULL, -- 'time_based', 'condition_based', 'manual'
    suppression_config JSONB NOT NULL, -- Configuration for suppression
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert webhooks table for webhook configurations
CREATE TABLE IF NOT EXISTS alert_webhooks (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    authentication JSONB DEFAULT '{}', -- Auth config (API key, bearer token, etc.)
    payload_template JSONB DEFAULT '{}', -- Custom payload template
    retry_config JSONB DEFAULT '{"maxRetries": 3, "retryDelay": 5}',
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_qr_code_id ON alert_rules(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric_type ON alert_rules(metric_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active ON alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_last_triggered ON alert_rules(last_triggered DESC);

CREATE INDEX IF NOT EXISTS idx_alert_instances_alert_rule_id ON alert_instances(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_severity ON alert_instances(severity);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at ON alert_instances(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_instance_id ON alert_notifications(alert_instance_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_channel ON alert_notifications(channel);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_sent_at ON alert_notifications(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_escalations_alert_rule_id ON alert_escalations(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_escalations_escalation_level ON alert_escalations(escalation_level);

CREATE INDEX IF NOT EXISTS idx_alert_metrics_alert_rule_id ON alert_metrics(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_metrics_date_bucket ON alert_metrics(date_bucket DESC);

CREATE INDEX IF NOT EXISTS idx_alert_suppressions_alert_rule_id ON alert_suppressions(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_suppressions_is_active ON alert_suppressions(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_suppressions_start_time ON alert_suppressions(start_time);
CREATE INDEX IF NOT EXISTS idx_alert_suppressions_end_time ON alert_suppressions(end_time);

CREATE INDEX IF NOT EXISTS idx_alert_webhooks_user_id ON alert_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_webhooks_is_active ON alert_webhooks(is_active);

-- Insert default alert rule templates
INSERT INTO alert_rules (
    id, 
    user_id, 
    name, 
    description, 
    rule_type, 
    metric_type, 
    conditions, 
    severity, 
    notification_channels, 
    notification_settings
) SELECT 
    'default_high_scans_' || generate_random_uuid(),
    u.id,
    'High Scan Volume',
    'Alert when QR code receives unusually high scan volume',
    'threshold',
    'scans_per_minute',
    '{"operator": "greater_than", "threshold": 100, "window_minutes": 5}',
    'medium',
    ARRAY['email'],
    '{"email": {"template": "high_volume_alert"}}'
FROM (SELECT id FROM users LIMIT 1) u
WHERE EXISTS (SELECT 1 FROM users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO alert_rules (
    id, 
    user_id, 
    name, 
    description, 
    rule_type, 
    metric_type, 
    conditions, 
    severity, 
    notification_channels, 
    notification_settings
) SELECT 
    'default_error_rate_' || generate_random_uuid(),
    u.id,
    'High Error Rate',
    'Alert when QR code error rate exceeds threshold',
    'threshold',
    'error_rate',
    '{"operator": "greater_than", "threshold": 5.0, "window_minutes": 10}',
    'high',
    ARRAY['email', 'sms'],
    '{"email": {"template": "error_rate_alert"}, "sms": {"template": "error_rate_sms"}}'
FROM (SELECT id FROM users LIMIT 1) u
WHERE EXISTS (SELECT 1 FROM users)
ON CONFLICT (id) DO NOTHING;

-- Create functions for alert management
CREATE OR REPLACE FUNCTION evaluate_threshold_alert(
    p_metric_value DECIMAL,
    p_threshold_config JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    threshold_value DECIMAL;
    operator_type TEXT;
BEGIN
    threshold_value := (p_threshold_config->>'threshold')::DECIMAL;
    operator_type := p_threshold_config->>'operator';
    
    CASE operator_type
        WHEN 'greater_than' THEN
            RETURN p_metric_value > threshold_value;
        WHEN 'greater_than_or_equal' THEN
            RETURN p_metric_value >= threshold_value;
        WHEN 'less_than' THEN
            RETURN p_metric_value < threshold_value;
        WHEN 'less_than_or_equal' THEN
            RETURN p_metric_value <= threshold_value;
        WHEN 'equals' THEN
            RETURN p_metric_value = threshold_value;
        WHEN 'not_equals' THEN
            RETURN p_metric_value != threshold_value;
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_alert_cooldown(
    p_alert_rule_id VARCHAR,
    p_cooldown_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    last_triggered TIMESTAMP WITH TIME ZONE;
    cooldown_end TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT last_triggered INTO last_triggered
    FROM alert_rules 
    WHERE id = p_alert_rule_id;
    
    IF last_triggered IS NULL THEN
        RETURN TRUE; -- No previous trigger, allow alert
    END IF;
    
    cooldown_end := last_triggered + (p_cooldown_minutes || ' minutes')::INTERVAL;
    
    RETURN CURRENT_TIMESTAMP > cooldown_end;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_alert_rule_trigger(
    p_alert_rule_id VARCHAR
) RETURNS VOID AS $$
BEGIN
    UPDATE alert_rules 
    SET last_triggered = CURRENT_TIMESTAMP,
        triggered_count = triggered_count + 1
    WHERE id = p_alert_rule_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_resolved_alerts()
RETURNS void AS $$
BEGIN
    -- Auto-resolve alerts older than 24 hours without updates
    UPDATE alert_instances 
    SET status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP,
        resolution_notes = 'Auto-resolved: No activity for 24 hours'
    WHERE status = 'active' 
    AND triggered_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND id NOT IN (
        SELECT DISTINCT alert_instance_id 
        FROM alert_notifications 
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
    );
    
    -- Delete old resolved alerts (older than 30 days)
    DELETE FROM alert_instances 
    WHERE status = 'resolved' 
    AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON alert_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_webhooks_updated_at 
    BEFORE UPDATE ON alert_webhooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for easier querying
CREATE OR REPLACE VIEW active_alerts_overview AS
SELECT 
    ai.id,
    ai.qr_code_id,
    ar.name as rule_name,
    ai.title,
    ai.severity,
    ai.status,
    ai.trigger_value,
    ai.threshold_value,
    ai.triggered_at,
    ar.notification_channels,
    COUNT(an.id) as notification_count,
    COUNT(CASE WHEN an.status = 'failed' THEN 1 END) as failed_notifications
FROM alert_instances ai
JOIN alert_rules ar ON ai.alert_rule_id = ar.id
LEFT JOIN alert_notifications an ON ai.id = an.alert_instance_id
WHERE ai.status = 'active'
GROUP BY ai.id, ai.qr_code_id, ar.name, ai.title, ai.severity, 
         ai.status, ai.trigger_value, ai.threshold_value, 
         ai.triggered_at, ar.notification_channels;

CREATE OR REPLACE VIEW alert_performance_metrics AS
SELECT 
    ar.id as alert_rule_id,
    ar.name as rule_name,
    ar.metric_type,
    ar.severity,
    COUNT(ai.id) as total_alerts,
    COUNT(CASE WHEN ai.status = 'resolved' THEN 1 END) as resolved_alerts,
    AVG(EXTRACT(EPOCH FROM (ai.resolved_at - ai.triggered_at))/60) as avg_resolution_time_minutes,
    COUNT(CASE WHEN an.status = 'failed' THEN 1 END) as failed_notifications,
    MAX(ai.triggered_at) as last_alert_time
FROM alert_rules ar
LEFT JOIN alert_instances ai ON ar.id = ai.alert_rule_id
LEFT JOIN alert_notifications an ON ai.id = an.alert_instance_id
WHERE ar.is_active = true
GROUP BY ar.id, ar.name, ar.metric_type, ar.severity;

-- Migration complete
SELECT 'Real-time Alerts Engine migration completed successfully' as result;