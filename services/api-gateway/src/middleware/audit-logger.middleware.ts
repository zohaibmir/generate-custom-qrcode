import { Request, Response, NextFunction } from 'express';
import { auditLogging } from '../config/security.config';
import { Logger } from '../services/logger.service';

interface AuditRequest extends Request {
  startTime?: number;
  auditId?: string;
  clientIP?: string;
  userId?: string;
  userRole?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  clientIP: string;
  userAgent: string;
  userId?: string;
  userRole?: string;
  requestHeaders?: any;
  requestBody?: any;
  responseStatus?: number;
  responseHeaders?: any;
  responseBody?: any;
  duration?: number;
  error?: string;
  metadata?: any;
}

export class AuditLoggerMiddleware {
  private logger: Logger;
  private auditLogs: AuditLogEntry[] = []; // In-memory storage for demo, should use database

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Setup cleanup interval for retention policy
    if (auditLogging.retention.enabled) {
      this.setupRetentionCleanup();
    }
  }

  /**
   * Main audit logging middleware
   */
  public middleware = (req: AuditRequest, res: Response, next: NextFunction): void => {
    try {
      // Skip if audit logging is disabled
      if (!auditLogging.enabled) {
        return next();
      }

      // Skip for excluded routes
      if (this.isExcludedRoute(req.path)) {
        return next();
      }

      // Generate audit ID and capture start time
      req.auditId = this.generateAuditId();
      req.startTime = Date.now();

      // Extract client information
      req.clientIP = req.clientIP || this.extractClientIP(req);
      this.extractUserInfo(req);

      // Create initial audit log entry
      const auditEntry: AuditLogEntry = {
        id: req.auditId,
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        path: req.path,
        clientIP: req.clientIP,
        userAgent: req.get('User-Agent') || 'Unknown',
        userId: req.userId,
        userRole: req.userRole,
        requestHeaders: auditLogging.logHeaders ? this.sanitizeHeaders(req.headers) : undefined,
        requestBody: auditLogging.logBody ? this.sanitizeBody(req.body) : undefined
      };

      // Log request
      if (auditLogging.logRequests) {
        this.logAuditEvent('request', auditEntry);
      }

      // Capture response data
      if (auditLogging.logResponses) {
        this.captureResponse(req, res, auditEntry);
      }

      next();

    } catch (error) {
      this.logger.error('Audit logging middleware error:', error);
      // Don't block the request on audit logging errors
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
  private extractUserInfo(req: AuditRequest): void {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        
        // Don't verify the token, just decode it for audit purposes
        const decoded = jwt.decode(token) as any;
        if (decoded) {
          req.userId = decoded.id || decoded.sub || decoded.userId;
          req.userRole = decoded.role || decoded.subscriptionTier;
        }
      }
    } catch (error) {
      // Silently fail, not critical for audit logging
    }
  }

  /**
   * Capture response data
   */
  private captureResponse(req: AuditRequest, res: Response, auditEntry: AuditLogEntry): void {
    const originalSend = res.send;
    const originalJson = res.json;
    const self = this;

    // Override res.send
    res.send = function(this: Response, body: any) {
      auditEntry.responseStatus = this.statusCode;
      auditEntry.responseHeaders = auditLogging.logHeaders ? res.getHeaders() : undefined;
      
      if (auditLogging.logBody) {
        auditEntry.responseBody = self.sanitizeResponseBody(body);
      }
      
      auditEntry.duration = req.startTime ? Date.now() - req.startTime : undefined;
      
      // Log response
      self.finalizeAuditLog(auditEntry);
      
      return originalSend.call(this, body);
    };

    // Override res.json
    res.json = function(this: Response, obj: any) {
      auditEntry.responseStatus = this.statusCode;
      auditEntry.responseHeaders = auditLogging.logHeaders ? res.getHeaders() : undefined;
      
      if (auditLogging.logBody) {
        auditEntry.responseBody = self.sanitizeResponseBody(obj);
      }
      
      auditEntry.duration = req.startTime ? Date.now() - req.startTime : undefined;
      
      // Log response
      self.finalizeAuditLog(auditEntry);
      
      return originalJson.call(this, obj);
    };
  }

  /**
   * Finalize and store audit log
   */
  private finalizeAuditLog(auditEntry: AuditLogEntry): void {
    try {
      // Add to in-memory storage
      this.auditLogs.push(auditEntry);

      // Log the audit event
      this.logAuditEvent('response', auditEntry);

      // Keep only recent logs in memory to prevent memory leaks
      if (this.auditLogs.length > 10000) {
        this.auditLogs = this.auditLogs.slice(-5000);
      }

      // TODO: Store in database for persistence
      // await this.storeAuditLog(auditEntry);

    } catch (error) {
      this.logger.error('Failed to finalize audit log:', error);
    }
  }

  /**
   * Log audit event
   */
  private logAuditEvent(eventType: 'request' | 'response', auditEntry: AuditLogEntry): void {
    const logData = {
      auditId: auditEntry.id,
      eventType,
      method: auditEntry.method,
      path: auditEntry.path,
      clientIP: auditEntry.clientIP,
      userId: auditEntry.userId,
      userRole: auditEntry.userRole,
      status: auditEntry.responseStatus,
      duration: auditEntry.duration,
      timestamp: auditEntry.timestamp
    };

    if (auditEntry.responseStatus && auditEntry.responseStatus >= 400) {
      this.logger.warn(`Audit: ${eventType}`, logData);
    } else {
      this.logger.info(`Audit: ${eventType}`, logData);
    }
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    auditLogging.sensitiveFields.forEach(field => {
      const lowerField = field.toLowerCase();
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes(lowerField)) {
          sanitized[key] = '[REDACTED]';
        }
      });
    });
    
    return sanitized;
  }

  /**
   * Sanitize request body
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    auditLogging.sensitiveFields.forEach(field => {
      this.recursiveSanitize(sanitized, field.toLowerCase());
    });
    
    // Truncate large bodies
    const bodyString = JSON.stringify(sanitized);
    if (bodyString.length > auditLogging.maxBodySize) {
      return {
        _truncated: true,
        _originalSize: bodyString.length,
        _data: bodyString.substring(0, auditLogging.maxBodySize) + '...[TRUNCATED]'
      };
    }
    
    return sanitized;
  }

  /**
   * Sanitize response body
   */
  private sanitizeResponseBody(body: any): any {
    return this.sanitizeBody(body);
  }

  /**
   * Recursively sanitize object properties
   */
  private recursiveSanitize(obj: any, sensitiveField: string): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    Object.keys(obj).forEach(key => {
      if (key.toLowerCase().includes(sensitiveField)) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.recursiveSanitize(obj[key], sensitiveField);
      }
    });
  }

  /**
   * Check if route should be excluded from audit logging
   */
  private isExcludedRoute(path: string): boolean {
    return auditLogging.excludeRoutes.some(route => {
      if (route.includes('*')) {
        const pattern = route.replace(/\*/g, '.*');
        return new RegExp(pattern).test(path);
      } else {
        return path === route || path.startsWith(route);
      }
    });
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup retention policy cleanup
   */
  private setupRetentionCleanup(): void {
    const cleanupInterval = 24 * 60 * 60 * 1000; // Run daily
    
    setInterval(() => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - auditLogging.retention.days);
        
        const originalLength = this.auditLogs.length;
        this.auditLogs = this.auditLogs.filter(log => 
          new Date(log.timestamp) > cutoffDate
        );
        
        const removedCount = originalLength - this.auditLogs.length;
        if (removedCount > 0) {
          this.logger.info('Audit log cleanup completed', {
            removedCount,
            remainingCount: this.auditLogs.length,
            cutoffDate: cutoffDate.toISOString()
          });
        }
      } catch (error) {
        this.logger.error('Audit log cleanup failed:', error);
      }
    }, cleanupInterval);
  }

  /**
   * Get audit logs (for admin interface)
   */
  public getAuditLogs(limit: number = 100, offset: number = 0): AuditLogEntry[] {
    return this.auditLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  public getAuditStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recent24h = this.auditLogs.filter(log => new Date(log.timestamp) > last24h);
    const recent7d = this.auditLogs.filter(log => new Date(log.timestamp) > last7d);

    return {
      totalLogs: this.auditLogs.length,
      last24h: {
        total: recent24h.length,
        errors: recent24h.filter(log => log.responseStatus && log.responseStatus >= 400).length,
        uniqueIPs: new Set(recent24h.map(log => log.clientIP)).size,
        uniqueUsers: new Set(recent24h.filter(log => log.userId).map(log => log.userId)).size
      },
      last7d: {
        total: recent7d.length,
        errors: recent7d.filter(log => log.responseStatus && log.responseStatus >= 400).length,
        uniqueIPs: new Set(recent7d.map(log => log.clientIP)).size,
        uniqueUsers: new Set(recent7d.filter(log => log.userId).map(log => log.userId)).size
      },
      config: {
        enabled: auditLogging.enabled,
        retention: auditLogging.retention,
        logRequests: auditLogging.logRequests,
        logResponses: auditLogging.logResponses
      }
    };
  }
}