# JWT Token Generation Utilities for QR SaaS Platform

This directory contains comprehensive JWT token generation utilities for frontend development and API testing with the QR SaaS Platform.

## 🔐 Available Tools

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

## 🎯 Quick Start

### Generate a Token for Development
```bash
# Method 1: Bash script (fastest)
./scripts/generate-jwt-token.sh

# Method 2: npm script
npm run jwt:generate

# Method 3: Web interface
npm run jwt:web
```

### Test API with Generated Token
```bash
# Use the generated token in API calls
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/users
```

### Frontend Integration
```javascript
// Store token in localStorage
localStorage.setItem('authToken', 'YOUR_TOKEN_HERE');

// Use with axios
axios.defaults.headers.common['Authorization'] = 'Bearer ' + localStorage.getItem('authToken');

// Use with fetch
const response = await fetch('/api/users', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    }
});
```

## 📋 Available npm Scripts

| Script | Description | Example |
|--------|-------------|---------|
| `npm run jwt:generate` | Generate new token | `npm run jwt:generate -- --email test@example.com` |
| `npm run jwt:decode` | Decode existing token | `npm run jwt:decode -- eyJhbGc...` |
| `npm run jwt:verify` | Verify token signature | `npm run jwt:verify -- eyJhbGc...` |
| `npm run jwt:bulk` | Generate multiple test tokens | `npm run jwt:bulk` |
| `npm run jwt:web` | Open web interface | `npm run jwt:web` |
| `npm run jwt:help` | Show utility help | `npm run jwt:help` |

## 🔧 Configuration Options

### User ID Options
```bash
# Default demo user
--user-id 550e8400-e29b-41d4-a716-446655440000

# Custom user ID
--user-id your-custom-user-id
```

### Email Options
```bash
# Default demo email
--email demo@qr-saas.com

# Custom email
--email user@yourcompany.com
```

### Subscription Tiers
```bash
--subscription free        # Free tier (basic features)
--subscription pro         # Pro tier (advanced features)
--subscription business    # Business tier (team features)
--subscription enterprise  # Enterprise tier (all features)
```

### Expiration Options
```bash
--expires-in 3600      # 1 hour
--expires-in 86400     # 24 hours (default)
--expires-in 604800    # 7 days
--expires-in 2592000   # 30 days
```

## 🎫 Token Structure

### JWT Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### JWT Payload
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "demo@qr-saas.com",
  "name": "Demo User",
  "subscriptionTier": "pro",
  "isEmailVerified": true,
  "iat": 1762774629,
  "exp": 1762861029,
  "iss": "qr-saas-platform",
  "aud": "qr-saas-frontend"
}
```

## 🔒 Security Configuration

### JWT Secret
The default JWT secret is:
```
your-super-secret-jwt-key-change-in-production
```

**⚠️ Important:** This is for development only. In production:
1. Use a strong, randomly generated secret
2. Store it securely (environment variables, secrets manager)
3. Rotate it regularly

### Environment Variable
```bash
export JWT_SECRET="your-production-secret-here"
```

## 📁 Generated Files

### Token Files
Generated tokens are saved in `scripts/generated-tokens/`:
```
jwt-token-20231110-143022.txt       # Single token file
bulk-tokens-1699622222123.json      # Bulk tokens JSON
token-1699622222123.json            # Generated token data
```

### File Format Example
```txt
TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USER_ID=550e8400-e29b-41d4-a716-446655440000
EMAIL=demo@qr-saas.com
NAME=Demo User
SUBSCRIPTION=pro
EXPIRES_AT=Mon Nov 11 11:37:46 PST 2025
```

## 🚀 Frontend Integration Examples

### React Example
```jsx
// hooks/useAuth.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  const setAuthToken = (newToken) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  };

  return { token, setAuthToken };
};
```

### Vue.js Example
```javascript
// plugins/auth.js
import axios from 'axios';

export default {
  install(app) {
    const token = localStorage.getItem('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    app.config.globalProperties.$setToken = (token) => {
      localStorage.setItem('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    };
  }
};
```

### Angular Example
```typescript
// services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token = localStorage.getItem('authToken');

  constructor(private http: HttpClient) {}

  setToken(token: string) {
    localStorage.setItem('authToken', token);
    this.token = token;
  }

  getHeaders() {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    });
  }

  apiCall(url: string) {
    return this.http.get(url, { headers: this.getHeaders() });
  }
}
```

## 🧪 Testing Scenarios

### Test User Profiles
The bulk generator creates these test users:

1. **Admin User** (Enterprise)
   - Email: `admin@qr-saas.com`
   - Features: All platform features
   - Use case: Admin panel testing

2. **Pro User** (Pro)
   - Email: `pro@qr-saas.com`
   - Features: Advanced QR customization
   - Use case: Pro feature testing

3. **Free User** (Free)
   - Email: `free@qr-saas.com`
   - Features: Basic QR generation
   - Use case: Free tier limitation testing

### API Testing Workflow
```bash
# 1. Generate tokens for all user types
npm run jwt:bulk

# 2. Test free tier limitations
curl -H "Authorization: Bearer FREE_USER_TOKEN" \
     http://localhost:3000/api/qr \
     -d '{"data":"test","customization":{"logo":"should-fail"}}'

# 3. Test pro features
curl -H "Authorization: Bearer PRO_USER_TOKEN" \
     http://localhost:3000/api/qr \
     -d '{"data":"test","customization":{"logo":"should-work"}}'

# 4. Test enterprise features
curl -H "Authorization: Bearer ENTERPRISE_USER_TOKEN" \
     http://localhost:3000/api/analytics/advanced
```

## 🔍 Troubleshooting

### Common Issues

**1. "jq: command not found"**
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

**2. "node: command not found"**
```bash
# Install Node.js from https://nodejs.org/
# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
```

**3. Permission denied on bash script**
```bash
chmod +x scripts/generate-jwt-token.sh
```

**4. Token verification failed**
- Check JWT secret matches between generation and verification
- Ensure token hasn't expired
- Verify token format (should have 3 parts separated by dots)

### Debug Mode
```bash
# Enable debug logging for Node.js utility
DEBUG=jwt npm run jwt:generate

# Verbose output for bash script
JWT_DEBUG=1 ./scripts/generate-jwt-token.sh
```

## 📚 Additional Resources

### JWT Standards
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [JWT.io - JWT Debugger](https://jwt.io/)

### QR SaaS Platform API
- API Documentation: `http://localhost:3000/api-docs`
- Health Check: `http://localhost:3000/health`
- Postman Collection: `postman-collection.json`

### Security Best Practices
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0 JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

## 🎉 Ready to Authenticate!

Your JWT utilities are now ready for frontend development and API testing with the QR SaaS Platform. Choose the method that works best for your workflow:

- **Quick testing**: Use the bash script
- **Advanced scenarios**: Use the Node.js utility  
- **Visual interface**: Use the web interface

Happy coding! 🚀