import { Request, Response, NextFunction } from 'express';
import { ipWhitelisting } from '../config/security.config';
import { Logger } from '../services/logger.service';

interface IPWhitelistRequest extends Request {
  clientIP?: string;
  ipAllowed?: boolean;
  ipCheckReason?: string;
}

export class IPWhitelistMiddleware {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Main IP whitelisting middleware
   */
  public middleware = (req: IPWhitelistRequest, res: Response, next: NextFunction): void => {
    try {
      // Skip if IP whitelisting is disabled
      if (!ipWhitelisting.enabled) {
        return next();
      }

      // Skip for bypass routes
      if (this.isBypassRoute(req.path)) {
        return next();
      }

      const clientIP = this.extractClientIP(req);
      req.clientIP = clientIP;

      const checkResult = this.checkIPAllowed(clientIP);
      req.ipAllowed = checkResult.allowed;
      req.ipCheckReason = checkResult.reason;

      if (!checkResult.allowed) {
        this.logSecurityEvent('ip_blocked', {
          ip: clientIP,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          reason: checkResult.reason,
          headers: this.sanitizeHeaders(req.headers)
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'IP_ACCESS_DENIED',
            message: 'Access denied from this IP address',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      // Log allowed access for monitoring
      this.logSecurityEvent('ip_allowed', {
        ip: clientIP,
        path: req.path,
        method: req.method,
        reason: checkResult.reason
      });

      next();

    } catch (error) {
      this.logger.error('IP whitelist middleware error:', error);
      
      // Fail securely - block access on error
      res.status(500).json({
        success: false,
        error: {
          code: 'SECURITY_CHECK_FAILED',
          message: 'Security validation failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Extract the real client IP address
   */
  private extractClientIP(req: Request): string {
    // Check for forwarded headers (load balancers, proxies)
    const xForwardedFor = req.get('X-Forwarded-For');
    const xRealIP = req.get('X-Real-IP');
    const xClientIP = req.get('X-Client-IP');
    
    let clientIP = req.socket.remoteAddress || req.ip || '';
    
    // If behind a proxy, try to get the real IP
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      clientIP = xForwardedFor.split(',')[0].trim();
    } else if (xRealIP) {
      clientIP = xRealIP.trim();
    } else if (xClientIP) {
      clientIP = xClientIP.trim();
    }
    
    // Clean up IPv6 mapped IPv4 addresses
    return clientIP.replace(/^::ffff:/, '');
  }

  /**
   * Check if IP address is allowed
   */
  private checkIPAllowed(ip: string): { allowed: boolean; reason: string } {
    // Allow localhost if configured
    if (ipWhitelisting.allowLocalhost && this.isLocalhost(ip)) {
      return { allowed: true, reason: 'Localhost access allowed' };
    }

    // Allow private networks if configured
    if (ipWhitelisting.allowPrivateNetworks && this.isPrivateIP(ip)) {
      return { allowed: true, reason: 'Private network access allowed' };
    }

    // Check against explicitly allowed IPs
    if (ipWhitelisting.allowedIPs.length > 0) {
      if (this.isIPInList(ip, ipWhitelisting.allowedIPs)) {
        return { allowed: true, reason: 'IP in whitelist' };
      }
    }

    // If no allowed IPs configured and private networks/localhost allowed, default to allow
    if (ipWhitelisting.allowedIPs.length === 0 && 
        (ipWhitelisting.allowPrivateNetworks || ipWhitelisting.allowLocalhost)) {
      return { allowed: true, reason: 'No whitelist configured, default allow' };
    }

    return { allowed: false, reason: 'IP not in whitelist' };
  }

  /**
   * Check if IP address is localhost
   */
  private isLocalhost(ip: string): boolean {
    const localhostIPs = ['127.0.0.1', '::1', 'localhost', '0.0.0.0'];
    return localhostIPs.includes(ip) || ip.startsWith('127.');
  }

  /**
   * Check if IP address is in private network range
   */
  private isPrivateIP(ip: string): boolean {
    // Private IPv4 ranges:
    // 10.0.0.0 - 10.255.255.255 (10.0.0.0/8)
    // 172.16.0.0 - 172.31.255.255 (172.16.0.0/12)
    // 192.168.0.0 - 192.168.255.255 (192.168.0.0/16)
    
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Check if IP is in the allowed list (supports CIDR notation)
   */
  private isIPInList(ip: string, allowedList: string[]): boolean {
    return allowedList.some(allowedIP => {
      if (allowedIP.includes('/')) {
        // CIDR notation support
        return this.isIPInCIDR(ip, allowedIP);
      } else {
        // Exact IP match
        return ip === allowedIP;
      }
    });
  }

  /**
   * Check if IP is in CIDR range (basic implementation)
   */
  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [network, prefixLength] = cidr.split('/');
      const prefix = parseInt(prefixLength, 10);
      
      if (prefix >= 24) {
        // /24 and smaller subnets - match first 3 octets
        const networkPrefix = network.split('.').slice(0, 3).join('.');
        const ipPrefix = ip.split('.').slice(0, 3).join('.');
        return networkPrefix === ipPrefix;
      } else if (prefix >= 16) {
        // /16 subnets - match first 2 octets
        const networkPrefix = network.split('.').slice(0, 2).join('.');
        const ipPrefix = ip.split('.').slice(0, 2).join('.');
        return networkPrefix === ipPrefix;
      } else if (prefix >= 8) {
        // /8 subnets - match first octet
        const networkPrefix = network.split('.')[0];
        const ipPrefix = ip.split('.')[0];
        return networkPrefix === ipPrefix;
      }
      
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('CIDR parsing error:', { cidr, error: errorMessage });
      return false;
    }
  }

  /**
   * Check if route should bypass IP whitelisting
   */
  private isBypassRoute(path: string): boolean {
    return ipWhitelisting.bypassRoutes.some(route => {
      if (route.includes('*')) {
        // Wildcard matching
        const pattern = route.replace(/\*/g, '.*');
        return new RegExp(pattern).test(path);
      } else {
        // Exact match
        return path === route || path.startsWith(route);
      }
    });
  }

  /**
   * Log security events
   */
  private logSecurityEvent(eventType: string, data: any): void {
    this.logger.info(`Security Event: ${eventType}`, {
      eventType,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Get current IP whitelist configuration
   */
  public getConfig() {
    return {
      enabled: ipWhitelisting.enabled,
      allowedIPs: ipWhitelisting.allowedIPs.length,
      allowPrivateNetworks: ipWhitelisting.allowPrivateNetworks,
      allowLocalhost: ipWhitelisting.allowLocalhost,
      bypassRoutes: ipWhitelisting.bypassRoutes.length
    };
  }

  /**
   * Test if an IP would be allowed (for configuration testing)
   */
  public testIP(ip: string): { allowed: boolean; reason: string } {
    return this.checkIPAllowed(ip);
  }
}