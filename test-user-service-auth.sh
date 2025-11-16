#!/bin/bash

# Test User Service with Authentication Context
# This script simulates API Gateway forwarding authenticated requests to User Service

USER_SERVICE_URL="http://localhost:3099"

echo "🧪 Testing User Service Authentication Integration"
echo "================================================"

# Test 1: Health endpoint (should work without auth)
echo ""
echo "1️⃣  Testing health endpoint (no auth required):"
curl -s -X GET "${USER_SERVICE_URL}/health" | jq .
echo ""

# Test 2: Profile endpoint without auth headers (should fail)
echo "2️⃣  Testing profile endpoint without auth headers (should fail):"
curl -s -X GET "${USER_SERVICE_URL}/users/profile" | jq .
echo ""

# Test 3: Profile endpoint with auth headers from gateway (should succeed)
echo "3️⃣  Testing profile endpoint with auth headers from gateway:"
curl -s -X GET "${USER_SERVICE_URL}/users/profile" \
  -H "x-auth-user-id: test-user-123" \
  -H "x-auth-email: test@example.com" \
  -H "x-auth-username: testuser" \
  -H "x-auth-subscription: pro" \
  -H "x-auth-email-verified: true" \
  -H "x-auth-permissions: read,write,create" \
  -H "x-auth-organization-id: test-org-123" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_test_$(date +%s)" \
  -H "x-api-gateway: true" | jq .
echo ""

# Test 4: Update profile with auth headers
echo "4️⃣  Testing profile update with auth headers:"
curl -s -X PUT "${USER_SERVICE_URL}/users/profile" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: test-user-123" \
  -H "x-auth-email: test@example.com" \
  -H "x-auth-username: testuser" \
  -H "x-auth-subscription: pro" \
  -H "x-auth-email-verified: true" \
  -H "x-auth-permissions: read,write,update" \
  -H "x-auth-organization-id: test-org-123" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_test_$(date +%s)" \
  -H "x-api-gateway: true" \
  -d '{"fullName": "Test User Updated", "phoneNumber": "+1234567890"}' | jq .
echo ""

# Test 5: Direct access (no gateway headers)
echo "5️⃣  Testing direct access (no gateway indicators):"
curl -s -X GET "${USER_SERVICE_URL}/users/profile" \
  -H "x-auth-user-id: test-user-123" \
  -H "x-auth-email: test@example.com" \
  -H "x-auth-username: testuser" \
  -H "x-auth-subscription: pro" \
  -H "x-auth-email-verified: true" \
  -H "x-auth-permissions: read,write,create" | jq .
echo ""

echo "✅ User Service authentication integration test completed!"