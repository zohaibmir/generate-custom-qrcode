#!/bin/bash

# QR Code SaaS Platform - API Testing Script
echo "🚀 QR Code SaaS Platform - API Testing Script"
echo "=============================================="

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Test 1: Health Check
echo -e "\n📋 Test 1: API Gateway Health Check"
echo "GET /health"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "Response: $HEALTH_RESPONSE"

# Test 2: User Registration
echo -e "\n👤 Test 2: User Registration"
echo "POST /api/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!@#"}')
echo "Response: $REGISTER_RESPONSE"

# Extract token from response
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo "✅ Token extracted: ${TOKEN:0:20}..."
    
    # Test 3: Get User Profile
    echo -e "\n👤 Test 3: Get User Profile"
    echo "GET /api/users/profile"
    PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/profile)
    echo "Response: $PROFILE_RESPONSE"
    
    # Test 4: Create QR Code
    echo -e "\n🏷️  Test 4: Create QR Code"
    echo "POST /api/qr"
    QR_RESPONSE=$(curl -s -X POST http://localhost:3000/api/qr \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"data":"https://example.com","type":"url","title":"Test QR","description":"Test QR Code"}')
    echo "Response: $QR_RESPONSE"
    
    # Extract QR ID
    QR_ID=$(echo $QR_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    
    if [ ! -z "$QR_ID" ]; then
        echo "✅ QR ID extracted: $QR_ID"
        
        # Test 5: Get QR Code
        echo -e "\n🏷️  Test 5: Get QR Code by ID"
        echo "GET /api/qr/$QR_ID"
        GET_QR_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/qr/$QR_ID)
        echo "Response: $GET_QR_RESPONSE"
        
        # Test 6: Track QR Scan
        echo -e "\n📊 Test 6: Track QR Scan"
        echo "POST /api/analytics/scan"
        SCAN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/analytics/scan \
          -H "Content-Type: application/json" \
          -d "{\"qrId\":\"$QR_ID\",\"scanData\":{\"userAgent\":\"curl-test\",\"ip\":\"127.0.0.1\"}}")
        echo "Response: $SCAN_RESPONSE"
        
        # Test 7: Get QR Analytics
        echo -e "\n📊 Test 7: Get QR Analytics"
        echo "GET /api/analytics/qr/$QR_ID"
        ANALYTICS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/analytics/qr/$QR_ID)
        echo "Response: $ANALYTICS_RESPONSE"
    else
        echo "❌ Failed to extract QR ID from response"
    fi
    
    # Test 8: Send Notification
    echo -e "\n📧 Test 8: Send Email Notification"
    echo "POST /api/notifications/send"
    NOTIFICATION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/notifications/send \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"type":"email","recipient":"test@example.com","template":"welcome","data":{"name":"Test User"}}')
    echo "Response: $NOTIFICATION_RESPONSE"
    
    # Test 9: Get User Files
    echo -e "\n📁 Test 9: Get User Files"
    echo "GET /api/files/user"
    FILES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/files/user)
    echo "Response: $FILES_RESPONSE"
    
else
    echo "❌ Failed to extract authentication token"
fi

echo -e "\n✅ API Testing Complete!"
echo "=============================================="
echo "📝 Import postman-collection.json into Postman for comprehensive testing"
echo "🔗 All services running on localhost with API Gateway on port 3000"