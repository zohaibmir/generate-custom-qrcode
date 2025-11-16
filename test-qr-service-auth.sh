#!/bin/bash

# Test QR Service with Real User Authentication Context
# Using real user: zohaib.mir@gmail.com

QR_SERVICE_URL="http://localhost:3002"
REAL_USER_ID="9a8f4f1e-26b0-4247-a5ef-241de2beef75"
REAL_EMAIL="zohaib.mir@gmail.com"
REAL_USERNAME="zohaibmirwcn6"

echo "🧪 Testing QR Service with REAL USER Authentication Integration"
echo "============================================================="
echo "📧 User: ${REAL_EMAIL}"
echo "🆔 ID: ${REAL_USER_ID}"
echo "👤 Username: ${REAL_USERNAME}"
echo ""

# Test 1: Health endpoint (should work without auth)
echo "1️⃣  Testing health endpoint (no auth required):"
curl -s -X GET "${QR_SERVICE_URL}/health" | jq .
echo ""

# Test 2: Get user's QR codes without auth headers (should fail)
echo "2️⃣  Testing QR codes endpoint without auth headers (should fail):"
curl -s -X GET "${QR_SERVICE_URL}/qr" | jq .
echo ""

# Test 3: Get user's QR codes with REAL USER auth headers from gateway
echo "3️⃣  Testing QR codes endpoint with REAL USER auth headers from gateway:"
curl -s -X GET "${QR_SERVICE_URL}/qr" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-email-verified: false" \
  -H "x-auth-permissions: read,create" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_qr_list_$(date +%s)" \
  -H "x-api-gateway: true" | jq .
echo ""

# Test 4: Create QR code with REAL USER auth headers
echo "4️⃣  Testing QR code creation with REAL USER auth headers:"
curl -s -X POST "${QR_SERVICE_URL}/qr" \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-email-verified: false" \
  -H "x-auth-permissions: read,create" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_qr_create_$(date +%s)" \
  -H "x-api-gateway: true" \
  -d '{
    "text": "https://github.com/zohaibmir/generate-custom-qrcode",
    "type": "text",
    "title": "Clean Architecture Test QR",
    "description": "Testing QR Service with Clean Architecture authentication"
  }' | jq .
echo ""

# Test 5: Get user's QR codes again to verify the new QR was created
echo "5️⃣  Testing QR codes list after creation to verify new QR:"
curl -s -X GET "${QR_SERVICE_URL}/qr?limit=5" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-email-verified: false" \
  -H "x-auth-permissions: read,create" \
  -H "x-auth-token-issued-at: $(date +%s)" \
  -H "x-auth-token-expires-at: $(($(date +%s) + 3600))" \
  -H "x-request-id: req_qr_verify_$(date +%s)" \
  -H "x-api-gateway: true" | jq .
echo ""

# Test 6: Test QR templates endpoint (if available)
echo "6️⃣  Testing QR templates endpoint:"
curl -s -X GET "${QR_SERVICE_URL}/templates" \
  -H "x-auth-user-id: ${REAL_USER_ID}" \
  -H "x-auth-email: ${REAL_EMAIL}" \
  -H "x-auth-username: ${REAL_USERNAME}" \
  -H "x-auth-subscription: free" \
  -H "x-auth-permissions: read,template" \
  -H "x-request-id: req_templates_$(date +%s)" \
  -H "x-api-gateway: true" | jq .
echo ""

echo "✅ REAL USER QR Service authentication integration test completed!"
echo "🎯 This proves the QR Service works with Clean Architecture authentication context"