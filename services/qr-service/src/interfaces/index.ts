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
  is_active: boolean;
  expires_at?: Date;
  max_scans?: number;
  current_scans: number;
  password_hash?: string;
  valid_schedule?: ScheduleConfig;
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
    total?: number;
    category?: string;
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

// QR Templates System Interfaces
export interface IQRTemplateService {
  getAllTemplates(): Promise<ServiceResponse<QRTemplate[]>>;
  getTemplateById(id: string): Promise<ServiceResponse<QRTemplate>>;
  getTemplatesByCategory(category: string): Promise<ServiceResponse<QRTemplate[]>>;
  createQRFromTemplate(templateId: string, userId: string, customData: any): Promise<ServiceResponse<QRCode>>;
  validateTemplateData(templateId: string, data: any): Promise<ValidationResult>;
}

export interface QRTemplate {
  id: string;
  name: string;
  description: string;
  category: QRTemplateCategory;
  type: QRType;
  icon: string;
  isPopular: boolean;
  isPremium: boolean;
  requiredSubscriptionTier: SubscriptionTier;
  defaultConfig: QRDesignConfig;
  fields: QRTemplateField[];
  contentStructure: any;
  examples: QRTemplateExample[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QRTemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'phone' | 'textarea' | 'select' | 'number' | 'password';
  required: boolean;
  placeholder?: string;
  validation?: QRTemplateFieldValidation;
  options?: QRTemplateFieldOption[];
  defaultValue?: any;
  description?: string;
}

export interface QRTemplateFieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  customValidator?: string;
}

export interface QRTemplateFieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface QRTemplateExample {
  name: string;
  description: string;
  data: any;
  preview?: string;
}

export type QRTemplateCategory = 
  | 'business' 
  | 'marketing' 
  | 'hospitality' 
  | 'events' 
  | 'social' 
  | 'education' 
  | 'personal' 
  | 'ecommerce' 
  | 'healthcare' 
  | 'transportation';

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise';

// QR Categories System Interfaces
export interface IQRCategoryService {
  createCategory(userId: string, categoryData: CreateCategoryRequest): Promise<ServiceResponse<QRCategory>>;
  getCategoryById(id: string): Promise<ServiceResponse<QRCategory>>;
  getUserCategories(userId: string, options?: CategoryQueryOptions): Promise<ServiceResponse<QRCategory[]>>;
  updateCategory(id: string, categoryData: Partial<CreateCategoryRequest>): Promise<ServiceResponse<QRCategory>>;
  deleteCategory(id: string, transferToCategory?: string): Promise<ServiceResponse<boolean>>;
  getCategoryTree(userId: string): Promise<ServiceResponse<QRCategoryTree>>;
  moveQRsToCategory(qrIds: string[], categoryId: string | null): Promise<ServiceResponse<number>>;
  getCategoryStats(userId: string): Promise<ServiceResponse<CategoryStats[]>>;
}

export interface IQRCategoryRepository {
  create(categoryData: any): Promise<QRCategory>;
  findById(id: string): Promise<QRCategory | null>;
  findByUserId(userId: string, options?: CategoryQueryOptions): Promise<QRCategory[]>;
  update(id: string, categoryData: any): Promise<QRCategory>;
  delete(id: string): Promise<boolean>;
  findByParentId(parentId: string | null, userId: string): Promise<QRCategory[]>;
  moveQRsToCategory(qrIds: string[], categoryId: string | null): Promise<number>;
  getCategoryWithQRCount(userId: string): Promise<Array<QRCategory & { qrCount: number }>>;
}

export interface QRCategory {
  id: string;
  userId: string;
  parentId?: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface CategoryQueryOptions {
  includeChildren?: boolean;
  parentId?: string | null;
  sortBy?: 'name' | 'createdAt' | 'sortOrder';
  sortOrder?: 'asc' | 'desc';
}

export interface QRCategoryTree {
  categories: QRCategoryTreeNode[];
  totalCategories: number;
  maxDepth: number;
}

export interface QRCategoryTreeNode {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  sortOrder: number;
  qrCount: number;
  children: QRCategoryTreeNode[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  qrCount: number;
  totalScans: number;
  activeQRs: number;
  expiredQRs: number;
  recentActivity: Date | null;
}

// QR Validity System Interfaces
export interface ValidationResult {
  checkType: 'ACTIVE_STATUS' | 'EXPIRATION' | 'SCAN_LIMIT' | 'PASSWORD' | 'SCHEDULE' | 'TEMPLATE_VALIDATION' | 'FIELD_VALIDATION';
  isValid: boolean;
  message: string;
  details?: any;
}

export interface QRValidityCheck {
  isValid: boolean;
  reason: 'VALID' | 'QR_CODE_INACTIVE' | 'QR_CODE_EXPIRED' | 'SCAN_LIMIT_EXCEEDED' | 'PASSWORD_REQUIRED' | 'QR_CODE_SCHEDULED' | 'VALIDATION_ERROR';
  message: string;
  checks: ValidationResult[];
  expiredAt?: Date;
  currentScans?: number;
  maxScans?: number;
  schedule?: ScheduleConfig;
}

export interface ScanAttemptResult {
  success: boolean;
  canScan: boolean;
  reason: string;
  message: string;
  newScanCount?: number;
  validityCheck?: QRValidityCheck;
}

export interface ScheduleConfig {
  dailyHours?: {
    startHour?: number;
    startMinute?: number;
    endHour?: number;
    endMinute?: number;
  };
  weeklyDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface ValidityConfig {
  maxExpirationDays: number | null;
  maxScanLimit: number | null;
  allowPasswordProtection: boolean;
  allowScheduling: boolean;
  allowUnlimitedScans: boolean;
}

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