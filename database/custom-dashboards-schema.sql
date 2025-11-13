-- Custom Dashboards System Schema
-- Advanced dashboard builder with widget management

-- Dashboard table for storing dashboard configurations
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB NOT NULL DEFAULT '{}',
    theme JSONB NOT NULL DEFAULT '{}',
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    shared_with TEXT[], -- Array of user IDs or roles
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_dashboard_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Widget table for storing individual dashboard widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id VARCHAR(255) PRIMARY KEY,
    dashboard_id VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- metric, chart, table, map, gauge, etc.
    title VARCHAR(255) NOT NULL,
    position JSONB NOT NULL, -- { x, y, width, height }
    configuration JSONB NOT NULL DEFAULT '{}', -- Widget-specific config
    data_source VARCHAR(100) NOT NULL, -- analytics, qr_codes, campaigns, etc.
    data_filters JSONB DEFAULT '{}', -- Filters for data queries
    refresh_interval INTEGER DEFAULT 30, -- Seconds
    is_visible BOOLEAN DEFAULT true,
    is_real_time BOOLEAN DEFAULT false,
    cache_duration INTEGER DEFAULT 300, -- Cache in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_widget_dashboard_id FOREIGN KEY (dashboard_id) REFERENCES analytics_dashboards(id) ON DELETE CASCADE
);

-- Dashboard templates table
CREATE TABLE IF NOT EXISTS dashboard_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    thumbnail_url VARCHAR(500),
    layout JSONB NOT NULL DEFAULT '{}',
    theme JSONB NOT NULL DEFAULT '{}',
    widget_configs JSONB NOT NULL DEFAULT '[]', -- Array of widget configurations
    tags TEXT[],
    is_premium BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Widget templates table for reusable widget configurations
CREATE TABLE IF NOT EXISTS widget_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    default_config JSONB NOT NULL DEFAULT '{}',
    default_position JSONB NOT NULL DEFAULT '{}',
    data_source VARCHAR(100) NOT NULL,
    supported_themes TEXT[],
    is_premium BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard sharing and collaboration
CREATE TABLE IF NOT EXISTS dashboard_shares (
    id SERIAL PRIMARY KEY,
    dashboard_id VARCHAR(255) NOT NULL,
    shared_by VARCHAR(255) NOT NULL,
    shared_with VARCHAR(255), -- User ID or null for public
    share_type VARCHAR(50) NOT NULL, -- 'view', 'edit', 'admin'
    access_token VARCHAR(255), -- For public sharing
    expires_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255), -- Optional password protection
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_share_dashboard_id FOREIGN KEY (dashboard_id) REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
    CONSTRAINT fk_share_shared_by FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_share_shared_with FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
);

-- Dashboard activity log
CREATE TABLE IF NOT EXISTS dashboard_activity_logs (
    id SERIAL PRIMARY KEY,
    dashboard_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'viewed', 'shared', 'exported'
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_activity_dashboard_id FOREIGN KEY (dashboard_id) REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Widget data cache for performance optimization
CREATE TABLE IF NOT EXISTS widget_data_cache (
    id SERIAL PRIMARY KEY,
    widget_id VARCHAR(255) NOT NULL,
    cache_key VARCHAR(500) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cache_widget_id FOREIGN KEY (widget_id) REFERENCES dashboard_widgets(id) ON DELETE CASCADE
);

-- Dashboard favorites
CREATE TABLE IF NOT EXISTS dashboard_favorites (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    dashboard_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_favorite_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_dashboard_id FOREIGN KEY (dashboard_id) REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_dashboard_favorite UNIQUE (user_id, dashboard_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_user_id ON analytics_dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_category ON analytics_dashboards(category);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_is_public ON analytics_dashboards(is_public);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_is_template ON analytics_dashboards(is_template);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_updated_at ON analytics_dashboards(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(type);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_data_source ON dashboard_widgets(data_source);

CREATE INDEX IF NOT EXISTS idx_dashboard_templates_category ON dashboard_templates(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_usage_count ON dashboard_templates(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_widget_templates_type ON widget_templates(type);
CREATE INDEX IF NOT EXISTS idx_widget_templates_category ON widget_templates(category);
CREATE INDEX IF NOT EXISTS idx_widget_templates_data_source ON widget_templates(data_source);

CREATE INDEX IF NOT EXISTS idx_dashboard_shares_dashboard_id ON dashboard_shares(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_access_token ON dashboard_shares(access_token);

CREATE INDEX IF NOT EXISTS idx_dashboard_activity_logs_dashboard_id ON dashboard_activity_logs(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_activity_logs_user_id ON dashboard_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_activity_logs_created_at ON dashboard_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_widget_data_cache_widget_id ON widget_data_cache(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_cache_key ON widget_data_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_expires_at ON widget_data_cache(expires_at);

-- Insert default widget templates
INSERT INTO widget_templates (id, name, description, type, category, icon, default_config, default_position, data_source) VALUES
('total_scans_widget', 'Total Scans', 'Display total number of QR code scans', 'metric', 'analytics', '📊', 
 '{"metric": "total_scans", "format": "number", "showTrend": true}',
 '{"x": 0, "y": 0, "width": 3, "height": 2}', 'analytics'),

('conversion_rate_widget', 'Conversion Rate', 'Show conversion rate percentage', 'metric', 'analytics', '🎯',
 '{"metric": "conversion_rate", "format": "percentage", "showTrend": true, "threshold": {"warning": 5, "critical": 2}}',
 '{"x": 3, "y": 0, "width": 3, "height": 2}', 'analytics'),

('scans_timeline_widget', 'Scans Timeline', 'Time series chart of QR scans', 'chart', 'analytics', '📈',
 '{"chartType": "line", "metric": "scans", "groupBy": "day", "timeRange": "30d"}',
 '{"x": 0, "y": 2, "width": 6, "height": 4}', 'analytics'),

('top_countries_widget', 'Top Countries', 'Bar chart of top countries by scans', 'chart', 'geographic', '🌍',
 '{"chartType": "bar", "metric": "scans", "groupBy": "country", "limit": 10}',
 '{"x": 6, "y": 0, "width": 3, "height": 4}', 'analytics'),

('qr_codes_table_widget', 'Top QR Codes', 'Table of best performing QR codes', 'table', 'qr_codes', '📋',
 '{"columns": ["name", "scans", "conversions", "created_at"], "sortBy": "scans", "sortOrder": "desc", "limit": 10}',
 '{"x": 0, "y": 6, "width": 6, "height": 4}', 'qr_codes'),

('geographic_heatmap_widget', 'Geographic Heatmap', 'World map showing scan distribution', 'map', 'geographic', '🗺️',
 '{"mapType": "world", "metric": "scans", "colorScheme": "viridis"}',
 '{"x": 6, "y": 4, "width": 6, "height": 6}', 'analytics'),

('revenue_metric_widget', 'Revenue', 'Total revenue from QR conversions', 'metric', 'ecommerce', '💰',
 '{"metric": "total_revenue", "format": "currency", "currency": "USD", "showTrend": true}',
 '{"x": 0, "y": 0, "width": 4, "height": 2}', 'ecommerce'),

('campaign_performance_widget', 'Campaign Performance', 'Multi-campaign comparison chart', 'chart', 'campaigns', '🎯',
 '{"chartType": "line", "metrics": ["scans", "conversions", "click_rate"], "groupBy": "campaign", "compareMode": true}',
 '{"x": 0, "y": 2, "width": 8, "height": 4}', 'campaigns');

-- Insert default dashboard templates
INSERT INTO dashboard_templates (id, name, description, category, thumbnail_url, layout, theme, widget_configs, tags) VALUES
('analytics_overview_template', 'Analytics Overview', 'Comprehensive analytics dashboard with key metrics and charts', 'analytics',
 '/assets/templates/analytics_overview.png',
 '{"columns": 12, "rowHeight": 60, "margin": [10, 10], "containerPadding": [20, 20]}',
 '{"mode": "light", "primaryColor": "#1890ff", "backgroundColor": "#ffffff", "cardBackground": "#fafafa"}',
 '[{"template": "total_scans_widget"}, {"template": "conversion_rate_widget"}, {"template": "scans_timeline_widget"}, {"template": "top_countries_widget"}, {"template": "qr_codes_table_widget"}, {"template": "geographic_heatmap_widget"}]',
 ARRAY['analytics', 'overview', 'dashboard']),

('marketing_dashboard_template', 'Marketing Dashboard', 'Campaign performance and marketing analytics', 'marketing',
 '/assets/templates/marketing_dashboard.png',
 '{"columns": 12, "rowHeight": 60, "margin": [15, 15], "containerPadding": [25, 25]}',
 '{"mode": "light", "primaryColor": "#e74c3c", "backgroundColor": "#ffffff", "cardBackground": "#fafafa"}',
 '[{"template": "campaign_performance_widget"}, {"template": "conversion_rate_widget"}, {"template": "top_countries_widget"}, {"template": "scans_timeline_widget"}]',
 ARRAY['marketing', 'campaigns', 'dashboard']),

('ecommerce_insights_template', 'E-commerce Insights', 'Revenue tracking and product performance', 'ecommerce',
 '/assets/templates/ecommerce_insights.png',
 '{"columns": 12, "rowHeight": 60, "margin": [12, 12], "containerPadding": [20, 20]}',
 '{"mode": "light", "primaryColor": "#27ae60", "backgroundColor": "#ffffff", "cardBackground": "#fafafa"}',
 '[{"template": "revenue_metric_widget"}, {"template": "conversion_rate_widget"}, {"template": "qr_codes_table_widget"}, {"template": "geographic_heatmap_widget"}]',
 ARRAY['ecommerce', 'revenue', 'dashboard']);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_widget_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM widget_data_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update dashboard activity
CREATE OR REPLACE FUNCTION log_dashboard_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO dashboard_activity_logs (dashboard_id, user_id, action, details)
        VALUES (NEW.id, NEW.user_id, 'updated', 
                json_build_object('changes', 
                    json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO dashboard_activity_logs (dashboard_id, user_id, action, details)
        VALUES (NEW.id, NEW.user_id, 'created', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
DROP TRIGGER IF EXISTS dashboard_activity_trigger ON analytics_dashboards;
CREATE TRIGGER dashboard_activity_trigger
    AFTER INSERT OR UPDATE ON analytics_dashboards
    FOR EACH ROW EXECUTE FUNCTION log_dashboard_activity();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamp
CREATE TRIGGER update_analytics_dashboards_updated_at 
    BEFORE UPDATE ON analytics_dashboards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at 
    BEFORE UPDATE ON dashboard_widgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for easier querying
CREATE OR REPLACE VIEW dashboard_overview AS
SELECT 
    d.id,
    d.name,
    d.description,
    d.category,
    d.is_public,
    d.is_template,
    d.is_favorite,
    d.view_count,
    d.created_at,
    d.updated_at,
    u.email as owner_email,
    u.full_name as owner_name,
    COUNT(w.id) as widget_count,
    COUNT(s.id) as share_count,
    ARRAY_AGG(DISTINCT d.tags) as all_tags
FROM analytics_dashboards d
LEFT JOIN users u ON d.user_id = u.id
LEFT JOIN dashboard_widgets w ON d.id = w.dashboard_id
LEFT JOIN dashboard_shares s ON d.id = s.dashboard_id
GROUP BY d.id, u.email, u.full_name;

-- View for widget analytics
CREATE OR REPLACE VIEW widget_usage_analytics AS
SELECT 
    wt.type,
    wt.category,
    wt.data_source,
    COUNT(w.id) as usage_count,
    AVG(w.refresh_interval) as avg_refresh_interval,
    COUNT(CASE WHEN w.is_real_time = true THEN 1 END) as real_time_count
FROM widget_templates wt
LEFT JOIN dashboard_widgets w ON w.type = wt.type
GROUP BY wt.type, wt.category, wt.data_source;

COMMENT ON TABLE analytics_dashboards IS 'Custom dashboard configurations and layouts';
COMMENT ON TABLE dashboard_widgets IS 'Individual widgets within dashboards';
COMMENT ON TABLE dashboard_templates IS 'Pre-built dashboard templates';
COMMENT ON TABLE widget_templates IS 'Reusable widget configurations';
COMMENT ON TABLE dashboard_shares IS 'Dashboard sharing and collaboration settings';
COMMENT ON TABLE dashboard_activity_logs IS 'Audit trail for dashboard activities';
COMMENT ON TABLE widget_data_cache IS 'Performance cache for widget data';
COMMENT ON TABLE dashboard_favorites IS 'User dashboard favorites';