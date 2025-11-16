/**
 * Enterprise Security Middleware Suite for API Gateway
 * 
 * This module provides comprehensive security middleware for the API Gateway.
 * Currently simplified for testing the new authentication system.
 */

// Simplified security configuration for now
export const securityConfig = {
  ipWhitelisting: {
    enabled: false,
    allowedIPs: [],
    bypassRoutes: []
  }
};

/**
 * Security Middleware Factory
 * Creates and configures all security middleware instances
 */
export class SecurityMiddlewareFactory {
  /**
   * Create a simplified security middleware stack for testing
   */
  public static createSecurityStack(logger: any) {
    return {
      // Simplified for now - can add complex middleware later
      basic: (req: any, res: any, next: any) => {
        // Basic security headers
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-Frame-Options', 'DENY');
        res.header('X-XSS-Protection', '1; mode=block');
        next();
      }
    };
  }

  /**
   * Get security middleware in recommended order
   */
  public static getSecurityOrder() {
    return ['basic'];
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