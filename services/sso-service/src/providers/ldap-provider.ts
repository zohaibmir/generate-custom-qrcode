import LdapAuth = require('ldapauth-fork');
import {
  SSOProvider,
  SSOProviderHandler,
  SSOAuthRequest,
  SSOAuthResponse,
  LDAPProviderConfig,
} from '../types/sso.types';

export class LDAPProviderHandler implements SSOProviderHandler {
  private ldapAuth: LdapAuth | null = null;
  private provider: SSOProvider;
  private config: LDAPProviderConfig;

  constructor(provider: SSOProvider) {
    this.provider = provider;
    this.config = provider.configuration as LDAPProviderConfig;
    this.initializeLDAPAuth();
  }

  private initializeLDAPAuth(): void {
    try {
      this.ldapAuth = new LdapAuth({
        url: this.config.server.url,
        bindDN: this.config.server.bindDN,
        bindCredentials: this.config.server.bindCredentials,
        searchBase: this.config.server.searchBase,
        searchFilter: this.config.server.searchFilter || '(uid={{username}})',
        searchAttributes: this.config.server.searchAttributes,
        tlsOptions: this.config.server.tlsOptions,
        reconnect: true,
        timeout: 5000,
        connectTimeout: 10000,
        idleTimeout: 30000,
      });

      this.ldapAuth.on('error', (err: any) => {
        console.error(`LDAP error for provider ${this.provider.id}:`, err);
      });

    } catch (error) {
      console.error(`Error initializing LDAP auth for provider ${this.provider.id}:`, error);
      throw new Error(`Failed to initialize LDAP provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAuthUrl(request: SSOAuthRequest): Promise<string> {
    // LDAP doesn't use redirect URLs like OAuth/SAML
    // This would typically be handled by a form submission
    throw new Error('LDAP authentication does not use redirect URLs - use authenticateUser directly');
  }

  async handleCallback(callbackData: any): Promise<SSOAuthResponse> {
    // LDAP doesn't use callbacks like OAuth/SAML
    // Authentication is handled directly through username/password
    throw new Error('LDAP authentication does not use callbacks - use authenticateUser directly');
  }

  async authenticateUser(username: string, password: string): Promise<SSOAuthResponse> {
    if (!this.ldapAuth) {
      throw new Error('LDAP authentication not initialized');
    }

    try {
      // Authenticate user against LDAP
      const user = await new Promise<any>((resolve, reject) => {
        this.ldapAuth!.authenticate(username, password, (err: any, user: any) => {
          if (err) {
            reject(err);
          } else if (!user) {
            reject(new Error('Authentication failed'));
          } else {
            resolve(user);
          }
        });
      });

      // Extract user information from LDAP attributes
      const externalUser = this.extractUserInfo(user, username);

      return {
        success: true,
        user: {
          id: externalUser.id,
          email: externalUser.email,
          name: externalUser.displayName,
          avatar: undefined, // LDAP typically doesn't provide avatars
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LDAP_AUTH_ERROR',
          message: error instanceof Error ? error.message : 'LDAP authentication failed',
          details: { username },
        },
      };
    }
  }

  private extractUserInfo(ldapUser: any, username: string): any {
    const getValue = (field: string): string | undefined => {
      const value = ldapUser[field];
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    };

    // Try to extract email
    const emailField = this.config.emailField || 'mail';
    const email = getValue(emailField) || getValue('email') || getValue('userPrincipalName');

    // Try to extract display name
    const displayNameField = this.config.displayNameField || 'displayName';
    const displayName = getValue(displayNameField) || 
                       getValue('cn') || 
                       getValue('name') || 
                       `${getValue('givenName') || ''} ${getValue('sn') || ''}`.trim() ||
                       username;

    // Extract groups if configured
    const groups = this.extractGroups(ldapUser);

    // Extract other attributes
    const attributes: Record<string, any> = {};
    for (const [key, value] of Object.entries(ldapUser)) {
      if (key !== 'dn' && key !== 'controls') {
        attributes[key] = value;
      }
    }

    return {
      id: ldapUser.dn || username,
      username,
      email,
      displayName,
      firstName: getValue('givenName') || getValue('firstName'),
      lastName: getValue('sn') || getValue('surname') || getValue('lastName'),
      department: getValue('department'),
      title: getValue('title'),
      phone: getValue('telephoneNumber'),
      groups,
      attributes,
      rawProfile: ldapUser,
    };
  }

  private extractGroups(ldapUser: any): string[] {
    const groupField = this.config.groupField || 'memberOf';
    const groupValue = ldapUser[groupField];

    if (!groupValue) {
      return [];
    }

    if (Array.isArray(groupValue)) {
      return groupValue.map((group: string) => this.extractGroupName(group));
    }

    return [this.extractGroupName(groupValue)];
  }

  private extractGroupName(groupDN: string): string {
    // Extract CN from group DN (e.g., "CN=Administrators,OU=Groups,DC=company,DC=com" -> "Administrators")
    const cnMatch = groupDN.match(/CN=([^,]+)/i);
    return cnMatch ? cnMatch[1] : groupDN;
  }

  async getUserInfo(accessToken: string): Promise<any> {
    // LDAP doesn't use access tokens
    throw new Error('getUserInfo not applicable for LDAP provider - user data is provided during authentication');
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Check required LDAP configuration fields
      const requiredFields = ['url', 'bindDN', 'bindCredentials', 'searchBase'];
      
      for (const field of requiredFields) {
        const value = this.config.server[field as keyof typeof this.config.server];
        if (!value) {
          throw new Error(`Missing required LDAP configuration field: server.${field}`);
        }
      }

      // Validate LDAP URL format
      try {
        new URL(this.config.server.url);
      } catch {
        throw new Error('Invalid LDAP server URL');
      }

      // Validate search filter
      if (this.config.server.searchFilter && !this.config.server.searchFilter.includes('{{username}}')) {
        console.warn('LDAP search filter does not contain {{username}} placeholder');
      }

      return true;
    } catch (error) {
      console.error('LDAP configuration validation failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test LDAP configuration
      const isValid = await this.validateConfiguration();
      if (!isValid) {
        return {
          success: false,
          message: 'LDAP configuration validation failed',
        };
      }

      // Test LDAP connection
      if (!this.ldapAuth) {
        this.initializeLDAPAuth();
      }

      // Try to bind to LDAP server
      return new Promise<{ success: boolean; message: string }>((resolve) => {
        const testAuth = new LdapAuth({
          url: this.config.server.url,
          bindDN: this.config.server.bindDN,
          bindCredentials: this.config.server.bindCredentials,
          searchBase: this.config.server.searchBase,
          searchFilter: '(objectClass=*)',
          searchAttributes: ['dn'],
          tlsOptions: this.config.server.tlsOptions,
          timeout: 10000,
          connectTimeout: 15000,
        });

        testAuth.on('error', (err: any) => {
          resolve({
            success: false,
            message: `LDAP connection test failed: ${err.message}`,
          });
        });

        // Try a simple search to test connection
        testAuth.authenticate('test', 'test', (err: any) => {
          // We expect this to fail with auth error, but if we get a connection error, that's the issue
          if (err && err.name === 'InvalidCredentialsError') {
            resolve({
              success: true,
              message: 'LDAP server is reachable and configuration is valid',
            });
          } else if (err) {
            resolve({
              success: false,
              message: `LDAP connection test failed: ${err.message}`,
            });
          } else {
            resolve({
              success: true,
              message: 'LDAP server is reachable and configuration is valid',
            });
          }
          
          testAuth.close(() => {
            // Connection closed
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `LDAP connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Helper method to close LDAP connection
  close(): void {
    if (this.ldapAuth) {
      this.ldapAuth.close(() => {
        console.log(`LDAP connection closed for provider ${this.provider.id}`);
      });
      this.ldapAuth = null;
    }
  }

  // Method to search for users (useful for user provisioning)
  async searchUsers(searchTerm: string, attributes?: string[]): Promise<any[]> {
    if (!this.ldapAuth) {
      throw new Error('LDAP authentication not initialized');
    }

    return new Promise((resolve, reject) => {
      const searchFilter = this.config.server.searchFilter?.replace('{{username}}', searchTerm) || `(uid=${searchTerm})`;
      
      // Note: This requires extending ldapauth-fork or using ldapjs directly
      // For now, this is a placeholder for future implementation
      reject(new Error('User search not implemented yet'));
    });
  }
}