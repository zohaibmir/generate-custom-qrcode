// Core interfaces following clean architecture principles

export interface ILogger {
  info(message: string, metadata?: any): void;
  error(message: string, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  debug(message: string, metadata?: any): void;
}

export interface IQRRepository {
  create(qrData: any): Promise<QRCode>;
  findById(id: string): Promise<QRCode | null>;
  findByShortId(shortId: string): Promise<QRCode | null>;
  findByUserId(userId: string, pagination?: PaginationOptions): Promise<QRCode[]>;
  update(id: string, qrData: any): Promise<QRCode>;
  delete(id: string): Promise<boolean>;
  incrementScanCount(id: string): Promise<void>;
}

export interface IQRGenerator {
  generate(data: string, options?: QRGenerationOptions, format?: ImageFormat): Promise<Buffer>;
}

export interface IShortIdGenerator {
  generate(): Promise<string>;
  validate(shortId: string): boolean;
}

export interface IQRService {
  createQR(userId: string, qrData: CreateQRRequest): Promise<ServiceResponse<QRCode>>;
  getQRById(id: string): Promise<ServiceResponse<QRCode>>;
  getQRByShortId(shortId: string): Promise<ServiceResponse<QRCode>>;
  getUserQRs(userId: string, pagination?: PaginationOptions): Promise<ServiceResponse<QRCode[]>>;
  updateQR(id: string, qrData: Partial<CreateQRRequest>): Promise<ServiceResponse<QRCode>>;
  deleteQR(id: string): Promise<ServiceResponse<boolean>>;
  generateQRImage(qrCodeId: string, format?: ImageFormat): Promise<ServiceResponse<Buffer>>;
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
  checkDatabaseHealth(): Promise<boolean>;
}

export interface IDependencyContainer {
  resolve<T>(token: string): T;
  register<T>(token: string, instance: T): void;
  getRegisteredTokens(): string[];
}

// Types
export interface QRCode {
  id: string;
  userId: string;
  shortId: string;
  name: string;
  type: QRType;
  content: any;
  designConfig?: QRDesignConfig;
  targetUrl: string;
  isActive: boolean;
  validityConfig?: QRValidityConfig;
  currentScans: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQRRequest {
  data: string | any;
  type: QRType;
  title?: string;
  description?: string;
  customization?: QRDesignConfig;
  validityConfig?: QRValidityConfig;
}

export interface QRDesignConfig {
  size?: number;
  format?: ImageFormat;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    foreground?: string;
    background?: string;
  };
  logo?: {
    url?: string;
    size?: number;
  };
}

export interface QRValidityConfig {
  expiresAt?: Date;
  maxScans?: number;
  passwordHash?: string;
  validSchedule?: {
    startTime?: string;
    endTime?: string;
    days?: number[];
  };
}

export interface QRGenerationOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  width?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
    details?: any;
  };
  metadata?: {
    requestId?: string;
    timestamp?: string;
    pagination?: {
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    };
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  timestamp: string;
  dependencies?: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
}

export type QRType = 'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'location' | 'vcard';
export type ImageFormat = 'png' | 'jpg' | 'svg' | 'pdf';

// Error classes
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}