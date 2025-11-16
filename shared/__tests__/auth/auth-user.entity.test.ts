import { AuthUser, SubscriptionTier } from '../../src/auth/entities/auth-user.entity';

describe('AuthUser Entity', () => {
  const validPayload = {
    userId: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    subscription: 'pro' as SubscriptionTier,
    isEmailVerified: true,
    permissions: ['read', 'write'],
    organizationId: 'org123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  describe('fromJwtPayload', () => {
    it('should create AuthUser from valid JWT payload', () => {
      const authUser = AuthUser.fromJwtPayload(validPayload);
      expect(authUser.userId).toBe('user123');
      expect(authUser.email).toBe('test@example.com');
      expect(authUser.username).toBe('testuser');
      expect(authUser.permissions).toEqual(['read', 'write']);
      expect(authUser.subscriptionTier).toBe('pro');
      expect(authUser.organizationId).toBe('org123');
    });

    it('should throw error for missing userId', () => {
      const invalidPayload = { ...validPayload, userId: '' };
      expect(() => AuthUser.fromJwtPayload(invalidPayload)).toThrow('Invalid JWT payload: missing required fields');
    });

    it('should throw error for missing email', () => {
      const invalidPayload = { ...validPayload, email: '' };
      expect(() => AuthUser.fromJwtPayload(invalidPayload)).toThrow('Invalid JWT payload: missing required fields');
    });

    it('should set defaults for optional fields', () => {
      const minimalPayload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser'
      };
      const authUser = AuthUser.fromJwtPayload(minimalPayload);
      expect(authUser.subscriptionTier).toBe('free');
      expect(authUser.permissions).toEqual([]);
    });
  });

  describe('fromServiceHeaders', () => {
    it('should create AuthUser from valid headers', () => {
      const headers = {
        'x-auth-user-id': 'user123',
        'x-auth-email': 'test@example.com',
        'x-auth-username': 'testuser',
        'x-auth-tier': 'business',
        'x-auth-verified': 'true',
        'x-auth-permissions': '["read","write"]',
        'x-auth-org-id': 'org123'
      };

      const authUser = AuthUser.fromServiceHeaders(headers);
      expect(authUser.userId).toBe('user123');
      expect(authUser.email).toBe('test@example.com');
      expect(authUser.subscriptionTier).toBe('business');
      expect(authUser.isEmailVerified).toBe(true);
      expect(authUser.permissions).toEqual(['read', 'write']);
      expect(authUser.organizationId).toBe('org123');
    });

    it('should handle missing optional headers', () => {
      const headers = {
        'x-auth-user-id': 'user123',
        'x-auth-email': 'test@example.com',
        'x-auth-username': 'testuser'
      };

      const authUser = AuthUser.fromServiceHeaders(headers);
      expect(authUser.userId).toBe('user123');
      expect(authUser.subscriptionTier).toBe('free');
      expect(authUser.permissions).toEqual([]);
    });

    it('should throw error for missing required headers', () => {
      const headers = {
        'x-auth-email': 'test@example.com'
      };
      expect(() => AuthUser.fromServiceHeaders(headers)).toThrow('Invalid auth headers: missing required fields');
    });
  });

  describe('business methods', () => {
    let authUser: AuthUser;

    beforeEach(() => {
      authUser = AuthUser.fromJwtPayload(validPayload);
    });

    describe('hasPermission', () => {
      it('should return true for existing permission', () => {
        expect(authUser.hasPermission('read')).toBe(true);
        expect(authUser.hasPermission('write')).toBe(true);
      });

      it('should return false for non-existing permission', () => {
        expect(authUser.hasPermission('admin')).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true if user has any of the permissions', () => {
        expect(authUser.hasAnyPermission(['read', 'delete'])).toBe(true);
        expect(authUser.hasAnyPermission(['write', 'admin'])).toBe(true);
      });

      it('should return false if user has none of the permissions', () => {
        expect(authUser.hasAnyPermission(['admin', 'delete'])).toBe(false);
      });
    });

    describe('hasSubscriptionLevel', () => {
      it('should return true for same subscription tier', () => {
        expect(authUser.hasSubscriptionLevel('pro')).toBe(true);
      });

      it('should return true for lower subscription tier', () => {
        expect(authUser.hasSubscriptionLevel('free')).toBe(true);
      });

      it('should return false for higher subscription tier', () => {
        expect(authUser.hasSubscriptionLevel('business')).toBe(false);
        expect(authUser.hasSubscriptionLevel('enterprise')).toBe(false);
      });
    });

    describe('belongsToOrganization', () => {
      it('should return true for matching organization', () => {
        expect(authUser.belongsToOrganization('org123')).toBe(true);
      });

      it('should return false for different organization', () => {
        expect(authUser.belongsToOrganization('org456')).toBe(false);
      });
    });

    describe('toServiceHeaders', () => {
      it('should generate correct headers for service communication', () => {
        const headers = authUser.toServiceHeaders();
        
        expect(headers['x-auth-user-id']).toBe('user123');
        expect(headers['x-auth-email']).toBe('test@example.com');
        expect(headers['x-auth-username']).toBe('testuser');
        expect(headers['x-auth-tier']).toBe('pro');
        expect(headers['x-auth-verified']).toBe('true');
        expect(headers['x-auth-org-id']).toBe('org123');
        expect(headers['x-auth-permissions']).toBe('["read","write"]');
      });

      it('should handle empty permissions', () => {
        const userWithoutPermissions = AuthUser.fromJwtPayload({
          ...validPayload,
          permissions: []
        });
        
        const headers = userWithoutPermissions.toServiceHeaders();
        expect(headers['x-auth-permissions']).toBeUndefined();
      });

      it('should handle missing organization', () => {
        const userWithoutOrg = AuthUser.fromJwtPayload({
          ...validPayload,
          organizationId: undefined
        });
        
        const headers = userWithoutOrg.toServiceHeaders();
        expect(headers['x-auth-org-id']).toBeUndefined();
      });
    });

    describe('isTokenExpired', () => {
      it('should return false for valid token', () => {
        expect(authUser.isTokenExpired()).toBe(false);
      });

      it('should return true for expired token', () => {
        const expiredUser = AuthUser.fromJwtPayload({
          ...validPayload,
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        });
        expect(expiredUser.isTokenExpired()).toBe(true);
      });

      it('should allow custom current time for testing', () => {
        const futureTime = (authUser.tokenExpiresAt + 1000) * 1000;
        expect(authUser.isTokenExpired(futureTime)).toBe(true);
      });
    });

    describe('toLogObject', () => {
      it('should return safe object for logging', () => {
        const logObj = authUser.toLogObject();
        expect(logObj).toHaveProperty('userId', 'user123');
        expect(logObj).toHaveProperty('subscriptionTier', 'pro');
        expect(logObj).toHaveProperty('permissionCount', 2);
        expect((logObj as any).email).toContain('***'); // Email should be partially hidden
      });
    });
  });

  describe('validation', () => {
    it('should validate email format', () => {
      const invalidEmailPayload = {
        ...validPayload,
        email: 'invalid-email'
      };
      expect(() => AuthUser.fromJwtPayload(invalidEmailPayload)).toThrow('Invalid email address');
    });

    it('should validate subscription tier', () => {
      const invalidTierPayload = {
        ...validPayload,
        subscription: 'invalid-tier' as SubscriptionTier
      };
      expect(() => AuthUser.fromJwtPayload(invalidTierPayload)).toThrow('Invalid subscription tier');
    });

    it('should validate username', () => {
      const invalidUsernamePayload = {
        ...validPayload,
        username: ''
      };
      expect(() => AuthUser.fromJwtPayload(invalidUsernamePayload)).toThrow('Invalid username');
    });
  });
});