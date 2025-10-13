export interface IProxyService {
  forwardRequest(targetUrl: string, method: string, body: any, headers: Record<string, string>): Promise<ProxyResponse>;
}

export interface ProxyResponse {
  status: number;
  data: any;
  headers?: Record<string, string>;
}

export interface IServiceRegistry {
  getServiceUrl(serviceName: string): string;
  isServiceHealthy(serviceName: string): Promise<boolean>;
  getRegisteredServices(): string[];
  getServiceEndpoint(serviceName: string): ServiceEndpoint | undefined;
}

export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
  checkServiceHealth(serviceName: string): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  dependencies?: Record<string, HealthStatus>;
}

export interface ProxyConfig {
  timeout: number;
  retries: number;
  circuitBreakerThreshold: number;
}

export interface ServiceEndpoint {
  name: string;
  url: string;
  healthPath: string;
  timeout?: number;
}

export interface RouteConfig {
  path: string;
  targetService: string;
  pathRewrite?: string;
  requiresAuth?: boolean;
}