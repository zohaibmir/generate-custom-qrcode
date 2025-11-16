#!/bin/bash

# Test QR Service with Clean Architecture Authentication Pattern
# This test simulates how API Gateway would set x-auth-* headers

echo "🔬 Testing QR Service with Clean Architecture Auth Pattern"
echo "=========================================================="

QR_SERVICE_URL="http://localhost:3002"
USER_ID="9a8f4f1e-26b0-4247-a5ef-241de2beef75"
USER_EMAIL="zohaib.mir@gmail.com"
USER_SUBSCRIPTION="pro"

# Headers that API Gateway would set after JWT validation
AUTH_HEADERS=(
  -H "x-auth-user-id: $USER_ID"
  -H "x-auth-email: $USER_EMAIL"
  -H "x-auth-username: zohaib.mir"
  -H "x-auth-subscription: $USER_SUBSCRIPTION"
  -H "x-auth-email-verified: true"
  -H "x-auth-permissions: read,write,create,update"
  -H "Content-Type: application/json"
)

echo "📋 Testing with Clean Architecture headers:"
echo "   x-auth-user-id: $USER_ID"
echo "   x-auth-email: $USER_EMAIL"
echo "   x-auth-subscription: $USER_SUBSCRIPTION"
echo ""

# Test 1: Health check (no auth required)
echo "🔍 Test 1: Health Check (No Auth Required)"
echo "-------------------------------------------"
curl -s "$QR_SERVICE_URL/health" | jq '.'
echo ""

# Test 2: Get user QR codes (requires auth)
echo "🔍 Test 2: Get User QR Codes (Auth Required)"
echo "---------------------------------------------"
echo "GET $QR_SERVICE_URL/qr"
curl -s "${AUTH_HEADERS[@]}" "$QR_SERVICE_URL/qr?page=1&limit=5" | jq '.'
echo ""

# Test 3: Create new QR code (requires auth)
echo "🔍 Test 3: Create New QR Code (Auth Required)"
echo "----------------------------------------------"
QR_DATA='{
  "type": "url",
  "data": "https://example.com/clean-architecture-test",
  "title": "Clean Architecture QR Test",
  "description": "Testing QR service with Clean Architecture auth pattern"
}'

echo "POST $QR_SERVICE_URL/qr"
echo "Data: $QR_DATA"
CREATED_QR=$(curl -s "${AUTH_HEADERS[@]}" \
  -d "$QR_DATA" \
  "$QR_SERVICE_URL/qr")

echo "$CREATED_QR" | jq '.'

# Extract QR ID for further testing
QR_ID=$(echo "$CREATED_QR" | jq -r '.data.id // empty')
echo ""

# Test 4: Get QR templates (optional auth)
echo "🔍 Test 4: Get QR Templates (Optional Auth)"
echo "-------------------------------------------"
echo "GET $QR_SERVICE_URL/templates"
curl -s "${AUTH_HEADERS[@]}" "$QR_SERVICE_URL/templates" | jq '.data[0:2]'
echo ""

# Test 5: Test without auth headers (should fail for protected endpoints)
echo "🔍 Test 5: Test Without Auth Headers (Should Fail)"
echo "--------------------------------------------------"
echo "GET $QR_SERVICE_URL/qr (without auth headers)"
curl -s -H "Content-Type: application/json" "$QR_SERVICE_URL/qr" | jq '.'
echo ""

# Test 6: Get specific QR by ID (if created)
if [ ! -z "$QR_ID" ] && [ "$QR_ID" != "null" ]; then
  echo "🔍 Test 6: Get QR by ID"
  echo "----------------------"
  echo "GET $QR_SERVICE_URL/qr/$QR_ID"
  curl -s "${AUTH_HEADERS[@]}" "$QR_SERVICE_URL/qr/$QR_ID" | jq '.'
  echo ""
fi

echo "✅ Clean Architecture Authentication Testing Complete!"
echo ""
echo "📊 Expected Results:"
echo "   ✅ Health check should work without auth"
echo "   ✅ User QRs should return with auth headers" 
echo "   ✅ QR creation should work with auth headers"
echo "   ✅ Templates should work with or without auth"
echo "   ❌ Protected endpoints should fail without auth headers"
echo "   ✅ QR access should work with auth headers"
echo ""
echo "🏗️ Architecture Verification:"
echo "   • QR Service receives x-auth-* headers from API Gateway"
echo "   • No JWT validation in QR Service"
echo "   • Simple ServiceAuthExtractor middleware"
echo "   • Direct req.auth.userId access"