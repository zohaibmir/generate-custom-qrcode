export interface SSOProvider {
  id: string;
  organizationId: string;
  name: string;
  type: SSOProviderType;
  isEnabled: boolean;
  isDefault: boolean;
  displayName?: string;
  description?: string;
  logoUrl?: string;
  buttonText?: string;
  sortOrder: number;
  configuration: Record<string, any>;
  forceAuthn: boolean;
  allowCreateUser: boolean;
  requireEmailVerification: boolean;
  status: SSOProviderStatus;
  lastTestAt?: Date;
  lastTestResult?: string;
  errorCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export type SSOProviderType = 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'google' | 'microsoft' | 'github';
export type SSOProviderStatus = 'active' | 'inactive' | 'testing';

export interface SSOUserIdentity {
  id: string;
  userId: string;
  providerId: string;
  externalId: string;
  externalUsername?: string;
  externalEmail?: string;
  externalDisplayName?: string;
  attributes: Record<string, any>;
  firstLoginAt: Date;
  lastLoginAt: Date;
  loginCount: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SSOSession {
  id: string;
  sessionId: string;
  providerId: string;
  userId?: string;
  state: SSOSessionState;
  authRequestId?: string;
  redirectUrl?: string;
  responseData?: Record<string, any>;
  errorData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  initiatedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export type SSOSessionState = 'initiated' | 'authenticated' | 'completed' | 'failed' | 'expired';

export interface SSOConfigTemplate {
  id: string;
  name: string;
  providerType: SSOProviderType;
  displayName: string;
  description?: string;
  logoUrl?: string;
  configTemplate: Record<string, any>;
  requiredFields: string[];
  optionalFields: string[];
  setupInstructions?: string;
  documentationUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SSOAttributeMapping {
  id: string;
  providerId: string;
  externalAttribute: string;
  internalField: string;
  isRequired: boolean;
  defaultValue?: string;
  transformExpression?: string;
  fieldType: SSOFieldType;
  createdAt: Date;
  updatedAt: Date;
}

export type SSOFieldType = 'string' | 'email' | 'boolean' | 'number' | 'date' | 'json';

export interface SSOAuditLog {
  id: string;
  providerId?: string;
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventCategory: SSOEventCategory;
  eventDescription: string;
  eventData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status: SSOEventStatus;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt: Date;
}

export type SSOEventCategory = 'authentication' | 'configuration' | 'user_management' | 'error';
export type SSOEventStatus = 'success' | 'failure' | 'warning' | 'info';

// SSO Authentication Request/Response interfaces
export interface SSOAuthRequest {
  providerId: string;
  redirectUrl?: string;
  state?: string;
  nonce?: string;
  forceAuthn?: boolean;
}

export interface SSOAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  redirectUrl?: string;
  sessionId?: string;
}

// Provider-specific configuration interfaces
export interface SAMLProviderConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl?: string;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  identifierFormat?: string;
  authnRequestBinding?: string;
  wantAssertionsSigned?: boolean;
  wantAuthnResponseSigned?: boolean;
}

export interface OAuth2ProviderConfig {
  clientID: string;
  clientSecret: string;
  authorizationURL?: string;
  tokenURL?: string;
  callbackURL: string;
  scope?: string[];
  state?: boolean;
  pkce?: boolean;
}

export interface LDAPProviderConfig {
  server: {
    url: string;
    bindDN: string;
    bindCredentials: string;
    searchBase: string;
    searchFilter?: string;
    searchAttributes?: string[];
    tlsOptions?: Record<string, any>;
  };
  usernameField?: string;
  emailField?: string;
  displayNameField?: string;
  groupField?: string;
  groupFilter?: string;
}

// SSO Provider Factory interface
export interface SSOProviderFactory {
  createProvider(provider: SSOProvider): SSOProviderHandler;
  getSupportedTypes(): SSOProviderType[];
}

// SSO Provider Handler interface
export interface SSOProviderHandler {
  getAuthUrl(request: SSOAuthRequest): Promise<string>;
  handleCallback(callbackData: any): Promise<SSOAuthResponse>;
  getUserInfo(accessToken: string): Promise<any>;
  validateConfiguration(): Promise<boolean>;
  testConnection(): Promise<{ success: boolean; message: string }>;
}

// SSO Service interfaces
export interface SSOServiceInterface {
  authenticateUser(providerId: string, authData: any): Promise<SSOAuthResponse>;
  createUserIdentity(provider: SSOProvider, externalUser: any): Promise<SSOUserIdentity>;
  linkUserIdentity(userId: string, provider: SSOProvider, externalUser: any): Promise<SSOUserIdentity>;
  getUserByIdentity(providerId: string, externalId: string): Promise<SSOUserIdentity | null>;
  updateUserFromProvider(identity: SSOUserIdentity, externalUser: any): Promise<SSOUserIdentity>;
}

export interface SSOProviderServiceInterface {
  getProviders(organizationId: string): Promise<SSOProvider[]>;
  getProvider(id: string): Promise<SSOProvider | null>;
  createProvider(provider: Omit<SSOProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSOProvider>;
  updateProvider(id: string, updates: Partial<SSOProvider>): Promise<SSOProvider>;
  deleteProvider(id: string): Promise<boolean>;
  testProvider(id: string): Promise<{ success: boolean; message: string }>;
  enableProvider(id: string): Promise<SSOProvider>;
  disableProvider(id: string): Promise<SSOProvider>;
}

export interface SSOSessionServiceInterface {
  createSession(session: Omit<SSOSession, 'id' | 'initiatedAt'>): Promise<SSOSession>;
  getSession(sessionId: string): Promise<SSOSession | null>;
  updateSession(sessionId: string, updates: Partial<SSOSession>): Promise<SSOSession>;
  expireSession(sessionId: string): Promise<boolean>;
  cleanupExpiredSessions(): Promise<number>;
}