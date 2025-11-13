# Enterprise Security Implementation - API Gateway

## Overview

This document outlines the comprehensive enterprise security implementation for the QR SaaS API Gateway. The security middleware provides multiple layers of protection including IP whitelisting, audit logging, rate limiting, DDoS protection, geolocation blocking, and bot detection.

## Architecture

### Security Middleware Stack
1. **IP Whitelisting** - First line of defense (fastest bypass for allowed IPs)
2. **Advanced Security** - DDoS protection, geo-blocking, bot detection
3. **Rate Limiting** - Per-IP and per-user rate limiting with subscription tiers
4. **Audit Logging** - Comprehensive request/response logging

### Configuration-Based Approach
All security settings are managed through environment variables and configuration files, allowing for easy deployment and management across different environments.

## Security Middleware Components

### 1. IP Whitelisting (`ip-whitelist.middleware.ts`)

**Features:**
- CIDR notation support for IP ranges
- Private network detection and handling
- Geolocation-based country blocking/allowing
- Bypass routes for health checks and public endpoints
- Comprehensive logging of violations

**Configuration:**
```env
GATEWAY_IP_WHITELIST_ENABLED=true
GATEWAY_ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
GATEWAY_ALLOW_PRIVATE_NETWORKS=true
GATEWAY_ALLOW_LOCALHOST=true
GATEWAY_ALLOWED_COUNTRIES=US,CA,GB
GATEWAY_BLOCKED_COUNTRIES=CN,RU
```

**Key Features:**
- IPv4 and IPv6 support
- CIDR range validation
- Country-level restrictions
- Automatic localhost detection
- Security event logging

### 2. Audit Logging (`audit-logger.middleware.ts`)

**Features:**
- Request/response logging with configurable verbosity
- Sensitive data redaction (passwords, tokens, etc.)
- Configurable retention policy
- Performance metrics tracking
- User context extraction from JWT tokens

**Configuration:**
```env
GATEWAY_AUDIT_ENABLED=true
GATEWAY_AUDIT_LOG_REQUESTS=true
GATEWAY_AUDIT_LOG_RESPONSES=false
GATEWAY_AUDIT_LOG_HEADERS=true
GATEWAY_AUDIT_LOG_BODY=false
GATEWAY_AUDIT_RETENTION_DAYS=90
```

**Key Features:**
- Automatic sensitive field redaction
- Request duration tracking
- User identification from JWT tokens
- Configurable body size limits
- Automatic log rotation and retention

### 3. Rate Limiting (`rate-limiting.middleware.ts`)

**Features:**
- Per-IP rate limiting
- Per-user rate limiting with subscription tier support
- Sliding window algorithm
- Subscription-based limits (Free, Pro, Business, Enterprise)
- Automatic cleanup to prevent memory leaks

**Configuration:**
```env
GATEWAY_RATE_LIMIT_ENABLED=true
GATEWAY_RATE_LIMIT_WINDOW=900000  # 15 minutes
GATEWAY_RATE_LIMIT_MAX=1000
GATEWAY_RATE_LIMIT_FREE=100
GATEWAY_RATE_LIMIT_PRO=500
GATEWAY_RATE_LIMIT_BUSINESS=2000
GATEWAY_RATE_LIMIT_ENTERPRISE=10000
```

**Subscription Tiers:**
- **Free**: 100 requests per window
- **Pro**: 500 requests per window
- **Business**: 2,000 requests per window
- **Enterprise**: 10,000 requests per window

### 4. Advanced Security (`security.middleware.ts`)

**Features:**
- DDoS protection with configurable thresholds
- Geolocation-based access control
- Bot detection with signature matching
- Suspicious behavior analysis
- Automatic IP blocking with time-based release

**Configuration:**
```env
GATEWAY_DDOS_ENABLED=true
GATEWAY_DDOS_THRESHOLD=100
GATEWAY_DDOS_BLOCK_DURATION=60
GATEWAY_GEO_BLOCKING_ENABLED=false
GATEWAY_BOT_DETECTION_ENABLED=true
```

**DDoS Protection:**
- Requests per minute threshold monitoring
- Automatic IP blocking
- Whitelist support for trusted IPs
- Configurable block duration

**Bot Detection:**
- Search engine bot identification (Google, Bing, etc.)
- Security scanner detection (Nmap, SQLMap, etc.)
- HTTP client detection (Curl, Wget, etc.)
- User agent analysis and suspicious pattern detection

## Security Configuration

### Environment Variables

```env
# IP Whitelisting
GATEWAY_IP_WHITELIST_ENABLED=true
GATEWAY_ALLOWED_IPS=
GATEWAY_ALLOW_PRIVATE_NETWORKS=true
GATEWAY_ALLOW_LOCALHOST=true
GATEWAY_ALLOWED_COUNTRIES=
GATEWAY_BLOCKED_COUNTRIES=

# Rate Limiting
GATEWAY_RATE_LIMIT_ENABLED=true
GATEWAY_RATE_LIMIT_WINDOW=900000
GATEWAY_RATE_LIMIT_MAX=1000
GATEWAY_RATE_LIMIT_FREE=100
GATEWAY_RATE_LIMIT_PRO=500
GATEWAY_RATE_LIMIT_BUSINESS=2000
GATEWAY_RATE_LIMIT_ENTERPRISE=10000

# Audit Logging
GATEWAY_AUDIT_ENABLED=true
GATEWAY_AUDIT_LOG_REQUESTS=true
GATEWAY_AUDIT_LOG_RESPONSES=false
GATEWAY_AUDIT_LOG_HEADERS=true
GATEWAY_AUDIT_LOG_BODY=false
GATEWAY_AUDIT_RETENTION_DAYS=90

# DDoS Protection
GATEWAY_DDOS_ENABLED=true
GATEWAY_DDOS_THRESHOLD=100
GATEWAY_DDOS_BLOCK_DURATION=60

# Geo Blocking
GATEWAY_GEO_BLOCKING_ENABLED=false
GATEWAY_GEO_ALLOWED_COUNTRIES=
GATEWAY_GEO_BLOCKED_COUNTRIES=

# Bot Detection
GATEWAY_BOT_DETECTION_ENABLED=true
```

## Implementation Guide

### 1. Basic Setup

```typescript
import { SecurityMiddlewareFactory } from './middleware/security';
import { Logger } from './services/logger.service';

// Initialize logger
const logger = new Logger();

// Create security middleware stack
const security = SecurityMiddlewareFactory.createSecurityStack(logger);

// Apply middleware in recommended order
const securityOrder = SecurityMiddlewareFactory.getSecurityOrder();

securityOrder.forEach(middlewareName => {
  app.use(security[middlewareName].middleware);
});
```

### 2. Individual Middleware Usage

```typescript
// IP Whitelisting only
app.use(security.ipWhitelist.middleware);

// Rate limiting with custom configuration
app.use(security.rateLimiting.middleware);

// DDoS and bot protection
app.use(security.security.middleware);

// Audit logging (should be last)
app.use(security.auditLogger.middleware);
```

### 3. Admin API Integration

```typescript
// Get security statistics
app.get('/admin/security/stats', (req, res) => {
  const stats = SecurityMiddlewareFactory.getSecurityStats(security);
  res.json(stats);
});

// Block IP manually
app.post('/admin/security/block-ip', (req, res) => {
  const { ip, reason, duration } = req.body;
  security.security.manualBlockIP(ip, reason, duration);
  res.json({ success: true });
});

// Get blocked IPs
app.get('/admin/security/blocked-ips', (req, res) => {
  const blockedIPs = security.security.getBlockedIPs();
  res.json({ blockedIPs });
});

// Get audit logs
app.get('/admin/security/audit-logs', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const logs = security.auditLogger.getAuditLogs(Number(limit), Number(offset));
  res.json({ logs });
});
```

## Security Headers

The security middleware automatically adds the following headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-01T00:00:00Z
X-RateLimit-User-Tier: pro
X-Security-Scan: Passed
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
X-Bot-Detected: true  # If bot detected
```

## Monitoring and Alerting

### Security Event Types
- `ip_blocked` - IP address blocked by security middleware
- `rate_limit` - Rate limit exceeded
- `ddos_detected` - DDoS attack pattern detected
- `geo_blocked` - Geographic restriction triggered
- `bot_detected` - Bot activity identified
- `audit_log` - Audit event recorded

### Severity Levels
- `low` - Normal monitoring events
- `medium` - Potential security issues
- `high` - Active security threats
- `critical` - Immediate action required

### Example Monitoring Setup

```typescript
import { SecurityEventEmitter } from './middleware/security';

// Monitor critical security events
setInterval(() => {
  const criticalEvents = SecurityEventEmitter.getEventsBySeverity('critical');
  if (criticalEvents.length > 0) {
    // Send alert to security team
    console.error('CRITICAL SECURITY EVENTS:', criticalEvents);
  }
}, 60000); // Check every minute
```

## Performance Considerations

### Memory Usage
- IP whitelist: ~1KB per unique IP
- Rate limiting: ~500 bytes per tracked IP/user
- Audit logging: Configurable retention with automatic cleanup
- Security tracking: ~1KB per tracked IP

### Recommended Limits
- Max tracked IPs: 100,000
- Audit log retention: 90 days
- Rate limit window: 15 minutes
- DDoS threshold: 100 requests/minute

### Cleanup Processes
All middleware components include automatic cleanup:
- Expired rate limit entries
- Old audit logs (based on retention policy)
- Inactive DDoS tracking entries
- Temporary IP blocks

## Security Best Practices

### 1. Environment Configuration
- Use strong environment variable validation
- Implement configuration versioning
- Regular security configuration audits

### 2. Monitoring
- Set up real-time security event monitoring
- Implement automated alerting for critical events
- Regular security statistics reviews

### 3. Maintenance
- Regular review of blocked IPs
- Audit log analysis for patterns
- Rate limit threshold optimization based on usage

### 4. Integration
- Integrate with external threat intelligence
- Use proper GeoIP service for production
- Implement centralized security logging

## Troubleshooting

### Common Issues

1. **False Positives in Bot Detection**
   - Review bot signatures in `security.middleware.ts`
   - Adjust user agent patterns
   - Add legitimate bots to allow list

2. **Rate Limiting Too Restrictive**
   - Monitor rate limit statistics
   - Adjust subscription tier limits
   - Review window sizes

3. **High Memory Usage**
   - Check cleanup interval configuration
   - Monitor tracked IP counts
   - Adjust retention policies

4. **Audit Log Performance**
   - Disable body logging for high-volume endpoints
   - Implement proper log rotation
   - Use external logging service for production

### Debug Mode

Enable debug logging with:
```env
LOG_LEVEL=debug
```

This provides detailed security event information for troubleshooting.

## Production Deployment

### Required External Services
1. **GeoIP Service** - Replace mock geolocation with MaxMind or similar
2. **Log Storage** - External log storage for audit logs
3. **Monitoring** - Prometheus/Grafana for security metrics
4. **Alerting** - PagerDuty/Slack for security incidents

### Scaling Considerations
- Use Redis for distributed rate limiting
- Implement centralized IP block lists
- Use database for audit log persistence
- Implement security event queues for high throughput

## Testing

### Unit Tests
Run security middleware tests:
```bash
npm test -- --grep "security"
```

### Load Testing
Test rate limiting and DDoS protection:
```bash
# Simulate high traffic
ab -n 10000 -c 100 http://localhost:3000/api/test

# Test rate limiting
for i in {1..200}; do curl http://localhost:3000/api/test; done
```

### Security Testing
- Penetration testing with OWASP tools
- Bot simulation testing
- Geographic access testing with VPN

This completes the enterprise security implementation for the API Gateway. The system provides comprehensive protection while maintaining performance and configurability.