-- Useful Database Queries for QR SaaS Testing

-- 1. Check all test users
SELECT 
    email,
    full_name,
    subscription_tier,
    is_verified,
    created_at
FROM users 
WHERE email LIKE '%@test.com'
ORDER BY subscription_tier;

-- 2. Get user with QR codes count
SELECT 
    u.email,
    u.subscription_tier,
    COUNT(qr.id) as total_qr_codes,
    COUNT(CASE WHEN qr.is_active = true THEN 1 END) as active_qr_codes
FROM users u
LEFT JOIN qr_codes qr ON u.id = qr.user_id
WHERE u.email LIKE '%@test.com'
GROUP BY u.id, u.email, u.subscription_tier
ORDER BY u.subscription_tier;

-- 3. Check analytics data
SELECT 
    u.email,
    u.subscription_tier,
    qr.name as qr_name,
    COUNT(qa.id) as analytics_events
FROM users u
LEFT JOIN qr_codes qr ON u.id = qr.user_id
LEFT JOIN qr_analytics qa ON qr.id = qa.qr_code_id
WHERE u.email LIKE '%@test.com'
GROUP BY u.id, u.email, u.subscription_tier, qr.id, qr.name
ORDER BY u.subscription_tier;

-- 4. Get specific user details for login testing
SELECT 
    id,
    email,
    username,
    password_hash,
    subscription_tier,
    is_verified
FROM users 
WHERE email = 'pro@test.com';

-- 5. Create analytics data for testing
INSERT INTO qr_analytics (
    id,
    qr_code_id,
    event_type,
    ip_address,
    user_agent,
    country,
    city,
    device_type,
    referrer,
    metadata,
    created_at
)
SELECT 
    uuid_generate_v4(),
    qr.id,
    'scan',
    '192.168.1.' || (RANDOM() * 255)::INTEGER,
    'Mozilla/5.0 (Test Browser)',
    'US',
    'New York',
    'mobile',
    'https://test.com',
    '{"test": true}',
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM qr_codes qr
JOIN users u ON qr.user_id = u.id
WHERE u.email LIKE '%@test.com'
AND qr.id IS NOT NULL;

-- 6. Check subscription limits
SELECT 
    subscription_tier,
    COUNT(*) as user_count,
    MAX(created_at) as latest_user
FROM users 
WHERE email LIKE '%@test.com'
GROUP BY subscription_tier
ORDER BY subscription_tier;