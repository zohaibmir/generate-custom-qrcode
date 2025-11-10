#!/bin/bash

# JWT Token Generator for QR SaaS Platform
# Usage: ./generate-jwt-token.sh [user_id] [email] [name] [subscription_tier]

set -e

# Default values
DEFAULT_USER_ID="550e8400-e29b-41d4-a716-446655440000"
DEFAULT_EMAIL="demo@qr-saas.com"
DEFAULT_NAME="Demo User"
DEFAULT_SUBSCRIPTION="pro"
DEFAULT_SECRET="your-super-secret-jwt-key-change-in-production"

# Parse command line arguments
USER_ID=${1:-$DEFAULT_USER_ID}
EMAIL=${2:-$DEFAULT_EMAIL}
NAME=${3:-$DEFAULT_NAME}
SUBSCRIPTION=${4:-$DEFAULT_SUBSCRIPTION}
JWT_SECRET=${JWT_SECRET:-$DEFAULT_SECRET}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 QR SaaS Platform - JWT Token Generator${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is required but not installed.${NC}"
    echo -e "${YELLOW}💡 Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)${NC}\n"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is required but not installed.${NC}"
    echo -e "${YELLOW}💡 Install from: https://nodejs.org/${NC}\n"
    exit 1
fi

# Create temporary Node.js script for JWT generation
JWT_SCRIPT=$(cat << 'EOF'
const crypto = require('crypto');

function base64urlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateJWT(payload, secret) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Parse command line arguments
const args = process.argv.slice(2);
const userId = args[0];
const email = args[1];
const name = args[2];
const subscription = args[3];
const secret = args[4];

const now = Math.floor(Date.now() / 1000);
const payload = {
    sub: userId,
    userId: userId,
    email: email,
    name: name,
    subscriptionTier: subscription,
    isEmailVerified: true,
    iat: now,
    exp: now + (24 * 60 * 60), // 24 hours
    iss: 'qr-saas-platform',
    aud: 'qr-saas-frontend'
};

const token = generateJWT(payload, secret);
console.log(token);
EOF
)

# Generate the JWT token
echo -e "${YELLOW}🔨 Generating JWT token with the following claims:${NC}"
echo -e "   👤 User ID: ${BLUE}$USER_ID${NC}"
echo -e "   📧 Email: ${BLUE}$EMAIL${NC}"
echo -e "   🏷️  Name: ${BLUE}$NAME${NC}"
echo -e "   💳 Subscription: ${BLUE}$SUBSCRIPTION${NC}"
echo -e "   ⏰ Expires: ${BLUE}24 hours from now${NC}\n"

# Generate token using Node.js
TOKEN=$(echo "$JWT_SCRIPT" | node - "$USER_ID" "$EMAIL" "$NAME" "$SUBSCRIPTION" "$JWT_SECRET")

echo -e "${GREEN}✅ JWT Token Generated Successfully!${NC}\n"

# Display the token
echo -e "${YELLOW}🎫 Your JWT Token:${NC}"
echo -e "${GREEN}${TOKEN}${NC}\n"

# Decode and display payload for verification
echo -e "${YELLOW}🔍 Token Payload (for verification):${NC}"
PAYLOAD=$(echo "$TOKEN" | cut -d. -f2)
# Add padding if needed
while [ $((${#PAYLOAD} % 4)) -ne 0 ]; do
    PAYLOAD="${PAYLOAD}="
done

echo "$PAYLOAD" | base64 -d 2>/dev/null | jq . 2>/dev/null || echo -e "${RED}Could not decode payload${NC}"

echo ""

# Usage examples
echo -e "${BLUE}📋 Usage Examples:${NC}"
echo -e "${YELLOW}Frontend (localStorage):${NC}"
echo -e "  localStorage.setItem('authToken', '${TOKEN}');"
echo ""
echo -e "${YELLOW}Frontend (Axios headers):${NC}"
echo -e "  axios.defaults.headers.common['Authorization'] = 'Bearer ${TOKEN}';"
echo ""
echo -e "${YELLOW}curl API test:${NC}"
echo -e "  curl -H 'Authorization: Bearer ${TOKEN}' http://localhost:3000/api/users"
echo ""
echo -e "${YELLOW}Postman:${NC}"
echo -e "  1. Go to Authorization tab"
echo -e "  2. Select 'Bearer Token'"
echo -e "  3. Paste: ${TOKEN}"
echo ""

# Save to file option
read -p "💾 Save token to file? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    FILENAME="jwt-token-$(date +%Y%m%d-%H%M%S).txt"
    echo "TOKEN=$TOKEN" > "$FILENAME"
    echo "USER_ID=$USER_ID" >> "$FILENAME"
    echo "EMAIL=$EMAIL" >> "$FILENAME"
    echo "NAME=$NAME" >> "$FILENAME"
    echo "SUBSCRIPTION=$SUBSCRIPTION" >> "$FILENAME"
    echo "EXPIRES_AT=$(date -d '+24 hours' 2>/dev/null || date -v+24H 2>/dev/null || echo 'in 24 hours')" >> "$FILENAME"
    echo -e "${GREEN}✅ Token saved to: $FILENAME${NC}"
fi

echo -e "\n${GREEN}🎉 Ready to authenticate with the QR SaaS Platform!${NC}"