import jwt from 'jsonwebtoken';
import { JwtTokenService } from '../../src/auth/services/jwt-token.service';
import { AuthUser } from '../../src/auth/entities/auth-user.entity';
import { AuthErrorCode } from '../../src/auth/interfaces/auth.interfaces';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  decode: jest.fn(),
  sign: jest.fn(),
  JsonWebTokenError: Error,
  TokenExpiredError: class extends Error {
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
    }
  },
  NotBeforeError: class extends Error {
    constructor(message: string, date: Date) {
      super(message);
      this.name = 'NotBeforeError';
    }
  }
}));

const mockedJwt = {
  verify: jest.mocked(jwt.verify),
  decode: jest.mocked(jwt.decode),
  sign: jest.mocked(jwt.sign)
};

describe('JwtTokenService', () => {
  let jwtService: JwtTokenService;
  const mockSecret = 'test-secret-key-with-sufficient-length-for-security';
  
  beforeEach(() => {
    jwtService = new JwtTokenService(mockSecret, 'test-issuer');
    jest.clearAllMocks();
  });

  describe('constructor validation', () => {
    it('should throw error when no JWT secret provided', () => {
      expect(() => {
        new JwtTokenService();
      }).toThrow('JWT secret is required for token service');
    });

    it('should create service with valid secret', () => {
      expect(() => {
        new JwtTokenService(mockSecret);
      }).not.toThrow();
    });
  });

  describe('verifyToken', () => {
    const validPayload = {
      userId: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      subscription: 'pro',
      isEmailVerified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    it('should verify valid token and return AuthUser', async () => {
      mockedJwt.verify.mockReturnValue(validPayload as any);

      const result = await jwtService.verifyToken('valid.jwt.token');

      expect(result).toBeInstanceOf(AuthUser);
      expect(result.userId).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid.jwt.token', mockSecret, {
        issuer: 'test-issuer'
      });
    });

    it('should handle Bearer token prefix', async () => {
      mockedJwt.verify.mockReturnValue(validPayload as any);

      const result = await jwtService.verifyToken('Bearer valid.jwt.token');

      expect(result).toBeInstanceOf(AuthUser);
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid.jwt.token', mockSecret, {
        issuer: 'test-issuer'
      });
    });

    it('should handle edge cases for malformed tokens', async () => {
      // Test various edge cases that result in malformed token errors
      await expect(jwtService.verifyToken('Bearer ')).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_MALFORMED
      });
    });

    it('should handle null token input', async () => {
      await expect(jwtService.verifyToken(null as any)).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_MALFORMED
      });
    });

    it('should handle completely invalid token format', async () => {
      mockedJwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await expect(jwtService.verifyToken('completely-invalid-token')).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_INVALID
      });
    });

    it('should handle expired token', async () => {
      const expiredError = new (jwt as any).TokenExpiredError('Token expired', new Date());
      mockedJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      await expect(jwtService.verifyToken('expired.token')).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: 'Token has expired'
      });
    });

    it('should handle invalid token', async () => {
      const invalidError = new Error('Invalid token');
      invalidError.name = 'JsonWebTokenError';
      mockedJwt.verify.mockImplementation(() => {
        throw invalidError;
      });

      await expect(jwtService.verifyToken('invalid.token')).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_INVALID,
        message: 'Invalid token format'
      });
    });

    it('should handle not before error', async () => {
      const notBeforeError = new (jwt as any).NotBeforeError('Token not active', new Date());
      mockedJwt.verify.mockImplementation(() => {
        throw notBeforeError;
      });

      await expect(jwtService.verifyToken('not.active.token')).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_INVALID,
        message: 'Token not yet valid'
      });
    });

    it('should handle invalid payload structure', async () => {
      const invalidPayload = { 
        // Missing required fields
        someField: 'value'
      };
      mockedJwt.verify.mockReturnValue(invalidPayload as any);

      await expect(jwtService.verifyToken('malformed.token')).rejects.toMatchObject({
        code: AuthErrorCode.TOKEN_MALFORMED
      });
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      mockedJwt.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600
      } as any);

      const isExpired = jwtService.isTokenExpired('valid.token');
      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      mockedJwt.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      } as any);

      const isExpired = jwtService.isTokenExpired('expired.token');
      expect(isExpired).toBe(true);
    });

    it('should return true for token without expiry', () => {
      mockedJwt.decode.mockReturnValue({
        userId: 'user123'
      } as any);

      const isExpired = jwtService.isTokenExpired('token.without.exp');
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      mockedJwt.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const isExpired = jwtService.isTokenExpired('invalid.token');
      expect(isExpired).toBe(true);
    });

    it('should handle Bearer prefix in token expiry check', () => {
      mockedJwt.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600
      } as any);

      const isExpired = jwtService.isTokenExpired('Bearer valid.token');
      expect(isExpired).toBe(false);
      expect(mockedJwt.decode).toHaveBeenCalledWith('valid.token');
    });
  });

  describe('decodeTokenUnsafe', () => {
    it('should decode valid token without verification', () => {
      const mockPayload = { userId: 'user123', exp: 1234567890 };
      mockedJwt.decode.mockReturnValue(mockPayload as any);

      const result = jwtService.decodeTokenUnsafe('some.jwt.token');

      expect(result).toEqual(mockPayload);
      expect(mockedJwt.decode).toHaveBeenCalledWith('some.jwt.token');
    });

    it('should handle Bearer prefix', () => {
      mockedJwt.decode.mockReturnValue({ userId: 'user123' } as any);

      const result = jwtService.decodeTokenUnsafe('Bearer some.jwt.token');

      expect(result).toEqual({ userId: 'user123' });
      expect(mockedJwt.decode).toHaveBeenCalledWith('some.jwt.token');
    });

    it('should return null for invalid token', () => {
      mockedJwt.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = jwtService.decodeTokenUnsafe('invalid.token');

      expect(result).toBeNull();
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration with sufficient secret length', () => {
      const validService = new JwtTokenService(mockSecret, 'valid-issuer');
      const isValid = validService.validateConfiguration();
      
      expect(isValid).toBe(true);
    });

    it('should warn about short secret', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const shortSecretService = new JwtTokenService('short', 'issuer');
      
      const isValid = shortSecretService.validateConfiguration();
      
      expect(isValid).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('JWT secret should be at least 32 characters long');
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateTestToken', () => {
    const testPayload = {
      userId: 'test-user',
      email: 'test@example.com',
      username: 'testuser'
    };

    it('should generate test token in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockedJwt.sign.mockReturnValue('generated.test.token' as any);

      const result = jwtService.generateTestToken(testPayload);

      expect(result).toBe('generated.test.token');
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        testPayload,
        mockSecret,
        {
          expiresIn: '15m',
          issuer: 'test-issuer',
          subject: testPayload.userId
        }
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should generate test token with custom expiry', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      mockedJwt.sign.mockReturnValue('custom.expiry.token' as any);

      const result = jwtService.generateTestToken(testPayload, '1h');

      expect(result).toBe('custom.expiry.token');
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        testPayload,
        mockSecret,
        {
          expiresIn: '1h',
          issuer: 'test-issuer',
          subject: testPayload.userId
        }
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should reject test token generation in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(() => {
        jwtService.generateTestToken(testPayload);
      }).toThrow('Test token generation not allowed in production');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete verification flow with all fields', async () => {
      const payload = {
        userId: 'user123',
        email: 'user@example.com',
        username: 'user123',
        subscription: 'business',
        isEmailVerified: true,
        permissions: ['read', 'write'],
        organizationId: 'org123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockedJwt.verify.mockReturnValue(payload as any);

      const result = await jwtService.verifyToken('complete.test.token');

      expect(result).toBeInstanceOf(AuthUser);
      expect(result.userId).toBe('user123');
      expect(result.subscriptionTier).toBe('business');
      expect(result.permissions).toEqual(['read', 'write']);
      expect(result.organizationId).toBe('org123');
      expect(result.isEmailVerified).toBe(true);
    });

    it('should handle minimal payload verification', async () => {
      const minimalPayload = {
        userId: 'user456',
        email: 'minimal@example.com',
        username: 'minimal',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800
      };

      mockedJwt.verify.mockReturnValue(minimalPayload as any);

      const result = await jwtService.verifyToken('minimal.token');

      expect(result).toBeInstanceOf(AuthUser);
      expect(result.userId).toBe('user456');
      expect(result.subscriptionTier).toBe('free'); // Default value
      expect(result.permissions).toEqual([]); // Default empty array
      expect(result.organizationId).toBeUndefined();
    });
  });
});