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
-- DATABASE SCHEMA COMPLETE
-- All features implemented:
-- - Core QR SaaS Platform
-- - Team Management & Organizations
-- - Team Collaboration Features
-- - Landing Pages System
-- - Advanced Analytics
-- - Payment Processing
-- ===============================================
