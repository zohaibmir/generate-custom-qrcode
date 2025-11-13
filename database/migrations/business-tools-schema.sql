-- ===============================================
-- ADVANCED BUSINESS TOOLS SCHEMA
-- Custom Domains, White Label, GDPR Management
-- ===============================================

-- Custom Domains Table
CREATE TABLE IF NOT EXISTS custom_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    subdomain VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed', 'expired')),
    type VARCHAR(20) NOT NULL DEFAULT 'custom' CHECK (type IN ('custom', 'subdomain')),
    dns_configured BOOLEAN DEFAULT false,
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_certificate_id UUID,
    verification_token VARCHAR(255),
    verification_method VARCHAR(20) DEFAULT 'dns' CHECK (verification_method IN ('dns', 'http', 'email')),
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    redirect_type VARCHAR(10) DEFAULT '301' CHECK (redirect_type IN ('301', '302')),
    www_redirect BOOLEAN DEFAULT false,
    wildcard_enabled BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Domain Verifications Table
CREATE TABLE IF NOT EXISTS domain_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES custom_domains(id) ON DELETE CASCADE,
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('dns_txt', 'dns_cname', 'http_file', 'email')),
    verification_key VARCHAR(255) NOT NULL,
    verification_value TEXT NOT NULL,
    expected_value TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    last_check_at TIMESTAMP,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    error_details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- SSL Certificates Table
CREATE TABLE IF NOT EXISTS ssl_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES custom_domains(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'letsencrypt',
    certificate_data TEXT,
    private_key_data TEXT,
    chain_data TEXT,
    common_name VARCHAR(255) NOT NULL,
    subject_alternative_names TEXT[],
    issued_by VARCHAR(255),
    issued_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    renewal_threshold_days INTEGER DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'expired', 'revoked', 'failed')),
    fingerprint VARCHAR(255),
    serial_number VARCHAR(255),
    key_algorithm VARCHAR(50) DEFAULT 'RSA',
    key_size INTEGER DEFAULT 2048,
    signature_algorithm VARCHAR(50),
    installation_status VARCHAR(20) DEFAULT 'pending' CHECK (installation_status IN ('pending', 'installed', 'failed')),
    validation_method VARCHAR(20) DEFAULT 'http' CHECK (validation_method IN ('http', 'dns', 'email')),
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- White Label Configurations Table
CREATE TABLE IF NOT EXISTS white_label_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    logo_url TEXT,
    favicon_url TEXT,
    company_name VARCHAR(255),
    support_email VARCHAR(255),
    support_url TEXT,
    privacy_policy_url TEXT,
    terms_of_service_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#007bff',
    secondary_color VARCHAR(7) DEFAULT '#6c757d',
    accent_color VARCHAR(7) DEFAULT '#28a745',
    background_color VARCHAR(7) DEFAULT '#ffffff',
    text_color VARCHAR(7) DEFAULT '#333333',
    button_color VARCHAR(7) DEFAULT '#007bff',
    link_color VARCHAR(7) DEFAULT '#007bff',
    success_color VARCHAR(7) DEFAULT '#28a745',
    warning_color VARCHAR(7) DEFAULT '#ffc107',
    error_color VARCHAR(7) DEFAULT '#dc3545',
    font_family VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
    font_size_base INTEGER DEFAULT 16,
    border_radius INTEGER DEFAULT 8,
    box_shadow_enabled BOOLEAN DEFAULT true,
    animations_enabled BOOLEAN DEFAULT true,
    custom_css TEXT,
    custom_javascript TEXT,
    head_html TEXT,
    footer_html TEXT,
    gtag_id VARCHAR(100),
    facebook_pixel_id VARCHAR(100),
    google_analytics_id VARCHAR(100),
    hotjar_site_id VARCHAR(100),
    intercom_app_id VARCHAR(100),
    crisp_website_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brand Assets Table
CREATE TABLE IF NOT EXISTS brand_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    white_label_config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('logo', 'favicon', 'banner', 'background', 'watermark', 'font')),
    asset_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    dimensions VARCHAR(20),
    alt_text VARCHAR(255),
    usage_context VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    cdn_url TEXT,
    optimized_versions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- GDPR Requests Table
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('access', 'portability', 'rectification', 'erasure', 'restriction', 'objection')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    subject_email VARCHAR(255) NOT NULL,
    subject_details JSONB DEFAULT '{}',
    request_details TEXT,
    verification_token VARCHAR(255),
    verification_method VARCHAR(20) DEFAULT 'email' CHECK (verification_method IN ('email', 'phone', 'id_document')),
    verified_at TIMESTAMP,
    legal_basis TEXT,
    data_categories TEXT[],
    processing_notes TEXT,
    response_data JSONB DEFAULT '{}',
    export_file_path TEXT,
    export_file_size BIGINT,
    export_format VARCHAR(10) DEFAULT 'json' CHECK (export_format IN ('json', 'xml', 'csv', 'pdf')),
    encryption_key VARCHAR(255),
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    retention_period_days INTEGER DEFAULT 30,
    auto_delete_at TIMESTAMP,
    processor_user_id UUID REFERENCES users(id),
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    deadline_date TIMESTAMP NOT NULL,
    notification_sent_at TIMESTAMP,
    escalation_level INTEGER DEFAULT 0,
    compliance_notes TEXT,
    audit_trail JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Consents Table
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    consent_category VARCHAR(50) NOT NULL,
    purpose_description TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    data_categories TEXT[],
    retention_period_days INTEGER,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMP,
    consent_method VARCHAR(50),
    consent_ip_address INET,
    consent_user_agent TEXT,
    withdrawal_date TIMESTAMP,
    withdrawal_method VARCHAR(50),
    withdrawal_ip_address INET,
    withdrawal_user_agent TEXT,
    version VARCHAR(10) DEFAULT '1.0',
    source_url TEXT,
    third_party_sharing BOOLEAN DEFAULT false,
    third_parties JSONB DEFAULT '[]',
    automated_processing BOOLEAN DEFAULT false,
    profiling_enabled BOOLEAN DEFAULT false,
    legitimate_interest_basis TEXT,
    opt_out_available BOOLEAN DEFAULT true,
    granular_controls JSONB DEFAULT '{}',
    consent_receipt_id VARCHAR(255),
    parent_consent_id UUID REFERENCES user_consents(id),
    expires_at TIMESTAMP,
    last_confirmed_at TIMESTAMP,
    confirmation_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    compliance_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Privacy Settings Table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analytics_enabled BOOLEAN DEFAULT true,
    marketing_emails_enabled BOOLEAN DEFAULT true,
    product_emails_enabled BOOLEAN DEFAULT true,
    sms_notifications_enabled BOOLEAN DEFAULT false,
    push_notifications_enabled BOOLEAN DEFAULT true,
    third_party_sharing_enabled BOOLEAN DEFAULT false,
    personalization_enabled BOOLEAN DEFAULT true,
    location_tracking_enabled BOOLEAN DEFAULT false,
    cookie_preferences JSONB DEFAULT '{"necessary": true, "analytics": true, "marketing": false, "preferences": true}',
    data_retention_preferences JSONB DEFAULT '{}',
    communication_preferences JSONB DEFAULT '{}',
    visibility_settings JSONB DEFAULT '{"profile": "private", "activity": "private", "qr_codes": "private"}',
    download_format_preference VARCHAR(10) DEFAULT 'json' CHECK (download_format_preference IN ('json', 'xml', 'csv', 'pdf')),
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone_preference VARCHAR(50) DEFAULT 'UTC',
    accessibility_preferences JSONB DEFAULT '{}',
    security_preferences JSONB DEFAULT '{"two_factor": false, "login_notifications": true, "suspicious_activity_alerts": true}',
    export_frequency VARCHAR(20) DEFAULT 'manual' CHECK (export_frequency IN ('manual', 'weekly', 'monthly', 'quarterly')),
    auto_delete_enabled BOOLEAN DEFAULT false,
    auto_delete_period_days INTEGER DEFAULT 365,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Data Processing Logs Table
CREATE TABLE IF NOT EXISTS data_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    data_subject_id UUID,
    data_categories TEXT[],
    legal_basis VARCHAR(50),
    purpose TEXT NOT NULL,
    processor_system VARCHAR(100),
    processor_user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    data_before JSONB,
    data_after JSONB,
    data_location VARCHAR(100),
    retention_period_days INTEGER,
    encryption_used BOOLEAN DEFAULT false,
    anonymization_applied BOOLEAN DEFAULT false,
    third_party_involved BOOLEAN DEFAULT false,
    third_party_details JSONB DEFAULT '{}',
    consent_reference_id UUID REFERENCES user_consents(id),
    gdpr_request_reference_id UUID REFERENCES gdpr_requests(id),
    compliance_status VARCHAR(20) DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'review_required', 'violation')),
    audit_notes TEXT,
    automated_process BOOLEAN DEFAULT false,
    risk_level VARCHAR(10) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    data_minimization_applied BOOLEAN DEFAULT true,
    storage_duration VARCHAR(50),
    cross_border_transfer BOOLEAN DEFAULT false,
    transfer_safeguards TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Custom Domains indexes
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_expires ON custom_domains(expires_at) WHERE expires_at IS NOT NULL;

-- Domain Verifications indexes
CREATE INDEX IF NOT EXISTS idx_domain_verifications_domain_id ON domain_verifications(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_status ON domain_verifications(status);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_type ON domain_verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_expires ON domain_verifications(expires_at) WHERE expires_at IS NOT NULL;

-- SSL Certificates indexes
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain_id ON ssl_certificates(domain_id);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_status ON ssl_certificates(status);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_expires ON ssl_certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_auto_renew ON ssl_certificates(auto_renew, expires_at) WHERE auto_renew = true;

-- White Label Configs indexes
CREATE INDEX IF NOT EXISTS idx_white_label_configs_user_id ON white_label_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_active ON white_label_configs(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_white_label_configs_default ON white_label_configs(user_id, is_default) WHERE is_default = true;

-- Brand Assets indexes
CREATE INDEX IF NOT EXISTS idx_brand_assets_config_id ON brand_assets(white_label_config_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON brand_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_active ON brand_assets(white_label_config_id, is_active) WHERE is_active = true;

-- GDPR Requests indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_deadline ON gdpr_requests(deadline_date);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created ON gdpr_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_email ON gdpr_requests(subject_email);

-- User Consents indexes
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_category ON user_consents(consent_category);
CREATE INDEX IF NOT EXISTS idx_user_consents_given ON user_consents(consent_given);
CREATE INDEX IF NOT EXISTS idx_user_consents_active ON user_consents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_consents_expires ON user_consents(expires_at) WHERE expires_at IS NOT NULL;

-- User Privacy Settings indexes
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON user_privacy_settings(user_id);

-- Data Processing Logs indexes
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user_id ON data_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_type ON data_processing_logs(processing_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_operation ON data_processing_logs(operation);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_timestamp ON data_processing_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_subject ON data_processing_logs(data_subject_id) WHERE data_subject_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_compliance ON data_processing_logs(compliance_status);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_expires ON data_processing_logs(expires_at) WHERE expires_at IS NOT NULL;

-- ===============================================
-- CONSTRAINTS AND TRIGGERS
-- ===============================================

-- Ensure only one default white label config per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_white_label_default_unique 
ON white_label_configs(user_id) WHERE is_default = true;

-- Ensure only one active white label config per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_white_label_active_unique 
ON white_label_configs(user_id) WHERE is_active = true;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER trigger_custom_domains_updated_at 
    BEFORE UPDATE ON custom_domains FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ssl_certificates_updated_at 
    BEFORE UPDATE ON ssl_certificates FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_white_label_configs_updated_at 
    BEFORE UPDATE ON white_label_configs FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_gdpr_requests_updated_at 
    BEFORE UPDATE ON gdpr_requests FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_consents_updated_at 
    BEFORE UPDATE ON user_consents FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_privacy_settings_updated_at 
    BEFORE UPDATE ON user_privacy_settings FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();