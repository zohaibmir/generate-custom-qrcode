import { Request, Response } from 'express';
import { IProxyService, IServiceRegistry, ILogger, RouteConfig } from '../interfaces';

export class ProxyController {
  private proxyService: IProxyService;
  private serviceRegistry: IServiceRegistry;
  private logger: ILogger;
  private routes: RouteConfig[] = [];

  constructor(
    proxyService: IProxyService,
    serviceRegistry: IServiceRegistry,
    logger: ILogger
  ) {
    this.proxyService = proxyService;
    this.serviceRegistry = serviceRegistry;
    this.logger = logger;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.routes = [
      {
        path: '/api/auth',
        targetService: 'user-service',
        pathRewrite: '/auth',
        requiresAuth: false
      },
      {
        path: '/api/users',
        targetService: 'user-service',
        pathRewrite: '/users',
        requiresAuth: true
      },
      {
        path: '/api/qr',
        targetService: 'qr-service',
        pathRewrite: '/qr',
        requiresAuth: false // Some endpoints require auth, handled by service
      },
      {
        path: '/api/analytics',
        targetService: 'analytics-service',
        pathRewrite: '/analytics',
        requiresAuth: false // Mix of public and private endpoints
      },
      {
        path: '/api/files',
        targetService: 'file-service',
        pathRewrite: '/files',
        requiresAuth: true
      },
      {
        path: '/api/notifications',
        targetService: 'notification-service',
        pathRewrite: '/notifications',
        requiresAuth: true
      },
      {
        path: '/redirect',
        targetService: 'qr-service',
        pathRewrite: '/redirect',
        requiresAuth: false
      }
    ];
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info(`Incoming request`, {
        requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent')
      });

      const route = this.findRoute(req.path);
      if (!route) {
        this.sendErrorResponse(res, 404, 'Route not found', requestId);
        return;
      }

      const targetUrl = this.buildTargetUrl(route, req);
      const headers = this.extractHeaders(req);

      this.logger.debug(`Forwarding request`, {
        requestId,
        targetUrl,
        method: req.method,
        headers: Object.keys(headers),
        bodyPresent: !!req.body
      });

      const proxyResponse = await this.proxyService.forwardRequest(
        targetUrl,
        req.method,
        req.body,
        headers
      );

      const duration = Date.now() - startTime;
      this.logger.info(`Request completed successfully`, {
        requestId,
        targetUrl,
        status: proxyResponse.status,
        duration: `${duration}ms`
      });

      // Set response headers if provided
      if (proxyResponse.headers) {
        Object.entries(proxyResponse.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      res.status(proxyResponse.status).json(proxyResponse.data);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Request failed`, {
        requestId,
        method: req.method,
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });

      this.sendErrorResponse(res, 500, 'Internal proxy error', requestId);
    }
  }

  private findRoute(path: string): RouteConfig | null {
    return this.routes.find(route => path.startsWith(route.path)) || null;
  }

  private buildTargetUrl(route: RouteConfig, req: Request): string {
    const serviceUrl = this.serviceRegistry.getServiceUrl(route.targetService);
    const rewrittenPath = route.pathRewrite 
      ? req.path.replace(route.path, route.pathRewrite)
      : req.path;
    
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const fullPath = queryString ? `${rewrittenPath}?${queryString}` : rewrittenPath;
    
    return `${serviceUrl}${fullPath}`;
  }

  private extractHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Extract relevant headers safely
    const relevantHeaders = ['authorization', 'content-type', 'accept', 'user-agent'];
    
    relevantHeaders.forEach(headerName => {
      try {
        const value = req.get(headerName);
        if (value && typeof value === 'string') {
          headers[headerName] = value;
        }
      } catch (error) {
        this.logger.warn(`Failed to extract header ${headerName}`, error);
      }
    });

    // Ensure we always have content-type for API requests
    if (!headers['content-type'] && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendErrorResponse(res: Response, status: number, message: string, requestId: string): void {
    res.status(status).json({
      success: false,
      error: {
        code: 'PROXY_ERROR',
        message,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  getRoutes(): RouteConfig[] {
    return [...this.routes];
  }
}