import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import {
  SSOProvider,
  SSOProviderHandler,
  SSOAuthRequest,
  SSOAuthResponse,
  OAuth2ProviderConfig,
} from '../types/sso.types';
import axios from 'axios';

export class OAuth2ProviderHandler implements SSOProviderHandler {
  private strategy: OAuth2Strategy | GoogleStrategy | GitHubStrategy | null = null;
  private provider: SSOProvider;
  private config: OAuth2ProviderConfig;

  constructor(provider: SSOProvider) {
    this.provider = provider;
    this.config = provider.configuration as OAuth2ProviderConfig;
    this.initializeStrategy();
  }

  private initializeStrategy(): void {
    try {
      const strategyConfig = {
        clientID: this.config.clientID,
        clientSecret: this.config.clientSecret,
        callbackURL: this.config.callbackURL,
        scope: this.config.scope || ['openid', 'email', 'profile'],
        state: this.config.state ?? true,
      };

      switch (this.provider.type) {
        case 'google':
          this.strategy = new GoogleStrategy(
            strategyConfig,
            this.verifyCallback.bind(this)
          );
          break;

        case 'github':
          this.strategy = new GitHubStrategy(
            {
              clientID: this.config.clientID,
              clientSecret: this.config.clientSecret,
              callbackURL: this.config.callbackURL,
              scope: this.config.scope || ['user:email'],
            },
            this.verifyCallback.bind(this)
          );
          break;

        case 'oauth2':
        default:
          this.strategy = new OAuth2Strategy(
            {
              ...strategyConfig,
              authorizationURL: this.config.authorizationURL || '',
              tokenURL: this.config.tokenURL || '',
            },
            this.verifyCallback.bind(this)
          );
          break;
      }

      passport.use(`oauth2-${this.provider.id}`, this.strategy);
    } catch (error) {
      console.error(`Error initializing OAuth2 strategy for provider ${this.provider.id}:`, error);
      throw new Error(`Failed to initialize OAuth2 provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async verifyCallback(accessToken: string, refreshToken: string, profile: any, done: any): Promise<void> {
    try {
      // Extract user information from OAuth profile
      const externalUser = {
        id: profile.id,
        username: profile.username || profile.login || profile.id,
        email: this.extractEmail(profile),
        displayName: profile.displayName || profile.name || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
        firstName: profile.name?.givenName || profile.given_name,
        lastName: profile.name?.familyName || profile.family_name,
        avatar: this.extractAvatar(profile),
        locale: profile._json?.locale || profile.locale,
        verified: profile._json?.verified || profile.verified_email || profile.verified,
        attributes: {
          accessToken,
          refreshToken,
          profile: profile._json || profile,
        },
        rawProfile: profile,
      };

      done(null, externalUser);
    } catch (error) {
      console.error('OAuth2 verification error:', error);
      done(error, null);
    }
  }

  private extractEmail(profile: any): string | undefined {
    // Try multiple ways to extract email
    if (profile.emails && profile.emails.length > 0) {
      return profile.emails[0].value;
    }
    
    if (profile._json?.email) {
      return profile._json.email;
    }
    
    if (profile.email) {
      return profile.email;
    }

    return undefined;
  }

  private extractAvatar(profile: any): string | undefined {
    // Try multiple ways to extract avatar
    if (profile.photos && profile.photos.length > 0) {
      return profile.photos[0].value;
    }
    
    if (profile._json?.picture) {
      return profile._json.picture;
    }
    
    if (profile._json?.avatar_url) {
      return profile._json.avatar_url;
    }
    
    if (profile.picture) {
      return profile.picture;
    }

    return undefined;
  }

  async getAuthUrl(request: SSOAuthRequest): Promise<string> {
    if (!this.strategy) {
      throw new Error('OAuth2 strategy not initialized');
    }

    const baseUrl = this.getAuthorizationURL();
    const url = new URL(baseUrl);
    
    // Add standard OAuth2 parameters
    url.searchParams.set('client_id', this.config.clientID);
    url.searchParams.set('redirect_uri', this.config.callbackURL);
    url.searchParams.set('response_type', 'code');
    
    // Add scope
    if (this.config.scope && this.config.scope.length > 0) {
      url.searchParams.set('scope', this.config.scope.join(' '));
    }
    
    // Add state for security
    if (request.state) {
      url.searchParams.set('state', request.state);
    }
    
    // Add nonce for OIDC
    if (request.nonce) {
      url.searchParams.set('nonce', request.nonce);
    }
    
    // Force authentication if requested
    if (request.forceAuthn) {
      url.searchParams.set('prompt', 'login');
    }

    return url.toString();
  }

  private getAuthorizationURL(): string {
    switch (this.provider.type) {
      case 'google':
        return 'https://accounts.google.com/o/oauth2/v2/auth';
      case 'github':
        return 'https://github.com/login/oauth/authorize';
      case 'microsoft':
        return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
      case 'oauth2':
      default:
        return this.config.authorizationURL || '';
    }
  }

  async handleCallback(callbackData: any): Promise<SSOAuthResponse> {
    try {
      if (!callbackData || !callbackData.code) {
        throw new Error('No authorization code found in callback data');
      }

      // Exchange authorization code for access token
      const tokenData = await this.exchangeCodeForToken(callbackData.code, callbackData.state);
      
      // Get user info using access token
      const userInfo = await this.getUserInfo(tokenData.access_token);
      
      return {
        success: true,
        user: {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.displayName || userInfo.name,
          avatar: userInfo.avatar,
        },
        redirectUrl: callbackData.redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OAUTH2_CALLBACK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown OAuth2 callback error',
          details: callbackData,
        },
      };
    }
  }

  private async exchangeCodeForToken(code: string, state?: string): Promise<any> {
    const tokenUrl = this.getTokenURL();
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientID,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.callbackURL,
    });

    if (state) {
      params.append('state', state);
    }

    try {
      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'QR-SaaS-SSO-Service/1.0',
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getTokenURL(): string {
    switch (this.provider.type) {
      case 'google':
        return 'https://oauth2.googleapis.com/token';
      case 'github':
        return 'https://github.com/login/oauth/access_token';
      case 'microsoft':
        return 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      case 'oauth2':
      default:
        return this.config.tokenURL || '';
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    const userInfoUrl = this.getUserInfoURL();
    
    try {
      const response = await axios.get(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'QR-SaaS-SSO-Service/1.0',
        },
        timeout: 10000,
      });

      const userInfo = response.data;
      
      // Normalize user info based on provider
      return this.normalizeUserInfo(userInfo);
    } catch (error) {
      throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getUserInfoURL(): string {
    switch (this.provider.type) {
      case 'google':
        return 'https://www.googleapis.com/oauth2/v2/userinfo';
      case 'github':
        return 'https://api.github.com/user';
      case 'microsoft':
        return 'https://graph.microsoft.com/v1.0/me';
      default:
        // For generic OAuth2, this would need to be configured
        throw new Error('User info URL not configured for generic OAuth2 provider');
    }
  }

  private normalizeUserInfo(userInfo: any): any {
    switch (this.provider.type) {
      case 'google':
        return {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          displayName: userInfo.name,
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          avatar: userInfo.picture,
          verified: userInfo.verified_email,
          locale: userInfo.locale,
        };

      case 'github':
        return {
          id: String(userInfo.id),
          email: userInfo.email,
          name: userInfo.name || userInfo.login,
          displayName: userInfo.name || userInfo.login,
          username: userInfo.login,
          avatar: userInfo.avatar_url,
          verified: true, // GitHub accounts are considered verified
          company: userInfo.company,
          location: userInfo.location,
          bio: userInfo.bio,
        };

      case 'microsoft':
        return {
          id: userInfo.id,
          email: userInfo.mail || userInfo.userPrincipalName,
          name: userInfo.displayName,
          displayName: userInfo.displayName,
          firstName: userInfo.givenName,
          lastName: userInfo.surname,
          jobTitle: userInfo.jobTitle,
          officeLocation: userInfo.officeLocation,
          verified: true, // Microsoft accounts are considered verified
        };

      default:
        return userInfo;
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Check required OAuth2 configuration fields
      const requiredFields = ['clientID', 'clientSecret', 'callbackURL'];
      
      for (const field of requiredFields) {
        if (!this.config[field as keyof OAuth2ProviderConfig]) {
          throw new Error(`Missing required OAuth2 configuration field: ${field}`);
        }
      }

      // For generic OAuth2, also check URLs
      if (this.provider.type === 'oauth2') {
        if (!this.config.authorizationURL) {
          throw new Error('Missing authorizationURL for generic OAuth2 provider');
        }
        if (!this.config.tokenURL) {
          throw new Error('Missing tokenURL for generic OAuth2 provider');
        }
      }

      // Validate callback URL format
      try {
        new URL(this.config.callbackURL);
      } catch {
        throw new Error('Invalid OAuth2 callbackURL format');
      }

      return true;
    } catch (error) {
      console.error('OAuth2 configuration validation failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test OAuth2 configuration
      const isValid = await this.validateConfiguration();
      if (!isValid) {
        return {
          success: false,
          message: 'OAuth2 configuration validation failed',
        };
      }

      // Test connectivity to authorization endpoint
      const authUrl = this.getAuthorizationURL();
      if (authUrl) {
        const response = await axios.get(authUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'QR-SaaS-SSO-Service/1.0',
          },
          validateStatus: () => true, // Don't throw on any status
        });

        if (response.status < 500) {
          return {
            success: true,
            message: 'OAuth2 provider endpoints are reachable and configuration is valid',
          };
        } else {
          return {
            success: false,
            message: `OAuth2 authorization endpoint returned ${response.status}: ${response.statusText}`,
          };
        }
      }

      return {
        success: true,
        message: 'OAuth2 configuration is valid',
      };
    } catch (error) {
      return {
        success: false,
        message: `OAuth2 connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}