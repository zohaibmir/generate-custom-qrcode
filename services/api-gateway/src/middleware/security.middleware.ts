import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/security.config';
import { Logger } from '../services/logger.service';

const { ddosProtection, geoBlocking, botDetection } = securityConfig;

interface SecurityRequest extends Request {
  clientIP?: string;
  country?: string;
  userAgent?: string;
  isBot?: boolean;
  isSuspicious?: boolean;
}

interface ThreatEntry {
  requests: number;
  windowStart: number;
  blocked: number;
  lastRequest: number;
  threats: string[];
}

interface BotSignature {
  pattern: RegExp;
  name: string;
  action: 'block' | 'allow' | 'monitor';
}

export class SecurityMiddleware {
  private logger: Logger;
  private ddosTracker: Map<string, ThreatEntry> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  // Common bot signatures
  private botSignatures: BotSignature[] = [
    { pattern: /bot|crawler|spider|scraper/i, name: 'Generic Bot', action: 'monitor' },
    { pattern: /googlebot|bingbot|slurp|duckduckbot|baiduspider/i, name: 'Search Engine', action: 'allow' },
    { pattern: /facebookexternalhit|twitterbot|linkedinbot/i, name: 'Social Media', action: 'allow' },
    { pattern: /python|curl|wget|httpie|postman|insomnia/i, name: 'HTTP Client', action: 'monitor' },
    { pattern: /nikto|sqlmap|nmap|masscan|zap|burp/i, name: 'Security Scanner', action: 'block' },
    { pattern: /apache-httpclient|okhttp|java/i, name: 'Automated Tool', action: 'monitor' }
  ];

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Setup cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Clean every minute
  }

  /**
   * Main security middleware
   */
  public middleware = (req: SecurityRequest, res: Response, next: NextFunction): void => {
    try {
      // Extract client information
      req.clientIP = req.clientIP || this.extractClientIP(req);
      req.userAgent = req.get('User-Agent') || '';
      
      // Check if IP is in whitelist (bypass all security checks)
      if (this.isWhitelisted(req.clientIP)) {
        return next();
      }

      // Check if IP is already blocked
      if (this.blockedIPs.has(req.clientIP)) {
        return this.handleThreatBlocked(res, 'IP Blocked', 'Your IP has been blocked due to security violations');
      }

      // DDoS Protection
      if (ddosProtection.enabled) {
        const ddosCheck = this.checkDDoSProtection(req);
        if (ddosCheck.blocked) {
          this.blockIP(req.clientIP, 'DDoS Protection', ddosProtection.blockDurationMinutes);
          return this.handleThreatBlocked(res, 'DDoS Protection', ddosCheck.reason || 'DDoS pattern detected');
        }
      }

      // Geolocation Blocking
      if (geoBlocking.enabled) {
        const geoCheck = this.checkGeoBlocking(req);
        if (geoCheck.blocked) {
          return this.handleThreatBlocked(res, 'Geo Blocking', geoCheck.reason || 'Geographic restriction');
        }
      }

      // Bot Detection
      if (botDetection.enabled) {
        const botCheck = this.checkBotDetection(req);
        req.isBot = botCheck.isBot;
        req.isSuspicious = botCheck.suspicious;
        
        if (botCheck.blocked) {
          return this.handleThreatBlocked(res, 'Bot Protection', botCheck.reason || 'Bot activity detected');
        }
      }

      // Add security headers
      this.addSecurityHeaders(res, req);

      next();

    } catch (error) {
      this.logger.error('Security middleware error:', error);
      // Don't block the request on security middleware errors
      next();
    }
  };

  /**
   * Extract client IP address
   */
  private extractClientIP(req: Request): string {
    const xForwardedFor = req.get('X-Forwarded-For');
    const xRealIP = req.get('X-Real-IP');
    const xClientIP = req.get('X-Client-IP');
    
    let clientIP = req.socket.remoteAddress || req.ip || '';
    
    if (xForwardedFor) {
      clientIP = xForwardedFor.split(',')[0].trim();
    } else if (xRealIP) {
      clientIP = xRealIP.trim();
    } else if (xClientIP) {
      clientIP = xClientIP.trim();
    }
    
    return clientIP.replace(/^::ffff:/, '');
  }

  /**
   * Check if IP is whitelisted
   */
  private isWhitelisted(ip: string): boolean {
    return ddosProtection.whitelist.includes(ip);
  }

  /**
   * DDoS Protection Check
   */
  private checkDDoSProtection(req: SecurityRequest): { blocked: boolean; reason?: string } {
    const ip = req.clientIP!;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    
    if (!this.ddosTracker.has(ip)) {
      this.ddosTracker.set(ip, {
        requests: 0,
        windowStart: now,
        blocked: 0,
        lastRequest: now,
        threats: []
      });
    }

    const tracker = this.ddosTracker.get(ip)!;
    
    // Reset window if expired
    if (now - tracker.windowStart > windowMs) {
      tracker.requests = 0;
      tracker.windowStart = now;
    }

    // Increment request count
    tracker.requests++;
    tracker.lastRequest = now;

    // Check threshold
    if (tracker.requests > ddosProtection.thresholdPerMinute) {
      tracker.blocked++;
      tracker.threats.push('DDoS Pattern Detected');
      
      this.logger.warn('DDoS protection triggered', {
        ip,
        requests: tracker.requests,
        threshold: ddosProtection.thresholdPerMinute,
        userAgent: req.userAgent
      });

      return {
        blocked: true,
        reason: `Too many requests. Limit: ${ddosProtection.thresholdPerMinute} per minute`
      };
    }

    return { blocked: false };
  }

  /**
   * Geolocation Blocking Check
   */
  private checkGeoBlocking(req: SecurityRequest): { blocked: boolean; reason?: string } {
    // In a real implementation, you would use a GeoIP service like MaxMind
    // For now, we'll simulate based on headers or use a simple mock
    const country = this.extractCountryCode(req);
    req.country = country || undefined;

    if (!country) {
      // If we can't determine country, use fallback action
      if (geoBlocking.fallbackAction === 'block') {
        return {
          blocked: true,
          reason: 'Unable to determine location - access denied'
        };
      }
      return { blocked: false };
    }

    // Check blocked countries
    if (geoBlocking.blockedCountries.length > 0 && geoBlocking.blockedCountries.includes(country)) {
      this.logger.warn('Geo blocking triggered', {
        ip: req.clientIP,
        country,
        userAgent: req.userAgent
      });

      return {
        blocked: true,
        reason: `Access from ${country} is not permitted`
      };
    }

    // Check allowed countries (if specified, only these are allowed)
    if (geoBlocking.allowedCountries.length > 0 && !geoBlocking.allowedCountries.includes(country)) {
      this.logger.warn('Geo blocking triggered - country not in allowed list', {
        ip: req.clientIP,
        country,
        allowedCountries: geoBlocking.allowedCountries
      });

      return {
        blocked: true,
        reason: `Access from ${country} is not permitted`
      };
    }

    return { blocked: false };
  }

  /**
   * Extract country code from request
   * This is a mock implementation - in production use a real GeoIP service
   */
  private extractCountryCode(req: SecurityRequest): string | null {
    // Check for CloudFlare country header
    const cfCountry = req.get('CF-IPCountry');
    if (cfCountry) return cfCountry.toUpperCase();

    // Check for other geolocation headers
    const geoCountry = req.get('X-Country-Code') || req.get('X-GeoIP-Country');
    if (geoCountry) return geoCountry.toUpperCase();

    // Mock: Simulate country detection based on IP patterns
    const ip = req.clientIP || '';
    
    // This is just for demonstration - don't use in production
    if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'US'; // Local development
    }
    
    return null; // Unknown
  }

  /**
   * Bot Detection Check
   */
  private checkBotDetection(req: SecurityRequest): { blocked: boolean; isBot: boolean; suspicious: boolean; reason?: string } {
    const userAgent = req.userAgent!;
    let isBot = false;
    let suspicious = false;
    let action: 'block' | 'allow' | 'monitor' = 'allow';
    let detectedBot = '';

    // Check against bot signatures
    for (const signature of this.botSignatures) {
      if (signature.pattern.test(userAgent)) {
        isBot = true;
        detectedBot = signature.name;
        action = signature.action;
        break;
      }
    }

    // Additional suspicious behavior checks
    if (!isBot) {
      // Check for suspicious patterns
      if (userAgent.length < 10 || userAgent.length > 512) {
        suspicious = true;
      }

      // Check for missing or minimal user agent
      if (!userAgent || userAgent === '-' || userAgent.toLowerCase().includes('null')) {
        suspicious = true;
        action = 'monitor';
      }

      // Check for high-frequency patterns
      const patternKey = this.generatePatternKey(req);
      const patternCount = this.suspiciousPatterns.get(patternKey) || 0;
      this.suspiciousPatterns.set(patternKey, patternCount + 1);

      if (patternCount > 10) {
        suspicious = true;
        action = 'block';
      }
    }

    // Log bot detection
    if (isBot || suspicious) {
      this.logger.info('Bot/Suspicious activity detected', {
        ip: req.clientIP,
        userAgent,
        detectedBot,
        isBot,
        suspicious,
        action,
        path: req.path
      });
    }

    // Handle actions
    if (action === 'block') {
      return {
        blocked: true,
        isBot,
        suspicious,
        reason: isBot ? `Bot detected: ${detectedBot}` : 'Suspicious behavior detected'
      };
    }

    return { blocked: false, isBot, suspicious };
  }

  /**
   * Generate pattern key for suspicious behavior tracking
   */
  private generatePatternKey(req: SecurityRequest): string {
    return `${req.clientIP}_${req.userAgent?.substring(0, 50)}_${req.method}`;
  }

  /**
   * Block IP address for specified duration
   */
  private blockIP(ip: string, reason: string, durationMinutes: number): void {
    this.blockedIPs.add(ip);
    
    this.logger.warn('IP blocked by security middleware', {
      ip,
      reason,
      durationMinutes,
      timestamp: new Date().toISOString()
    });

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      this.logger.info('IP automatically unblocked', { ip, reason });
    }, durationMinutes * 60 * 1000);
  }

  /**
   * Handle threat blocked response
   */
  private handleThreatBlocked(res: Response, type: string, reason: string): void {
    res.status(403).json({
      error: 'Access Denied',
      type,
      message: reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(res: Response, req: SecurityRequest): void {
    // Add security information headers (non-sensitive)
    res.set({
      'X-Security-Scan': 'Passed',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    // Add rate limit context if bot detected
    if (req.isBot) {
      res.set('X-Bot-Detected', 'true');
    }

    if (req.isSuspicious) {
      res.set('X-Security-Level', 'elevated');
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Cleanup DDoS tracker
    for (const [ip, entry] of this.ddosTracker.entries()) {
      if (now - entry.lastRequest > maxAge) {
        this.ddosTracker.delete(ip);
      }
    }

    // Cleanup suspicious patterns
    if (this.suspiciousPatterns.size > 1000) {
      this.suspiciousPatterns.clear();
    }

    // Log cleanup stats
    this.logger.debug('Security middleware cleanup completed', {
      ddosEntries: this.ddosTracker.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousPatterns: this.suspiciousPatterns.size
    });
  }

  /**
   * Get security statistics
   */
  public getSecurityStats() {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const recentThreshold = now - hour;

    let recentThreats = 0;
    let totalBlocked = 0;
    let activeTracking = 0;

    // Count DDoS stats
    for (const [ip, entry] of this.ddosTracker.entries()) {
      totalBlocked += entry.blocked;
      if (entry.lastRequest > recentThreshold) {
        activeTracking++;
        if (entry.blocked > 0) {
          recentThreats++;
        }
      }
    }

    return {
      ddosProtection: {
        enabled: ddosProtection.enabled,
        totalEntries: this.ddosTracker.size,
        activeLastHour: activeTracking,
        threatsLastHour: recentThreats,
        totalBlocked,
        threshold: ddosProtection.thresholdPerMinute,
        blockDuration: ddosProtection.blockDurationMinutes
      },
      geoBlocking: {
        enabled: geoBlocking.enabled,
        allowedCountries: geoBlocking.allowedCountries.length,
        blockedCountries: geoBlocking.blockedCountries.length,
        fallbackAction: geoBlocking.fallbackAction
      },
      botDetection: {
        enabled: botDetection.enabled,
        signatures: this.botSignatures.length,
        suspiciousPatterns: this.suspiciousPatterns.size
      },
      blockedIPs: this.blockedIPs.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Manually block an IP (admin function)
   */
  public manualBlockIP(ip: string, reason: string = 'Manual block', durationMinutes: number = 60): void {
    this.blockIP(ip, reason, durationMinutes);
  }

  /**
   * Manually unblock an IP (admin function)
   */
  public manualUnblockIP(ip: string): boolean {
    const wasBlocked = this.blockedIPs.has(ip);
    this.blockedIPs.delete(ip);
    if (wasBlocked) {
      this.logger.info('IP manually unblocked', { ip });
    }
    return wasBlocked;
  }

  /**
   * Get blocked IPs list
   */
  public getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * Cleanup resources on shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.ddosTracker.clear();
    this.blockedIPs.clear();
    this.suspiciousPatterns.clear();
  }
}