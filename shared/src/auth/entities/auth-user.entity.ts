/**
 * Authentication User Entity - Domain Layer
 * Represents an authenticated user in the system
 * Following Clean Architecture Domain Entity pattern
 */

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise';

export class AuthUser {
  private constructor(
    private readonly _userId: string,
    private readonly _email: string,
    private readonly _username: string,
    private readonly _subscriptionTier: SubscriptionTier,
    private readonly _isEmailVerified: boolean,
    private readonly _tokenIssuedAt: number,
    private readonly _tokenExpiresAt: number,
    private readonly _organizationId?: string,
    private readonly _permissions: string[] = []
  ) {
    this.validateUser();
  }

  // Factory method for creating authenticated user from JWT payload
  public static fromJwtPayload(payload: any): AuthUser {
    if (!payload.userId || !payload.email) {
      throw new Error('Invalid JWT payload: missing required fields');
    }

    return new AuthUser(
      payload.userId || payload.sub,
      payload.email,
      payload.username,
      payload.subscription || 'free',
      Boolean(payload.isEmailVerified),
      payload.iat || 0,
      payload.exp || 0,
      payload.organizationId,
      payload.permissions || []
    );
  }

  // Factory method for creating from service headers
  public static fromServiceHeaders(data: {
    userId: string;
    email: string;
    username: string;
    subscriptionTier: SubscriptionTier;
    isEmailVerified: boolean;
    tokenIssuedAt?: number;
    tokenExpiresAt?: number;
    organizationId?: string;
    permissions?: string[];
  }): AuthUser {
    return new AuthUser(
      data.userId,
      data.email,
      data.username,
      data.subscriptionTier,
      data.isEmailVerified,
      data.tokenIssuedAt || 0,
      data.tokenExpiresAt || 0,
      data.organizationId,
      data.permissions || []
    );
  }

  // Getters following encapsulation principle
  public get userId(): string { return this._userId; }
  public get email(): string { return this._email; }
  public get username(): string { return this._username; }
  public get subscriptionTier(): SubscriptionTier { return this._subscriptionTier; }
  public get isEmailVerified(): boolean { return this._isEmailVerified; }
  public get tokenIssuedAt(): number { return this._tokenIssuedAt; }
  public get tokenExpiresAt(): number { return this._tokenExpiresAt; }
  public get organizationId(): string | undefined { return this._organizationId; }
  public get permissions(): readonly string[] { return Object.freeze([...this._permissions]); }

  // Business logic methods
  public hasPermission(permission: string): boolean {
    return this._permissions.includes(permission);
  }

  public hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  public hasSubscriptionLevel(minTier: SubscriptionTier): boolean {
    const tierLevels: Record<SubscriptionTier, number> = {
      'free': 0,
      'pro': 1,
      'business': 2,
      'enterprise': 3
    };

    return tierLevels[this._subscriptionTier] >= tierLevels[minTier];
  }

  public isTokenExpired(currentTime: number = Date.now()): boolean {
    return this._tokenExpiresAt * 1000 < currentTime;
  }

  public belongsToOrganization(organizationId: string): boolean {
    return this._organizationId === organizationId;
  }

  // Convert to service headers for inter-service communication
  public toServiceHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'x-auth-user-id': this._userId,
      'x-auth-email': this._email,
      'x-auth-username': this._username,
      'x-auth-tier': this._subscriptionTier,
      'x-auth-verified': this._isEmailVerified.toString(),
      'x-auth-iat': this._tokenIssuedAt.toString(),
      'x-auth-exp': this._tokenExpiresAt.toString()
    };

    if (this._organizationId) {
      headers['x-auth-org-id'] = this._organizationId;
    }

    if (this._permissions.length > 0) {
      headers['x-auth-permissions'] = JSON.stringify(this._permissions);
    }

    return headers;
  }

  // Validation method
  private validateUser(): void {
    if (!this._userId || typeof this._userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    if (!this._email || !this.isValidEmail(this._email)) {
      throw new Error('Invalid email address');
    }

    if (!this._username || typeof this._username !== 'string') {
      throw new Error('Invalid username');
    }

    const validTiers: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];
    if (!validTiers.includes(this._subscriptionTier)) {
      throw new Error('Invalid subscription tier');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // For debugging and logging (excludes sensitive data)
  public toLogObject(): object {
    return {
      userId: this._userId,
      email: this._email.replace(/(.{2}).*@/, '$1***@'), // Partially hide email
      subscriptionTier: this._subscriptionTier,
      isEmailVerified: this._isEmailVerified,
      organizationId: this._organizationId,
      permissionCount: this._permissions.length
    };
  }
}