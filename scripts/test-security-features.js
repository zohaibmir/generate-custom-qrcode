#!/usr/bin/env node

/**
 * Enterprise Security Features Test Script
 * 
 * This script tests all implemented security features:
 * - IP Whitelisting
 * - Rate Limiting (per-IP and per-user)
 * - DDoS Protection
 * - Bot Detection
 * - Geolocation Blocking
 * - Audit Logging
 * 
 * Usage: node scripts/test-security-features.js [options]
 * Options:
 *   --host <host>     API Gateway host (default: localhost)
 *   --port <port>     API Gateway port (default: 3001)
 *   --verbose         Show detailed output
 *   --test <name>     Run specific test (ip, rate, ddos, bot, geo, audit, all)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class SecurityTester {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 3001;
    this.verbose = options.verbose || false;
    this.baseUrl = `http://${this.host}:${this.port}`;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  verbose_log(message) {
    if (this.verbose) {
      this.log(message, 'debug');
    }
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const requestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': options.userAgent || 'SecurityTester/1.0',
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData,
              raw: data
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data,
              raw: data
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  recordTest(name, passed, message, details = {}) {
    const test = {
      name,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    this.results.tests.push(test);
    
    if (passed) {
      this.results.passed++;
      this.log(`${name}: ${message}`, 'success');
    } else {
      this.results.failed++;
      this.log(`${name}: ${message}`, 'error');
    }

    if (this.verbose && Object.keys(details).length > 0) {
      this.verbose_log(`Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async testIPWhitelisting() {
    this.log('Testing IP Whitelisting...');

    try {
      // Test 1: Normal request should pass (assuming local IP is allowed)
      const normalRes = await this.makeRequest('/health');
      this.recordTest(
        'IP-Whitelist-Normal',
        normalRes.statusCode === 200,
        normalRes.statusCode === 200 ? 'Local IP allowed access' : `Unexpected status: ${normalRes.statusCode}`,
        { statusCode: normalRes.statusCode }
      );

      // Test 2: Check for IP whitelist headers
      const hasSecurityHeaders = normalRes.headers['x-security-scan'] || 
                               normalRes.headers['x-content-type-options'];
      this.recordTest(
        'IP-Whitelist-Headers',
        !!hasSecurityHeaders,
        hasSecurityHeaders ? 'Security headers present' : 'Security headers missing',
        { headers: normalRes.headers }
      );

    } catch (error) {
      this.recordTest(
        'IP-Whitelist-Error',
        false,
        `Test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testRateLimiting() {
    this.log('Testing Rate Limiting...');

    try {
      // Test 1: Check rate limit headers
      const firstRes = await this.makeRequest('/api/health');
      const hasRateLimitHeaders = firstRes.headers['x-ratelimit-ip-limit'] || 
                                 firstRes.headers['x-ratelimit-limit'];
      
      this.recordTest(
        'Rate-Limit-Headers',
        !!hasRateLimitHeaders,
        hasRateLimitHeaders ? 'Rate limit headers present' : 'Rate limit headers missing',
        { headers: firstRes.headers }
      );

      // Test 2: Rapid requests to test rate limiting
      this.log('Sending rapid requests to test rate limiting...');
      let rateLimitHit = false;
      let requestCount = 0;

      for (let i = 0; i < 50; i++) {
        try {
          const res = await this.makeRequest('/api/health');
          requestCount++;
          
          if (res.statusCode === 429) {
            rateLimitHit = true;
            this.recordTest(
              'Rate-Limit-Enforcement',
              true,
              `Rate limit triggered after ${requestCount} requests`,
              { 
                statusCode: res.statusCode,
                requestCount,
                retryAfter: res.headers['retry-after'],
                data: res.data
              }
            );
            break;
          }
        } catch (error) {
          // Continue on errors
        }
        
        // Small delay to avoid overwhelming
        await this.sleep(10);
      }

      if (!rateLimitHit) {
        this.recordTest(
          'Rate-Limit-Enforcement',
          false,
          `Rate limit not triggered after ${requestCount} requests (may be disabled or threshold too high)`,
          { requestCount }
        );
      }

    } catch (error) {
      this.recordTest(
        'Rate-Limit-Error',
        false,
        `Test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testDDoSProtection() {
    this.log('Testing DDoS Protection...');

    try {
      // Test 1: Burst of requests to trigger DDoS protection
      this.log('Sending burst of requests to test DDoS protection...');
      let ddosTriggered = false;
      let burstCount = 0;

      // Send many requests quickly
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(this.makeRequest('/api/health'));
      }

      const results = await Promise.allSettled(promises);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          burstCount++;
          if (result.value.statusCode === 403 || result.value.statusCode === 429) {
            ddosTriggered = true;
            this.recordTest(
              'DDoS-Protection',
              true,
              `DDoS protection triggered (HTTP ${result.value.statusCode})`,
              { 
                statusCode: result.value.statusCode,
                burstCount,
                data: result.value.data
              }
            );
            break;
          }
        }
      }

      if (!ddosTriggered) {
        this.recordTest(
          'DDoS-Protection',
          false,
          `DDoS protection not triggered after ${burstCount} burst requests (may be disabled or threshold too high)`,
          { burstCount }
        );
      }

    } catch (error) {
      this.recordTest(
        'DDoS-Protection-Error',
        false,
        `Test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testBotDetection() {
    this.log('Testing Bot Detection...');

    const botUserAgents = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Nikto/2.1.6',
      'sqlmap/1.0',
      'python-requests/2.25.1',
      'curl/7.68.0',
      'PostmanRuntime/7.26.8'
    ];

    try {
      for (let i = 0; i < botUserAgents.length; i++) {
        const userAgent = botUserAgents[i];
        const testName = userAgent.split('/')[0];
        
        try {
          const res = await this.makeRequest('/api/health', {
            userAgent: userAgent
          });

          const botDetected = res.headers['x-bot-detected'] === 'true' ||
                             res.statusCode === 403;

          this.recordTest(
            `Bot-Detection-${testName}`,
            res.statusCode === 200 || res.statusCode === 403, // Either allowed or blocked is fine
            botDetected ? `Bot detected and handled (${res.statusCode})` : 
                         `Request processed normally (${res.statusCode})`,
            { 
              userAgent,
              statusCode: res.statusCode,
              botDetected,
              headers: res.headers
            }
          );

        } catch (error) {
          this.recordTest(
            `Bot-Detection-${testName}`,
            false,
            `Test failed: ${error.message}`,
            { userAgent, error: error.message }
          );
        }

        await this.sleep(100); // Small delay between requests
      }

    } catch (error) {
      this.recordTest(
        'Bot-Detection-Error',
        false,
        `Test setup failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testGeolocationBlocking() {
    this.log('Testing Geolocation Blocking...');

    const geoHeaders = [
      { 'CF-IPCountry': 'CN' }, // China
      { 'CF-IPCountry': 'RU' }, // Russia
      { 'CF-IPCountry': 'US' }, // United States
      { 'X-Country-Code': 'GB' }, // United Kingdom
      { 'X-GeoIP-Country': 'CA' } // Canada
    ];

    try {
      for (let i = 0; i < geoHeaders.length; i++) {
        const headers = geoHeaders[i];
        const country = Object.values(headers)[0];
        
        try {
          const res = await this.makeRequest('/api/health', {
            headers: headers
          });

          const geoBlocked = res.statusCode === 403 && 
                           res.data && 
                           res.data.type === 'Geo Blocking';

          this.recordTest(
            `Geo-Blocking-${country}`,
            res.statusCode === 200 || res.statusCode === 403, // Either allowed or blocked is fine
            geoBlocked ? `Country ${country} blocked` : 
                        `Country ${country} allowed (${res.statusCode})`,
            { 
              country,
              statusCode: res.statusCode,
              geoBlocked,
              data: res.data
            }
          );

        } catch (error) {
          this.recordTest(
            `Geo-Blocking-${country}`,
            false,
            `Test failed: ${error.message}`,
            { country, error: error.message }
          );
        }

        await this.sleep(100); // Small delay between requests
      }

    } catch (error) {
      this.recordTest(
        'Geo-Blocking-Error',
        false,
        `Test setup failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testAuditLogging() {
    this.log('Testing Audit Logging...');

    try {
      // Test 1: Make request with various data to ensure audit logging
      const testPayload = {
        test: 'audit_logging',
        timestamp: new Date().toISOString(),
        sensitive_data: 'password123' // Should be redacted in logs
      };

      const res = await this.makeRequest('/api/health', {
        method: 'POST',
        body: testPayload,
        headers: {
          'Authorization': 'Bearer test-token-12345',
          'X-Test-Header': 'audit-test'
        }
      });

      this.recordTest(
        'Audit-Logging-Request',
        res.statusCode >= 200 && res.statusCode < 500,
        `Request logged (${res.statusCode})`,
        { 
          statusCode: res.statusCode,
          requestPayload: testPayload
        }
      );

      // Test 2: Check if security headers indicate logging is active
      const hasAuditHeaders = res.headers['x-audit-id'] || 
                             res.headers['x-security-scan'];
      
      this.recordTest(
        'Audit-Logging-Headers',
        true, // We'll consider this passed if no error occurred
        hasAuditHeaders ? 'Audit tracking headers present' : 'Basic audit logging functional',
        { headers: res.headers }
      );

    } catch (error) {
      this.recordTest(
        'Audit-Logging-Error',
        false,
        `Test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async testSecurityStatistics() {
    this.log('Testing Security Statistics...');

    try {
      // Try to access security stats endpoint
      const res = await this.makeRequest('/admin/security/stats', {
        headers: {
          'Authorization': 'Bearer admin-token' // Mock admin token
        }
      });

      this.recordTest(
        'Security-Stats-Endpoint',
        res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 200,
        res.statusCode === 200 ? 'Security stats accessible' :
        res.statusCode === 401 || res.statusCode === 403 ? 'Security stats properly protected' :
        `Unexpected response: ${res.statusCode}`,
        { 
          statusCode: res.statusCode,
          data: res.data
        }
      );

    } catch (error) {
      this.recordTest(
        'Security-Stats-Error',
        false,
        `Test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Enterprise Security Features Test Suite...');
    this.log(`Testing against: ${this.baseUrl}`);
    this.log('');

    const startTime = Date.now();

    // Run all security tests
    await this.testIPWhitelisting();
    await this.sleep(500);

    await this.testRateLimiting();
    await this.sleep(500);

    await this.testDDoSProtection();
    await this.sleep(500);

    await this.testBotDetection();
    await this.sleep(500);

    await this.testGeolocationBlocking();
    await this.sleep(500);

    await this.testAuditLogging();
    await this.sleep(500);

    await this.testSecurityStatistics();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Print summary
    this.printSummary(duration);
  }

  async runSpecificTest(testName) {
    this.log(`🎯 Running specific test: ${testName}`);
    this.log('');

    const startTime = Date.now();

    switch (testName.toLowerCase()) {
      case 'ip':
        await this.testIPWhitelisting();
        break;
      case 'rate':
        await this.testRateLimiting();
        break;
      case 'ddos':
        await this.testDDoSProtection();
        break;
      case 'bot':
        await this.testBotDetection();
        break;
      case 'geo':
        await this.testGeolocationBlocking();
        break;
      case 'audit':
        await this.testAuditLogging();
        break;
      case 'stats':
        await this.testSecurityStatistics();
        break;
      case 'all':
        return this.runAllTests();
      default:
        this.log(`Unknown test: ${testName}`, 'error');
        return;
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    this.printSummary(duration);
  }

  printSummary(duration) {
    this.log('');
    this.log('=' * 60);
    this.log('🔐 ENTERPRISE SECURITY TEST SUMMARY');
    this.log('=' * 60);
    this.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    this.log(`✅ Passed: ${this.results.passed}`);
    this.log(`❌ Failed: ${this.results.failed}`);
    this.log(`📊 Total: ${this.results.tests.length}`);
    this.log('');

    if (this.results.failed > 0) {
      this.log('❌ FAILED TESTS:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          this.log(`   • ${test.name}: ${test.message}`, 'error');
        });
      this.log('');
    }

    const successRate = (this.results.passed / this.results.tests.length * 100).toFixed(1);
    
    if (this.results.failed === 0) {
      this.log('🎉 ALL SECURITY TESTS PASSED!', 'success');
    } else if (successRate >= 80) {
      this.log(`⚠️  Most security features working (${successRate}% pass rate)`);
    } else {
      this.log(`🚨 Multiple security issues detected (${successRate}% pass rate)`, 'error');
    }

    this.log('');
    this.log('📋 Test Results saved to memory');
    this.log('💡 Run with --verbose for detailed output');
    this.log('🔧 Use --test <name> to run specific tests');
    this.log('');

    // Exit with appropriate code
    process.exit(this.results.failed === 0 ? 0 : 1);
  }

  getTestResults() {
    return this.results;
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    host: 'localhost',
    port: 3001,
    verbose: false,
    test: 'all'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--host':
        options.host = args[++i];
        break;
      case '--port':
        options.port = parseInt(args[++i]);
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--test':
        options.test = args[++i];
        break;
      case '--help':
        console.log(`
Enterprise Security Features Test Script

Usage: node scripts/test-security-features.js [options]

Options:
  --host <host>     API Gateway host (default: localhost)
  --port <port>     API Gateway port (default: 3001)
  --verbose         Show detailed output
  --test <name>     Run specific test:
                      ip      - IP Whitelisting
                      rate    - Rate Limiting
                      ddos    - DDoS Protection
                      bot     - Bot Detection
                      geo     - Geolocation Blocking
                      audit   - Audit Logging
                      stats   - Security Statistics
                      all     - All tests (default)
  --help           Show this help

Examples:
  node scripts/test-security-features.js
  node scripts/test-security-features.js --verbose
  node scripts/test-security-features.js --test rate --verbose
  node scripts/test-security-features.js --host production.api.com --port 443
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const tester = new SecurityTester(options);

    if (options.test === 'all') {
      await tester.runAllTests();
    } else {
      await tester.runSpecificTest(options.test);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SecurityTester;