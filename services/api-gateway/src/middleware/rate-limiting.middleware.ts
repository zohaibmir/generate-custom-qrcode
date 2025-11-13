import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/security.config';
import { Logger } from '../services/logger.service';

const { rateLimiting } = securityConfig;

interface RateLimitRequest extends Request {
  clientIP?: string;
  userId?: string;
  subscriptionTier?: string;
  userRole?: string;
}

interface RateLimitEntry {
  requests: number;
  windowStart: number;
  blocked: number;
  lastRequest: number;
}

interface RateLimitStats {
  total: RateLimitEntry;
  [key: string]: RateLimitEntry; // For different subscription tiers
}

interface RateLimitResult {
  blocked: boolean;
  stats: RateLimitEntry;
  limit: number;
  window: number;
}

export class RateLimitingMiddleware {
  private logger: Logger;
  private ipLimits: Map<string, RateLimitStats> = new Map();
  private userLimits: Map<string, RateLimitStats> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Setup cleanup interval to remove expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Clean every minute
  }

  /**
   * Main rate limiting middleware
   */
  public middleware = (req: RateLimitRequest, res: Response, next: NextFunction): void => {
    try {
      // Skip if rate limiting is disabled
      if (!rateLimiting.enabled) {
        return next();
      }

      // Skip for excluded routes
      if (this.isExcludedRoute(req.path)) {
        return next();
      }

      // Extract client information
      req.clientIP = req.clientIP || this.extractClientIP(req);
      this.extractUserInfo(req);

      // Check IP-based rate limits
      const ipLimitResult = this.checkIPRateLimit(req);
      if (ipLimitResult.blocked) {
        return this.handleRateLimitExceeded(res, 'IP', ipLimitResult);
      }

      // Check user-based rate limits (if user is authenticated)
      if (req.userId) {
        const userLimitResult = this.checkUserRateLimit(req);
        if (userLimitResult.blocked) {
          return this.handleRateLimitExceeded(res, 'User', userLimitResult);
        }
      }

      // Set rate limit headers
      this.setRateLimitHeaders(res, req);

      next();

    } catch (error) {
      this.logger.error('Rate limiting middleware error:', error);
      // Don't block the request on rate limiting errors
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
   * Extract user information from JWT token
   */
  private extractUserInfo(req: RateLimitRequest): void {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        
        // Don't verify the token, just decode it for rate limiting
        const decoded = jwt.decode(token) as any;
        if (decoded) {
          req.userId = decoded.id || decoded.sub || decoded.userId;
          req.subscriptionTier = decoded.subscriptionTier || 'free';
          req.userRole = decoded.role;
        }
      }
    } catch (error) {
      // Silently fail, not critical for rate limiting
    }
  }

  /**
   * Check IP-based rate limits
   */
  private checkIPRateLimit(req: RateLimitRequest): RateLimitResult | { blocked: false; stats: RateLimitEntry; limit: number; window: number } {
    const ip = req.clientIP!;
    const now = Date.now();
    
    if (!this.ipLimits.has(ip)) {
      this.ipLimits.set(ip, {
        total: { requests: 0, windowStart: now, blocked: 0, lastRequest: now }
      });
    }

    const ipStats = this.ipLimits.get(ip)!;
    const limit = rateLimiting.maxRequests; // Use global max requests
    const windowMs = rateLimiting.windowMs; // Use global window

    // Reset window if expired
    if (now - ipStats.total.windowStart > windowMs) {
      ipStats.total = { requests: 0, windowStart: now, blocked: 0, lastRequest: now };
    }

    // Check if limit exceeded
    if (ipStats.total.requests >= limit) {
      ipStats.total.blocked++;
      this.logRateLimitViolation('IP', ip, ipStats.total, limit, windowMs);
      return { 
        blocked: true, 
        stats: ipStats.total, 
        limit, 
        window: windowMs 
      } as RateLimitResult;
    }

    // Update counters
    ipStats.total.requests++;
    ipStats.total.lastRequest = now;

    return { 
      blocked: false, 
      stats: ipStats.total, 
      limit, 
      window: windowMs 
    };
  }

  /**
   * Check user-based rate limits
   */
  private checkUserRateLimit(req: RateLimitRequest): RateLimitResult | { blocked: false; stats: RateLimitEntry; limit: number; window: number } {
    const userId = req.userId!;
    const subscriptionTier = req.subscriptionTier || 'free';
    const now = Date.now();

    if (!this.userLimits.has(userId)) {
      this.userLimits.set(userId, {
        total: { requests: 0, windowStart: now, blocked: 0, lastRequest: now },
        [subscriptionTier]: { requests: 0, windowStart: now, blocked: 0, lastRequest: now }
      });
    }

    const userStats = this.userLimits.get(userId)!;
    
    // Ensure subscription tier stats exist
    if (!userStats[subscriptionTier]) {
      userStats[subscriptionTier] = { requests: 0, windowStart: now, blocked: 0, lastRequest: now };
    }

    // Get limits for subscription tier
    const tierLimit = rateLimiting.perUserLimits[subscriptionTier as keyof typeof rateLimiting.perUserLimits] || 
                     rateLimiting.perUserLimits.free;
    const limit = tierLimit;
    const windowMs = rateLimiting.windowMs; // Use global window

    // Reset window if expired
    if (now - userStats[subscriptionTier].windowStart > windowMs) {
      userStats[subscriptionTier] = { requests: 0, windowStart: now, blocked: 0, lastRequest: now };
    }

    // Check if limit exceeded
    if (userStats[subscriptionTier].requests >= limit) {
      userStats[subscriptionTier].blocked++;
      this.logRateLimitViolation('User', userId, userStats[subscriptionTier], limit, windowMs, subscriptionTier);
      return { 
        blocked: true, 
        stats: userStats[subscriptionTier], 
        limit, 
        window: windowMs 
      } as RateLimitResult;
    }

    // Update counters
    userStats[subscriptionTier].requests++;
    userStats[subscriptionTier].lastRequest = now;
    userStats.total.requests++;
    userStats.total.lastRequest = now;

    return { 
      blocked: false, 
      stats: userStats[subscriptionTier], 
      limit, 
      window: windowMs 
    };
  }

  /**
   * Handle rate limit exceeded
   */
  private handleRateLimitExceeded(
    res: Response, 
    limitType: string, 
    limitResult: RateLimitResult
  ): void {
    const retryAfter = Math.ceil((limitResult.window - (Date.now() - limitResult.stats.windowStart)) / 1000);
    
    res.set({
      'X-RateLimit-Limit': limitResult.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(limitResult.stats.windowStart + limitResult.window).toISOString(),
      'Retry-After': retryAfter.toString()
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: `${limitType} rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
      limit: limitResult.limit,
      window: Math.floor(limitResult.window / 1000)
    });
  }

  /**
   * Set rate limit headers
   */
  private setRateLimitHeaders(res: Response, req: RateLimitRequest): void {
    try {
      // Set IP rate limit headers
      const ip = req.clientIP!;
      if (this.ipLimits.has(ip)) {
        const ipStats = this.ipLimits.get(ip)!.total;
        const ipLimit = rateLimiting.maxRequests;
        const remaining = Math.max(0, ipLimit - ipStats.requests);
        const resetTime = new Date(ipStats.windowStart + rateLimiting.windowMs);

        res.set({
          'X-RateLimit-IP-Limit': ipLimit.toString(),
          'X-RateLimit-IP-Remaining': remaining.toString(),
          'X-RateLimit-IP-Reset': resetTime.toISOString()
        });
      }

      // Set user rate limit headers (if authenticated)
      if (req.userId && this.userLimits.has(req.userId)) {
        const subscriptionTier = req.subscriptionTier || 'free';
        const userStats = this.userLimits.get(req.userId)!;
        
        if (userStats[subscriptionTier]) {
          const tierLimit = rateLimiting.perUserLimits[subscriptionTier as keyof typeof rateLimiting.perUserLimits] || 
                           rateLimiting.perUserLimits.free;
          const remaining = Math.max(0, tierLimit - userStats[subscriptionTier].requests);
          const resetTime = new Date(userStats[subscriptionTier].windowStart + rateLimiting.windowMs);

          res.set({
            'X-RateLimit-User-Limit': tierLimit.toString(),
            'X-RateLimit-User-Remaining': remaining.toString(),
            'X-RateLimit-User-Reset': resetTime.toISOString(),
            'X-RateLimit-User-Tier': subscriptionTier
          });
        }
      }
    } catch (error) {
      // Don't fail the request if headers can't be set
      this.logger.warn('Failed to set rate limit headers:', error);
    }
  }

  /**
   * Log rate limit violation
   */
  private logRateLimitViolation(
    limitType: string,
    identifier: string,
    stats: RateLimitEntry,
    limit: number,
    window: number,
    subscriptionTier?: string
  ): void {
    this.logger.warn('Rate limit exceeded', {
      limitType,
      identifier,
      subscriptionTier,
      requests: stats.requests,
      limit,
      windowMs: window,
      blocked: stats.blocked,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if route should be excluded from rate limiting
   */
  private isExcludedRoute(path: string): boolean {
    const excludedRoutes = [
      '/health',
      '/metrics',
      '/favicon.ico'
    ];

    return excludedRoutes.some(route => {
      if (route.includes('*')) {
        const pattern = route.replace(/\*/g, '.*');
        return new RegExp(pattern).test(path);
      } else {
        return path === route || path.startsWith(route);
      }
    });
  }

  /**
   * Cleanup expired entries to prevent memory leaks
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const maxAge = rateLimiting.windowMs * 2; // Keep entries for 2x the window

    // Cleanup IP limits
    for (const [ip, stats] of this.ipLimits.entries()) {
      if (now - stats.total.lastRequest > maxAge) {
        this.ipLimits.delete(ip);
      }
    }

    // Cleanup user limits
    for (const [userId, stats] of this.userLimits.entries()) {
      if (now - stats.total.lastRequest > maxAge) {
        this.userLimits.delete(userId);
      }
    }

    // Log cleanup stats periodically
    if (Math.random() < 0.1) { // 10% chance to log
      this.logger.debug('Rate limit cleanup completed', {
        ipEntries: this.ipLimits.size,
        userEntries: this.userLimits.size,
        maxAge: Math.floor(maxAge / 1000) + 's'
      });
    }
  }

  /**
   * Get rate limiting statistics
   */
  public getRateLimitStats() {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const recentThreshold = now - hour;

    let totalIpBlocked = 0;
    let totalUserBlocked = 0;
    let activeIPs = 0;
    let activeUsers = 0;

    // Count IP stats
    for (const [ip, stats] of this.ipLimits.entries()) {
      totalIpBlocked += stats.total.blocked;
      if (stats.total.lastRequest > recentThreshold) {
        activeIPs++;
      }
    }

    // Count user stats
    for (const [userId, stats] of this.userLimits.entries()) {
      if (stats.total.lastRequest > recentThreshold) {
        activeUsers++;
      }
      // Sum blocked requests across all tiers
      Object.keys(stats).forEach(key => {
        if (key !== 'total') {
          totalUserBlocked += stats[key].blocked;
        }
      });
    }

    return {
      enabled: rateLimiting.enabled,
      ipLimits: {
        totalEntries: this.ipLimits.size,
        activeLastHour: activeIPs,
        totalBlocked: totalIpBlocked,
        maxRequests: rateLimiting.maxRequests,
        windowMs: rateLimiting.windowMs
      },
      userLimits: {
        totalEntries: this.userLimits.size,
        activeLastHour: activeUsers,
        totalBlocked: totalUserBlocked,
        subscriptionTiers: rateLimiting.perUserLimits
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset rate limits for specific IP or user (admin function)
   */
  public resetRateLimit(type: 'ip' | 'user', identifier: string): boolean {
    try {
      if (type === 'ip') {
        const result = this.ipLimits.delete(identifier);
        this.logger.info('IP rate limit reset', { ip: identifier, found: result });
        return result;
      } else if (type === 'user') {
        const result = this.userLimits.delete(identifier);
        this.logger.info('User rate limit reset', { userId: identifier, found: result });
        return result;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to reset rate limit:', error);
      return false;
    }
  }

  /**
   * Cleanup resources on shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.ipLimits.clear();
    this.userLimits.clear();
  }
}