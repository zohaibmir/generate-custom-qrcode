-- Consolidated Database Optimization Migration
-- Combines performance indexes and connection pool monitoring
-- Generated automatically - DO NOT EDIT

-- Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_qr_code_timestamp 
ON scan_events (qr_code_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_timestamp_qr_code 
ON scan_events (timestamp DESC, qr_code_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_location_active 
ON scan_events (country, region, city, timestamp DESC) 
WHERE country IS NOT NULL AND country != '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_platform_device_timestamp 
ON scan_events (platform, device, timestamp DESC) 
WHERE platform IS NOT NULL AND device IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_ip_timestamp 
ON scan_events (ip_address, timestamp DESC) 
WHERE ip_address IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qr_codes_user_active 
ON qr_codes (user_id, is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qr_codes_id_user_type 
ON qr_codes (id, user_id, type, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_date_qr_code 
ON scan_events (DATE(timestamp), qr_code_id);

-- Connection Pool Monitoring Functions (already applied)
SELECT 'Optimization indexes applied successfully' as status;
