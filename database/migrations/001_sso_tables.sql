-- ============================================================================
-- SSO Integration Database Migration
-- Version: 1.0
-- Date: November 13, 2025
-- Description: Adds SSO tables for enterprise authentication providers
-- ============================================================================

-- Create SSO providers table for storing authentication provider configurations
CREATE TABLE IF NOT EXISTS sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('SAML', 'OAUTH2', 'OIDC', 'LDAP', 'GOOGLE', 'MICROSOFT', 'GITHUB')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TESTING')),
    configuration JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(organization_id, name),
    CONSTRAINT valid_configuration CHECK (jsonb_typeof(configuration) = 'object')
);

-- Create SSO user identities table for linking external identities to internal users
CREATE TABLE IF NOT EXISTS sso_user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    external_username VARCHAR(255),
    external_email VARCHAR(255),
    external_display_name VARCHAR(255),
    attributes JSONB DEFAULT '{}',
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, external_id),
    CONSTRAINT valid_attributes CHECK (jsonb_typeof(attributes) = 'object')
);

-- Create SSO sessions table for managing SSO authentication sessions
CREATE TABLE IF NOT EXISTS sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES sso_user_identities(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    session_data JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    CONSTRAINT valid_session_data CHECK (jsonb_typeof(session_data) = 'object'),
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create SSO configuration templates table for provider setup templates
CREATE TABLE IF NOT EXISTS sso_config_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    description TEXT,
    configuration_template JSONB NOT NULL DEFAULT '{}',
    metadata_template JSONB DEFAULT '{}',
    is_built_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_config_template CHECK (jsonb_typeof(configuration_template) = 'object'),
    CONSTRAINT valid_metadata_template CHECK (jsonb_typeof(metadata_template) = 'object')
);

-- Create SSO attribute mappings table for user attribute mapping configuration
CREATE TABLE IF NOT EXISTS sso_attribute_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    source_attribute VARCHAR(255) NOT NULL,
    target_attribute VARCHAR(255) NOT NULL,
    transformation VARCHAR(50) DEFAULT 'NONE' CHECK (transformation IN ('NONE', 'UPPERCASE', 'LOWERCASE', 'TRIM', 'REGEX')),
    transformation_config JSONB DEFAULT '{}',
    is_required BOOLEAN DEFAULT FALSE,
    default_value VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, source_attribute),
    CONSTRAINT valid_transformation_config CHECK (jsonb_typeof(transformation_config) = 'object')
);

-- Create SSO audit logs table for comprehensive SSO operation logging
CREATE TABLE IF NOT EXISTS sso_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    provider_id UUID REFERENCES sso_providers(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    event_data JSONB DEFAULT '{}',
    result VARCHAR(20) CHECK (result IN ('SUCCESS', 'FAILURE', 'ERROR', 'WARNING')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_data CHECK (jsonb_typeof(event_data) = 'object')
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- SSO providers indexes
CREATE INDEX IF NOT EXISTS idx_sso_providers_org_id ON sso_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_sso_providers_type ON sso_providers(type);
CREATE INDEX IF NOT EXISTS idx_sso_providers_status ON sso_providers(status);
CREATE INDEX IF NOT EXISTS idx_sso_providers_created_at ON sso_providers(created_at);

-- SSO user identities indexes
CREATE INDEX IF NOT EXISTS idx_sso_user_identities_user_id ON sso_user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_user_identities_provider_id ON sso_user_identities(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_user_identities_external_email ON sso_user_identities(external_email);
CREATE INDEX IF NOT EXISTS idx_sso_user_identities_last_login ON sso_user_identities(last_login);
CREATE INDEX IF NOT EXISTS idx_sso_user_identities_status ON sso_user_identities(status);

-- SSO sessions indexes
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_provider_id ON sso_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_identity_id ON sso_sessions(identity_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_session_id ON sso_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires_at ON sso_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_status ON sso_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_ip_address ON sso_sessions(ip_address);

-- SSO attribute mappings indexes
CREATE INDEX IF NOT EXISTS idx_sso_attr_mappings_provider_id ON sso_attribute_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_attr_mappings_target_attr ON sso_attribute_mappings(target_attribute);

-- SSO audit logs indexes
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_event_type ON sso_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_user_id ON sso_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_provider_id ON sso_audit_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_created_at ON sso_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_result ON sso_audit_logs(result);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_ip_address ON sso_audit_logs(ip_address);

-- ============================================================================
-- INSERT DEFAULT SSO CONFIGURATION TEMPLATES
-- ============================================================================

-- Google Workspace OAuth2 template
INSERT INTO sso_config_templates (name, provider_type, description, configuration_template, metadata_template, is_built_in) 
VALUES (
    'Google Workspace OAuth2',
    'GOOGLE',
    'Google Workspace OAuth2 configuration for enterprise G Suite integration',
    '{
        "clientId": "",
        "clientSecret": "",
        "scope": ["openid", "email", "profile"],
        "redirectUri": "/auth/google/callback",
        "domain": "",
        "hostedDomain": ""
    }',
    '{
        "attributeMapping": {
            "email": "email",
            "firstName": "given_name", 
            "lastName": "family_name",
            "displayName": "name",
            "picture": "picture"
        },
        "requiredScopes": ["openid", "email", "profile"]
    }',
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Microsoft Azure AD SAML template
INSERT INTO sso_config_templates (name, provider_type, description, configuration_template, metadata_template, is_built_in)
VALUES (
    'Microsoft Azure AD SAML',
    'SAML',
    'Microsoft Azure Active Directory SAML 2.0 configuration',
    '{
        "entryPoint": "",
        "issuer": "",
        "cert": "",
        "callbackUrl": "/auth/saml/callback",
        "identifierFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
        "signatureAlgorithm": "sha256",
        "digestAlgorithm": "sha256"
    }',
    '{
        "attributeMapping": {
            "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
            "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
            "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
            "displayName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        }
    }',
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Okta SAML template
INSERT INTO sso_config_templates (name, provider_type, description, configuration_template, metadata_template, is_built_in)
VALUES (
    'Okta SAML 2.0',
    'SAML',
    'Okta SAML 2.0 identity provider configuration',
    '{
        "entryPoint": "",
        "issuer": "",
        "cert": "",
        "callbackUrl": "/auth/saml/callback",
        "identifierFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        "signatureAlgorithm": "sha256"
    }',
    '{
        "attributeMapping": {
            "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
            "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
            "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
            "groups": "http://schemas.xmlsoap.org/claims/Group"
        }
    }',
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- GitHub Enterprise OAuth2 template
INSERT INTO sso_config_templates (name, provider_type, description, configuration_template, metadata_template, is_built_in)
VALUES (
    'GitHub Enterprise OAuth2',
    'GITHUB',
    'GitHub Enterprise OAuth2 App configuration',
    '{
        "clientId": "",
        "clientSecret": "",
        "scope": ["user:email", "read:user"],
        "redirectUri": "/auth/github/callback",
        "enterpriseUrl": ""
    }',
    '{
        "attributeMapping": {
            "email": "email",
            "username": "login",
            "displayName": "name",
            "avatarUrl": "avatar_url"
        }
    }',
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Generic LDAP template
INSERT INTO sso_config_templates (name, provider_type, description, configuration_template, metadata_template, is_built_in)
VALUES (
    'Generic LDAP/Active Directory',
    'LDAP',
    'Generic LDAP or Active Directory configuration',
    '{
        "url": "ldap://localhost:389",
        "bindDN": "",
        "bindCredentials": "",
        "searchBase": "",
        "searchFilter": "(uid={{username}})",
        "searchAttributes": ["uid", "mail", "cn", "sn", "givenName"],
        "tlsOptions": {
            "rejectUnauthorized": false
        }
    }',
    '{
        "attributeMapping": {
            "email": "mail",
            "username": "uid",
            "firstName": "givenName",
            "lastName": "sn",
            "displayName": "cn"
        }
    }',
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- UPDATE TRIGGERS FOR AUTOMATIC TIMESTAMP MANAGEMENT
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_sso_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_sso_providers_updated_at ON sso_providers;
CREATE TRIGGER update_sso_providers_updated_at 
    BEFORE UPDATE ON sso_providers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_sso_updated_at_column();

DROP TRIGGER IF EXISTS update_sso_user_identities_updated_at ON sso_user_identities;
CREATE TRIGGER update_sso_user_identities_updated_at 
    BEFORE UPDATE ON sso_user_identities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_sso_updated_at_column();

DROP TRIGGER IF EXISTS update_sso_config_templates_updated_at ON sso_config_templates;
CREATE TRIGGER update_sso_config_templates_updated_at 
    BEFORE UPDATE ON sso_config_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_sso_updated_at_column();

DROP TRIGGER IF EXISTS update_sso_attribute_mappings_updated_at ON sso_attribute_mappings;
CREATE TRIGGER update_sso_attribute_mappings_updated_at 
    BEFORE UPDATE ON sso_attribute_mappings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_sso_updated_at_column();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to the application user
GRANT SELECT, INSERT, UPDATE, DELETE ON sso_providers TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sso_user_identities TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sso_sessions TO qr_user;
GRANT SELECT ON sso_config_templates TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sso_attribute_mappings TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sso_audit_logs TO qr_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log the completion of the migration
INSERT INTO sso_audit_logs (event_type, event_data, result, created_at) 
VALUES (
    'MIGRATION_COMPLETED',
    '{"migration": "sso_tables_v1.0", "tables_created": 6, "templates_added": 5, "indexes_created": 23}',
    'SUCCESS',
    CURRENT_TIMESTAMP
);

-- Display completion message
SELECT 'SSO Database Migration Completed Successfully!' as status,
       'Created 6 tables with indexes and triggers' as details,
       'Added 5 built-in provider configuration templates' as templates;