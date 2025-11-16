/**
 * Authentication System Test Script
 * Tests the new Clean Architecture authentication system
 */

import express from 'express';
import { AuthenticationModuleFactory } from '@qr-saas/shared';

const app = express();
app.use(express.json());

// Initialize authentication module
const authModule = AuthenticationModuleFactory.create({
  jwtSecret: process.env.JWT_SECRET || 'test-secret-key-for-authentication-testing-purposes',
  jwtIssuer: 'test-api-gateway',
  enableAuditLogging: false,
  publicRoutes: [
    { pattern: '/api/auth/login', method: 'POST', isPublic: true },
    { pattern: '/api/auth/register', method: 'POST', isPublic: true },
    { pattern: '/health', method: 'GET', isPublic: true }
  ],
  protectedRoutes: [
    { pattern: '/api/user/profile', method: 'GET', isPublic: false, requiredPermissions: ['read'] },
    { pattern: '/api/qr/create', method: 'POST', isPublic: false, requiredPermissions: ['create'] }
  ],
  optionalAuthRoutes: []
});

console.log('🚀 Authentication module initialized successfully');

// Test middleware setup
const authMiddleware = authModule.createAuthMiddleware();

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

app.use(authMiddleware);

// Test routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Authentication system test server is running'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Generate a test token for testing purposes
  if (process.env.NODE_ENV !== 'production') {
    try {
      const testPayload = {
        userId: 'test-user-123',
        email: email,
        username: email.split('@')[0],
        subscription: 'pro',
        isEmailVerified: true,
        permissions: ['read', 'write', 'create'],
        organizationId: 'test-org-123'
      };
      
      const token = authModule.jwtTokenService.generateTestToken(testPayload, '1h');
      
      res.json({
        success: true,
        message: 'Test login successful',
        token: token,
        user: {
          id: testPayload.userId,
          email: testPayload.email,
          username: testPayload.username,
          subscription: testPayload.subscription
        }
      });
    } catch (error) {
      console.error('❌ Test token generation failed:', error);
      res.status(500).json({ error: 'Test token generation failed' });
    }
  } else {
    res.status(501).json({ error: 'Login not implemented in production mode' });
  }
});

app.get('/api/user/profile', (req: any, res) => {
  const authUser = req.auth;
  
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json({
    success: true,
    user: {
      id: authUser.userId,
      email: authUser.email,
      username: authUser.username,
      subscription: authUser.subscriptionTier,
      permissions: authUser.permissions,
      isEmailVerified: authUser.isEmailVerified,
      organizationId: authUser.organizationId
    },
    message: 'Profile retrieved successfully'
  });
});

app.post('/api/qr/create', (req: any, res) => {
  const authUser = req.auth;
  
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text required for QR code creation' });
  }

  res.json({
    success: true,
    qrCode: {
      id: 'test-qr-' + Date.now(),
      text: text,
      createdBy: authUser.userId,
      createdAt: new Date().toISOString()
    },
    message: 'QR code creation request processed (test mode)'
  });
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', error.message);
  res.status(500).json({
    error: 'Internal server error',
    code: error.code || 'UNKNOWN_ERROR'
  });
});

const PORT = process.env.TEST_PORT || 3333;

app.listen(PORT, () => {
  console.log(`✅ Authentication test server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Test login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 User profile: GET http://localhost:${PORT}/api/user/profile`);
  console.log(`📱 QR create: POST http://localhost:${PORT}/api/qr/create`);
  console.log('');
  console.log('🧪 Test the authentication flow:');
  console.log('1. POST /api/auth/login with { "email": "test@example.com", "password": "password" }');
  console.log('2. Copy the token from response');
  console.log('3. Use token in Authorization header: "Bearer <token>"');
  console.log('4. Test protected routes');
});