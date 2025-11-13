/**
 * Enterprise Security Middleware Suite for API Gateway
 * 
 * This module provides comprehensive security middleware for the API Gateway,
 * including IP whitelisting, audit logging, rate limiting, DDoS protection,
 * geolocation blocking, and bot detection.
 */

export { IPWhitelistMiddleware } from '../ip-whitelist.middleware';
export { AuditLoggerMiddleware } from '../audit-logger.middleware';
export { RateLimitingMiddleware } from '../rate-limiting.middleware';
export { SecurityMiddleware } from '../security.middleware';

// Security configuration
export { securityConfig } from '../../config/security.config';

/**
 * Security Middleware Factory
 * Creates and configures all security middleware instances
 */
export class SecurityMiddlewareFactory {
  /**
   * Create a complete security middleware stack
   */
  public static createSecurityStack(logger: any) {
    return {
      ipWhitelist: new IPWhitelistMiddleware(logger),
      auditLogger: new AuditLoggerMiddleware(logger),
      rateLimiting: new RateLimitingMiddleware(logger),
      security: new SecurityMiddleware(logger)
    };
  }

  /**
   * Get security middleware in recommended order
   */
  public static getSecurityOrder() {
    return [
      'ipWhitelist',    // 1. Check IP whitelist first (fastest bypass)
      'security',       // 2. DDoS, geo-blocking, bot detection
      'rateLimiting',   // 3. Rate limiting
      'auditLogger'     // 4. Audit logging (last to capture all data)
    ];
  }

  /**
   * Get security statistics from all middleware
   */
  public static getSecurityStats(middlewareStack: any) {
    return {
      ipWhitelist: {
        enabled: securityConfig.ipWhitelisting.enabled,
        allowedIPs: securityConfig.ipWhitelisting.allowedIPs.length,
        bypassRoutes: securityConfig.ipWhitelisting.bypassRoutes.length
      },
      auditLogger: middlewareStack.auditLogger?.getAuditStats() || null,
      rateLimiting: middlewareStack.rateLimiting?.getRateLimitStats() || null,
      security: middlewareStack.security?.getSecurityStats() || null,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Security Events Interface
 * For monitoring and alerting on security events
 */
export interface SecurityEvent {
  type: 'ip_blocked' | 'rate_limit' | 'ddos_detected' | 'geo_blocked' | 'bot_detected' | 'audit_log';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  ip: string;
  timestamp: string;
  details: any;
}

/**
 * Security Event Emitter
 * Central hub for security events across all middleware
 */
export class SecurityEventEmitter {
  private static events: SecurityEvent[] = [];
  private static maxEvents = 1000;

  public static emit(event: SecurityEvent): void {
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents / 2);
    }

    // Log high severity events immediately
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn('SECURITY EVENT:', event);
    }
  }

  public static getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public static getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  public static getEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  public static clearEvents(): void {
    this.events = [];
  }
}