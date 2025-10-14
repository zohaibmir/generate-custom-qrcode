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

-- Function to create default categories for a user
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO qr_categories (user_id, name, description, color, icon, is_default, sort_order) VALUES
    (p_user_id, 'Business', 'Business and professional QR codes', '#3B82F6', '💼', true, 1),
    (p_user_id, 'Marketing', 'Marketing campaigns and promotions', '#EF4444', '📈', true, 2),
    (p_user_id, 'Personal', 'Personal QR codes and contacts', '#10B981', '👤', true, 3),
    (p_user_id, 'Events', 'Events, gatherings, and RSVPs', '#F59E0B', '🎉', true, 4),
    (p_user_id, 'Social Media', 'Social media profiles and links', '#8B5CF6', '📱', true, 5);
END;
$$ LANGUAGE plpgsql;