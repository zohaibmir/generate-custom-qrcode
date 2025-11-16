/**
 * Service Integration Middleware
 * Extracts authentication context from API Gateway headers for microservices
 * Following Clean Architecture Application Layer pattern
 */

import express, { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../entities/auth-user.entity';
import { IRequestContext } from '../interfaces/auth.interfaces';

// Extend request context for service integration
export interface IServiceRequestContext extends IRequestContext {
  isAuthenticated: boolean;
  source: 'api-gateway' | 'direct';
}

// Extend Express Request with auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      serviceContext?: IServiceRequestContext;
    }
  }
}

export interface ServiceIntegrationConfig {
  requireAuthentication?: boolean;
  allowDirectAccess?: boolean;
  trustedSources?: string[];
}

export class ServiceIntegrationMiddleware {
  constructor(private readonly config: ServiceIntegrationConfig = {}) {}

  /**
   * Create middleware that extracts authentication context from gateway headers
   */
  public createServiceAuthMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Extract authentication headers set by API Gateway
        const authHeaders = this.extractAuthHeaders(req);
        
        // Create request context
        const requestContext: IServiceRequestContext = {
          requestId: req.headers['x-request-id'] as string || `req_${Date.now()}`,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          method: req.method,
          path: req.path,
          timestamp: new Date(),
          isAuthenticated: !!authHeaders.userId,
          source: this.isFromGateway(req) ? 'api-gateway' as const : 'direct' as const
        };
        
        req.serviceContext = requestContext;

        // If we have auth context from gateway, reconstruct AuthUser
        if (authHeaders.userId) {
          const authUser = this.reconstructAuthUser(authHeaders);
          req.auth = authUser;
          
          this.logAuthContext('auth_context_extracted', req, authUser);
        } else if (this.config.requireAuthentication) {
          // Service requires authentication but none provided
          return this.handleAuthenticationRequired(req, res);
        }

        // Validate source if configured
        if (!this.config.allowDirectAccess && requestContext.source === 'direct') {
          return this.handleDirectAccessDenied(req, res);
        }

        next();
      } catch (error) {
        this.handleMiddlewareError(error, req, res, next);
      }
    };
  }

  /**
   * Extract authentication headers from request
   */
  private extractAuthHeaders(req: Request): {
    userId?: string;
    email?: string;
    username?: string;
    subscriptionTier?: string;
    isEmailVerified?: boolean;
    permissions?: string[];
    organizationId?: string;
    tokenIssuedAt?: number;
    tokenExpiresAt?: number;
  } {
    return {
      userId: req.headers['x-auth-user-id'] as string,
      email: req.headers['x-auth-email'] as string,
      username: req.headers['x-auth-username'] as string,
      subscriptionTier: req.headers['x-auth-subscription'] as string,
      isEmailVerified: req.headers['x-auth-email-verified'] === 'true',
      permissions: this.parsePermissions(req.headers['x-auth-permissions'] as string),
      organizationId: req.headers['x-auth-organization-id'] as string,
      tokenIssuedAt: this.parseTimestamp(req.headers['x-auth-token-issued-at'] as string),
      tokenExpiresAt: this.parseTimestamp(req.headers['x-auth-token-expires-at'] as string)
    };
  }

  /**
   * Reconstruct AuthUser entity from headers
   */
  private reconstructAuthUser(authHeaders: any): AuthUser {
    return AuthUser.fromServiceHeaders({
      userId: authHeaders.userId,
      email: authHeaders.email,
      username: authHeaders.username,
      subscriptionTier: authHeaders.subscriptionTier || 'free',
      isEmailVerified: authHeaders.isEmailVerified || false,
      permissions: authHeaders.permissions || [],
      organizationId: authHeaders.organizationId,
      tokenIssuedAt: authHeaders.tokenIssuedAt,
      tokenExpiresAt: authHeaders.tokenExpiresAt
    });
  }

  /**
   * Check if request is from API Gateway
   */
  private isFromGateway(req: Request): boolean {
    const gatewayHeaders = [
      'x-api-gateway',
      'x-forwarded-by',
      'x-request-id'
    ];

    return gatewayHeaders.some(header => req.headers[header]);
  }

  /**
   * Parse comma-separated permissions
   */
  private parsePermissions(permissionsHeader?: string): string[] {
    if (!permissionsHeader) return [];
    return permissionsHeader.split(',').map(p => p.trim()).filter(Boolean);
  }

  /**
   * Parse timestamp from header
   */
  private parseTimestamp(timestampHeader?: string): number | undefined {
    if (!timestampHeader) return undefined;
    const timestamp = parseInt(timestampHeader, 10);
    return isNaN(timestamp) ? undefined : timestamp;
  }

  /**
   * Handle authentication required error
   */
  private handleAuthenticationRequired(req: Request, res: Response): void {
    this.logAuthContext('authentication_required', req);
    
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'This service requires authentication context from API Gateway',
        statusCode: 401,
        requestId: req.serviceContext?.requestId
      }
    });
  }

  /**
   * Handle direct access denied error
   */
  private handleDirectAccessDenied(req: Request, res: Response): void {
    this.logAuthContext('direct_access_denied', req);
    
    res.status(403).json({
      success: false,
      error: {
        code: 'DIRECT_ACCESS_DENIED',
        message: 'Direct access to this service is not allowed. Please use API Gateway.',
        statusCode: 403,
        requestId: req.serviceContext?.requestId
      }
    });
  }  /**
   * Handle middleware errors
   */
  private handleMiddlewareError(
    error: any, 
    req: Request, 
    res: Response, 
    next: NextFunction
  ): void {
    console.error('Service integration middleware error:', error);
    
    this.logAuthContext('middleware_error', req, undefined, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_INTEGRATION_ERROR',
        message: 'Failed to process authentication context',
        statusCode: 500,
        requestId: req.serviceContext?.requestId
      }
    });
  }

  /**
   * Log authentication context events
   */
  private logAuthContext(
    event: string, 
    req: Request, 
    user?: AuthUser, 
    error?: string
  ): void {
    const logData = {
      event,
      requestId: req.serviceContext?.requestId,
      method: req.method,
      path: req.path,
      source: req.serviceContext?.source,
      isAuthenticated: req.serviceContext?.isAuthenticated,
      userId: user?.userId,
      email: user?.email,
      error,
      timestamp: new Date().toISOString()
    };

    console.log('Service Auth Context:', JSON.stringify(logData));
  }

  /**
   * Factory method to create middleware instance
   */
  public static create(config: ServiceIntegrationConfig = {}): ServiceIntegrationMiddleware {
    return new ServiceIntegrationMiddleware(config);
  }

  /**
   * Create middleware for protected services (require auth from gateway)
   */
  public static createProtected(config: Partial<ServiceIntegrationConfig> = {}): express.RequestHandler {
    const middleware = new ServiceIntegrationMiddleware({
      requireAuthentication: true,
      allowDirectAccess: false,
      ...config
    });
    
    return middleware.createServiceAuthMiddleware();
  }

  /**
   * Create middleware for internal services (optional auth, allow direct access)
   */
  public static createInternal(config: Partial<ServiceIntegrationConfig> = {}): express.RequestHandler {
    const middleware = new ServiceIntegrationMiddleware({
      requireAuthentication: false,
      allowDirectAccess: true,
      ...config
    });
    
    return middleware.createServiceAuthMiddleware();
  }

  /**
   * Create middleware for admin services (require auth, no direct access)
   */
  public static createAdmin(config: Partial<ServiceIntegrationConfig> = {}): express.RequestHandler {
    const middleware = new ServiceIntegrationMiddleware({
      requireAuthentication: true,
      allowDirectAccess: false,
      trustedSources: ['api-gateway', 'admin-dashboard'],
      ...config
    });
    
    return middleware.createServiceAuthMiddleware();
  }
}

// Export types
export type ServiceAuthMiddleware = express.RequestHandler;