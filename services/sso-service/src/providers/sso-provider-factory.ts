import {
  SSOProvider,
  SSOProviderType,
  SSOProviderFactory,
  SSOProviderHandler,
} from '../types/sso.types';
import { SAMLProviderHandler } from './saml-provider';
import { OAuth2ProviderHandler } from './oauth2-provider';
import { LDAPProviderHandler } from './ldap-provider';

export class SSOProviderFactoryImpl implements SSOProviderFactory {
  private static instance: SSOProviderFactoryImpl;
  private handlers: Map<string, SSOProviderHandler> = new Map();

  private constructor() {}

  public static getInstance(): SSOProviderFactoryImpl {
    if (!SSOProviderFactoryImpl.instance) {
      SSOProviderFactoryImpl.instance = new SSOProviderFactoryImpl();
    }
    return SSOProviderFactoryImpl.instance;
  }

  createProvider(provider: SSOProvider): SSOProviderHandler {
    try {
      // Check if we already have a cached handler for this provider
      const cacheKey = `${provider.id}-${provider.updatedAt.getTime()}`;
      if (this.handlers.has(cacheKey)) {
        return this.handlers.get(cacheKey)!;
      }

      let handler: SSOProviderHandler;

      switch (provider.type) {
        case 'saml':
          handler = new SAMLProviderHandler(provider);
          break;

        case 'oauth2':
        case 'oidc':
        case 'google':
        case 'microsoft':
        case 'github':
          handler = new OAuth2ProviderHandler(provider);
          break;

        case 'ldap':
          handler = new LDAPProviderHandler(provider);
          break;

        default:
          throw new Error(`Unsupported SSO provider type: ${provider.type}`);
      }

      // Cache the handler
      this.handlers.set(cacheKey, handler);

      // Clean up old handlers for this provider
      this.cleanupOldHandlers(provider.id);

      return handler;
    } catch (error) {
      console.error(`Error creating SSO provider handler for ${provider.id}:`, error);
      throw new Error(`Failed to create SSO provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getSupportedTypes(): SSOProviderType[] {
    return ['saml', 'oauth2', 'oidc', 'google', 'microsoft', 'github', 'ldap'];
  }

  // Remove a provider handler from cache
  removeProvider(providerId: string): void {
    const keysToRemove: string[] = [];
    
    for (const key of this.handlers.keys()) {
      if (key.startsWith(providerId + '-')) {
        // Cleanup LDAP connections if needed
        const handler = this.handlers.get(key);
        if (handler && 'close' in handler && typeof handler.close === 'function') {
          (handler as any).close();
        }
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.handlers.delete(key));
  }

  // Clean up old cached handlers for a provider (keep only the latest)
  private cleanupOldHandlers(providerId: string): void {
    const providerKeys = Array.from(this.handlers.keys())
      .filter(key => key.startsWith(providerId + '-'))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('-').pop() || '0');
        const timestampB = parseInt(b.split('-').pop() || '0');
        return timestampB - timestampA; // Sort descending (newest first)
      });

    // Keep only the latest handler, remove the rest
    for (let i = 1; i < providerKeys.length; i++) {
      const key = providerKeys[i];
      const handler = this.handlers.get(key);
      
      // Cleanup LDAP connections if needed
      if (handler && 'close' in handler && typeof handler.close === 'function') {
        (handler as any).close();
      }
      
      this.handlers.delete(key);
    }
  }

  // Test a provider configuration without caching
  async testProvider(provider: SSOProvider): Promise<{ success: boolean; message: string }> {
    try {
      const handler = this.createTemporaryHandler(provider);
      const result = await handler.testConnection();
      
      // Clean up temporary handler if it's LDAP
      if (handler && 'close' in handler && typeof handler.close === 'function') {
        (handler as any).close();
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Provider test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Create a temporary handler for testing (not cached)
  private createTemporaryHandler(provider: SSOProvider): SSOProviderHandler {
    switch (provider.type) {
      case 'saml':
        return new SAMLProviderHandler(provider);

      case 'oauth2':
      case 'oidc':
      case 'google':
      case 'microsoft':
      case 'github':
        return new OAuth2ProviderHandler(provider);

      case 'ldap':
        return new LDAPProviderHandler(provider);

      default:
        throw new Error(`Unsupported SSO provider type: ${provider.type}`);
    }
  }

  // Get provider configuration template
  getProviderTemplate(type: SSOProviderType): any {
    switch (type) {
      case 'saml':
        return {
          entryPoint: '',
          issuer: '',
          cert: '',
          callbackUrl: '/auth/saml/callback',
          signatureAlgorithm: 'sha256',
          digestAlgorithm: 'sha256',
          identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          wantAssertionsSigned: false,
          wantAuthnResponseSigned: false,
        };

      case 'oauth2':
        return {
          clientID: '',
          clientSecret: '',
          authorizationURL: '',
          tokenURL: '',
          callbackURL: '/auth/oauth2/callback',
          scope: ['openid', 'email', 'profile'],
          state: true,
        };

      case 'oidc':
        return {
          clientID: '',
          clientSecret: '',
          authorizationURL: '',
          tokenURL: '',
          callbackURL: '/auth/oidc/callback',
          scope: ['openid', 'email', 'profile'],
          state: true,
          pkce: true,
        };

      case 'google':
        return {
          clientID: '',
          clientSecret: '',
          callbackURL: '/auth/google/callback',
          scope: ['openid', 'email', 'profile'],
        };

      case 'microsoft':
        return {
          clientID: '',
          clientSecret: '',
          tenant: 'common',
          callbackURL: '/auth/microsoft/callback',
          scope: ['openid', 'email', 'profile'],
        };

      case 'github':
        return {
          clientID: '',
          clientSecret: '',
          callbackURL: '/auth/github/callback',
          scope: ['user:email'],
        };

      case 'ldap':
        return {
          server: {
            url: 'ldap://localhost:389',
            bindDN: 'cn=admin,dc=company,dc=com',
            bindCredentials: '',
            searchBase: 'dc=company,dc=com',
            searchFilter: '(uid={{username}})',
            searchAttributes: ['dn', 'cn', 'mail', 'givenName', 'sn', 'memberOf'],
            tlsOptions: {},
          },
          usernameField: 'uid',
          emailField: 'mail',
          displayNameField: 'cn',
          groupField: 'memberOf',
        };

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  // Get required fields for a provider type
  getRequiredFields(type: SSOProviderType): string[] {
    switch (type) {
      case 'saml':
        return ['entryPoint', 'issuer', 'cert'];

      case 'oauth2':
      case 'oidc':
        return ['clientID', 'clientSecret', 'authorizationURL', 'tokenURL', 'callbackURL'];

      case 'google':
      case 'microsoft':
      case 'github':
        return ['clientID', 'clientSecret', 'callbackURL'];

      case 'ldap':
        return ['server.url', 'server.bindDN', 'server.bindCredentials', 'server.searchBase'];

      default:
        return [];
    }
  }

  // Clear all cached handlers
  clearCache(): void {
    // Clean up LDAP connections
    for (const handler of this.handlers.values()) {
      if (handler && 'close' in handler && typeof handler.close === 'function') {
        (handler as any).close();
      }
    }
    
    this.handlers.clear();
  }
}