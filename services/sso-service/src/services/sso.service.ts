import { Pool } from 'pg';
import {
  SSOProvider,
  SSOUserIdentity,
  SSOServiceInterface,
  SSOAuthRequest,
  SSOAuthResponse,
} from '../types/sso.types';
import { SSOUserIdentityRepository } from '../repositories/sso-user-identity.repository';
import { SSOProviderRepository } from '../repositories/sso-provider.repository';
import { SSOProviderFactoryImpl } from '../providers/sso-provider-factory';

export class SSOService implements SSOServiceInterface {
  private userIdentityRepository: SSOUserIdentityRepository;
  private providerRepository: SSOProviderRepository;
  private factory: SSOProviderFactoryImpl;

  constructor(private pool: Pool) {
    this.userIdentityRepository = new SSOUserIdentityRepository(pool);
    this.providerRepository = new SSOProviderRepository(pool);
    this.factory = SSOProviderFactoryImpl.getInstance();
  }

  async authenticateUser(providerId: string, authData: any): Promise<SSOAuthResponse> {
    try {
      // Get provider configuration
      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        throw new Error('SSO provider not found');
      }

      if (!provider.isEnabled || provider.status !== 'active') {
        throw new Error('SSO provider is not active');
      }

      // Get provider handler
      const handler = this.factory.createProvider(provider);

      // Handle authentication based on provider type
      let authResponse: SSOAuthResponse;
      
      if (provider.type === 'ldap') {
        // LDAP requires direct username/password authentication
        if (!authData.username || !authData.password) {
          throw new Error('Username and password are required for LDAP authentication');
        }
        
        // Cast handler to LDAP provider to access authenticateUser method
        const ldapHandler = handler as any;
        if (typeof ldapHandler.authenticateUser === 'function') {
          authResponse = await ldapHandler.authenticateUser(authData.username, authData.password);
        } else {
          throw new Error('LDAP authentication method not available');
        }
      } else {
        // OAuth/SAML callback authentication
        authResponse = await handler.handleCallback(authData);
      }

      if (!authResponse.success || !authResponse.user) {
        return authResponse;
      }

      // Find existing user identity or create new one
      const externalUser = authData.user || authResponse.user;
      let userIdentity = await this.getUserByIdentity(providerId, externalUser.id);

      if (userIdentity) {
        // Update existing identity
        userIdentity = await this.updateUserFromProvider(userIdentity, externalUser);
      } else if (provider.allowCreateUser) {
        // Create new user identity
        userIdentity = await this.createUserIdentity(provider, externalUser);
      } else {
        return {
          success: false,
          error: {
            code: 'USER_NOT_ALLOWED',
            message: 'User creation is not allowed for this provider',
          },
        };
      }

      // Update login information
      await this.userIdentityRepository.updateLoginInfo(userIdentity.id);

      return {
        success: true,
        user: {
          id: userIdentity.userId,
          email: userIdentity.externalEmail || '',
          name: userIdentity.externalDisplayName || '',
        },
        sessionId: authData.sessionId,
      };
    } catch (error) {
      console.error('SSO authentication error:', error);
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: error instanceof Error ? error.message : 'Authentication failed',
          details: { providerId },
        },
      };
    }
  }

  async createUserIdentity(provider: SSOProvider, externalUser: any): Promise<SSOUserIdentity> {
    try {
      // Check if user already exists by email
      let userId: string;
      
      if (externalUser.email) {
        // Try to find existing user by email
        const existingUser = await this.findUserByEmail(externalUser.email);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user
          userId = await this.createUser(externalUser);
        }
      } else {
        // Create new user without email
        userId = await this.createUser(externalUser);
      }

      // Create SSO user identity
      const identity = await this.userIdentityRepository.create({
        userId,
        providerId: provider.id,
        externalId: externalUser.id,
        externalUsername: externalUser.username,
        externalEmail: externalUser.email,
        externalDisplayName: externalUser.displayName || externalUser.name,
        attributes: externalUser.attributes || {},
        firstLoginAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 1,
        isActive: true,
        isVerified: externalUser.verified || false,
      });

      return identity;
    } catch (error) {
      console.error('Error creating user identity:', error);
      throw new Error('Failed to create user identity');
    }
  }

  async linkUserIdentity(userId: string, provider: SSOProvider, externalUser: any): Promise<SSOUserIdentity> {
    try {
      // Check if identity already exists
      const existingIdentity = await this.userIdentityRepository.findByExternalId(
        provider.id,
        externalUser.id
      );

      if (existingIdentity) {
        throw new Error('Identity already linked to another user');
      }

      // Create SSO user identity
      const identity = await this.userIdentityRepository.create({
        userId,
        providerId: provider.id,
        externalId: externalUser.id,
        externalUsername: externalUser.username,
        externalEmail: externalUser.email,
        externalDisplayName: externalUser.displayName || externalUser.name,
        attributes: externalUser.attributes || {},
        firstLoginAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 1,
        isActive: true,
        isVerified: externalUser.verified || false,
      });

      return identity;
    } catch (error) {
      console.error('Error linking user identity:', error);
      throw new Error('Failed to link user identity');
    }
  }

  async getUserByIdentity(providerId: string, externalId: string): Promise<SSOUserIdentity | null> {
    try {
      return await this.userIdentityRepository.findByExternalId(providerId, externalId);
    } catch (error) {
      console.error('Error getting user by identity:', error);
      return null;
    }
  }

  async updateUserFromProvider(identity: SSOUserIdentity, externalUser: any): Promise<SSOUserIdentity> {
    try {
      return await this.userIdentityRepository.update(identity.id, {
        externalUsername: externalUser.username,
        externalEmail: externalUser.email,
        externalDisplayName: externalUser.displayName || externalUser.name,
        attributes: externalUser.attributes || identity.attributes,
        isVerified: externalUser.verified !== undefined ? externalUser.verified : identity.isVerified,
      });
    } catch (error) {
      console.error('Error updating user from provider:', error);
      throw new Error('Failed to update user from provider');
    }
  }

  // Helper methods to interact with user service
  private async findUserByEmail(email: string): Promise<any | null> {
    try {
      // This would typically call the user service
      // For now, return null to create new users
      const query = 'SELECT id FROM users WHERE email = $1';
      const result = await this.pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  private async createUser(externalUser: any): Promise<string> {
    try {
      // This would typically call the user service to create a new user
      // For now, create a minimal user record
      const query = `
        INSERT INTO users (email, full_name, is_verified, subscription_tier, password_hash)
        VALUES ($1, $2, $3, 'free', 'sso_managed')
        RETURNING id
      `;
      
      const values = [
        externalUser.email || `sso_user_${Date.now()}@placeholder.com`,
        externalUser.displayName || externalUser.name || 'SSO User',
        externalUser.verified || false,
      ];
      
      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  // Identity management methods

  async getUserIdentities(userId: string): Promise<SSOUserIdentity[]> {
    try {
      return await this.userIdentityRepository.findAll(userId);
    } catch (error) {
      console.error('Error getting user identities:', error);
      return [];
    }
  }

  async unlinkUserIdentity(userId: string, providerId: string): Promise<boolean> {
    try {
      const identities = await this.userIdentityRepository.findAll(userId);
      const identity = identities.find(i => i.providerId === providerId);
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      return await this.userIdentityRepository.delete(identity.id);
    } catch (error) {
      console.error('Error unlinking user identity:', error);
      return false;
    }
  }

  async deactivateUserIdentity(userId: string, providerId: string): Promise<boolean> {
    try {
      const identities = await this.userIdentityRepository.findAll(userId);
      const identity = identities.find(i => i.providerId === providerId);
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      return await this.userIdentityRepository.deactivate(identity.id);
    } catch (error) {
      console.error('Error deactivating user identity:', error);
      return false;
    }
  }

  async activateUserIdentity(userId: string, providerId: string): Promise<boolean> {
    try {
      const identities = await this.userIdentityRepository.findAll(userId);
      const identity = identities.find(i => i.providerId === providerId);
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      return await this.userIdentityRepository.activate(identity.id);
    } catch (error) {
      console.error('Error activating user identity:', error);
      return false;
    }
  }

  // Provider statistics

  async getProviderLoginStats(providerId: string, days: number = 30): Promise<any> {
    try {
      return await this.userIdentityRepository.getLoginStats(providerId, days);
    } catch (error) {
      console.error('Error getting provider login stats:', error);
      return {
        total_identities: 0,
        active_identities: 0,
        avg_login_count: 0,
        most_recent_login: null,
      };
    }
  }

  // Cleanup methods

  async cleanupInactiveIdentities(days: number = 90): Promise<number> {
    try {
      const query = `
        DELETE FROM sso_user_identities 
        WHERE is_active = false 
        AND updated_at < NOW() - INTERVAL '${days} days'
      `;
      
      const result = await this.pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up inactive identities:', error);
      return 0;
    }
  }

  async cleanupOrphanedIdentities(): Promise<number> {
    try {
      const query = `
        DELETE FROM sso_user_identities 
        WHERE provider_id NOT IN (SELECT id FROM sso_providers WHERE is_enabled = true)
      `;
      
      const result = await this.pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up orphaned identities:', error);
      return 0;
    }
  }
}