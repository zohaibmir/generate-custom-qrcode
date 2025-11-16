/**
 * JWT Token Service Implementation
 * Following Single Responsibility Principle from SOLID
 * Handles all JWT token operations
 */

import jwt from 'jsonwebtoken';
import { IJwtTokenService, AuthenticationError, AuthErrorCode } from '../interfaces/auth.interfaces';
import { AuthUser } from '../entities/auth-user.entity';

export class JwtTokenService implements IJwtTokenService {
  private readonly jwtSecret: string;
  private readonly jwtIssuer: string;

  constructor(
    jwtSecret?: string,
    jwtIssuer: string = 'qr-saas-api-gateway'
  ) {
    if (!jwtSecret) {
      throw new Error('JWT secret is required for token service');
    }
    this.jwtSecret = jwtSecret;
    this.jwtIssuer = jwtIssuer;
  }

  public async verifyToken(token: string): Promise<AuthUser> {
    try {
      if (!token || typeof token !== 'string') {
        throw this.createAuthError(AuthErrorCode.TOKEN_MISSING, 'Token is required');
      }

      // Remove Bearer prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

      if (!cleanToken) {
        throw this.createAuthError(AuthErrorCode.TOKEN_MISSING, 'Token is empty');
      }

      // Verify and decode the JWT
      const decoded = jwt.verify(cleanToken, this.jwtSecret, {
        issuer: this.jwtIssuer
      }) as any;

      if (!decoded) {
        throw this.createAuthError(AuthErrorCode.TOKEN_INVALID, 'Token verification failed');
      }

      // Create AuthUser from JWT payload
      try {
        return AuthUser.fromJwtPayload(decoded);
      } catch (userError) {
        throw this.createAuthError(
          AuthErrorCode.TOKEN_MALFORMED,
          `Invalid token payload: ${userError instanceof Error ? userError.message : 'Unknown error'}`
        );
      }

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return this.handleJwtError(error);
      }
      
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw our custom auth errors
      }

      throw this.createAuthError(
        AuthErrorCode.AUTHENTICATION_SERVICE_ERROR,
        'Token verification service error'
      );
    }
  }

  public isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeTokenUnsafe(token);
      
      if (!decoded || !decoded.exp) {
        return true; // Treat missing expiration as expired
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true; // Treat invalid tokens as expired
    }
  }

  public decodeTokenUnsafe(token: string): any {
    try {
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      return jwt.decode(cleanToken);
    } catch {
      return null;
    }
  }

  private handleJwtError(error: jwt.JsonWebTokenError): never {
    if (error instanceof jwt.TokenExpiredError) {
      throw this.createAuthError(
        AuthErrorCode.TOKEN_EXPIRED,
        'Token has expired'
      );
    }

    if (error.name === 'JsonWebTokenError') {
      throw this.createAuthError(
        AuthErrorCode.TOKEN_INVALID,
        'Invalid token format'
      );
    }

    if (error.name === 'NotBeforeError') {
      throw this.createAuthError(
        AuthErrorCode.TOKEN_INVALID,
        'Token not yet valid'
      );
    }

    throw this.createAuthError(
      AuthErrorCode.TOKEN_MALFORMED,
      'Token is malformed'
    );
  }

  private createAuthError(code: AuthErrorCode, message: string): AuthenticationError {
    const statusCodes: Record<AuthErrorCode, number> = {
      [AuthErrorCode.TOKEN_MISSING]: 401,
      [AuthErrorCode.TOKEN_INVALID]: 401,
      [AuthErrorCode.TOKEN_EXPIRED]: 401,
      [AuthErrorCode.TOKEN_MALFORMED]: 400,
      [AuthErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
      [AuthErrorCode.SUBSCRIPTION_REQUIRED]: 402,
      [AuthErrorCode.EMAIL_VERIFICATION_REQUIRED]: 403,
      [AuthErrorCode.ORGANIZATION_ACCESS_DENIED]: 403,
      [AuthErrorCode.AUTHENTICATION_SERVICE_ERROR]: 500
    };

    const error = new Error(message) as any;
    error.code = code;
    error.statusCode = statusCodes[code];
    
    return error as AuthenticationError;
  }

  // Method to validate JWT configuration
  public validateConfiguration(): boolean {
    try {
      if (!this.jwtSecret || this.jwtSecret.length < 32) {
        console.warn('JWT secret should be at least 32 characters long');
        return false;
      }

      if (!this.jwtIssuer) {
        console.warn('JWT issuer is not configured');
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Method for testing token generation (for testing purposes only)
  public generateTestToken(payload: any, expiresIn: string = '15m'): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test token generation not allowed in production');
    }

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: expiresIn,
      issuer: this.jwtIssuer,
      subject: payload.userId
    } as jwt.SignOptions);
  }
}