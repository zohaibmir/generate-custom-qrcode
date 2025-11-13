-- Test Users for QR SaaS with Different Subscription Tiers
-- Password for all test users: "password123" (bcrypt hashed)

-- Delete existing test users first (if any)
DELETE FROM users WHERE email IN (
    'free@test.com',
    'pro@test.com', 
    'business@test.com',
    'enterprise@test.com',
    'admin@test.com'
);

-- Insert test users with different subscription tiers
INSERT INTO users (
    id,
    email,
    username,
    password_hash,
    full_name,
    subscription_tier,
    is_verified,
    preferences,
    metadata,
    created_at,
    updated_at
) VALUES 
-- Free Tier User
(
    uuid_generate_v4(),
    'free@test.com',
    'freetester',
    '$2b$10$X8Z1QZ8Z8Z8Z8Z8Z8Z8Z8Zu9BQNjjjjjjjjjjjjjjjjjjjjjjjjjjjjj',
    'Free Tier User',
    'free',
    true,
    '{"theme": "light", "notifications": true}',
    '{"onboarded": true, "last_login": "2024-11-09T10:00:00Z"}',
    NOW() - INTERVAL '30 days',
    NOW()
),
-- Pro Tier User  
(
    uuid_generate_v4(),
    'pro@test.com',
    'protester',
    '$2b$10$X8Z1QZ8Z8Z8Z8Z8Z8Z8Z8Zu9BQNjjjjjjjjjjjjjjjjjjjjjjjjjjjj',
    'Pro Tier User',
    'pro',
    true,
    '{"theme": "dark", "notifications": true}',
    '{"onboarded": true, "last_login": "2024-11-09T09:30:00Z"}',
    NOW() - INTERVAL '20 days',
    NOW()
),
-- Business Tier User
(
    uuid_generate_v4(),
    'business@test.com',
    'businesstester',
    '$2b$10$X8Z1QZ8Z8Z8Z8Z8Z8Z8Z8Zu9BQNjjjjjjjjjjjjjjjjjjjjjjjjjjjj',
    'Business Tier User',
    'business',
    true,
    '{"theme": "light", "notifications": false}',
    '{"onboarded": true, "last_login": "2024-11-09T09:00:00Z"}',
    NOW() - INTERVAL '15 days',
    NOW()
),
-- Enterprise Tier User
(
    uuid_generate_v4(),
    'enterprise@test.com',
    'enterprisetester',
    '$2b$10$X8Z1QZ8Z8Z8Z8Z8Z8Z8Z8Zu9BQNjjjjjjjjjjjjjjjjjjjjjjjjjjjj',
    'Enterprise Tier User',
    'enterprise',
    true,
    '{"theme": "dark", "notifications": true}',
    '{"onboarded": true, "last_login": "2024-11-09T08:30:00Z"}',
    NOW() - INTERVAL '10 days',
    NOW()
),
-- Super Admin User
(
    uuid_generate_v4(),
    'admin@test.com',
    'superadmin',
    '$2b$10$X8Z1QZ8Z8Z8Z8Z8Z8Z8Z8Zu9BQNjjjjjjjjjjjjjjjjjjjjjjjjjjjj',
    'Super Admin User',
    'super_admin',
    true,
    '{"theme": "dark", "notifications": true}',
    '{"onboarded": true, "last_login": "2024-11-09T08:00:00Z"}',
    NOW() - INTERVAL '5 days',
    NOW()
);

-- Show created users
SELECT 
    email,
    username,
    full_name,
    subscription_tier,
    is_verified,
    created_at
FROM users 
WHERE email IN (
    'free@test.com',
    'pro@test.com', 
    'business@test.com',
    'enterprise@test.com',
    'admin@test.com'
)
ORDER BY subscription_tier;

-- Create some sample QR codes for each user to have analytics data
-- Get user IDs for creating sample data
WITH test_user_ids AS (
    SELECT id, email, subscription_tier 
    FROM users 
    WHERE email IN ('free@test.com', 'pro@test.com', 'business@test.com', 'enterprise@test.com')
)
INSERT INTO qr_codes (
    id,
    user_id,
    short_id,
    name,
    type,
    content,
    design_config,
    target_url,
    is_active,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    u.id,
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
    'Sample QR - ' || u.subscription_tier,
    'url',
    '{"url": "https://example.com/' || u.subscription_tier || '"}',
    '{"size": 256, "margin": 4, "foregroundColor": "#000000", "backgroundColor": "#FFFFFF"}',
    'https://example.com/' || u.subscription_tier,
    true,
    NOW() - INTERVAL '7 days',
    NOW()
FROM test_user_ids u;

COMMIT;