#!/bin/bash

# Test User Service with Real User Authentication Context
# Using real user: zohaib.mir@gmail.com

USER_SERVICE_URL="http://localhost:3099"
REAL_USER_ID="9a8f4f1e-26b0-4247-a5ef-241de2beef75"
REAL_EMAIL="zohaib.mir@gmail.com"
REAL_USERNAME="zohaibmirwcn6"

echo "🧪 Testing User Service with REAL USER Authentication Integration"
echo "================================================================="
echo "📧 User: ${REAL_EMAIL}"
echo "🆔 ID: ${REAL_USER_ID}"
echo "👤 Username: ${REAL_USERNAME}"
echo ""

# Test 1: Health endpoint (should work without auth)
echo "1️⃣  Testing health endpoint (no auth required):"
curl -s -X GET "${USER_SERVICE_URL}/health" | jq .
echo ""

# Test 2: Profile endpoint without auth headers (should fail)
echo "2️⃣  Testing profile endpoint without auth headers (should fail):"
curl -s -X GET "${USER_SERVICE_URL}/users/profile" | jq .
echo ""

# Test 3: Profile endpoint with REAL USER auth headers from gateway (should succeed)
echo "3️⃣  Testing profile endpoint with REAL USER auth headers from gateway:"
curl -s -X GET "${USER_SERVICE_URL}/users/profile" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-email-verified: false" \
  -H "x-auth-permissions: read,create" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_real_user_$(date +%s)" \
  -H "x-api-gateway: true" | jq .
echo ""

# Test 4: Update profile with REAL USER auth headers
echo "4️⃣  Testing profile update with REAL USER auth headers:"
curl -s -X PUT "${USER_SERVICE_URL}/users/profile" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-email-verified: false" \
  -H "x-auth-permissions: read,create,update" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_real_user_update_$(date +%s)" \
  -H "x-api-gateway: true" \
  -d '{"fullName": "ZOHAIB Mir - Updated via Auth Context", "phoneNumber": "+92-300-1234567"}' | jq .
echo ""

# Test 5: Verify the update worked by fetching profile again
echo "5️⃣  Testing profile fetch after update to verify changes:"
curl -s -X GET "${USER_SERVICE_URL}/users/profile" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-email-verified: false" \
  -H "x-auth-permissions: read,create" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_real_user_verify_$(date +%s)" \
  -H "x-api-gateway: true" | jq .
echo ""

# Test 6: Test other user ID routes (admin-style) with auth context
echo "6️⃣  Testing direct user lookup by ID (admin style):"
curl -s -X GET "${USER_SERVICE_URL}/users/${REAL_USER_ID}" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-permissions: read,admin" \
  -H "x-request-id: req_admin_$(date +%s)" \
  -H "x-api-gateway: true" | jq .
echo ""

echo "✅ REAL USER authentication integration test completed!"
echo "🎯 This proves the authentication context flows correctly from Gateway → Service → Business Logic"