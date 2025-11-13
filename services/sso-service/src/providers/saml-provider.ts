import passport from 'passport';
import { Strategy as SamlStrategy, Profile } from 'passport-saml';
import {
  SSOProvider,
  SSOProviderHandler,
  SSOAuthRequest,
  SSOAuthResponse,
  SAMLProviderConfig,
} from '../types/sso.types';

export class SAMLProviderHandler implements SSOProviderHandler {
  private strategy: SamlStrategy | null = null;
  private provider: SSOProvider;
  private config: SAMLProviderConfig;

  constructor(provider: SSOProvider) {
    this.provider = provider;
    this.config = provider.configuration as SAMLProviderConfig;
    this.initializeStrategy();
  }

  private initializeStrategy(): void {
    try {
      this.strategy = new SamlStrategy(
        {
          entryPoint: this.config.entryPoint,
          issuer: this.config.issuer,
          callbackUrl: this.config.callbackUrl || '/auth/saml/callback',
          cert: this.config.cert,
          signatureAlgorithm: (this.config.signatureAlgorithm || 'sha256') as any,
          digestAlgorithm: this.config.digestAlgorithm || 'sha256',
          identifierFormat: this.config.identifierFormat,
          authnRequestBinding: this.config.authnRequestBinding,
          passReqToCallback: true,
        } as any,
        this.verifyCallback.bind(this)
      );

      passport.use(`saml-${this.provider.id}`, this.strategy);
    } catch (error) {
      console.error(`Error initializing SAML strategy for provider ${this.provider.id}:`, error);
      throw new Error(`Failed to initialize SAML provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async verifyCallback(req: any, profile: Profile | null | undefined, done: any): Promise<void> {
    try {
      if (!profile) {
        return done(new Error('No profile received from SAML provider'), null);
      }

      // Extract user information from SAML profile
      const externalUser = {
        id: profile.nameID || profile.ID,
        username: profile.nameID,
        email: this.extractAttribute(profile, 'email') || 
               this.extractAttribute(profile, 'emailaddress') ||
               this.extractAttribute(profile, 'mail'),
        displayName: this.extractAttribute(profile, 'displayName') ||
                    this.extractAttribute(profile, 'name') ||
                    this.extractAttribute(profile, 'cn') ||
                    profile.nameID,
        firstName: this.extractAttribute(profile, 'firstName') ||
                  this.extractAttribute(profile, 'givenName'),
        lastName: this.extractAttribute(profile, 'lastName') ||
                 this.extractAttribute(profile, 'surname') ||
                 this.extractAttribute(profile, 'sn'),
        groups: this.extractGroups(profile),
        attributes: profile.attributes || {},
        rawProfile: profile,
      };

      done(null, externalUser);
    } catch (error) {
      console.error('SAML verification error:', error);
      done(error, null);
    }
  }

  private extractAttribute(profile: Profile, attributeName: string): string | undefined {
    if (!profile.attributes) return undefined;
    
    // Try exact match first
    if ((profile.attributes as any)[attributeName]) {
      const value = (profile.attributes as any)[attributeName];
      return Array.isArray(value) ? String(value[0]) : String(value);
    }

    // Try case-insensitive match
    const lowerAttributeName = attributeName.toLowerCase();
    for (const [key, value] of Object.entries(profile.attributes)) {
      if (key.toLowerCase() === lowerAttributeName) {
        return Array.isArray(value) ? String(value[0]) : String(value);
      }
    }

    return undefined;
  }

  private extractGroups(profile: Profile): string[] {
    if (!profile.attributes) return [];

    const groupAttributes = ['groups', 'memberOf', 'roles', 'group'];
    
    for (const attr of groupAttributes) {
      const value = this.extractAttribute(profile, attr);
      if (value) {
        if (Array.isArray(value)) {
          return value;
        }
        return [value];
      }
    }

    return [];
  }

  async getAuthUrl(request: SSOAuthRequest): Promise<string> {
    if (!this.strategy) {
      throw new Error('SAML strategy not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        // Create a mock request object for SAML strategy
        const req = {
          query: {},
          body: {},
          session: {
            samlRequest: {
              id: request.providerId,
              redirectUrl: request.redirectUrl,
              state: request.state,
            },
          },
        };

        // Generate SAML auth URL
        const authUrl = this.strategy!.authenticate(req as any, {
          additionalParams: {},
          successRedirect: undefined,
          failureRedirect: undefined,
        });

        // For SAML, we need to construct the auth URL manually
        const url = new URL(this.config.entryPoint);
        if (request.forceAuthn) {
          url.searchParams.set('ForceAuthn', 'true');
        }

        resolve(url.toString());
      } catch (error) {
        reject(new Error(`Failed to generate SAML auth URL: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  async handleCallback(callbackData: any): Promise<SSOAuthResponse> {
    try {
      if (!callbackData || !callbackData.samlResponse) {
        throw new Error('No SAML response found in callback data');
      }

      // The callback data should contain the user profile from passport verification
      if (callbackData.user) {
        const user = callbackData.user;
        
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.displayName,
            avatar: undefined, // SAML typically doesn't provide avatar
          },
          redirectUrl: callbackData.redirectUrl,
        };
      }

      throw new Error('No user data found in SAML callback');
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAML_CALLBACK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown SAML callback error',
          details: callbackData,
        },
      };
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    // SAML doesn't use access tokens like OAuth
    // User info is provided in the SAML assertion during authentication
    throw new Error('getUserInfo not applicable for SAML provider - user data is provided during authentication');
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Check required SAML configuration fields
      const requiredFields = ['entryPoint', 'issuer', 'cert'];
      
      for (const field of requiredFields) {
        if (!this.config[field as keyof SAMLProviderConfig]) {
          throw new Error(`Missing required SAML configuration field: ${field}`);
        }
      }

      // Validate URLs
      try {
        new URL(this.config.entryPoint);
      } catch {
        throw new Error('Invalid SAML entryPoint URL');
      }

      if (this.config.callbackUrl) {
        try {
          new URL(this.config.callbackUrl);
        } catch {
          throw new Error('Invalid SAML callbackUrl');
        }
      }

      // Validate certificate format (basic check)
      if (!this.config.cert.includes('-----BEGIN CERTIFICATE-----') && 
          !this.config.cert.includes('-----BEGIN PUBLIC KEY-----')) {
        throw new Error('Invalid SAML certificate format');
      }

      return true;
    } catch (error) {
      console.error('SAML configuration validation failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test SAML configuration
      const isValid = await this.validateConfiguration();
      if (!isValid) {
        return {
          success: false,
          message: 'SAML configuration validation failed',
        };
      }

      // Try to initialize strategy (this will fail if configuration is wrong)
      this.initializeStrategy();

      // Test connectivity to SAML endpoint
      const axios = (await import('axios')).default;
      const response = await axios.get(this.config.entryPoint, {
        timeout: 10000,
        headers: {
          'User-Agent': 'QR-SaaS-SSO-Service/1.0',
        },
        validateStatus: () => true, // Don't throw on any status
      });

      if (response.status < 400) {
        return {
          success: true,
          message: 'SAML provider endpoint is reachable and configuration is valid',
        };
      } else {
        return {
          success: false,
          message: `SAML endpoint returned ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `SAML connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Helper method to get SAML metadata
  async getMetadata(): Promise<string> {
    if (!this.strategy) {
      throw new Error('SAML strategy not initialized');
    }

    // Generate SAML metadata XML
    // This is a simplified version - in production you might want to use a proper SAML library
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor entityID="${this.config.issuer}" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="${this.config.wantAssertionsSigned}" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${this.config.callbackUrl}" index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

    return metadata;
  }
}