CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    is_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Tokens table (for JWT refresh tokens, email verification, password reset)
CREATE TABLE user_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('refresh', 'email_verification', 'password_reset')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, type)
);

-- Indexes for user_tokens
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_token ON user_tokens(token);
CREATE INDEX idx_user_tokens_type ON user_tokens(type);
CREATE INDEX idx_user_tokens_expires_at ON user_tokens(expires_at);

-- QR Categories table
CREATE TABLE qr_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES qr_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(10) DEFAULT '📁',
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name, parent_id)
);

-- QR Codes table
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES qr_categories(id) ON DELETE SET NULL,
    short_id VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    design_config JSONB NOT NULL,
    target_url TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    max_scans INTEGER,
    current_scans INTEGER DEFAULT 0,
    password_hash VARCHAR(255),
    valid_schedule JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- QR Content Rules for Advanced Dynamic Features
CREATE TABLE qr_content_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('time', 'location', 'language', 'device')),
    rule_data JSONB NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('url', 'text', 'landing_page')),
    content_value TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for QR Content Rules
CREATE INDEX idx_qr_content_rules_qr_id ON qr_content_rules(qr_code_id);
CREATE INDEX idx_qr_content_rules_type ON qr_content_rules(rule_type);
CREATE INDEX idx_qr_content_rules_priority ON qr_content_rules(priority DESC);
CREATE INDEX idx_qr_content_rules_active ON qr_content_rules(is_active);

-- QR Content Rule Analytics
CREATE TABLE qr_rule_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES qr_content_rules(id) ON DELETE CASCADE,
    scan_event_id UUID, -- Links to scan events if available
    rule_matched BOOLEAN NOT NULL,
    execution_time_ms INTEGER,
    device_type VARCHAR(50),
    country VARCHAR(100),
    browser VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for QR Rule Analytics
CREATE INDEX idx_qr_rule_analytics_qr_id ON qr_rule_analytics(qr_code_id);
CREATE INDEX idx_qr_rule_analytics_rule_id ON qr_rule_analytics(rule_id);
CREATE INDEX idx_qr_rule_analytics_timestamp ON qr_rule_analytics(timestamp);
CREATE INDEX idx_qr_rule_analytics_matched ON qr_rule_analytics(rule_matched);

-- Scan Events for Analytics
CREATE TABLE scan_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(64),
    user_agent TEXT,
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    platform VARCHAR(50),
    device VARCHAR(50),
    referrer TEXT
);

-- Daily Analytics Summary
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_scans INTEGER DEFAULT 0,
    unique_scans INTEGER DEFAULT 0,
    top_platform VARCHAR(50),
    top_country VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(qr_code_id, date)
);

-- Subscription Plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    qr_limit INTEGER,
    analytics_retention_days INTEGER,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- File Uploads
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    upload_type VARCHAR(50) DEFAULT 'general',
    url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Messages (for notification persistence)
CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SMS Messages (for notification persistence)
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_phone VARCHAR(20) NOT NULL,
    from_phone VARCHAR(20),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification Templates (for future template management)
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    variables TEXT[], -- Array of variable names
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_qr_categories_user_id ON qr_categories(user_id);
CREATE INDEX idx_qr_categories_parent_id ON qr_categories(parent_id);
CREATE INDEX idx_qr_categories_name ON qr_categories(name);
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_codes_category_id ON qr_codes(category_id);
CREATE INDEX idx_qr_codes_short_id ON qr_codes(short_id);
CREATE INDEX idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX idx_qr_codes_design_config_gin ON qr_codes USING GIN (design_config);
CREATE INDEX idx_qr_codes_design_config_size ON qr_codes ((design_config->>'size'));
CREATE INDEX idx_qr_codes_design_config_pattern ON qr_codes ((design_config->>'pattern'));
CREATE INDEX idx_scan_events_qr_code_id ON scan_events(qr_code_id);
CREATE INDEX idx_scan_events_timestamp ON scan_events(timestamp);
CREATE INDEX idx_scan_events_country ON scan_events(country);
CREATE INDEX idx_scan_events_platform ON scan_events(platform);
CREATE INDEX idx_daily_analytics_qr_code_id ON daily_analytics(qr_code_id);
CREATE INDEX idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);
CREATE INDEX idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX idx_email_messages_status ON email_messages(status);
CREATE INDEX idx_email_messages_created_at ON email_messages(created_at);
CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at);
CREATE INDEX idx_notification_templates_name ON notification_templates(name);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price, qr_limit, analytics_retention_days, features) VALUES 
('Free', 0.00, 10, 30, '{"customization": "basic", "api_access": false, "team_features": false}'),
('Pro', 19.00, 500, 365, '{"customization": "advanced", "api_access": true, "team_features": false, "custom_domains": true}'),
('Business', 49.00, -1, 1095, '{"customization": "advanced", "api_access": true, "team_features": true, "custom_domains": true, "white_label": true}'),
('Enterprise', 199.00, -1, -1, '{"customization": "advanced", "api_access": true, "team_features": true, "custom_domains": true, "white_label": true, "priority_support": true}');

-- Insert default bulk QR templates
INSERT INTO qr_bulk_templates (name, description, template_type, field_mappings, default_values, validation_rules, qr_settings, is_system_template) VALUES 
('URL List', 'Bulk create QR codes from a list of URLs', 'url_list', 
 '{"name": "name", "url": "url", "description": "description"}',
 '{"type": "url", "design_config": {"size": 300, "errorCorrectionLevel": "M", "foregroundColor": "#000000", "backgroundColor": "#ffffff", "pattern": "square", "margin": 4}}',
 '{"url": {"required": true, "pattern": "^https?://.+"}, "name": {"required": true, "maxLength": 255}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true),

('Business Cards', 'Bulk create vCard QR codes for business contacts', 'vcard_bulk',
 '{"name": "name", "firstName": "first_name", "lastName": "last_name", "email": "email", "phone": "phone", "company": "company", "title": "title"}',
 '{"type": "vcard", "design_config": {"size": 350, "errorCorrectionLevel": "M", "foregroundColor": "#1f2937", "backgroundColor": "#ffffff", "pattern": "rounded", "frame": {"style": "rounded", "width": 10, "color": "#e5e7eb"}}}',
 '{"firstName": {"required": true}, "lastName": {"required": true}, "email": {"pattern": "^[^@]+@[^@]+\\.[^@]+$"}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true),

('Product Catalog', 'Bulk create QR codes for product listings', 'product_bulk',
 '{"name": "product_name", "sku": "sku", "url": "product_url", "price": "price", "category": "category"}',
 '{"type": "url", "design_config": {"size": 400, "errorCorrectionLevel": "H", "foregroundColor": "#059669", "backgroundColor": "#ffffff", "pattern": "dots", "eyePattern": {"outer": "rounded", "inner": "circle"}, "gradient": {"type": "linear", "colors": ["#059669", "#10b981"]}}}',
 '{"product_name": {"required": true}, "sku": {"required": true}, "product_url": {"required": true, "pattern": "^https?://.+"}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true),

('Event Tickets', 'Bulk create QR codes for event tickets and check-ins', 'event_tickets',
 '{"name": "ticket_name", "eventName": "event_name", "ticketId": "ticket_id", "seatNumber": "seat", "gateInfo": "gate"}',
 '{"type": "text", "design_config": {"foregroundColor": "#7c3aed", "backgroundColor": "#ffffff", "size": 200}}',
 '{"ticket_name": {"required": true}, "event_name": {"required": true}, "ticket_id": {"required": true}}',
 '{"errorCorrectionLevel": "H", "format": "png"}', true),

('WiFi Access', 'Bulk create WiFi QR codes for multiple locations', 'wifi_bulk',
 '{"name": "location_name", "ssid": "wifi_ssid", "password": "wifi_password", "security": "security_type"}',
 '{"type": "wifi", "design_config": {"foregroundColor": "#dc2626", "backgroundColor": "#ffffff", "size": 200}}',
 '{"location_name": {"required": true}, "wifi_ssid": {"required": true}, "security_type": {"enum": ["WPA", "WEP", "nopass"]}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true);

-- Create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO qr_categories (user_id, name, description, color, icon, is_default, sort_order)
    VALUES 
        (p_user_id, 'General', 'Default category for general QR codes', '#6B7280', '📋', true, 0),
        (p_user_id, 'Business', 'Business-related QR codes', '#3B82F6', '💼', true, 10),
        (p_user_id, 'Marketing', 'Marketing and promotional QR codes', '#EF4444', '�', true, 20),
        (p_user_id, 'Events', 'Event-related QR codes', '#10B981', '🎉', true, 30),
        (p_user_id, 'Personal', 'Personal QR codes', '#8B5CF6', '👤', true, 40)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- DYNAMIC QR CODES SYSTEM TABLES
-- ===============================================

-- QR Code Content Versions for Dynamic QRs
CREATE TABLE IF NOT EXISTS qr_content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content JSONB NOT NULL,
    redirect_url TEXT,
    is_active BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMP,
    activated_at TIMESTAMP,
    deactivated_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique version numbers per QR code
    UNIQUE(qr_code_id, version_number),
    -- Only one active version per QR code at a time
    EXCLUDE (qr_code_id WITH =) WHERE (is_active = true)
);

-- A/B Testing for Dynamic QRs
CREATE TABLE IF NOT EXISTS qr_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    variant_a_version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    variant_b_version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    traffic_split INTEGER DEFAULT 50 CHECK (traffic_split BETWEEN 0 AND 100),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    winner_variant VARCHAR(1) CHECK (winner_variant IN ('A', 'B')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic QR Redirect Rules
CREATE TABLE IF NOT EXISTS qr_redirect_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('geographic', 'device', 'time', 'custom')),
    conditions JSONB NOT NULL,
    target_version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    priority INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic QR Analytics (Enhanced)
CREATE TABLE IF NOT EXISTS qr_dynamic_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    version_id UUID REFERENCES qr_content_versions(id),
    ab_test_id UUID REFERENCES qr_ab_tests(id),
    variant VARCHAR(1), -- For A/B testing
    redirect_rule_id UUID REFERENCES qr_redirect_rules(id),
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    referrer TEXT,
    conversion_event VARCHAR(100),
    session_id VARCHAR(255),
    scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for performance
    INDEX idx_dynamic_analytics_qr_code (qr_code_id),
    INDEX idx_dynamic_analytics_version (version_id),
    INDEX idx_dynamic_analytics_timestamp (scan_timestamp),
    INDEX idx_dynamic_analytics_ab_test (ab_test_id, variant)
);

-- QR Content Scheduling
CREATE TABLE IF NOT EXISTS qr_content_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    schedule_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    repeat_pattern VARCHAR(50), -- 'none', 'daily', 'weekly', 'monthly'
    repeat_days INTEGER[], -- Days of week for weekly repeat (1-7)
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- INDEXES FOR DYNAMIC QR PERFORMANCE
-- ===============================================

-- Content versions indexes
CREATE INDEX IF NOT EXISTS idx_content_versions_qr_code ON qr_content_versions(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_active ON qr_content_versions(qr_code_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_versions_scheduled ON qr_content_versions(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- A/B testing indexes  
CREATE INDEX IF NOT EXISTS idx_ab_tests_qr_code ON qr_ab_tests(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON qr_ab_tests(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_ab_tests_dates ON qr_ab_tests(start_date, end_date);

-- Redirect rules indexes
CREATE INDEX IF NOT EXISTS idx_redirect_rules_qr_code ON qr_redirect_rules(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_redirect_rules_enabled ON qr_redirect_rules(qr_code_id, is_enabled, priority) WHERE is_enabled = true;

-- Content schedule indexes
CREATE INDEX IF NOT EXISTS idx_content_schedule_qr_code ON qr_content_schedule(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_content_schedule_active ON qr_content_schedule(is_active, start_time, end_time) WHERE is_active = true;

-- ===============================================
-- BULK QR GENERATION SYSTEM TABLES
-- ===============================================

-- Bulk QR Generation Batches
CREATE TABLE IF NOT EXISTS qr_bulk_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id VARCHAR(50), -- Optional template to use for all QRs
    category_id UUID REFERENCES qr_categories(id) ON DELETE SET NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    input_file_id UUID REFERENCES file_uploads(id),
    input_data JSONB, -- Store CSV data or array of QR requests
    error_log JSONB, -- Store processing errors
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    estimated_completion_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bulk QR Generation Items (Individual QR codes in a batch)
CREATE TABLE IF NOT EXISTS qr_bulk_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES qr_bulk_batches(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL, -- Null if creation failed
    row_number INTEGER NOT NULL, -- Original row number from CSV
    input_data JSONB NOT NULL, -- Original input data for this QR
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped')),
    error_message TEXT,
    error_details JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique row numbers within batch
    UNIQUE(batch_id, row_number)
);

-- Bulk QR Templates for common bulk operations
CREATE TABLE IF NOT EXISTS qr_bulk_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for system templates
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL, -- 'csv_mapping', 'url_list', 'vcard_bulk', etc.
    field_mappings JSONB NOT NULL, -- Map CSV columns to QR fields
    default_values JSONB, -- Default values for optional fields
    validation_rules JSONB, -- Validation rules for input data
    qr_settings JSONB, -- Default QR generation settings
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- BULK QR GENERATION INDEXES
-- ===============================================

-- Bulk batches indexes
CREATE INDEX IF NOT EXISTS idx_bulk_batches_user_id ON qr_bulk_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_status ON qr_bulk_batches(status);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_created_at ON qr_bulk_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_processing ON qr_bulk_batches(status, processing_started_at) WHERE status = 'processing';

-- Bulk items indexes
CREATE INDEX IF NOT EXISTS idx_bulk_items_batch_id ON qr_bulk_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_bulk_items_status ON qr_bulk_items(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_items_qr_code_id ON qr_bulk_items(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_bulk_items_row_number ON qr_bulk_items(batch_id, row_number);

-- Bulk templates indexes
CREATE INDEX IF NOT EXISTS idx_bulk_templates_user_id ON qr_bulk_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_templates_type ON qr_bulk_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_bulk_templates_system ON qr_bulk_templates(is_system_template) WHERE is_system_template = true;
CREATE INDEX IF NOT EXISTS idx_bulk_templates_active ON qr_bulk_templates(is_active) WHERE is_active = true;

-- ===============================================
-- BULK QR GENERATION FUNCTIONS
-- ===============================================

-- Function to update batch progress
CREATE OR REPLACE FUNCTION update_batch_progress(p_batch_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total INTEGER;
    v_processed INTEGER;
    v_success INTEGER;
    v_failed INTEGER;
    v_progress INTEGER;
BEGIN
    -- Get current counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('success', 'failed', 'skipped')),
        COUNT(*) FILTER (WHERE status = 'success'),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO v_total, v_processed, v_success, v_failed
    FROM qr_bulk_items 
    WHERE batch_id = p_batch_id;
    
    -- Calculate progress percentage
    v_progress := CASE 
        WHEN v_total > 0 THEN ROUND((v_processed::DECIMAL / v_total) * 100)
        ELSE 0 
    END;
    
    -- Update batch
    UPDATE qr_bulk_batches 
    SET 
        total_count = v_total,
        processed_count = v_processed,
        success_count = v_success,
        failed_count = v_failed,
        progress_percentage = v_progress,
        status = CASE 
            WHEN v_processed = v_total AND v_total > 0 THEN 'completed'
            WHEN v_processed > 0 THEN 'processing'
            ELSE status
        END,
        processing_completed_at = CASE 
            WHEN v_processed = v_total AND v_total > 0 THEN CURRENT_TIMESTAMP
            ELSE processing_completed_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get batch statistics
CREATE OR REPLACE FUNCTION get_batch_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_batches BIGINT,
    completed_batches BIGINT,
    processing_batches BIGINT,
    failed_batches BIGINT,
    total_qr_codes BIGINT,
    avg_batch_size NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_batches,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_batches,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_batches,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_batches,
        COALESCE(SUM(success_count), 0) as total_qr_codes,
        COALESCE(AVG(total_count), 0) as avg_batch_size,
        CASE 
            WHEN SUM(total_count) > 0 THEN 
                ROUND((SUM(success_count)::DECIMAL / SUM(total_count)) * 100, 2)
            ELSE 0
        END as success_rate
    FROM qr_bulk_batches
    WHERE user_id = p_user_id 
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- DYNAMIC QR HELPER FUNCTIONS
-- ===============================================

-- Function to activate scheduled content
CREATE OR REPLACE FUNCTION activate_scheduled_content()
RETURNS INTEGER AS $$
DECLARE
    activated_count INTEGER := 0;
BEGIN
    -- Activate scheduled versions that are due
    UPDATE qr_content_versions 
    SET is_active = true, activated_at = CURRENT_TIMESTAMP
    WHERE scheduled_at IS NOT NULL 
      AND scheduled_at <= CURRENT_TIMESTAMP 
      AND is_active = false;
    
    GET DIAGNOSTICS activated_count = ROW_COUNT;
    
    RETURN activated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active content version for QR
CREATE OR REPLACE FUNCTION get_active_qr_content(p_qr_code_id UUID)
RETURNS TABLE(
    version_id UUID,
    content JSONB,
    redirect_url TEXT,
    version_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.id as version_id,
        cv.content,
        cv.redirect_url,
        cv.version_number
    FROM qr_content_versions cv
    WHERE cv.qr_code_id = p_qr_code_id 
      AND cv.is_active = true
    ORDER BY cv.version_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- TEAM MANAGEMENT SCHEMA (Phase 4A)
-- ===================================

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_plan_id UUID,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization members table
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Organization invitations table
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    accepted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- Indexes for organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created_by ON organizations(created_by);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- Indexes for organization_members
CREATE INDEX idx_org_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);
CREATE INDEX idx_org_members_status ON organization_members(status);

-- Indexes for organization_invitations
CREATE INDEX idx_org_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX idx_org_invitations_expires_at ON organization_invitations(expires_at);

-- Add organization context to QR codes (for shared QR codes)
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS is_shared_with_team BOOLEAN DEFAULT false;

-- Index for QR codes organization context
CREATE INDEX IF NOT EXISTS idx_qr_codes_organization_id ON qr_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_shared_with_team ON qr_codes(is_shared_with_team);

-- Helper functions for team management
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE(
    organization_id UUID,
    organization_name VARCHAR(255),
    organization_slug VARCHAR(100),
    user_role VARCHAR(20),
    member_since TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        om.role,
        om.created_at
    FROM organizations o
    INNER JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = p_user_id 
      AND o.is_active = true 
      AND om.status = 'active'
    ORDER BY om.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_organization_permission(p_user_id UUID, p_organization_id UUID, p_permission VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(20);
    has_permission BOOLEAN := false;
BEGIN
    -- Get user role in organization
    SELECT role INTO user_role
    FROM organization_members
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id 
      AND status = 'active';
    
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check permissions based on role and permission type
    CASE 
        WHEN user_role = 'owner' THEN
            has_permission := true;
        WHEN user_role = 'admin' THEN
            has_permission := p_permission NOT IN ('organization.delete', 'organization.manage_billing');
        WHEN user_role = 'editor' THEN
            has_permission := p_permission IN ('organization.read', 'qr_codes.create', 'qr_codes.read', 'qr_codes.update', 'qr_codes.share_with_team', 'analytics.view_own');
        WHEN user_role = 'viewer' THEN
            has_permission := p_permission IN ('organization.read', 'qr_codes.read');
        ELSE
            has_permission := false;
    END CASE;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Database initialization complete

-- ===============================================
-- PAYMENT INTEGRATION TABLES
-- ===============================================

-- Payment Methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('stripe', 'klarna', 'swish', 'paypal')),
    type VARCHAR(50) NOT NULL,
    card_data JSONB,
    klarna_data JSONB,
    swish_data JSONB,
    paypal_data JSONB,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('stripe', 'klarna', 'swish', 'paypal')),
    provider_transaction_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('subscription', 'one_time', 'upgrade', 'refund')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'requires_action')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for payment tables
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default);
CREATE UNIQUE INDEX idx_payment_methods_user_provider_default ON payment_methods(user_id, provider) WHERE is_default = true;

CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX idx_payment_transactions_type ON payment_transactions(type);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider_transaction_id ON payment_transactions(provider_transaction_id);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Ensure only one default payment method per user per provider
CREATE OR REPLACE FUNCTION check_default_payment_method() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE payment_methods 
        SET is_default = false 
        WHERE user_id = NEW.user_id 
          AND provider = NEW.provider 
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_default_payment_method
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION check_default_payment_method();

-- Payment configuration settings
CREATE TABLE payment_provider_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('stripe', 'klarna', 'swish', 'paypal')),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('test', 'production')),
    is_enabled BOOLEAN DEFAULT true,
    config_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, environment)
);

-- Insert default payment provider configurations for Swedish market
INSERT INTO payment_provider_config (provider, environment, is_enabled, config_data) VALUES 
('stripe', 'test', true, '{"supported_currencies": ["USD", "EUR", "SEK"], "supported_countries": ["SE", "US", "GB"]}'),
('stripe', 'production', false, '{"supported_currencies": ["USD", "EUR", "SEK"], "supported_countries": ["SE", "US", "GB"]}'),
('klarna', 'test', true, '{"supported_currencies": ["SEK", "EUR", "USD"], "supported_countries": ["SE", "NO", "DK", "FI"]}'),
('klarna', 'production', false, '{"supported_currencies": ["SEK", "EUR", "USD"], "supported_countries": ["SE", "NO", "DK", "FI"]}'),
('swish', 'test', true, '{"supported_currencies": ["SEK"], "supported_countries": ["SE"], "max_amount": 150000}'),
('swish', 'production', false, '{"supported_currencies": ["SEK"], "supported_countries": ["SE"], "max_amount": 150000}'),
('paypal', 'test', true, '{"supported_currencies": ["USD", "EUR", "SEK"], "supported_countries": ["SE", "US", "GB", "DE", "FR"]}'),
('paypal', 'production', false, '{"supported_currencies": ["USD", "EUR", "SEK"], "supported_countries": ["SE", "US", "GB", "DE", "FR"]}');

-- ===============================================
-- TEAM COLLABORATION FEATURES SCHEMA
-- Phase 4B: Shared QR Libraries & Fine-grained Permissions
-- ===============================================

-- ===============================================
-- SHARED QR LIBRARIES SYSTEM
-- ===============================================

-- QR Libraries (Collections/Folders for team QR codes)
CREATE TABLE IF NOT EXISTS qr_libraries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color_hex VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'folder',
    is_public BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_color_hex CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT valid_icon CHECK (icon IN ('folder', 'collection', 'star', 'heart', 'bookmark', 'tag', 'archive', 'box'))
);

-- Library Items (QR Codes in Libraries)
CREATE TABLE IF NOT EXISTS qr_library_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_id UUID NOT NULL REFERENCES qr_libraries(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES users(id),
    position INTEGER DEFAULT 0,
    notes TEXT,
    tags TEXT[],
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate QR in same library
    UNIQUE(library_id, qr_code_id)
);

-- Library Access Permissions (Fine-grained library access)
CREATE TABLE IF NOT EXISTS qr_library_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    library_id UUID NOT NULL REFERENCES qr_libraries(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20),
    permissions JSONB DEFAULT '{}',
    granted_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Either user_id OR role, not both
    CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL)),
    -- Role must be valid team role if specified
    CHECK (role IS NULL OR role IN ('owner', 'admin', 'editor', 'viewer'))
);

-- ===============================================
-- FINE-GRAINED QR PERMISSIONS SYSTEM  
-- ===============================================

-- Enhanced QR Code Permissions (extend existing qr_codes table)
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS individual_permissions JSONB DEFAULT '{}';
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS permission_inheritance VARCHAR(20) DEFAULT 'team' CHECK (permission_inheritance IN ('team', 'custom', 'private'));
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) DEFAULT 'team' CHECK (access_level IN ('public', 'team', 'private', 'custom'));

-- QR Access Control Lists (Individual QR permissions)
CREATE TABLE IF NOT EXISTS qr_access_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20),
    permissions JSONB NOT NULL DEFAULT '{}',
    granted_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Either user_id OR role, not both
    CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL)),
    -- Role must be valid team role if specified
    CHECK (role IS NULL OR role IN ('owner', 'admin', 'editor', 'viewer'))
);

-- QR Access Log (Audit trail for QR access)
CREATE TABLE IF NOT EXISTS qr_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    permission_used VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Valid actions
    CHECK (action IN ('view', 'edit', 'delete', 'share', 'analytics', 'permissions', 'scan'))
);

-- ===============================================
-- TEAM DASHBOARD ANALYTICS TABLES
-- ===============================================

-- Team Dashboard Metrics (Aggregated team analytics)
CREATE TABLE IF NOT EXISTS team_dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_data JSONB DEFAULT '{}',
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint for metric per period
    UNIQUE(organization_id, metric_type, metric_name, period_start)
);

-- Team Activity Feed (Recent team actions)
CREATE TABLE IF NOT EXISTS team_activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Valid activity types
    CHECK (activity_type IN ('qr_created', 'qr_edited', 'qr_deleted', 'qr_shared', 'library_created', 'library_shared', 'member_invited', 'permission_granted'))
);

-- ===============================================
-- PERFORMANCE INDEXES
-- ===============================================

-- QR Libraries indexes
CREATE INDEX IF NOT EXISTS idx_qr_libraries_org_id ON qr_libraries(organization_id);
CREATE INDEX IF NOT EXISTS idx_qr_libraries_created_by ON qr_libraries(created_by);
CREATE INDEX IF NOT EXISTS idx_qr_libraries_public ON qr_libraries(organization_id, is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_qr_libraries_default ON qr_libraries(organization_id, is_default) WHERE is_default = true;

-- Library Items indexes
CREATE INDEX IF NOT EXISTS idx_qr_library_items_library_id ON qr_library_items(library_id);
CREATE INDEX IF NOT EXISTS idx_qr_library_items_qr_code_id ON qr_library_items(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_library_items_position ON qr_library_items(library_id, position);
CREATE INDEX IF NOT EXISTS idx_qr_library_items_featured ON qr_library_items(library_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_qr_library_items_tags ON qr_library_items USING GIN(tags);

-- Library Permissions indexes
CREATE INDEX IF NOT EXISTS idx_qr_library_permissions_library_id ON qr_library_permissions(library_id);
CREATE INDEX IF NOT EXISTS idx_qr_library_permissions_user_id ON qr_library_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_library_permissions_role ON qr_library_permissions(role);
CREATE INDEX IF NOT EXISTS idx_qr_library_permissions_expires ON qr_library_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- QR Access Control indexes
CREATE INDEX IF NOT EXISTS idx_qr_access_control_qr_id ON qr_access_control(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_control_user_id ON qr_access_control(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_control_role ON qr_access_control(role);
CREATE INDEX IF NOT EXISTS idx_qr_access_control_active ON qr_access_control(qr_code_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_qr_access_control_expires ON qr_access_control(expires_at) WHERE expires_at IS NOT NULL;

-- QR Access Log indexes
CREATE INDEX IF NOT EXISTS idx_qr_access_log_qr_id ON qr_access_log(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_log_user_id ON qr_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_log_action ON qr_access_log(action);
CREATE INDEX IF NOT EXISTS idx_qr_access_log_created_at ON qr_access_log(created_at);

-- Team Dashboard indexes
CREATE INDEX IF NOT EXISTS idx_team_dashboard_metrics_org_id ON team_dashboard_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_dashboard_metrics_type ON team_dashboard_metrics(organization_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_team_dashboard_metrics_period ON team_dashboard_metrics(period_start, period_end);

-- Team Activity indexes
CREATE INDEX IF NOT EXISTS idx_team_activity_feed_org_id ON team_activity_feed(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_feed_user_id ON team_activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_feed_type ON team_activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_team_activity_feed_created_at ON team_activity_feed(created_at);

-- ===============================================
-- HELPER FUNCTIONS
-- ===============================================

-- Function to create default library for organization
CREATE OR REPLACE FUNCTION create_default_library_for_org(
    p_org_id UUID,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_library_id UUID;
BEGIN
    -- Create default "Team QR Codes" library
    INSERT INTO qr_libraries (
        organization_id, 
        name, 
        description, 
        color_hex, 
        icon, 
        is_public, 
        is_default, 
        created_by
    )
    VALUES (
        p_org_id,
        'Team QR Codes',
        'Default shared library for team QR codes',
        '#3B82F6',
        'folder',
        true,
        true,
        p_created_by
    )
    RETURNING id INTO v_library_id;
    
    RETURN v_library_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check QR permission for user
CREATE OR REPLACE FUNCTION check_qr_permission(
    p_qr_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN := false;
    v_org_id UUID;
    v_user_role VARCHAR(20);
    v_qr_access_level VARCHAR(20);
    v_permission_inheritance VARCHAR(20);
BEGIN
    -- Get QR code details
    SELECT organization_id, access_level, permission_inheritance 
    INTO v_org_id, v_qr_access_level, v_permission_inheritance
    FROM qr_codes 
    WHERE id = p_qr_id;
    
    -- If QR not found or no organization, deny access
    IF v_org_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get user's role in organization
    SELECT role INTO v_user_role
    FROM organization_members 
    WHERE organization_id = v_org_id AND user_id = p_user_id AND status = 'active';
    
    -- If user not in organization, deny access
    IF v_user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check based on access level and permission inheritance
    CASE v_qr_access_level
        WHEN 'public' THEN
            v_has_permission := true;
        WHEN 'team' THEN
            -- Use team role permissions
            v_has_permission := check_team_permission(v_user_role, p_permission);
        WHEN 'private' THEN
            -- Only QR owner has access
            v_has_permission := EXISTS(
                SELECT 1 FROM qr_codes 
                WHERE id = p_qr_id AND user_id = p_user_id
            );
        WHEN 'custom' THEN
            -- Check individual permissions
            v_has_permission := EXISTS(
                SELECT 1 FROM qr_access_control 
                WHERE qr_code_id = p_qr_id 
                AND ((user_id = p_user_id) OR (role = v_user_role))
                AND (permissions->p_permission)::boolean = true
                AND is_active = true
                AND (expires_at IS NULL OR expires_at > NOW())
            );
    END CASE;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to log QR access
CREATE OR REPLACE FUNCTION log_qr_access(
    p_qr_id UUID,
    p_user_id UUID,
    p_action VARCHAR(50),
    p_permission VARCHAR(50) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO qr_access_log (
        qr_code_id,
        user_id,
        action,
        permission_used,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_qr_id,
        p_user_id,
        p_action,
        p_permission,
        p_ip_address,
        p_user_agent,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired permissions
CREATE OR REPLACE FUNCTION cleanup_expired_permissions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Cleanup expired QR permissions
    DELETE FROM qr_access_control 
    WHERE expires_at < NOW() AND expires_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Cleanup expired library permissions
    DELETE FROM qr_library_permissions 
    WHERE expires_at < NOW() AND expires_at IS NOT NULL;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get team dashboard metrics
CREATE OR REPLACE FUNCTION get_team_dashboard_stats(
    p_org_id UUID,
    p_period_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
    v_period_start TIMESTAMP := NOW() - INTERVAL '1 day' * p_period_days;
BEGIN
    SELECT jsonb_build_object(
        'total_qr_codes', (
            SELECT COUNT(*) 
            FROM qr_codes 
            WHERE organization_id = p_org_id
        ),
        'total_libraries', (
            SELECT COUNT(*) 
            FROM qr_libraries 
            WHERE organization_id = p_org_id
        ),
        'total_scans', (
            SELECT COALESCE(SUM(current_scans), 0) 
            FROM qr_codes 
            WHERE organization_id = p_org_id
        ),
        'scans_this_period', (
            SELECT COUNT(*) 
            FROM scan_events se
            JOIN qr_codes qr ON se.qr_code_id = qr.id
            WHERE qr.organization_id = p_org_id
            AND se.created_at >= v_period_start
        ),
        'active_members', (
            SELECT COUNT(*) 
            FROM organization_members 
            WHERE organization_id = p_org_id AND status = 'active'
        ),
        'shared_qr_codes', (
            SELECT COUNT(*) 
            FROM qr_codes 
            WHERE organization_id = p_org_id AND shared_with_team = true
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- LANDING PAGES SCHEMA
-- ===============================================


-- ===============================================
-- LANDING PAGES & CONTENT SYSTEM SCHEMA
-- ===============================================
-- This schema contains all tables, indexes, and functions
-- required for the Landing Pages Service
-- 
-- Dependencies: Core schema (users, qr_codes tables)
-- Tables: 8 landing page tables with complete functionality
-- Features: Templates, A/B testing, forms, analytics, domains
-- ===============================================

-- ===============================================
-- LANDING PAGES & CONTENT SYSTEM TABLES  
-- ===============================================

-- Landing Page Templates
CREATE TABLE IF NOT EXISTS landing_page_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('business', 'personal', 'event', 'marketing', 'ecommerce', 'portfolio')),
    layout_config JSONB NOT NULL, -- Page layout configuration
    default_styles JSONB NOT NULL, -- Default styling options
    component_config JSONB NOT NULL, -- Available components and their configs
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    preview_image_url TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Landing Pages
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
    template_id UUID REFERENCES landing_page_templates(id),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB NOT NULL, -- Page content configuration
    styles JSONB NOT NULL, -- Custom styling
    seo_config JSONB DEFAULT '{}', -- SEO meta tags, title, description
    custom_domain VARCHAR(255),
    is_published BOOLEAN DEFAULT false,
    is_mobile_optimized BOOLEAN DEFAULT true,
    password_protected BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- A/B Testing for Landing Pages
CREATE TABLE IF NOT EXISTS landing_page_ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    variant_a_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    variant_b_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    traffic_split INTEGER DEFAULT 50 CHECK (traffic_split BETWEEN 0 AND 100),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    winner_variant VARCHAR(1) CHECK (winner_variant IN ('A', 'B')),
    confidence_level DECIMAL(5,4) DEFAULT 0.0,
    statistical_significance DECIMAL(5,4) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Form Integration for Landing Pages
CREATE TABLE IF NOT EXISTS landing_page_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    form_name VARCHAR(255) NOT NULL,
    form_type VARCHAR(50) NOT NULL CHECK (form_type IN ('contact', 'newsletter', 'lead', 'survey', 'feedback', 'custom')),
    fields_config JSONB NOT NULL, -- Form field definitions
    validation_rules JSONB, -- Field validation rules
    notification_settings JSONB, -- Email notifications config
    integration_config JSONB, -- Third-party integrations (CRM, email marketing)
    auto_responder_config JSONB, -- Auto-response email settings
    redirect_after_submit VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    submission_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Form Submissions
CREATE TABLE IF NOT EXISTS landing_page_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES landing_page_forms(id) ON DELETE CASCADE,
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255), -- Anonymous visitor tracking
    submission_data JSONB NOT NULL, -- Form data
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    device_info JSONB,
    geo_location JSONB, -- Country, city, coordinates
    submission_source VARCHAR(100), -- ab_test_variant_a, ab_test_variant_b, direct
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Social Sharing Configuration
CREATE TABLE IF NOT EXISTS landing_page_social_sharing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'email', 'copy_link')),
    is_enabled BOOLEAN DEFAULT true,
    custom_message TEXT,
    tracking_parameters JSONB, -- UTM parameters for social sharing
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(landing_page_id, platform)
);

-- Landing Page Analytics Events
CREATE TABLE IF NOT EXISTS landing_page_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    ab_test_id UUID REFERENCES landing_page_ab_tests(id),
    variant VARCHAR(1), -- For A/B testing (A or B)
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'form_submission', 'social_share', 'conversion', 'bounce', 'scroll', 'click')),
    event_data JSONB, -- Additional event context
    visitor_id VARCHAR(255), -- Anonymous visitor tracking
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    referrer_url TEXT,
    page_url TEXT,
    scroll_depth INTEGER, -- Percentage scrolled
    time_on_page INTEGER, -- Seconds spent on page
    conversion_value DECIMAL(10,2),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Landing Page Custom Domains
CREATE TABLE IF NOT EXISTS landing_page_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_certificate TEXT,
    dns_verified BOOLEAN DEFAULT false,
    dns_verification_token VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed', 'suspended')),
    error_message TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- LANDING PAGES INDEXES FOR PERFORMANCE
-- ===============================================

-- Landing page templates indexes
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_type ON landing_page_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_active ON landing_page_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_premium ON landing_page_templates(is_premium);

-- Landing pages indexes
CREATE INDEX IF NOT EXISTS idx_landing_pages_user_id ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_qr_code_id ON landing_pages(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_published ON landing_pages(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_landing_pages_domain ON landing_pages(custom_domain);
CREATE INDEX IF NOT EXISTS idx_landing_pages_template ON landing_pages(template_id);

-- A/B testing indexes
CREATE INDEX IF NOT EXISTS idx_landing_ab_tests_user_id ON landing_page_ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_ab_tests_status ON landing_page_ab_tests(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_landing_ab_tests_dates ON landing_page_ab_tests(start_date, end_date);

-- Forms indexes
CREATE INDEX IF NOT EXISTS idx_landing_page_forms_page_id ON landing_page_forms(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_forms_active ON landing_page_forms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_landing_page_forms_type ON landing_page_forms(form_type);

-- Form submissions indexes
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON landing_page_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_page_id ON landing_page_form_submissions(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_visitor ON landing_page_form_submissions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON landing_page_form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_processed ON landing_page_form_submissions(is_processed);

-- Social sharing indexes
CREATE INDEX IF NOT EXISTS idx_social_sharing_page_id ON landing_page_social_sharing(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_social_sharing_platform ON landing_page_social_sharing(platform);
CREATE INDEX IF NOT EXISTS idx_social_sharing_enabled ON landing_page_social_sharing(is_enabled) WHERE is_enabled = true;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_landing_analytics_page_id ON landing_page_analytics(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_timestamp ON landing_page_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_event_type ON landing_page_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_ab_test ON landing_page_analytics(ab_test_id, variant) WHERE ab_test_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_landing_analytics_visitor ON landing_page_analytics(visitor_id);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_session ON landing_page_analytics(session_id);

-- Custom domains indexes
CREATE INDEX IF NOT EXISTS idx_landing_domains_user_id ON landing_page_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_domains_status ON landing_page_domains(status);
CREATE INDEX IF NOT EXISTS idx_landing_domains_verified ON landing_page_domains(dns_verified) WHERE dns_verified = true;

-- ===============================================
-- LANDING PAGES HELPER FUNCTIONS
-- ===============================================

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_landing_page_slug(p_title VARCHAR(255), p_user_id UUID)
RETURNS VARCHAR(255) AS $$
DECLARE
    base_slug VARCHAR(255);
    final_slug VARCHAR(255);
    counter INTEGER := 0;
BEGIN
    -- Create base slug from title
    base_slug := lower(regexp_replace(trim(p_title), '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := substring(base_slug from 1 for 200);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM landing_pages WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to track landing page analytics
CREATE OR REPLACE FUNCTION track_landing_page_event(
    p_landing_page_id UUID,
    p_event_type VARCHAR(50),
    p_visitor_id VARCHAR(255) DEFAULT NULL,
    p_event_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_ab_test_id UUID DEFAULT NULL,
    p_variant VARCHAR(1) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO landing_page_analytics (
        landing_page_id, ab_test_id, variant, event_type, event_data,
        visitor_id, ip_address, user_agent, referrer_url
    ) VALUES (
        p_landing_page_id, p_ab_test_id, p_variant, p_event_type, p_event_data,
        p_visitor_id, p_ip_address, p_user_agent, p_referrer_url
    ) RETURNING id INTO event_id;
    
    -- Update landing page view count for view events
    IF p_event_type = 'view' THEN
        UPDATE landing_pages 
        SET view_count = view_count + 1, last_viewed_at = NOW()
        WHERE id = p_landing_page_id;
    END IF;
    
    -- Update conversion count for conversion events
    IF p_event_type = 'conversion' THEN
        UPDATE landing_pages 
        SET conversion_count = conversion_count + 1
        WHERE id = p_landing_page_id;
    END IF;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get landing page analytics summary
CREATE OR REPLACE FUNCTION get_landing_page_analytics_summary(
    p_landing_page_id UUID,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE(
    total_views BIGINT,
    unique_visitors BIGINT,
    total_conversions BIGINT,
    conversion_rate DECIMAL(5,4),
    avg_time_on_page DECIMAL(10,2),
    bounce_rate DECIMAL(5,4),
    top_referrer TEXT,
    top_country VARCHAR(100),
    top_device VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'view') as total_views,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as total_conversions,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'view') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE event_type = 'conversion')::DECIMAL / 
                       COUNT(*) FILTER (WHERE event_type = 'view')) * 100, 4)
            ELSE 0
        END as conversion_rate,
        AVG(time_on_page) as avg_time_on_page,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'view') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE event_type = 'bounce')::DECIMAL / 
                       COUNT(*) FILTER (WHERE event_type = 'view')) * 100, 4)
            ELSE 0
        END as bounce_rate,
        MODE() WITHIN GROUP (ORDER BY referrer_url) as top_referrer,
        MODE() WITHIN GROUP (ORDER BY country) as top_country,
        MODE() WITHIN GROUP (ORDER BY device_type) as top_device
    FROM landing_page_analytics
    WHERE landing_page_id = p_landing_page_id 
      AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Insert default landing page templates
INSERT INTO landing_page_templates (name, description, template_type, layout_config, default_styles, component_config, is_premium) VALUES 
('Business Card', 'Professional business card landing page', 'business', 
 '{"layout": "single_column", "sections": ["header", "content", "contact", "footer"]}',
 '{"primaryColor": "#3B82F6", "secondaryColor": "#1F2937", "backgroundColor": "#FFFFFF", "textColor": "#374151"}',
 '{"header": {"logo": true, "navigation": false}, "content": {"hero": true, "description": true, "features": false}, "contact": {"form": true, "social": true}, "footer": {"simple": true}}',
 false),

('Event Promotion', 'Event landing page with registration form', 'event',
 '{"layout": "full_width", "sections": ["hero", "details", "speakers", "registration", "footer"]}',
 '{"primaryColor": "#EF4444", "secondaryColor": "#991B1B", "backgroundColor": "#FEF2F2", "textColor": "#7F1D1D"}',
 '{"hero": {"countdown": true, "video": true}, "details": {"schedule": true, "location": true}, "speakers": {"grid": true, "bio": true}, "registration": {"form": true, "pricing": true}}',
 false),

('Product Showcase', 'Product landing page with features and CTA', 'marketing',
 '{"layout": "multi_column", "sections": ["hero", "features", "testimonials", "pricing", "cta"]}',
 '{"primaryColor": "#10B981", "secondaryColor": "#059669", "backgroundColor": "#ECFDF5", "textColor": "#065F46"}',
 '{"hero": {"video": true, "gallery": true}, "features": {"icons": true, "comparison": true}, "testimonials": {"carousel": true, "ratings": true}, "pricing": {"plans": true, "calculator": true}}',
 false),

('Portfolio Showcase', 'Creative portfolio with project gallery', 'portfolio',
 '{"layout": "masonry", "sections": ["header", "about", "portfolio", "services", "contact"]}',
 '{"primaryColor": "#8B5CF6", "secondaryColor": "#7C3AED", "backgroundColor": "#FAFAFA", "textColor": "#4C1D95"}',
 '{"header": {"minimal": true, "fixed": true}, "about": {"timeline": true, "skills": true}, "portfolio": {"filter": true, "lightbox": true}, "services": {"pricing": true, "packages": true}}',
 true),

('E-commerce Product', 'Product page with shopping features', 'ecommerce',
 '{"layout": "product_layout", "sections": ["navigation", "product", "description", "reviews", "related"]}',
 '{"primaryColor": "#F59E0B", "secondaryColor": "#D97706", "backgroundColor": "#FFFBEB", "textColor": "#92400E"}',
 '{"product": {"gallery": true, "variants": true, "inventory": true}, "description": {"tabs": true, "specifications": true}, "reviews": {"ratings": true, "photos": true}, "related": {"recommendations": true, "upsells": true}}',
 true),

('Lead Generation', 'High-converting lead capture page', 'marketing',
 '{"layout": "centered", "sections": ["hero", "benefits", "form", "testimonials", "footer"]}',
 '{"primaryColor": "#DC2626", "secondaryColor": "#B91C1C", "backgroundColor": "#FFFFFF", "textColor": "#1F2937"}',
 '{"hero": {"headline": true, "subheadline": true, "media": true}, "benefits": {"list": true, "icons": true}, "form": {"multi_step": true, "validation": true}, "testimonials": {"social_proof": true, "logos": true}}',
 false);


-- ===============================================
-- ADVANCED ANALYTICS SCHEMA
-- ===============================================

-- ===============================================
-- ADVANCED ANALYTICS SYSTEM TABLES (POSTGRESQL COMPATIBLE)
-- ===============================================

-- Conversion Goals Table
CREATE TABLE IF NOT EXISTS conversion_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('url_visit', 'form_completion', 'purchase', 'download', 'signup', 'custom')),
    target_url TEXT,
    target_selector VARCHAR(500), -- CSS selector for tracking
    value_amount DECIMAL(10,2), -- Monetary value of conversion
    value_currency VARCHAR(3) DEFAULT 'USD',
    funnel_steps JSONB, -- Array of funnel step definitions
    attribution_window_hours INTEGER DEFAULT 24, -- Attribution window in hours
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversion Events Table
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES conversion_goals(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    user_fingerprint VARCHAR(255), -- Browser fingerprint for user tracking
    step_number INTEGER NOT NULL DEFAULT 1, -- Funnel step number
    step_name VARCHAR(255), -- Name of the funnel step
    event_type VARCHAR(50) NOT NULL, -- Type of conversion event
    event_data JSONB, -- Additional event data
    attribution_type VARCHAR(50) DEFAULT 'direct', -- first_touch, last_touch, linear, etc.
    conversion_value DECIMAL(10,2), -- Value of this specific conversion
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    page_url TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Heatmap Data Storage Table
CREATE TABLE IF NOT EXISTS heatmap_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    heatmap_type VARCHAR(50) NOT NULL CHECK (heatmap_type IN ('geographic', 'temporal', 'device', 'platform')),
    data_key VARCHAR(255) NOT NULL, -- Country code, hour, device name, etc.
    data_value INTEGER NOT NULL DEFAULT 0, -- Count/intensity value
    normalized_value DECIMAL(5,4) DEFAULT 0.0, -- Normalized value (0-1)
    coordinates_lat DECIMAL(10,7), -- For geographic heatmaps
    coordinates_lng DECIMAL(10,7), -- For geographic heatmaps
    time_period TIMESTAMP, -- For temporal heatmaps
    metadata JSONB, -- Additional context data
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- For cache invalidation
    UNIQUE(qr_code_id, heatmap_type, data_key, time_period)
);

-- Real-time Metrics Cache Table  
CREATE TABLE IF NOT EXISTS realtime_metrics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL, -- active_scans, current_viewers, response_time, etc.
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50), -- seconds, count, percentage, etc.
    aggregation_period VARCHAR(20) DEFAULT 'instant', -- instant, 1min, 5min, 15min, 1hour
    tags JSONB, -- Additional metric tags (country, device, etc.)
    timestamp TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
    UNIQUE(qr_code_id, metric_type, aggregation_period, timestamp)
);

-- Peak Time Analysis Results Table
CREATE TABLE IF NOT EXISTS peak_time_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL,
    time_granularity VARCHAR(20) NOT NULL CHECK (time_granularity IN ('hour', 'day', 'week', 'month')),
    peak_periods JSONB NOT NULL, -- Array of peak time periods with intensities
    trough_periods JSONB NOT NULL, -- Array of low activity periods
    business_hours_performance JSONB, -- Business hours vs off-hours analysis
    day_of_week_patterns JSONB, -- Weekly pattern analysis
    seasonal_trends JSONB, -- Monthly/seasonal trend data
    recommendations JSONB, -- AI-generated recommendations
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- Confidence in analysis (0-1)
    data_points_analyzed INTEGER NOT NULL DEFAULT 0,
    analysis_version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(qr_code_id, analysis_date, time_granularity)
);

-- Export Jobs Table
CREATE TABLE IF NOT EXISTS analytics_export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE, -- NULL for multi-QR exports
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('excel', 'pdf', 'csv', 'json')),
    export_format VARCHAR(50) NOT NULL, -- standard, executive, detailed, custom
    configuration JSONB NOT NULL, -- Export settings and filters
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    download_url TEXT,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'expired')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    error_message TEXT,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    downloaded_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Alerts Table
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('scan_threshold', 'conversion_drop', 'traffic_spike', 'anomaly', 'goal_achieved')),
    alert_name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL, -- Alert trigger conditions
    notification_channels JSONB DEFAULT '[]', -- email, sms, webhook
    is_active BOOLEAN DEFAULT true,
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP,
    last_notification_sent_at TIMESTAMP,
    snooze_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Alert History Table
CREATE TABLE IF NOT EXISTS analytics_alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES analytics_alerts(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP DEFAULT NOW(),
    trigger_value DECIMAL(15,4), -- The value that triggered the alert
    threshold_value DECIMAL(15,4), -- The threshold that was exceeded
    notification_sent BOOLEAN DEFAULT false,
    notification_channels_used JSONB, -- Which channels were used for notification
    metadata JSONB -- Additional context about the trigger
);

-- WebSocket Connections Table (for real-time tracking)
CREATE TABLE IF NOT EXISTS realtime_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscribed_qr_codes TEXT[], -- Array of QR code IDs
    subscribed_metrics TEXT[], -- Array of metric types
    connection_metadata JSONB, -- Client info, user agent, etc.
    connected_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    disconnected_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- ===============================================
-- CREATE INDEXES FOR ADVANCED ANALYTICS TABLES
-- ===============================================

-- Conversion Goals indexes
CREATE INDEX IF NOT EXISTS idx_conversion_goals_qr_code ON conversion_goals(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_conversion_goals_user ON conversion_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_goals_active ON conversion_goals(qr_code_id, is_active) WHERE is_active = true;

-- Conversion Events indexes
CREATE INDEX IF NOT EXISTS idx_conversion_events_goal ON conversion_events(goal_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_qr_code ON conversion_events(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_session ON conversion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_timestamp ON conversion_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversion_events_funnel ON conversion_events(goal_id, step_number, timestamp);

-- Heatmap Data indexes
CREATE INDEX IF NOT EXISTS idx_heatmap_data_qr_code ON heatmap_data(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_data_type ON heatmap_data(qr_code_id, heatmap_type);
CREATE INDEX IF NOT EXISTS idx_heatmap_data_key ON heatmap_data(qr_code_id, heatmap_type, data_key);
CREATE INDEX IF NOT EXISTS idx_heatmap_data_time ON heatmap_data(qr_code_id, time_period);
CREATE INDEX IF NOT EXISTS idx_heatmap_data_expires ON heatmap_data(expires_at);

-- Real-time Metrics indexes
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_qr_code ON realtime_metrics_cache(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_type ON realtime_metrics_cache(qr_code_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_timestamp ON realtime_metrics_cache(timestamp);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_expires ON realtime_metrics_cache(expires_at);

-- Peak Time Analysis indexes
CREATE INDEX IF NOT EXISTS idx_peak_analysis_qr_code ON peak_time_analysis(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_peak_analysis_date ON peak_time_analysis(analysis_date);
CREATE INDEX IF NOT EXISTS idx_peak_analysis_granularity ON peak_time_analysis(qr_code_id, time_granularity);

-- Export Jobs indexes
CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON analytics_export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_qr_code ON analytics_export_jobs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON analytics_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_expires ON analytics_export_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created ON analytics_export_jobs(created_at);

-- Analytics Alerts indexes
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_user ON analytics_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_qr_code ON analytics_alerts(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_active ON analytics_alerts(qr_code_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_type ON analytics_alerts(alert_type);

-- Alert History indexes
CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON analytics_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON analytics_alert_history(triggered_at);

-- Real-time Connections indexes
CREATE INDEX IF NOT EXISTS idx_realtime_connections_user ON realtime_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_connections_active ON realtime_connections(is_active, last_activity_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_realtime_connections_qr_subscriptions ON realtime_connections USING GIN (subscribed_qr_codes);

-- ===============================================
-- CONVERSION FUNNEL MATERIALIZED VIEW
-- ===============================================

-- Conversion Funnel Performance (Materialized View) - Now that tables exist
CREATE MATERIALIZED VIEW IF NOT EXISTS conversion_funnel_summary AS
SELECT 
    cg.id as goal_id,
    cg.qr_code_id,
    cg.name as goal_name,
    DATE_TRUNC('day', ce.timestamp) as conversion_date,
    ce.step_number,
    COUNT(*) as step_completions,
    COUNT(DISTINCT ce.session_id) as unique_sessions,
    SUM(ce.conversion_value) as total_value,
    AVG(ce.conversion_value) as avg_value
FROM conversion_goals cg
JOIN conversion_events ce ON cg.id = ce.goal_id
WHERE ce.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cg.id, cg.qr_code_id, cg.name, DATE_TRUNC('day', ce.timestamp), ce.step_number;

-- Create unique index for conversion funnel view
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_funnel_summary_unique 
ON conversion_funnel_summary (goal_id, conversion_date, step_number);

-- ===============================================
-- ADVANCED ANALYTICS HELPER FUNCTIONS
-- ===============================================

-- Function to update heatmap data
CREATE OR REPLACE FUNCTION update_heatmap_data(
    p_qr_code_id UUID,
    p_heatmap_type VARCHAR(50),
    p_data_key VARCHAR(255),
    p_increment INTEGER DEFAULT 1,
    p_coordinates_lat DECIMAL(10,7) DEFAULT NULL,
    p_coordinates_lng DECIMAL(10,7) DEFAULT NULL,
    p_time_period TIMESTAMP DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO heatmap_data (
        qr_code_id, heatmap_type, data_key, data_value, 
        coordinates_lat, coordinates_lng, time_period,
        expires_at
    ) VALUES (
        p_qr_code_id, p_heatmap_type, p_data_key, p_increment,
        p_coordinates_lat, p_coordinates_lng, p_time_period,
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (qr_code_id, heatmap_type, data_key, time_period)
    DO UPDATE SET 
        data_value = heatmap_data.data_value + p_increment,
        generated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to normalize heatmap values
CREATE OR REPLACE FUNCTION normalize_heatmap_data(p_qr_code_id UUID, p_heatmap_type VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    max_value INTEGER;
    updated_count INTEGER;
BEGIN
    -- Get maximum value for this heatmap type
    SELECT MAX(data_value) INTO max_value
    FROM heatmap_data
    WHERE qr_code_id = p_qr_code_id AND heatmap_type = p_heatmap_type;
    
    -- Update normalized values
    UPDATE heatmap_data
    SET normalized_value = CASE 
        WHEN max_value > 0 THEN data_value::DECIMAL / max_value
        ELSE 0
    END
    WHERE qr_code_id = p_qr_code_id AND heatmap_type = p_heatmap_type;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cache real-time metrics
CREATE OR REPLACE FUNCTION cache_realtime_metric(
    p_qr_code_id UUID,
    p_metric_type VARCHAR(100),
    p_metric_value DECIMAL(15,4),
    p_metric_unit VARCHAR(50) DEFAULT NULL,
    p_aggregation_period VARCHAR(20) DEFAULT 'instant',
    p_tags JSONB DEFAULT NULL,
    p_ttl_seconds INTEGER DEFAULT 3600
) RETURNS VOID AS $$
BEGIN
    INSERT INTO realtime_metrics_cache (
        qr_code_id, metric_type, metric_value, metric_unit,
        aggregation_period, tags, expires_at
    ) VALUES (
        p_qr_code_id, p_metric_type, p_metric_value, p_metric_unit,
        p_aggregation_period, p_tags, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL
    )
    ON CONFLICT (qr_code_id, metric_type, aggregation_period, timestamp)
    DO UPDATE SET 
        metric_value = p_metric_value,
        metric_unit = p_metric_unit,
        tags = p_tags,
        expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_analytics_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
    additional_count INTEGER := 0;
BEGIN
    -- Clean up expired heatmap data
    DELETE FROM heatmap_data WHERE expires_at < NOW();
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Clean up expired real-time metrics
    DELETE FROM realtime_metrics_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS additional_count = ROW_COUNT;
    cleanup_count := cleanup_count + additional_count;
    
    -- Clean up expired export jobs
    UPDATE analytics_export_jobs 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status IN ('completed', 'failed');
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY conversion_funnel_summary;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- ANALYTICS TRIGGERS
-- ===============================================

-- Trigger to update heatmap data on scan events
CREATE OR REPLACE FUNCTION trigger_update_heatmap_on_scan()
RETURNS TRIGGER AS $$
BEGIN
    -- Update geographic heatmap
    IF NEW.country IS NOT NULL THEN
        PERFORM update_heatmap_data(
            NEW.qr_code_id::UUID, 
            'geographic', 
            NEW.country, 
            1, 
            NEW.latitude, 
            NEW.longitude,
            DATE_TRUNC('hour', NEW.timestamp)
        );
    END IF;
    
    -- Update device heatmap
    IF NEW.device IS NOT NULL THEN
        PERFORM update_heatmap_data(
            NEW.qr_code_id::UUID, 
            'device', 
            NEW.device, 
            1,
            NULL,
            NULL,
            DATE_TRUNC('hour', NEW.timestamp)
        );
    END IF;
    
    -- Update temporal heatmap
    PERFORM update_heatmap_data(
        NEW.qr_code_id::UUID, 
        'temporal', 
        EXTRACT(HOUR FROM NEW.timestamp)::VARCHAR, 
        1,
        NULL,
        NULL,
        DATE_TRUNC('hour', NEW.timestamp)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS scan_event_heatmap_update ON scan_events;
CREATE TRIGGER scan_event_heatmap_update
    AFTER INSERT ON scan_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_heatmap_on_scan();

-- ===============================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ===============================================

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_conversion_goals_funnel_steps ON conversion_goals USING GIN (funnel_steps);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_data ON conversion_events USING GIN (event_data);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_conditions ON analytics_alerts USING GIN (conditions);
CREATE INDEX IF NOT EXISTS idx_peak_analysis_recommendations ON peak_time_analysis USING GIN (recommendations);

-- Partial indexes for active data
CREATE INDEX IF NOT EXISTS idx_conversion_goals_active_qr ON conversion_goals (qr_code_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_active_qr ON analytics_alerts (qr_code_id) WHERE is_active = true;

-- Expression indexes for common calculations
CREATE INDEX IF NOT EXISTS idx_conversion_events_conversion_rate ON conversion_events (goal_id, step_number, session_id);
-- ===============================================
-- PAYMENT SCHEMA
-- ===============================================

-- ===============================================
-- PAYMENT INTEGRATION TABLES
-- ===============================================

-- Payment Methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('STRIPE', 'KLARNA', 'SWISH', 'PAYPAL')),
    type VARCHAR(50) NOT NULL,
    card JSONB, -- For Stripe card details
    klarna JSONB, -- For Klarna payment details  
    swish JSONB, -- For Swish phone number details
    paypal JSONB, -- For PayPal account details
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('STRIPE', 'KLARNA', 'SWISH', 'PAYPAL')),
    provider_transaction_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ONE_TIME', 'SUBSCRIPTION', 'REFUND')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REQUIRES_ACTION')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Provider Configuration table
CREATE TABLE IF NOT EXISTS payment_provider_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('STRIPE', 'KLARNA', 'SWISH', 'PAYPAL')),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    is_enabled BOOLEAN DEFAULT true,
    config_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, environment)
);

-- ===============================================
-- PAYMENT INDEXES FOR PERFORMANCE
-- ===============================================

-- Payment Methods indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_at ON payment_methods(created_at DESC);

-- Payment Transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_transaction_id ON payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_amount ON payment_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_currency ON payment_transactions(currency);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status ON payment_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_type ON payment_transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_status ON payment_transactions(provider, status);

-- Payment Provider Config indexes  
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_provider ON payment_provider_config(provider);
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_environment ON payment_provider_config(environment);
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_enabled ON payment_provider_config(is_enabled);

-- ===============================================
-- PAYMENT HELPER FUNCTIONS
-- ===============================================

-- Function to ensure only one default payment method per user per provider
CREATE OR REPLACE FUNCTION check_default_payment_method() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE payment_methods 
        SET is_default = false, updated_at = NOW()
        WHERE user_id = NEW.user_id 
          AND provider = NEW.provider 
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default payment method constraint
DROP TRIGGER IF EXISTS trigger_check_default_payment_method ON payment_methods;
CREATE TRIGGER trigger_check_default_payment_method
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION check_default_payment_method();

-- Function to update transaction status and metadata
CREATE OR REPLACE FUNCTION update_transaction_status(
    p_transaction_id UUID,
    p_status VARCHAR(20),
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE payment_transactions 
    SET 
        status = p_status,
        failure_reason = CASE WHEN p_failure_reason IS NOT NULL THEN p_failure_reason ELSE failure_reason END,
        metadata = CASE WHEN p_metadata IS NOT NULL THEN metadata || p_metadata ELSE metadata END,
        updated_at = NOW()
    WHERE id = p_transaction_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user payment summary
CREATE OR REPLACE FUNCTION get_user_payment_summary(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_transactions BIGINT,
    successful_transactions BIGINT,
    failed_transactions BIGINT,
    total_amount DECIMAL(12,2),
    successful_amount DECIMAL(12,2),
    preferred_provider VARCHAR(20),
    success_rate NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'SUCCEEDED') as successful_transactions,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCEEDED'), 0) as successful_amount,
        MODE() WITHIN GROUP (ORDER BY provider) as preferred_provider,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0
        END as success_rate
    FROM payment_transactions
    WHERE user_id = p_user_id 
      AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- PAYMENT PROVIDER CONFIGURATIONS
-- ===============================================

-- Insert default payment provider configurations optimized for Swedish market
INSERT INTO payment_provider_config (provider, environment, is_enabled, config_data) VALUES 
-- Stripe Configuration (Global + Swedish support)
('STRIPE', 'sandbox', true, '{
    "supported_currencies": ["USD", "EUR", "SEK", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI"],
    "features": ["cards", "subscriptions", "refunds", "webhooks"],
    "swedish_features": {
        "local_cards": true,
        "sek_processing": true,
        "eu_compliance": true
    }
}'),
('STRIPE', 'production', false, '{
    "supported_currencies": ["USD", "EUR", "SEK", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI"],
    "features": ["cards", "subscriptions", "refunds", "webhooks"],
    "swedish_features": {
        "local_cards": true,
        "sek_processing": true,
        "eu_compliance": true
    }
}'),

-- Klarna Configuration (Nordic focus)
('KLARNA', 'sandbox', true, '{
    "supported_currencies": ["SEK", "EUR", "USD", "NOK", "DKK"],
    "supported_countries": ["SE", "NO", "DK", "FI", "DE", "AT", "NL"],
    "features": ["pay_later", "pay_in_installments", "direct_payments"],
    "swedish_features": {
        "market_leader": true,
        "local_brand_recognition": "high",
        "mobile_optimized": true
    }
}'),
('KLARNA', 'production', false, '{
    "supported_currencies": ["SEK", "EUR", "USD", "NOK", "DKK"],
    "supported_countries": ["SE", "NO", "DK", "FI", "DE", "AT", "NL"],
    "features": ["pay_later", "pay_in_installments", "direct_payments"],
    "swedish_features": {
        "market_leader": true,
        "local_brand_recognition": "high",
        "mobile_optimized": true
    }
}'),

-- Swish Configuration (Sweden-specific)
('SWISH', 'sandbox', true, '{
    "supported_currencies": ["SEK"],
    "supported_countries": ["SE"],
    "features": ["instant_payments", "qr_codes", "mobile_native"],
    "limits": {
        "min_amount": 1,
        "max_amount": 150000,
        "daily_limit": 150000
    },
    "swedish_features": {
        "market_share": "60+",
        "instant_settlement": true,
        "bank_integration": "all_major_banks",
        "mobile_first": true
    }
}'),
('SWISH', 'production', false, '{
    "supported_currencies": ["SEK"],
    "supported_countries": ["SE"],
    "features": ["instant_payments", "qr_codes", "mobile_native"],
    "limits": {
        "min_amount": 1,
        "max_amount": 150000,
        "daily_limit": 150000
    },
    "swedish_features": {
        "market_share": "60+",
        "instant_settlement": true,
        "bank_integration": "all_major_banks",
        "mobile_first": true
    }
}'),

-- PayPal Configuration (International fallback)
('PAYPAL', 'sandbox', true, '{
    "supported_currencies": ["USD", "EUR", "SEK", "GBP", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI", "NL"],
    "features": ["express_checkout", "subscriptions", "refunds", "guest_payments"],
    "swedish_features": {
        "recognized_brand": true,
        "international_customers": true,
        "fallback_option": true
    }
}'),
('PAYPAL', 'production', false, '{
    "supported_currencies": ["USD", "EUR", "SEK", "GBP", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI", "NL"],
    "features": ["express_checkout", "subscriptions", "refunds", "guest_payments"],
    "swedish_features": {
        "recognized_brand": true,
        "international_customers": true,
        "fallback_option": true
    }
}')
ON CONFLICT (provider, environment) DO UPDATE SET
    config_data = EXCLUDED.config_data,
    updated_at = NOW();

-- ===============================================
-- PAYMENT AUDIT AND LOGGING
-- ===============================================

-- Payment audit log table for tracking all payment-related actions
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_user_id ON payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_transaction_id ON payment_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_action ON payment_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at ON payment_audit_log(created_at DESC);

-- Function to log payment actions
CREATE OR REPLACE FUNCTION log_payment_action(
    p_user_id UUID,
    p_transaction_id UUID,
    p_action VARCHAR(50),
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO payment_audit_log (
        user_id, transaction_id, action, old_data, new_data, ip_address, user_agent
    ) VALUES (
        p_user_id, p_transaction_id, p_action, p_old_data, p_new_data, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Payment tables and functions created successfully
-- Swedish market optimization complete with Swish integration
-- Ready for production payment processing
-- ===============================================

-- ===============================================
-- SDK GENERATION TABLES
-- ===============================================

-- SDK Generation Jobs table
CREATE TABLE IF NOT EXISTS sdk_generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    package_name VARCHAR(100) NOT NULL,
    options JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    file_path TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'expired')),
    CHECK (language IN ('javascript', 'typescript-fetch', 'python', 'php', 'java', 'csharp-netcore', 'go'))
);

-- SDK Download Statistics table
CREATE TABLE IF NOT EXISTS sdk_download_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES sdk_generation_jobs(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- SDK Generation Usage Metrics table for analytics
CREATE TABLE IF NOT EXISTS sdk_generation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    generation_count INTEGER DEFAULT 1,
    total_downloads INTEGER DEFAULT 0,
    last_generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, language)
);

-- API Keys table (for API service integration)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL,
    prefix VARCHAR(20) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    rate_limit JSONB,
    ip_whitelist JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- API Key Usage table
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    ip_address INET NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    retry_policy JSONB NOT NULL DEFAULT '{}',
    headers JSONB,
    timeout INTEGER NOT NULL DEFAULT 30000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Webhook Deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_settings JSONB NOT NULL DEFAULT '{}',
    mapping JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR SDK AND API TABLES
-- ===============================================

-- SDK generation indexes
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_user_id ON sdk_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_status ON sdk_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_expires_at ON sdk_generation_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_created_at ON sdk_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_user_language ON sdk_generation_jobs(user_id, language, package_name);

CREATE INDEX IF NOT EXISTS idx_sdk_download_stats_job_id ON sdk_download_stats(job_id);
CREATE INDEX IF NOT EXISTS idx_sdk_download_stats_downloaded_at ON sdk_download_stats(downloaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_user_id ON sdk_generation_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_language ON sdk_generation_metrics(language);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_last_generated ON sdk_generation_metrics(last_generated_at DESC);

-- API service indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(is_active);

-- ===============================================
-- SDK GENERATION FUNCTIONS AND TRIGGERS
-- ===============================================

-- SDK Generation Metrics Functions and Triggers
CREATE OR REPLACE FUNCTION update_sdk_generation_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO sdk_generation_metrics (user_id, language, generation_count, last_generated_at)
        VALUES (NEW.user_id, NEW.language, 1, NEW.completed_at)
        ON CONFLICT (user_id, language)
        DO UPDATE SET
            generation_count = sdk_generation_metrics.generation_count + 1,
            last_generated_at = NEW.completed_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sdk_generation_metrics_trigger
    AFTER UPDATE ON sdk_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_sdk_generation_metrics();

CREATE OR REPLACE FUNCTION update_sdk_download_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sdk_generation_metrics 
    SET total_downloads = total_downloads + 1,
        updated_at = CURRENT_TIMESTAMP
    FROM sdk_generation_jobs sgj
    WHERE sdk_generation_metrics.user_id = sgj.user_id 
    AND sdk_generation_metrics.language = sgj.language
    AND sgj.id = NEW.job_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sdk_download_metrics_trigger
    AFTER INSERT ON sdk_download_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_sdk_download_metrics();

-- Cleanup function for expired SDK files
CREATE OR REPLACE FUNCTION cleanup_expired_sdk_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted_jobs AS (
        DELETE FROM sdk_generation_jobs
        WHERE expires_at < CURRENT_TIMESTAMP OR status = 'expired'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_jobs;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_api_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_api_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_api_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_api_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE sdk_generation_jobs IS 'Tracks SDK generation requests and their status';
COMMENT ON TABLE sdk_download_stats IS 'Records SDK download events for analytics';
COMMENT ON TABLE sdk_generation_metrics IS 'Aggregated metrics for SDK generation by user and language';
COMMENT ON TABLE api_keys IS 'API keys for third-party access to QR SaaS platform';
COMMENT ON TABLE webhooks IS 'Webhook endpoints for real-time event notifications';

COMMENT ON COLUMN sdk_generation_jobs.options IS 'JSON configuration for SDK generation (version, clientName, namespace, etc.)';
COMMENT ON COLUMN sdk_generation_jobs.file_path IS 'Path to the generated SDK ZIP file';
COMMENT ON COLUMN sdk_generation_jobs.expires_at IS 'When the SDK download link expires (typically 24 hours)';

-- ===============================================
-- E-COMMERCE QR SERVICE TABLES
-- ===============================================

-- Inventory Integrations Table
CREATE TABLE IF NOT EXISTS inventory_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'shopify', 'woocommerce', 'magento', 'bigcommerce', 'custom', 'manual'
    platform VARCHAR(50) NOT NULL, -- Same as type for compatibility
    platform_version VARCHAR(20),
    credentials TEXT NOT NULL, -- Encrypted JSON with API keys/tokens
    
    -- Legacy API Configuration (kept for compatibility)
    api_endpoint VARCHAR(500),
    api_key VARCHAR(255),
    api_secret VARCHAR(255),
    
    -- Shopify specific (legacy)
    shopify_store_name VARCHAR(255),
    shopify_access_token VARCHAR(255),
    
    -- WooCommerce specific (legacy) 
    woo_commerce_url VARCHAR(500),
    woo_commerce_consumer_key VARCHAR(255),
    woo_commerce_consumer_secret VARCHAR(255),
    
    -- Manual inventory products (JSON array)
    products JSONB,
    
    -- Sync settings (JSON object)
    sync_settings JSONB,
    
    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for inventory_integrations
CREATE INDEX IF NOT EXISTS idx_inventory_integrations_user_id ON inventory_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_integrations_type ON inventory_integrations(type);
CREATE INDEX IF NOT EXISTS idx_inventory_integrations_platform ON inventory_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_inventory_integrations_active ON inventory_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_integrations_created ON inventory_integrations(created_at);

-- E-commerce QR Codes Table  
CREATE TABLE IF NOT EXISTS ecommerce_qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('product', 'coupon', 'payment', 'inventory')),
    
    -- Type-specific data (JSON)
    product_data JSONB, -- ProductQRData as JSON
    coupon_data JSONB,  -- CouponQRData as JSON  
    payment_data JSONB, -- PaymentQRData as JSON
    
    -- Inventory integration reference
    inventory_integration_id UUID REFERENCES inventory_integrations(id) ON DELETE SET NULL,
    
    -- Analytics
    views INTEGER DEFAULT 0,
    scans INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0.00,
    
    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for ecommerce_qr_codes
CREATE INDEX IF NOT EXISTS idx_ecommerce_qr_codes_qr_code_id ON ecommerce_qr_codes(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_qr_codes_type ON ecommerce_qr_codes(type);
CREATE INDEX IF NOT EXISTS idx_ecommerce_qr_codes_inventory_integration ON ecommerce_qr_codes(inventory_integration_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_qr_codes_active ON ecommerce_qr_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_ecommerce_qr_codes_created ON ecommerce_qr_codes(created_at);

-- E-commerce Analytics Events Table
CREATE TABLE IF NOT EXISTS ecommerce_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view', 'scan', 'conversion', 'payment')),
    event_data JSONB, -- JSON with event-specific data
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    location_data JSONB, -- JSON with geolocation data
    device_info JSONB, -- JSON with device/browser info
    session_id VARCHAR(255),
    
    -- E-commerce specific
    product_id VARCHAR(255),
    variant_id VARCHAR(255),
    quantity INTEGER,
    unit_price DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    currency VARCHAR(3),
    coupon_code VARCHAR(100),
    discount_amount DECIMAL(12,2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for ecommerce_analytics
CREATE INDEX IF NOT EXISTS idx_ecommerce_analytics_qr_code_id ON ecommerce_analytics(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_analytics_event_type ON ecommerce_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_ecommerce_analytics_created ON ecommerce_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_ecommerce_analytics_product_id ON ecommerce_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_analytics_session ON ecommerce_analytics(session_id);

-- Inventory Items Table (for cached inventory data)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES inventory_integrations(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL, -- Product ID from external system
    sku VARCHAR(255),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    stock_count INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    category VARCHAR(255),
    brand VARCHAR(255),
    image_url TEXT,
    product_url TEXT,
    weight DECIMAL(8,2),
    dimensions JSONB, -- JSON: {length, width, height, unit}
    
    -- Product variations/attributes
    variants JSONB, -- JSON array of variants
    attributes JSONB, -- JSON object with product attributes
    
    -- Sync metadata
    external_updated_at TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sync_status VARCHAR(10) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'error', 'pending')),
    sync_error TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(integration_id, external_id)
);

-- Add indexes for inventory_items
CREATE INDEX IF NOT EXISTS idx_inventory_items_integration_id ON inventory_items(integration_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_external_id ON inventory_items(external_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand ON inventory_items(brand);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(stock_count);
CREATE INDEX IF NOT EXISTS idx_inventory_items_price ON inventory_items(price);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sync_status ON inventory_items(sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_updated ON inventory_items(updated_at);

-- Price Rules Table (for dynamic pricing)
CREATE TABLE IF NOT EXISTS price_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID REFERENCES inventory_integrations(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'bulk_discount')),
    value DECIMAL(12,2) NOT NULL,
    conditions JSONB NOT NULL, -- JSON array of conditions
    priority INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for price_rules
CREATE INDEX IF NOT EXISTS idx_price_rules_integration_id ON price_rules(integration_id);
CREATE INDEX IF NOT EXISTS idx_price_rules_qr_code_id ON price_rules(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_price_rules_type ON price_rules(type);
CREATE INDEX IF NOT EXISTS idx_price_rules_priority ON price_rules(priority);
CREATE INDEX IF NOT EXISTS idx_price_rules_active ON price_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_price_rules_valid_from ON price_rules(valid_from);
CREATE INDEX IF NOT EXISTS idx_price_rules_valid_to ON price_rules(valid_to);

-- Coupons Table (for coupon QR codes)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y')),
    value DECIMAL(12,2),
    minimum_order_amount DECIMAL(12,2),
    maximum_discount_amount DECIMAL(12,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    per_customer_usage_limit INTEGER DEFAULT 1,
    applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_products', 'specific_categories')),
    applicable_products JSONB, -- JSON array of product IDs
    applicable_categories JSONB, -- JSON array of category IDs
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for coupons
CREATE INDEX IF NOT EXISTS idx_coupons_qr_code_id ON coupons(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_type ON coupons(type);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_starts_at ON coupons(starts_at);
CREATE INDEX IF NOT EXISTS idx_coupons_ends_at ON coupons(ends_at);
CREATE INDEX IF NOT EXISTS idx_coupons_usage_limit ON coupons(usage_limit);

-- Coupon Usage Tracking
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id VARCHAR(255),
    discount_amount DECIMAL(12,2),
    order_total DECIMAL(12,2),
    used_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for coupon_usage
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_id ON coupon_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_used_at ON coupon_usage(used_at);

-- Payment Links Table (for payment QR codes)
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    payment_processor VARCHAR(20) NOT NULL CHECK (payment_processor IN ('stripe', 'paypal', 'square', 'manual')),
    processor_payment_id VARCHAR(255), -- Payment ID from processor
    processor_data JSONB, -- JSON with processor-specific data
    
    -- Payment status
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'digital_wallet', etc.
    transaction_fee DECIMAL(12,2),
    net_amount DECIMAL(12,2),
    
    -- Customer info (optional)
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    billing_address JSONB, -- JSON
    
    -- Metadata
    metadata JSONB, -- JSON for additional data
    expires_at TIMESTAMP,
    paid_at TIMESTAMP,
    refunded_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for payment_links
CREATE INDEX IF NOT EXISTS idx_payment_links_qr_code_id ON payment_links(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_processor_payment_id ON payment_links(processor_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_customer_email ON payment_links(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_links_expires_at ON payment_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_links_paid_at ON payment_links(paid_at);
CREATE INDEX IF NOT EXISTS idx_payment_links_amount ON payment_links(amount);

-- Webhook Events Table (for external integrations)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID REFERENCES inventory_integrations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(50) NOT NULL, -- 'shopify', 'woocommerce', etc.
    payload JSONB NOT NULL, -- Raw webhook payload
    headers JSONB, -- Request headers as JSON
    signature VARCHAR(255), -- Webhook signature for verification
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_integration_id ON webhook_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_source ON webhook_events(event_source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need updated_at
CREATE TRIGGER update_inventory_integrations_updated_at BEFORE UPDATE ON inventory_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_qr_codes_updated_at BEFORE UPDATE ON ecommerce_qr_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_rules_updated_at BEFORE UPDATE ON price_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_links_updated_at BEFORE UPDATE ON payment_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- MARKETING TOOLS SYSTEM
-- Campaign management, UTM tracking, conversion attribution, and retargeting pixels
-- ===============================================

-- Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('awareness', 'acquisition', 'conversion', 'retention', 'referral')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    
    -- Campaign targeting
    target_audience TEXT, -- Description of target audience
    geographic_targets TEXT[], -- Array of countries/regions
    device_targets TEXT[], -- Array of device types
    
    -- Campaign dates
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Budget and goals
    budget_amount DECIMAL(12,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    target_conversions INTEGER,
    target_cpa DECIMAL(10,2), -- Cost per acquisition
    
    -- Campaign settings
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    
    -- Metadata
    tags TEXT[], -- Array of campaign tags
    metadata JSONB,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign QR Codes Junction Table
CREATE TABLE IF NOT EXISTS campaign_qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    
    -- Performance tracking
    scans_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    last_scan_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(campaign_id, qr_code_id)
);

-- UTM Tracking Parameters Table
CREATE TABLE IF NOT EXISTS utm_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    
    -- UTM Parameters
    utm_source VARCHAR(255) NOT NULL,
    utm_medium VARCHAR(255) NOT NULL,
    utm_campaign VARCHAR(255) NOT NULL,
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    
    -- Generated URLs
    original_url TEXT NOT NULL,
    utm_url TEXT NOT NULL,
    
    -- Tracking data
    clicks_count INTEGER DEFAULT 0,
    unique_clicks_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    first_click_at TIMESTAMP,
    last_click_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- UTM Events Table (for detailed tracking)
CREATE TABLE IF NOT EXISTS utm_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utm_tracking_id UUID NOT NULL REFERENCES utm_tracking(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    
    -- UTM parameters at time of click
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    
    -- Event details
    event_type VARCHAR(50) DEFAULT 'click' CHECK (event_type IN ('click', 'view', 'conversion', 'bounce')),
    referrer_url TEXT,
    landing_page_url TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Attribution
    attribution_type VARCHAR(50) DEFAULT 'last_click',
    attribution_value DECIMAL(10,2),
    
    -- Geolocation
    country VARCHAR(2),
    region VARCHAR(255),
    city VARCHAR(255),
    
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Retargeting Pixels Table
CREATE TABLE IF NOT EXISTS retargeting_pixels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    
    name VARCHAR(255) NOT NULL,
    pixel_type VARCHAR(50) NOT NULL CHECK (pixel_type IN ('facebook', 'google', 'linkedin', 'twitter', 'custom')),
    pixel_id VARCHAR(255) NOT NULL, -- Platform-specific pixel ID
    
    -- Pixel configuration
    pixel_code TEXT NOT NULL, -- HTML/JavaScript pixel code
    trigger_events TEXT[] DEFAULT '{"page_view"}', -- Array of events that trigger pixel
    
    -- Targeting settings
    target_qr_codes UUID[], -- Array of QR code IDs to track
    target_campaigns UUID[], -- Array of campaign IDs to track
    
    -- Pixel settings
    is_test_mode BOOLEAN DEFAULT FALSE,
    custom_parameters JSONB, -- Platform-specific parameters
    
    -- Activity tracking
    fires_count INTEGER DEFAULT 0,
    last_fired_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Retargeting Pixel Events Table
CREATE TABLE IF NOT EXISTS retargeting_pixel_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pixel_id UUID NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    event_value DECIMAL(10,2),
    event_currency VARCHAR(3),
    
    -- User context
    session_id VARCHAR(255),
    user_fingerprint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    page_url TEXT,
    
    -- Platform data
    platform_event_id VARCHAR(255), -- Event ID from platform (Facebook, Google, etc.)
    platform_response JSONB, -- Response from platform API
    
    -- Geolocation
    country VARCHAR(2),
    region VARCHAR(255),
    city VARCHAR(255),
    
    fired_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Analytics Summary Table
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    
    -- Date for daily aggregation
    analytics_date DATE NOT NULL,
    
    -- Basic metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    scans INTEGER DEFAULT 0,
    unique_scans INTEGER DEFAULT 0,
    
    -- Conversion metrics
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0,
    
    -- Campaign performance
    click_through_rate DECIMAL(5,4) DEFAULT 0, -- CTR
    conversion_rate DECIMAL(5,4) DEFAULT 0, -- CVR
    cost_per_click DECIMAL(10,2) DEFAULT 0, -- CPC
    cost_per_conversion DECIMAL(10,2) DEFAULT 0, -- CPA
    return_on_ad_spend DECIMAL(10,4) DEFAULT 0, -- ROAS
    
    -- UTM performance
    top_utm_source VARCHAR(255),
    top_utm_medium VARCHAR(255),
    top_utm_content VARCHAR(255),
    
    -- Geographic performance
    top_country VARCHAR(2),
    top_region VARCHAR(255),
    
    -- Device performance
    top_device_type VARCHAR(50),
    mobile_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Temporal patterns
    peak_hour INTEGER, -- Hour with most activity
    peak_day_of_week INTEGER, -- Day with most activity
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(campaign_id, analytics_date)
);

-- Campaign Conversion Attribution Table
CREATE TABLE IF NOT EXISTS campaign_conversion_attribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    conversion_event_id UUID NOT NULL REFERENCES conversion_events(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    utm_tracking_id UUID REFERENCES utm_tracking(id) ON DELETE SET NULL,
    
    -- Attribution model
    attribution_model VARCHAR(50) NOT NULL CHECK (attribution_model IN ('first_touch', 'last_touch', 'linear', 'time_decay', 'position_based')),
    attribution_weight DECIMAL(5,4) DEFAULT 1.0, -- Weight for multi-touch attribution
    
    -- Attribution timing
    touch_timestamp TIMESTAMP NOT NULL,
    conversion_timestamp TIMESTAMP NOT NULL,
    time_to_conversion INTERVAL, -- Time between touch and conversion
    
    -- Attribution value
    attributed_value DECIMAL(10,2),
    attributed_currency VARCHAR(3),
    
    -- Context
    touch_point VARCHAR(255), -- Source of the touch (UTM source, QR code, etc.)
    conversion_path TEXT[], -- Array of touch points leading to conversion
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for marketing tables
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user_id ON marketing_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_campaign_qr_codes_campaign_id ON campaign_qr_codes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_qr_codes_qr_code_id ON campaign_qr_codes(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_campaign_qr_codes_active ON campaign_qr_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_utm_tracking_qr_code_id ON utm_tracking(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_utm_tracking_campaign_id ON utm_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_utm_tracking_source ON utm_tracking(utm_source);
CREATE INDEX IF NOT EXISTS idx_utm_tracking_medium ON utm_tracking(utm_medium);
CREATE INDEX IF NOT EXISTS idx_utm_tracking_campaign ON utm_tracking(utm_campaign);

CREATE INDEX IF NOT EXISTS idx_utm_events_utm_tracking_id ON utm_events(utm_tracking_id);
CREATE INDEX IF NOT EXISTS idx_utm_events_qr_code_id ON utm_events(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_utm_events_session_id ON utm_events(session_id);
CREATE INDEX IF NOT EXISTS idx_utm_events_timestamp ON utm_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_utm_events_event_type ON utm_events(event_type);

CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_user_id ON retargeting_pixels(user_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_campaign_id ON retargeting_pixels(campaign_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_type ON retargeting_pixels(pixel_type);
CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_active ON retargeting_pixels(is_active);

CREATE INDEX IF NOT EXISTS idx_retargeting_pixel_events_pixel_id ON retargeting_pixel_events(pixel_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_pixel_events_qr_code_id ON retargeting_pixel_events(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_pixel_events_campaign_id ON retargeting_pixel_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_pixel_events_fired_at ON retargeting_pixel_events(fired_at);

CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_date ON campaign_analytics(analytics_date);

CREATE INDEX IF NOT EXISTS idx_campaign_conversion_attribution_campaign_id ON campaign_conversion_attribution(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_conversion_attribution_conversion_id ON campaign_conversion_attribution(conversion_event_id);
CREATE INDEX IF NOT EXISTS idx_campaign_conversion_attribution_qr_code_id ON campaign_conversion_attribution(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_campaign_conversion_attribution_touch_time ON campaign_conversion_attribution(touch_timestamp);

-- Add triggers for updated_at columns on marketing tables
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_utm_tracking_updated_at BEFORE UPDATE ON utm_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retargeting_pixels_updated_at BEFORE UPDATE ON retargeting_pixels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_analytics_updated_at BEFORE UPDATE ON campaign_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- CONTENT MANAGEMENT SYSTEM TABLES
-- Features: Blog Posts, Testimonials, Static Pages
-- Rich Content Editor, Categories, Tags, SEO
-- ===============================================

-- Content Categories Table
CREATE TABLE IF NOT EXISTS content_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES content_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(100), -- Icon name or URL
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Tags Table
CREATE TABLE IF NOT EXISTS content_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Posts Table (Blog Posts, Testimonials, Static Pages)
CREATE TABLE IF NOT EXISTS content_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    
    -- Content Storage
    content_delta JSONB, -- Quill Delta format for editor
    content_html TEXT,   -- Rendered HTML for display
    excerpt TEXT,        -- Short description/summary
    
    -- Post Classification
    post_type VARCHAR(50) NOT NULL DEFAULT 'blog', -- blog, testimonial, page, help
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived, scheduled
    
    -- Media & Visuals
    featured_image_url VARCHAR(1000),
    featured_image_alt VARCHAR(500),
    gallery_images JSONB, -- Array of image objects
    
    -- Organization
    category_id INTEGER REFERENCES content_categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Publishing Control
    publish_date TIMESTAMP,
    scheduled_publish_date TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- SEO & Meta
    seo_title VARCHAR(600),
    seo_description VARCHAR(1000),
    seo_keywords TEXT[],
    meta_robots VARCHAR(100) DEFAULT 'index, follow',
    canonical_url VARCHAR(1000),
    
    -- Social Media
    social_image_url VARCHAR(1000),
    social_title VARCHAR(300),
    social_description VARCHAR(500),
    
    -- Engagement & Analytics
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_enabled BOOLEAN DEFAULT TRUE,
    
    -- Testimonial-specific fields
    customer_name VARCHAR(255),
    customer_title VARCHAR(255),
    customer_company VARCHAR(255),
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_avatar_url VARCHAR(1000),
    testimonial_date DATE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Content Settings
    allow_comments BOOLEAN DEFAULT TRUE,
    is_sticky BOOLEAN DEFAULT FALSE,
    password_protected BOOLEAN DEFAULT FALSE,
    access_password VARCHAR(255),
    
    -- Metadata
    metadata JSONB,
    custom_fields JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Post Tags Junction Table
CREATE TABLE IF NOT EXISTS content_post_tags (
    post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES content_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Content Media Library Table
CREATE TABLE IF NOT EXISTS content_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    
    -- File Information
    mime_type VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_extension VARCHAR(10),
    
    -- Media Classification
    media_type VARCHAR(50) NOT NULL DEFAULT 'image', -- image, video, audio, document
    
    -- Image-specific fields
    width INTEGER,
    height INTEGER,
    
    -- Image variants/thumbnails
    thumbnails JSONB, -- Array of thumbnail objects
    
    -- Organization
    alt_text VARCHAR(500),
    caption TEXT,
    description TEXT,
    
    -- Usage & Relations
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    folder_path VARCHAR(500),
    tags TEXT[],
    
    -- SEO
    seo_filename VARCHAR(500),
    
    -- Metadata
    exif_data JSONB,
    metadata JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Comments Table
CREATE TABLE IF NOT EXISTS content_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
    
    -- Commenter Information
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    author_website VARCHAR(500),
    author_ip VARCHAR(45),
    user_agent TEXT,
    
    -- Comment Content
    content TEXT NOT NULL,
    content_html TEXT, -- Processed/sanitized HTML
    
    -- Status & Moderation
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, spam, deleted
    is_approved BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEO Settings Table
CREATE TABLE IF NOT EXISTS content_seo_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Site-wide SEO Settings
    site_title VARCHAR(300),
    site_description VARCHAR(1000),
    site_keywords TEXT[],
    
    -- Default Meta Settings
    default_meta_title_template VARCHAR(500),
    default_meta_description_template VARCHAR(1000),
    default_meta_robots VARCHAR(100) DEFAULT 'index, follow',
    
    -- Social Media Defaults
    default_og_type VARCHAR(50) DEFAULT 'website',
    default_og_image VARCHAR(1000),
    default_twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
    
    -- Analytics & Tracking
    google_analytics_id VARCHAR(50),
    google_tag_manager_id VARCHAR(50),
    facebook_pixel_id VARCHAR(50),
    
    -- Sitemap Settings
    sitemap_enabled BOOLEAN DEFAULT TRUE,
    sitemap_include_images BOOLEAN DEFAULT TRUE,
    sitemap_change_frequency VARCHAR(20) DEFAULT 'weekly',
    sitemap_priority DECIMAL(2,1) DEFAULT 0.8,
    
    -- Robots.txt Settings
    robots_txt_content TEXT,
    
    -- Schema.org Settings
    organization_name VARCHAR(255),
    organization_logo VARCHAR(1000),
    organization_url VARCHAR(1000),
    
    -- Breadcrumbs
    breadcrumbs_enabled BOOLEAN DEFAULT TRUE,
    breadcrumbs_separator VARCHAR(10) DEFAULT ' > ',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Views Table (For Analytics)
CREATE TABLE IF NOT EXISTS content_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
    
    -- Visitor Information
    visitor_ip VARCHAR(45),
    user_agent TEXT,
    referrer_url VARCHAR(1000),
    
    -- Session Information
    session_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Geographic Data
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Device & Browser
    device_type VARCHAR(20), -- desktop, mobile, tablet
    browser VARCHAR(50),
    operating_system VARCHAR(50),
    
    -- Engagement Metrics
    time_on_page INTEGER, -- seconds
    scroll_depth INTEGER, -- percentage
    
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Menu Items Table (For Navigation)
CREATE TABLE IF NOT EXISTS content_menu_items (
    id SERIAL PRIMARY KEY,
    menu_location VARCHAR(50) NOT NULL, -- header, footer, sidebar, mobile
    
    -- Menu Item Details
    title VARCHAR(255) NOT NULL,
    url VARCHAR(1000),
    target VARCHAR(20) DEFAULT '_self',
    css_classes VARCHAR(255),
    
    -- Content Link (if linking to internal content)
    linked_post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE,
    
    -- Organization
    parent_id INTEGER REFERENCES content_menu_items(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    
    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,
    visibility_rules JSONB, -- User role/permission rules
    
    -- Metadata
    description TEXT,
    icon VARCHAR(100),
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Content Management
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_type ON content_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_content_posts_category ON content_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_author ON content_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_published ON content_posts(publish_date) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_content_posts_slug ON content_posts(slug);
CREATE INDEX IF NOT EXISTS idx_content_media_type ON content_media(media_type);
CREATE INDEX IF NOT EXISTS idx_content_views_post ON content_views(post_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_content_comments_post ON content_comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_content_categories_slug ON content_categories(slug);
CREATE INDEX IF NOT EXISTS idx_content_tags_slug ON content_tags(slug);

-- Add updated_at triggers for content tables
CREATE TRIGGER update_content_categories_updated_at BEFORE UPDATE ON content_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_posts_updated_at BEFORE UPDATE ON content_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_media_updated_at BEFORE UPDATE ON content_media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_comments_updated_at BEFORE UPDATE ON content_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_seo_settings_updated_at BEFORE UPDATE ON content_seo_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_menu_items_updated_at BEFORE UPDATE ON content_menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default Content Categories
INSERT INTO content_categories (name, slug, description, sort_order) VALUES
('Blog', 'blog', 'Company blog posts and articles', 1),
('News & Updates', 'news', 'Company news and product updates', 2),
('Tutorials', 'tutorials', 'How-to guides and tutorials', 3),
('Case Studies', 'case-studies', 'Customer success stories and case studies', 4),
('Company', 'company', 'About us and company information', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert Default Content Tags
INSERT INTO content_tags (name, slug, description) VALUES
('QR Codes', 'qr-codes', 'Posts about QR code technology'),
('Marketing', 'marketing', 'Marketing tips and strategies'),
('Business', 'business', 'Business growth and development'),
('Technology', 'technology', 'Technology news and updates'),
('Tutorial', 'tutorial', 'Step-by-step guides'),
('Tips', 'tips', 'Helpful tips and tricks'),
('Best Practices', 'best-practices', 'Industry best practices'),
('Case Study', 'case-study', 'Customer case studies'),
('Feature Update', 'feature-update', 'New feature announcements'),
('Success Story', 'success-story', 'Customer success stories')
ON CONFLICT (slug) DO NOTHING;

-- Insert Default SEO Settings
INSERT INTO content_seo_settings (
    site_title,
    site_description,
    site_keywords,
    default_meta_title_template,
    default_meta_description_template,
    organization_name,
    breadcrumbs_enabled
) VALUES (
    'QR Generation SaaS - Create Custom QR Codes',
    'Professional QR code generation platform with advanced customization, analytics, and management features for businesses.',
    ARRAY['QR codes', 'custom QR codes', 'QR generator', 'business QR codes', 'marketing QR codes'],
    '%title% - QR Generation SaaS',
    '%description% | Professional QR code generation platform',
    'QR Generation SaaS',
    TRUE
) ON CONFLICT DO NOTHING;

-- ===============================================
-- ADMIN DASHBOARD SYSTEM
-- Complete admin management with role-based access control
-- ===============================================

-- Admin role enumeration
CREATE TYPE admin_role_enum AS ENUM (
    'super_admin',      -- Full system access
    'content_admin',    -- Content management only  
    'analytics_admin',  -- Analytics and reports
    'user_admin',       -- User management
    'support_admin',    -- Customer support
    'marketing_admin'   -- Marketing tools
);

-- Admin Users Table - Separate from regular users for security
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role admin_role_enum NOT NULL DEFAULT 'content_admin',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin Sessions Table - Secure session management
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Activity Logs - Audit trail for all admin actions
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Permissions - Granular permission system
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    service VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Role Permissions - Map roles to permissions
CREATE TABLE admin_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role admin_role_enum NOT NULL,
    permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- Performance indexes for admin tables
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_active ON admin_sessions(is_active);
CREATE INDEX idx_admin_activity_admin_id ON admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_created_at ON admin_activity_logs(created_at);
CREATE INDEX idx_admin_activity_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_permissions_service ON admin_permissions(service);
CREATE INDEX idx_admin_role_permissions_role ON admin_role_permissions(role);

-- Default admin permissions
INSERT INTO admin_permissions (name, description, service, resource, action) VALUES
-- Content Service Permissions (Priority)
('content.posts.create', 'Create blog posts and pages', 'content', 'posts', 'create'),
('content.posts.read', 'View blog posts and pages', 'content', 'posts', 'read'),
('content.posts.update', 'Edit blog posts and pages', 'content', 'posts', 'update'),
('content.posts.delete', 'Delete blog posts and pages', 'content', 'posts', 'delete'),
('content.posts.publish', 'Publish and unpublish content', 'content', 'posts', 'publish'),
('content.media.manage', 'Manage media library', 'content', 'media', 'manage'),
('content.categories.manage', 'Manage content categories', 'content', 'categories', 'manage'),
('content.tags.manage', 'Manage content tags', 'content', 'tags', 'manage'),
('content.comments.manage', 'Moderate comments', 'content', 'comments', 'manage'),
('content.seo.manage', 'Manage SEO settings', 'content', 'seo', 'manage'),

-- User Service Permissions (Secondary priority)
('users.read', 'View user accounts', 'user', 'users', 'read'),
('users.update', 'Edit user accounts', 'user', 'users', 'update'),
('users.delete', 'Delete user accounts', 'user', 'users', 'delete'),
('users.subscriptions.manage', 'Manage user subscriptions', 'user', 'subscriptions', 'manage'),
('users.payments.read', 'View payment information', 'user', 'payments', 'read'),
('users.support', 'Provide user support', 'user', 'support', 'manage'),

-- Analytics Permissions
('analytics.read', 'View analytics data', 'analytics', 'reports', 'read'),
('analytics.export', 'Export analytics data', 'analytics', 'reports', 'export'),
('analytics.super_admin', 'View super admin analytics', 'analytics', 'super_admin', 'read'),

-- QR Service Permissions
('qr.read', 'View QR codes', 'qr', 'codes', 'read'),
('qr.manage', 'Manage QR codes', 'qr', 'codes', 'manage'),
('qr.bulk.manage', 'Manage bulk QR operations', 'qr', 'bulk', 'manage'),
('qr.categories.manage', 'Manage QR categories', 'qr', 'categories', 'manage'),

-- System & Admin Permissions
('system.settings.read', 'View system settings', 'system', 'settings', 'read'),
('system.settings.manage', 'Manage system settings', 'system', 'settings', 'manage'),
('admin.users.manage', 'Manage admin users', 'admin', 'users', 'manage'),
('admin.logs.read', 'View admin activity logs', 'admin', 'logs', 'read'),
('admin.dashboard.access', 'Access admin dashboard', 'admin', 'dashboard', 'access');

-- Map permissions to roles
-- Super Admin gets all permissions
INSERT INTO admin_role_permissions (role, permission_id)
SELECT 'super_admin', id FROM admin_permissions;

-- Content Admin gets content-related permissions
INSERT INTO admin_role_permissions (role, permission_id)
SELECT 'content_admin', id FROM admin_permissions 
WHERE name LIKE 'content.%' OR name = 'admin.dashboard.access';

-- Analytics Admin gets analytics permissions
INSERT INTO admin_role_permissions (role, permission_id)
SELECT 'analytics_admin', id FROM admin_permissions 
WHERE name LIKE 'analytics.%' OR name = 'admin.dashboard.access';

-- User Admin gets user management permissions
INSERT INTO admin_role_permissions (role, permission_id)
SELECT 'user_admin', id FROM admin_permissions 
WHERE name LIKE 'users.%' OR name = 'admin.dashboard.access';

-- Support Admin gets user support permissions
INSERT INTO admin_role_permissions (role, permission_id)
SELECT 'support_admin', id FROM admin_permissions 
WHERE name IN ('users.read', 'users.support', 'qr.read', 'admin.dashboard.access');

-- Marketing Admin gets marketing permissions
INSERT INTO admin_role_permissions (role, permission_id)
SELECT 'marketing_admin', id FROM admin_permissions 
WHERE name LIKE 'analytics.%' OR name LIKE 'content.%' OR name = 'admin.dashboard.access';

-- Create default super admin user (password: Admin@123456)
-- Password hash for "Admin@123456" using bcrypt rounds 12
INSERT INTO admin_users (email, password_hash, full_name, role, is_active) VALUES 
('admin@qr-saas.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewSBcz/HXgO9mWoC', 'System Administrator', 'super_admin', true);

-- Create default content admin user (password: Content@123456)
-- Password hash for "Content@123456" using bcrypt rounds 12  
INSERT INTO admin_users (email, password_hash, full_name, role, is_active) VALUES 
('content@qr-saas.com', '$2b$12$XeA8vQp1zP5w9nJ2uC7fROL9KzN1hD6yP8qV3xW4nG5tA2sQ0mR7E', 'Content Administrator', 'content_admin', true);

-- ===============================================
-- BUSINESS TOOLS SYSTEM SCHEMA
-- Advanced business features for enterprise customers
-- ===============================================

-- Custom Domains table
CREATE TABLE IF NOT EXISTS custom_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    subdomain VARCHAR(100),
    full_domain VARCHAR(355) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'verifying', 'active', 'failed', 'suspended'
    verification_method VARCHAR(20) NOT NULL DEFAULT 'dns', -- 'dns', 'http', 'email'
    verification_token VARCHAR(255) NOT NULL,
    verification_value VARCHAR(500),
    verified_at TIMESTAMP WITH TIME ZONE,
    ssl_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'issued', 'active', 'failed', 'expired'
    ssl_certificate_id VARCHAR(255),
    ssl_issued_at TIMESTAMP WITH TIME ZONE,
    ssl_expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew_ssl BOOLEAN NOT NULL DEFAULT true,
    redirect_settings JSONB DEFAULT '{}',
    custom_headers JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Domain Verification Records
CREATE TABLE IF NOT EXISTS domain_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES custom_domains(id) ON DELETE CASCADE,
    verification_type VARCHAR(20) NOT NULL, -- 'dns_txt', 'dns_cname', 'http_file', 'email_click'
    record_name VARCHAR(500),
    record_value VARCHAR(1000),
    expected_value VARCHAR(1000),
    actual_value VARCHAR(1000),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
    last_checked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- SSL Certificates table
CREATE TABLE IF NOT EXISTS ssl_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES custom_domains(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'letsencrypt', -- 'letsencrypt', 'custom', 'cloudflare'
    certificate_data TEXT,
    private_key_data TEXT, -- Encrypted
    certificate_chain TEXT,
    serial_number VARCHAR(255),
    issued_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    renewal_attempts INTEGER DEFAULT 0,
    last_renewal_attempt TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'revoked', 'failed'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- White Label Configurations
CREATE TABLE IF NOT EXISTS white_label_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    config_name VARCHAR(200) NOT NULL,
    logo_url VARCHAR(500),
    logo_dark_url VARCHAR(500), -- Dark theme logo
    favicon_url VARCHAR(500),
    primary_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) NOT NULL DEFAULT '#1E40AF',
    accent_color VARCHAR(7) NOT NULL DEFAULT '#F59E0B',
    background_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    text_color VARCHAR(7) NOT NULL DEFAULT '#111827',
    company_name VARCHAR(200),
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    support_url VARCHAR(500),
    terms_url VARCHAR(500),
    privacy_url VARCHAR(500),
    custom_css TEXT,
    custom_js TEXT,
    branding_settings JSONB DEFAULT '{}',
    email_settings JSONB DEFAULT '{}', -- Custom email templates
    domain_settings JSONB DEFAULT '{}',
    feature_flags JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Brand Assets table
CREATE TABLE IF NOT EXISTS brand_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    white_label_config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- 'logo', 'favicon', 'background', 'email_header', 'custom'
    asset_name VARCHAR(200) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    dimensions JSONB, -- {width: number, height: number}
    alt_text VARCHAR(500),
    usage_context JSONB DEFAULT '{}', -- Where this asset is used
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- GDPR Compliance Management
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    request_type VARCHAR(30) NOT NULL, -- 'export', 'delete', 'rectify', 'restrict', 'object', 'portability'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected', 'expired'
    request_details JSONB DEFAULT '{}',
    requested_data JSONB DEFAULT '{}', -- What data is being requested
    processed_data JSONB DEFAULT '{}', -- Results of the request
    requester_email VARCHAR(255) NOT NULL,
    requester_ip_address INET,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE, -- Legal deadline
    admin_notes TEXT,
    rejection_reason TEXT,
    file_exports JSONB DEFAULT '[]', -- Array of exported file URLs
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User Consent Management
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL, -- 'cookies', 'marketing', 'analytics', 'data_processing', 'third_party'
    consent_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT, -- The actual consent text shown to user
    legal_basis VARCHAR(100), -- 'consent', 'legitimate_interest', 'contract', 'legal_obligation'
    source VARCHAR(100), -- 'registration', 'cookie_banner', 'privacy_dashboard', 'admin'
    ip_address INET,
    user_agent TEXT,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Privacy Settings per User
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analytics_tracking BOOLEAN NOT NULL DEFAULT true,
    marketing_emails BOOLEAN NOT NULL DEFAULT true,
    third_party_sharing BOOLEAN NOT NULL DEFAULT false,
    data_retention_days INTEGER DEFAULT 365,
    cookie_preferences JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    export_format VARCHAR(20) DEFAULT 'json', -- 'json', 'csv', 'pdf'
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(50) DEFAULT 'user', -- 'user', 'admin', 'system'
    UNIQUE(user_id)
);

-- Data Processing Activities Log
CREATE TABLE IF NOT EXISTS data_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL, -- 'data_access', 'data_export', 'data_delete', 'data_update'
    data_categories JSONB NOT NULL DEFAULT '[]', -- Array of data types accessed/processed
    purpose VARCHAR(200) NOT NULL,
    legal_basis VARCHAR(100) NOT NULL,
    processor VARCHAR(100), -- Service/system that processed the data
    processing_details JSONB DEFAULT '{}',
    retention_period INTEGER, -- Days
    automated_decision BOOLEAN DEFAULT false,
    third_party_transfers JSONB DEFAULT '[]',
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- GDPR Audit Trail
CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gdpr_request_id UUID REFERENCES gdpr_requests(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'created', 'verified', 'processing_started', 'data_exported', 'completed'
    performed_by VARCHAR(100), -- 'user', 'admin', 'system'
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ===============================================
-- BUSINESS TOOLS INDEXES
-- ===============================================

-- Custom Domains indexes
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_organization_id ON custom_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_full_domain ON custom_domains(full_domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);
CREATE INDEX IF NOT EXISTS idx_custom_domains_ssl_status ON custom_domains(ssl_status);
CREATE INDEX IF NOT EXISTS idx_custom_domains_active ON custom_domains(is_active);

-- Domain Verification indexes
CREATE INDEX IF NOT EXISTS idx_domain_verifications_domain_id ON domain_verifications(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_status ON domain_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_type ON domain_verifications(verification_type);

-- SSL Certificates indexes
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain_id ON ssl_certificates(domain_id);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_status ON ssl_certificates(status);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_expires_at ON ssl_certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_auto_renew ON ssl_certificates(auto_renew) WHERE auto_renew = true;

-- White Label Config indexes
CREATE INDEX IF NOT EXISTS idx_white_label_configs_user_id ON white_label_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_organization_id ON white_label_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_active ON white_label_configs(is_active);

-- Brand Assets indexes
CREATE INDEX IF NOT EXISTS idx_brand_assets_config_id ON brand_assets(white_label_config_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON brand_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_active ON brand_assets(is_active);

-- GDPR Request indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_email ON gdpr_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_expiry ON gdpr_requests(expiry_date);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at ON gdpr_requests(created_at DESC);

-- User Consent indexes
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_active ON user_consents(is_active);
CREATE INDEX IF NOT EXISTS idx_user_consents_date ON user_consents(consent_date DESC);

-- Privacy Settings indexes
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_updated ON user_privacy_settings(last_updated_at DESC);

-- Data Processing Logs indexes
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user_id ON data_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_activity ON data_processing_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_created_at ON data_processing_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_processor ON data_processing_logs(processor);

-- GDPR Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_logs_request_id ON gdpr_audit_logs(gdpr_request_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_logs_action ON gdpr_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_logs_timestamp ON gdpr_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_logs_admin_id ON gdpr_audit_logs(admin_user_id);

-- ===============================================
-- SSO (Single Sign-On) ENTERPRISE SECURITY SYSTEM
-- ===============================================

-- SSO Provider Configurations
CREATE TABLE sso_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('saml', 'oauth2', 'oidc', 'ldap', 'google', 'microsoft', 'github')),
    is_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    display_name VARCHAR(200),
    description TEXT,
    logo_url TEXT,
    button_text VARCHAR(100) DEFAULT 'Sign in',
    sort_order INTEGER DEFAULT 0,
    
    -- Provider-specific configuration (JSON)
    configuration JSONB NOT NULL DEFAULT '{}',
    
    -- Security settings
    force_authn BOOLEAN DEFAULT false,
    allow_create_user BOOLEAN DEFAULT true,
    require_email_verification BOOLEAN DEFAULT false,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
    last_test_at TIMESTAMP,
    last_test_result TEXT,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    UNIQUE(organization_id, name)
);

-- SSO User Identities (links external identities to local users)
CREATE TABLE sso_user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    external_id VARCHAR(500) NOT NULL,
    external_username VARCHAR(255),
    external_email VARCHAR(255),
    external_display_name VARCHAR(255),
    
    -- Attributes from SSO provider
    attributes JSONB DEFAULT '{}',
    
    -- Authentication details
    first_login_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP DEFAULT NOW(),
    login_count INTEGER DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(provider_id, external_id)
);

-- SSO Authentication Sessions
CREATE TABLE sso_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session state
    state VARCHAR(20) NOT NULL CHECK (state IN ('initiated', 'authenticated', 'completed', 'failed', 'expired')),
    
    -- SSO flow data
    auth_request_id VARCHAR(255),
    redirect_url TEXT,
    response_data JSONB,
    error_data JSONB,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    INDEX idx_sso_sessions_session_id (session_id),
    INDEX idx_sso_sessions_provider_id (provider_id),
    INDEX idx_sso_sessions_user_id (user_id),
    INDEX idx_sso_sessions_state (state),
    INDEX idx_sso_sessions_expires_at (expires_at)
);

-- SSO Configuration Templates (predefined provider configurations)
CREATE TABLE sso_config_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    provider_type VARCHAR(20) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    logo_url TEXT,
    
    -- Template configuration
    config_template JSONB NOT NULL,
    required_fields JSONB NOT NULL DEFAULT '[]',
    optional_fields JSONB NOT NULL DEFAULT '[]',
    
    -- Documentation
    setup_instructions TEXT,
    documentation_url TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SSO Attribute Mappings (map external attributes to user fields)
CREATE TABLE sso_attribute_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    
    -- Mapping configuration
    external_attribute VARCHAR(255) NOT NULL,
    internal_field VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    transform_expression TEXT,
    
    -- Field type for validation
    field_type VARCHAR(50) DEFAULT 'string' CHECK (field_type IN ('string', 'email', 'boolean', 'number', 'date', 'json')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(provider_id, external_attribute)
);

-- SSO Audit Logs
CREATE TABLE sso_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sso_sessions(id) ON DELETE SET NULL,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(30) NOT NULL CHECK (event_category IN ('authentication', 'configuration', 'user_management', 'error')),
    event_description TEXT NOT NULL,
    
    -- Event data
    event_data JSONB,
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'warning', 'info')),
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Performance
    duration_ms INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_sso_audit_logs_provider_id (provider_id),
    INDEX idx_sso_audit_logs_user_id (user_id),
    INDEX idx_sso_audit_logs_session_id (session_id),
    INDEX idx_sso_audit_logs_event_type (event_type),
    INDEX idx_sso_audit_logs_category (event_category),
    INDEX idx_sso_audit_logs_status (status),
    INDEX idx_sso_audit_logs_created_at (created_at DESC),
    INDEX idx_sso_audit_logs_ip_address (ip_address)
);

-- ===============================================
-- SSO SCHEMA INDEXES
-- ===============================================

-- SSO Providers indexes
CREATE INDEX idx_sso_providers_org_id ON sso_providers(organization_id);
CREATE INDEX idx_sso_providers_type ON sso_providers(type);
CREATE INDEX idx_sso_providers_enabled ON sso_providers(is_enabled);
CREATE INDEX idx_sso_providers_default ON sso_providers(is_default);
CREATE INDEX idx_sso_providers_status ON sso_providers(status);

-- SSO User Identities indexes
CREATE INDEX idx_sso_identities_user_id ON sso_user_identities(user_id);
CREATE INDEX idx_sso_identities_provider_id ON sso_user_identities(provider_id);
CREATE INDEX idx_sso_identities_external_id ON sso_user_identities(external_id);
CREATE INDEX idx_sso_identities_external_email ON sso_user_identities(external_email);
CREATE INDEX idx_sso_identities_active ON sso_user_identities(is_active);
CREATE INDEX idx_sso_identities_last_login ON sso_user_identities(last_login_at DESC);

-- SSO Attribute Mappings indexes
CREATE INDEX idx_sso_mappings_provider_id ON sso_attribute_mappings(provider_id);
CREATE INDEX idx_sso_mappings_internal_field ON sso_attribute_mappings(internal_field);

-- ===============================================
-- DEFAULT SSO CONFIGURATION TEMPLATES
-- ===============================================

-- Insert default SSO provider templates
INSERT INTO sso_config_templates (name, provider_type, display_name, description, config_template, required_fields, optional_fields, setup_instructions) VALUES
('google-oauth', 'google', 'Google OAuth 2.0', 'Sign in with Google account using OAuth 2.0', 
 '{"clientID": "", "clientSecret": "", "scope": ["openid", "email", "profile"], "callbackURL": "/auth/google/callback"}',
 '["clientID", "clientSecret"]',
 '["scope", "callbackURL"]',
 'Create a Google OAuth app in Google Cloud Console and configure the Client ID and Secret.'),

('microsoft-oauth', 'microsoft', 'Microsoft OAuth 2.0', 'Sign in with Microsoft account (Azure AD)', 
 '{"clientID": "", "clientSecret": "", "tenant": "common", "scope": ["openid", "email", "profile"], "callbackURL": "/auth/microsoft/callback"}',
 '["clientID", "clientSecret"]',
 '["tenant", "scope", "callbackURL"]',
 'Register an app in Azure AD and configure the Application (client) ID and Client secret.'),

('github-oauth', 'github', 'GitHub OAuth 2.0', 'Sign in with GitHub account', 
 '{"clientID": "", "clientSecret": "", "scope": ["user:email"], "callbackURL": "/auth/github/callback"}',
 '["clientID", "clientSecret"]',
 '["scope", "callbackURL"]',
 'Create a GitHub OAuth App in your GitHub settings and configure the Client ID and Secret.'),

('okta-saml', 'saml', 'Okta SAML 2.0', 'Enterprise SAML authentication with Okta', 
 '{"entryPoint": "", "issuer": "", "cert": "", "callbackUrl": "/auth/saml/callback", "signatureAlgorithm": "sha256"}',
 '["entryPoint", "issuer", "cert"]',
 '["callbackUrl", "signatureAlgorithm", "identifierFormat"]',
 'Configure SAML app in Okta and obtain the SSO URL, Entity ID, and Certificate.'),

('azure-saml', 'saml', 'Azure AD SAML 2.0', 'Enterprise SAML authentication with Azure Active Directory', 
 '{"entryPoint": "", "issuer": "", "cert": "", "callbackUrl": "/auth/saml/callback"}',
 '["entryPoint", "issuer", "cert"]',
 '["callbackUrl", "signatureAlgorithm"]',
 'Configure Enterprise Application in Azure AD and obtain the Login URL, Azure AD Identifier, and Certificate.'),

('generic-ldap', 'ldap', 'LDAP Authentication', 'Connect to LDAP directory (Active Directory, OpenLDAP)', 
 '{"server": {"url": "", "bindDN": "", "bindCredentials": "", "searchBase": "", "searchFilter": "(uid={{username}})"}}',
 '["server.url", "server.bindDN", "server.bindCredentials", "server.searchBase"]',
 '["server.searchFilter", "server.searchAttributes", "server.tlsOptions"]',
 'Configure LDAP connection details including server URL, bind credentials, and search parameters.');

-- ===============================================
-- DATABASE SCHEMA COMPLETE
-- All features implemented:
-- - Core QR SaaS Platform
-- - Team Management & Organizations  
-- - Team Collaboration Features
-- - Landing Pages System
-- - Advanced Analytics
-- - Payment Processing
-- - API & Integrations (SDK Generation)
-- - E-commerce QR Service
-- - MARKETING TOOLS SYSTEM
-- - Content Management System
-- - ADMIN DASHBOARD SYSTEM
-- - ADVANCED BUSINESS TOOLS SYSTEM
-- - ENTERPRISE SSO INTEGRATION SYSTEM
-- ===============================================
