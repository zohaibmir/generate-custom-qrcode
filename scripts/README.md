# QR SaaS Platform Testing & Utility Scripts

This directory contains comprehensive testing scripts and utilities for the QR SaaS Platform, including JWT token generation and enterprise security testing.

## 🔐 Security Testing

### `test-security-features.js`

Comprehensive testing script for all enterprise security middleware components implemented in the API Gateway.

**Quick Start:**
```bash
# Run all security tests
node scripts/test-security-features.js

# Run with verbose output
node scripts/test-security-features.js --verbose

# Run specific test category
node scripts/test-security-features.js --test rate --verbose
```

**Features Tested:**
- **IP Whitelisting** - Tests IP restrictions and bypass functionality
- **Rate Limiting** - Tests per-IP and per-user rate limits with subscription tiers
- **DDoS Protection** - Tests burst request detection and blocking
- **Bot Detection** - Tests various bot user agents and suspicious behavior
- **Geolocation Blocking** - Tests country-based access restrictions
- **Audit Logging** - Tests request/response logging and data redaction
- **Security Statistics** - Tests admin endpoints for security monitoring

**Test Categories:**
| Category | Command | Description |
|----------|---------|-------------|
| `ip` | `--test ip` | IP Whitelisting and restrictions |
| `rate` | `--test rate` | Rate limiting enforcement |
| `ddos` | `--test ddos` | DDoS protection triggers |
| `bot` | `--test bot` | Bot detection and handling |
| `geo` | `--test geo` | Geolocation blocking |
| `audit` | `--test audit` | Audit logging functionality |
| `stats` | `--test stats` | Security statistics endpoints |
| `all` | `--test all` | All tests (default) |

## 🎫 JWT Token Generation Utilities

### 1. **Bash Script** - `generate-jwt-token.sh`
Simple command-line JWT token generator with interactive features.

**Usage:**
```bash
# Basic usage with defaults
./scripts/generate-jwt-token.sh

# Custom user data
./scripts/generate-jwt-token.sh "user-id" "email@domain.com" "User Name" "subscription-tier"

# Example
./scripts/generate-jwt-token.sh "123-456-789" "admin@company.com" "Admin User" "enterprise"
```

**Features:**
- ✅ Interactive token generation
- ✅ Automatic payload display and verification
- ✅ Frontend usage examples
- ✅ Save to file option
- ✅ Cross-platform compatibility (macOS, Linux)

### 2. **Node.js Utility** - `jwt-utility.js`
Advanced JWT management with generation, decoding, and verification.

**Usage:**
```bash
# Generate token with defaults
npm run jwt:generate

# Generate custom token
npm run jwt:generate -- --email user@test.com --name "Test User" --subscription pro

# Generate token with custom expiration (7 days)
npm run jwt:generate -- --expires-in 604800

# Decode existing token
npm run jwt:decode -- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Verify token
npm run jwt:verify -- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generate multiple test tokens
npm run jwt:bulk

# Show help
npm run jwt:help
```

**Features:**
- ✅ Token generation with custom parameters
- ✅ Token decoding and verification
- ✅ Bulk token generation for testing
- ✅ Save tokens to JSON files
- ✅ Comprehensive error handling

### 3. **Web Interface** - `jwt-generator.html`
Browser-based JWT token management with visual interface.

**Usage:**
```bash
# Open web interface
npm run jwt:web

# Or manually open
open scripts/jwt-generator.html
```

**Features:**
- ✅ Visual token generation interface
- ✅ Real-time token decoding and verification
- ✅ Copy-to-clipboard functionality
- ✅ Multiple user presets
- ✅ Frontend code examples
- ✅ No server required (client-side only)

## 📋 Available npm Scripts

| Script | Description | Example |
|--------|-------------|---------|
| `npm run test:security` | Run all security tests | `npm run test:security` |
| `npm run test:security:verbose` | Security tests with detailed output | `npm run test:security:verbose` |
| `npm run test:security:rate` | Test only rate limiting | `npm run test:security:rate` |
| `npm run jwt:generate` | Generate new token | `npm run jwt:generate -- --email test@example.com` |
| `npm run jwt:decode` | Decode existing token | `npm run jwt:decode -- eyJhbGc...` |
| `npm run jwt:verify` | Verify token signature | `npm run jwt:verify -- eyJhbGc...` |
| `npm run jwt:bulk` | Generate multiple test tokens | `npm run jwt:bulk` |
| `npm run jwt:web` | Open web interface | `npm run jwt:web` |
| `npm run jwt:help` | Show utility help | `npm run jwt:help` |

## 🔐 Security Testing Details

### Prerequisites for Security Testing:

1. **API Gateway Running**: Ensure the API Gateway service is running on target host/port
2. **Security Middleware Enabled**: Security features must be enabled in environment configuration
3. **Node.js**: Requires Node.js for script execution

### Environment Variables for Security Testing:

```env
# Enable all security features for comprehensive testing
GATEWAY_IP_WHITELIST_ENABLED=true
GATEWAY_RATE_LIMIT_ENABLED=true
GATEWAY_DDOS_ENABLED=true
GATEWAY_GEO_BLOCKING_ENABLED=true
GATEWAY_BOT_DETECTION_ENABLED=true
GATEWAY_AUDIT_ENABLED=true

# Set reasonable thresholds for testing
GATEWAY_RATE_LIMIT_MAX=100
GATEWAY_DDOS_THRESHOLD=50
```

### Example Security Test Output:

```
🚀 Starting Enterprise Security Features Test Suite...
Testing against: http://localhost:3001

ℹ️  [2024-01-01T00:00:00.000Z] Testing IP Whitelisting...
✅ [2024-01-01T00:00:00.100Z] IP-Whitelist-Normal: Local IP allowed access
✅ [2024-01-01T00:00:00.150Z] IP-Whitelist-Headers: Security headers present

ℹ️  [2024-01-01T00:00:00.200Z] Testing Rate Limiting...
✅ [2024-01-01T00:00:00.250Z] Rate-Limit-Headers: Rate limit headers present
✅ [2024-01-01T00:00:00.800Z] Rate-Limit-Enforcement: Rate limit triggered after 45 requests

============================================================
🔐 ENTERPRISE SECURITY TEST SUMMARY
============================================================
⏱️  Duration: 5.23s
✅ Passed: 18
❌ Failed: 2
📊 Total: 20

🎉 ALL SECURITY TESTS PASSED!
```

## 🎯 Quick Start Guide

### 1. Test Security Features
```bash
# Run all security tests with verbose output
node scripts/test-security-features.js --verbose

# Test specific security feature
node scripts/test-security-features.js --test rate --verbose

# Test against different environment
node scripts/test-security-features.js --host staging.api.com --port 3001
```

### 2. Generate JWT Tokens for Testing
```bash
# Generate a token for development
./scripts/generate-jwt-token.sh

# Generate tokens for all user types
npm run jwt:bulk

# Use web interface for visual token management
npm run jwt:web
```

### 3. Test API with Generated Token
```bash
# Use the generated token in API calls
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3001/api/users
```

## 🧪 Integration Testing Workflow

### Complete Security & Authentication Testing:

```bash
# 1. Start API Gateway with security enabled
npm run dev

# 2. Generate test tokens
npm run jwt:bulk

# 3. Run comprehensive security tests
node scripts/test-security-features.js --verbose

# 4. Test authentication with different user tiers
curl -H "Authorization: Bearer FREE_USER_TOKEN" http://localhost:3001/api/qr
curl -H "Authorization: Bearer PRO_USER_TOKEN" http://localhost:3001/api/qr/advanced
curl -H "Authorization: Bearer ENTERPRISE_USER_TOKEN" http://localhost:3001/admin/security/stats
```

## 🔍 Troubleshooting

### Security Testing Issues:

| Issue | Solution |
|-------|----------|
| Connection refused | Ensure API Gateway is running on specified host:port |
| All security tests fail | Check if security middleware is properly enabled |
| Rate limiting not triggered | Lower `GATEWAY_RATE_LIMIT_MAX` threshold |
| DDoS protection not working | Lower `GATEWAY_DDOS_THRESHOLD` value |
| Bot detection not working | Verify `GATEWAY_BOT_DETECTION_ENABLED=true` |

### JWT Token Issues:

| Issue | Solution |
|-------|----------|
| "jq: command not found" | Install jq: `brew install jq` (macOS) or `sudo apt-get install jq` (Linux) |
| Permission denied on bash script | Run `chmod +x scripts/generate-jwt-token.sh` |
| Token verification failed | Check JWT secret matches between generation and verification |

## 📁 Generated Files

### Security Test Results
Test results are stored in memory and displayed in console output. For persistent storage, pipe output to file:
```bash
node scripts/test-security-features.js --verbose > security-test-results.log 2>&1
```

### JWT Token Files
Generated tokens are saved in `scripts/generated-tokens/`:
```
jwt-token-20231110-143022.txt       # Single token file
bulk-tokens-1699622222123.json      # Bulk tokens JSON
token-1699622222123.json            # Generated token data
```

## 🚀 CI/CD Integration

### Add to package.json:
```json
{
  "scripts": {
    "test:security": "node scripts/test-security-features.js",
    "test:security:verbose": "node scripts/test-security-features.js --verbose",
    "test:security:ci": "node scripts/test-security-features.js --test all"
  }
}
```

### GitHub Actions Example:
```yaml
name: Security Tests
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run dev & # Start API Gateway
      - run: sleep 10 # Wait for startup
      - run: npm run test:security:ci
```

## 📚 Additional Resources

### Security Documentation
- [Enterprise Security Implementation Guide](../ENTERPRISE-SECURITY-IMPLEMENTATION.md)
- [API Gateway Security Configuration](../services/api-gateway/src/config/security.config.ts)

### JWT Standards
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [JWT.io - JWT Debugger](https://jwt.io/)

### QR SaaS Platform API
- API Documentation: `http://localhost:3001/api-docs`
- Health Check: `http://localhost:3001/health`
- Postman Collection: `postman-collection.json`

---

## 🎉 Ready for Comprehensive Testing!

Your testing utilities are now ready for:
- **Security Feature Validation** - Comprehensive enterprise security testing
- **Authentication Testing** - JWT token generation and validation
- **API Integration Testing** - Complete workflow validation

Choose the appropriate testing method for your needs and ensure your QR SaaS platform is secure and robust! 🔐🚀