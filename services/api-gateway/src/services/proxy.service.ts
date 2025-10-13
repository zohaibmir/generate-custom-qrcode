import { IProxyService, ProxyResponse, ProxyConfig, ILogger } from '../interfaces';

export class ProxyService implements IProxyService {
  private config: ProxyConfig;
  private logger: ILogger;

  constructor(logger: ILogger, config?: Partial<ProxyConfig>) {
    this.logger = logger;
    this.config = {
      timeout: config?.timeout || 10000,
      retries: config?.retries || 2,
      circuitBreakerThreshold: config?.circuitBreakerThreshold || 5
    };
  }

  async forwardRequest(
    targetUrl: string, 
    method: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<ProxyResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        this.logger.debug(`Attempting request to ${targetUrl}`, { 
          method, 
          attempt: attempt + 1,
          maxAttempts: this.config.retries + 1
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const sanitizedHeaders = this.sanitizeHeaders(headers);
        
        this.logger.debug(`Making request to ${targetUrl}`, {
          method,
          headers: Object.keys(sanitizedHeaders),
          bodyIncluded: this.shouldIncludeBody(method) && !!body
        });

        const response = await fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...sanitizedHeaders
          },
          body: this.shouldIncludeBody(method) && body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseData = await this.parseResponse(response);
        const duration = Date.now() - startTime;

        this.logger.info(`Request completed`, {
          targetUrl,
          method,
          status: response.status,
          duration: `${duration}ms`,
          attempt: attempt + 1
        });

        return {
          status: response.status,
          data: responseData,
          headers: this.extractResponseHeaders(response)
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const duration = Date.now() - startTime;

        this.logger.warn(`Request attempt ${attempt + 1} failed`, {
          targetUrl,
          method,
          error: lastError.message,
          duration: `${duration}ms`
        });

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All attempts failed
    this.logger.error(`All attempts failed for ${targetUrl}`, {
      method,
      totalAttempts: this.config.retries + 1,
      finalError: lastError?.message
    });

    throw new Error(`Proxy request failed after ${this.config.retries + 1} attempts: ${lastError?.message}`);
  }

  private shouldIncludeBody(method: string): boolean {
    return !['GET', 'HEAD', 'DELETE'].includes(method.toUpperCase());
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    // Only include safe headers, ensuring they exist and are strings
    const allowedHeaders = ['content-type', 'authorization', 'accept', 'user-agent'];
    
    Object.entries(headers || {}).forEach(([key, value]) => {
      if (key && value && typeof key === 'string' && typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (allowedHeaders.includes(lowerKey)) {
          sanitized[key] = value;
        }
      }
    });

    // Ensure content-type is always set for POST/PUT requests
    if (!sanitized['content-type'] && !sanitized['Content-Type']) {
      sanitized['Content-Type'] = 'application/json';
    }

    return sanitized;
  }

  private extractResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Extract useful response headers
    const headersToExtract = ['content-type', 'cache-control', 'etag'];
    
    headersToExtract.forEach(headerName => {
      const value = response.headers.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    return headers;
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    if (contentType?.includes('text/')) {
      return await response.text();
    }
    
    // For other content types, return as blob info
    return {
      type: 'binary',
      contentType: contentType || 'application/octet-stream',
      size: response.headers.get('content-length') || 'unknown'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}