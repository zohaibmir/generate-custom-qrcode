#!/usr/bin/env node

/**
 * JWT Token Utility for QR SaaS Platform
 * 
 * Usage:
 *   node jwt-utility.js generate [options]
 *   node jwt-utility.js decode <token>
 *   node jwt-utility.js verify <token>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class JWTUtility {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.issuer = 'qr-saas-platform';
    this.audience = 'qr-saas-frontend';
  }

  base64urlEncode(str) {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  base64urlDecode(str) {
    // Add padding if needed
    while (str.length % 4) {
      str += '=';
    }
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }

  generateToken(options = {}) {
    const now = Math.floor(Date.now() / 1000);
    
    const defaultPayload = {
      sub: options.userId || '550e8400-e29b-41d4-a716-446655440000',
      userId: options.userId || '550e8400-e29b-41d4-a716-446655440000',
      email: options.email || 'demo@qr-saas.com',
      name: options.name || 'Demo User',
      subscriptionTier: options.subscriptionTier || 'pro',
      isEmailVerified: options.isEmailVerified !== false,
      iat: now,
      exp: now + (options.expiresIn || 24 * 60 * 60), // Default 24 hours
      iss: this.issuer,
      aud: this.audience
    };

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = this.base64urlEncode(JSON.stringify(header));
    const encodedPayload = this.base64urlEncode(JSON.stringify(defaultPayload));
    
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    return {
      token,
      payload: defaultPayload,
      expiresAt: new Date(defaultPayload.exp * 1000).toISOString()
    };
  }

  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const header = JSON.parse(this.base64urlDecode(parts[0]).toString());
      const payload = JSON.parse(this.base64urlDecode(parts[1]).toString());

      return {
        header,
        payload,
        signature: parts[2]
      };
    } catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`);
    }
  }

  verifyToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      const payload = JSON.parse(this.base64urlDecode(encodedPayload).toString());
      const now = Math.floor(Date.now() / 1000);

      // Check expiration
      if (payload.exp && payload.exp < now) {
        return { 
          valid: false, 
          error: 'Token expired',
          expiredAt: new Date(payload.exp * 1000).toISOString()
        };
      }

      // Check not before
      if (payload.nbf && payload.nbf > now) {
        return { 
          valid: false, 
          error: 'Token not yet valid',
          validFrom: new Date(payload.nbf * 1000).toISOString()
        };
      }

      return {
        valid: true,
        payload,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null
      };

    } catch (error) {
      return { valid: false, error: `Verification failed: ${error.message}` };
    }
  }

  generateMultipleTokens(users) {
    return users.map(user => ({
      user,
      ...this.generateToken(user)
    }));
  }

  saveToFile(data, filename) {
    const dir = path.join(__dirname, 'generated-tokens');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return filepath;
  }
}

function printUsage() {
  console.log(`
🔐 JWT Token Utility for QR SaaS Platform

USAGE:
  node jwt-utility.js generate [options]        Generate a new JWT token
  node jwt-utility.js decode <token>           Decode a JWT token  
  node jwt-utility.js verify <token>           Verify a JWT token
  node jwt-utility.js bulk                     Generate multiple test tokens

GENERATE OPTIONS:
  --user-id <id>           User ID (default: demo UUID)
  --email <email>          Email address (default: demo@qr-saas.com)
  --name <name>            Full name (default: Demo User)
  --subscription <tier>    Subscription tier (default: pro)
  --expires-in <seconds>   Expiration time in seconds (default: 86400 = 24h)
  --save                   Save token to file

EXAMPLES:
  # Generate default token
  node jwt-utility.js generate

  # Generate custom token
  node jwt-utility.js generate --email user@test.com --name "Test User" --subscription enterprise

  # Generate token with custom expiration (1 week)
  node jwt-utility.js generate --expires-in 604800

  # Decode existing token
  node jwt-utility.js decode eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

  # Verify token
  node jwt-utility.js verify eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

ENVIRONMENT:
  JWT_SECRET               JWT signing secret (default: development secret)
`);
}

function main() {
  const args = process.argv.slice(2);
  const jwt = new JWTUtility();

  if (args.length === 0) {
    printUsage();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'generate': {
      const options = {};
      
      for (let i = 1; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
          case '--user-id':
            options.userId = value;
            break;
          case '--email':
            options.email = value;
            break;
          case '--name':
            options.name = value;
            break;
          case '--subscription':
            options.subscriptionTier = value;
            break;
          case '--expires-in':
            options.expiresIn = parseInt(value);
            break;
        }
      }

      const result = jwt.generateToken(options);
      
      console.log('\n🎫 Generated JWT Token:');
      console.log('========================');
      console.log(`Token: ${result.token}`);
      console.log(`\n📋 Payload:`);
      console.log(JSON.stringify(result.payload, null, 2));
      console.log(`\n⏰ Expires: ${result.expiresAt}`);

      if (args.includes('--save')) {
        const filename = `token-${Date.now()}.json`;
        const filepath = jwt.saveToFile(result, filename);
        console.log(`\n💾 Saved to: ${filepath}`);
      }

      console.log('\n🔧 Frontend Usage:');
      console.log(`localStorage.setItem('authToken', '${result.token}');`);
      console.log(`// or`);
      console.log(`axios.defaults.headers.common['Authorization'] = 'Bearer ${result.token}';`);
      break;
    }

    case 'decode': {
      const token = args[1];
      if (!token) {
        console.error('❌ Error: Token required');
        return;
      }

      try {
        const decoded = jwt.decodeToken(token);
        console.log('\n🔍 Decoded JWT Token:');
        console.log('====================');
        console.log('Header:', JSON.stringify(decoded.header, null, 2));
        console.log('Payload:', JSON.stringify(decoded.payload, null, 2));
        console.log('Signature:', decoded.signature);
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
      }
      break;
    }

    case 'verify': {
      const token = args[1];
      if (!token) {
        console.error('❌ Error: Token required');
        return;
      }

      const result = jwt.verifyToken(token);
      
      console.log('\n🔐 Token Verification:');
      console.log('=====================');
      
      if (result.valid) {
        console.log('✅ Token is VALID');
        console.log('Payload:', JSON.stringify(result.payload, null, 2));
        if (result.expiresAt) {
          console.log(`Expires: ${result.expiresAt}`);
        }
        if (result.issuedAt) {
          console.log(`Issued: ${result.issuedAt}`);
        }
      } else {
        console.log('❌ Token is INVALID');
        console.log(`Reason: ${result.error}`);
        if (result.expiredAt) {
          console.log(`Expired at: ${result.expiredAt}`);
        }
      }
      break;
    }

    case 'bulk': {
      const testUsers = [
        {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'admin@qr-saas.com',
          name: 'Admin User',
          subscriptionTier: 'enterprise'
        },
        {
          userId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'pro@qr-saas.com', 
          name: 'Pro User',
          subscriptionTier: 'pro'
        },
        {
          userId: '550e8400-e29b-41d4-a716-446655440002',
          email: 'free@qr-saas.com',
          name: 'Free User', 
          subscriptionTier: 'free'
        }
      ];

      const tokens = jwt.generateMultipleTokens(testUsers);
      
      console.log('\n👥 Bulk Token Generation:');
      console.log('========================');
      
      tokens.forEach((tokenData, index) => {
        console.log(`\n${index + 1}. ${tokenData.user.name} (${tokenData.user.subscriptionTier})`);
        console.log(`   Email: ${tokenData.user.email}`);
        console.log(`   Token: ${tokenData.token}`);
        console.log(`   Expires: ${tokenData.expiresAt}`);
      });

      const filename = `bulk-tokens-${Date.now()}.json`;
      const filepath = jwt.saveToFile(tokens, filename);
      console.log(`\n💾 All tokens saved to: ${filepath}`);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
  }
}

if (require.main === module) {
  main();
}

module.exports = JWTUtility;