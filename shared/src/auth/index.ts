/**
 * Authentication Module Export
 * Clean Architecture Module Interface
 * Following Interface Segregation Principle from SOLID
 */

// Entities
export { AuthUser, SubscriptionTier } from './entities/auth-user.entity';

// Interfaces
export {
  IJwtTokenService,
  IRouteClassificationService,
  IAuthorizationService,
  IAuthAuditLogger,
  IAuthenticationStrategy,
  IAuthContextRepository,
  IRequestContext,
  AuthenticationResult,
  AuthenticationError,
  AuthErrorCode,
  RouteConfig,
  RouteConfigResult,
  AuthMiddlewareConfig,
  AuthenticationEvent,
  AuthorizationEvent,
  SecurityEvent
} from './interfaces/auth.interfaces';

// Services
export { JwtTokenService } from './services/jwt-token.service';
export { 
  RouteClassificationService,
  DEFAULT_PUBLIC_ROUTES,
  DEFAULT_PROTECTED_ROUTES,
  DEFAULT_OPTIONAL_AUTH_ROUTES
} from './services/route-classification.service';
export { AuthorizationService } from './services/authorization.service';

// Middleware
export { AuthenticationMiddleware } from './middleware/authentication.middleware';
export { 
  ServiceIntegrationMiddleware,
  ServiceIntegrationConfig,
  ServiceAuthMiddleware 
} from './middleware/service-integration.middleware';

// Import types and classes for factory
import { AuthUser } from './entities/auth-user.entity';
import { 
  RouteConfig,
  AuthenticationError,
  AuthErrorCode 
} from './interfaces/auth.interfaces';
import { JwtTokenService } from './services/jwt-token.service';
import { 
  RouteClassificationService,
  DEFAULT_PUBLIC_ROUTES,
  DEFAULT_PROTECTED_ROUTES,
  DEFAULT_OPTIONAL_AUTH_ROUTES
} from './services/route-classification.service';
import { AuthorizationService } from './services/authorization.service';
import { AuthenticationMiddleware } from './middleware/authentication.middleware';

// Factory for creating authentication module
export class AuthenticationModuleFactory {
  public static create(config: {
    jwtSecret: string;
    jwtIssuer?: string;
    publicRoutes?: RouteConfig[];
    protectedRoutes?: RouteConfig[];
    optionalAuthRoutes?: RouteConfig[];
    enableAuditLogging?: boolean;
  }) {
    // Create services with dependency injection
    const jwtTokenService = new JwtTokenService(config.jwtSecret, config.jwtIssuer);
    
    const routeClassificationService = new RouteClassificationService(
      config.publicRoutes || DEFAULT_PUBLIC_ROUTES,
      config.protectedRoutes || DEFAULT_PROTECTED_ROUTES,
      config.optionalAuthRoutes || DEFAULT_OPTIONAL_AUTH_ROUTES
    );
    
    const authorizationService = new AuthorizationService();
    
    // Create main middleware
    const authenticationMiddleware = AuthenticationMiddleware.create(
      jwtTokenService,
      routeClassificationService,
      authorizationService
      // auditLogger will be added later if needed
    );

    return {
      jwtTokenService,
      routeClassificationService,
      authorizationService,
      authenticationMiddleware,
      
      // Convenience methods
      createAuthMiddleware: () => authenticationMiddleware.createAuthMiddleware(),
      createOptionalAuthMiddleware: () => authenticationMiddleware.createOptionalAuthMiddleware()
    };
  }
}

// Service extraction utility for microservices
export class ServiceAuthExtractor {
  public static extractAuthUser(headers: Record<string, string | string[] | undefined>): AuthUser | null {
    try {
      const userId = this.getHeaderValue(headers, 'x-auth-user-id');
      const email = this.getHeaderValue(headers, 'x-auth-email');
      const username = this.getHeaderValue(headers, 'x-auth-username');
      const subscriptionTier = this.getHeaderValue(headers, 'x-auth-subscription');
      const isEmailVerified = this.getHeaderValue(headers, 'x-auth-email-verified') === 'true';
      const organizationId = this.getHeaderValue(headers, 'x-auth-organization-id');
      const permissionsHeader = this.getHeaderValue(headers, 'x-auth-permissions');
      const tokenIssuedAtHeader = this.getHeaderValue(headers, 'x-auth-token-issued-at');
      const tokenExpiresAtHeader = this.getHeaderValue(headers, 'x-auth-token-expires-at');

      if (!userId || !email || !username) {
        return null; // Missing required headers
      }

      return AuthUser.fromServiceHeaders({
        userId,
        email,
        username,
        subscriptionTier: (subscriptionTier as any) || 'free',
        isEmailVerified,
        organizationId,
        permissions: permissionsHeader ? permissionsHeader.split(',').map(p => p.trim()) : [],
        tokenIssuedAt: tokenIssuedAtHeader ? parseInt(tokenIssuedAtHeader, 10) : undefined,
        tokenExpiresAt: tokenExpiresAtHeader ? parseInt(tokenExpiresAtHeader, 10) : undefined
      });
    } catch (error) {
      return null;
    }
  }

  private static getHeaderValue(headers: Record<string, string | string[] | undefined>, key: string): string | undefined {
    const value = headers[key];
    if (typeof value === 'string') {
      return value;
    } else if (Array.isArray(value)) {
      return value[0];
    }
    return undefined;
  }

  public static requireAuthUser(headers: Record<string, string | string[] | undefined>): AuthUser {
    const user = this.extractAuthUser(headers);
    if (!user) {
      throw new Error('Authentication required but not provided');
    }
    return user;
  }

  public static createServiceMiddleware() {
    return (req: any, res: any, next: any) => {
      try {
        const auth = this.extractAuthUser(req.headers);
        if (auth) {
          req.auth = auth;
        }
        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'AUTH_CONTEXT_ERROR',
            message: 'Failed to process authentication context'
          }
        });
      }
    };
  }

  public static createRequireAuthMiddleware() {
    return (req: any, res: any, next: any) => {
      try {
        const auth = this.requireAuthUser(req.headers);
        req.auth = auth;
        next();
      } catch (error) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'This endpoint requires authentication'
          }
        });
      }
    };
  }
}