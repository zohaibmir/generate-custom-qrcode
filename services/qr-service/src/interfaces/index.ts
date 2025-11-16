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
  createQR(userId: string, qrData: CreateQRRequest, subscriptionTier?: string): Promise<ServiceResponse<QRCode>>;
  getQRById(id: string): Promise<ServiceResponse<QRCode>>;
  getQRByShortId(shortId: string): Promise<ServiceResponse<QRCode>>;
  getUserQRs(userId: string, pagination?: PaginationOptions): Promise<ServiceResponse<QRCode[]>>;
  updateQR(id: string, qrData: Partial<CreateQRRequest>): Promise<ServiceResponse<QRCode>>;
  deleteQR(id: string): Promise<ServiceResponse<boolean>>;
  generateQRImage(qrCodeId: string, format?: ImageFormat): Promise<ServiceResponse<Buffer>>;
  
  // QR Validity and Scanning methods
  processScan(shortId: string, password?: string): Promise<ServiceResponse<ScanAttemptResult>>;
  validateQRForScan(shortId: string, password?: string): Promise<ServiceResponse<QRValidityCheck>>;
  updateValiditySettings(qrId: string, validityData: any, userTier: string): Promise<ServiceResponse<QRCode>>;
  getValidityLimits(tier: string): ServiceResponse<any>;
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
  data?: any; // For backward compatibility - maps to content.data
  designConfig?: QRDesignConfig;
  targetUrl: string;
  is_active: boolean;
  expires_at?: Date;
  max_scans?: number;
  current_scans: number;
  password_hash?: string;
  valid_schedule?: ScheduleConfig;
  image_url?: string; // URL to the saved QR image
  image_file_id?: string; // Reference to file_uploads table
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
  
  // Enhanced Color Configuration
  color?: {
    foreground?: string;
    background?: string;
  };
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    direction?: number;
  };
  
  // Advanced Logo Integration
  logo?: {
    url?: string;
    buffer?: Buffer;
    size?: number;
    position?: 'center' | 'corner';
    borderRadius?: number;
    opacity?: number;
  };
  
  // Pattern and Shape Variations
  pattern?: 'square' | 'dots' | 'rounded' | 'diamond' | 'circular';
  cornerRadius?: number;
  
  // Eye Pattern Customization
  eyePattern?: {
    outer: 'square' | 'rounded' | 'circle' | 'diamond';
    inner: 'square' | 'rounded' | 'circle' | 'diamond';
    color?: string;
  };
  
  // Frame Design
  frame?: {
    style: 'none' | 'square' | 'rounded' | 'circle' | 'banner';
    text?: string;
    textColor?: string;
    color?: string;
    width?: number;
    padding?: number;
  };
  
  // Background Options
  backgroundTransparent?: boolean;
  backgroundImage?: {
    url?: string;
    buffer?: Buffer;
    opacity?: number;
    blend?: 'normal' | 'multiply' | 'overlay';
  };
  
  // Advanced Effects
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  
  // Output Quality
  quality?: number;
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
  type?: 'png' | 'svg';
  rendererOpts?: {
    quality?: number;
  };
}

export interface IImageProcessor {
  overlayLogo(qrBuffer: Buffer, logoBuffer: Buffer, options: LogoOverlayOptions): Promise<Buffer>;
  addFrame(imageBuffer: Buffer, frameOptions: FrameOptions): Promise<Buffer>;
  applyPattern(qrBuffer: Buffer, pattern: PatternOptions): Promise<Buffer>;
  applyEyePattern(qrBuffer: Buffer, eyeOptions: EyePatternOptions): Promise<Buffer>;
  makeTransparent(imageBuffer: Buffer, backgroundColor?: string): Promise<Buffer>;
  applyEffects(imageBuffer: Buffer, effects: EffectOptions): Promise<Buffer>;
}

export interface LogoOverlayOptions {
  size: number;
  position: 'center' | 'corner';
  borderRadius?: number;
  opacity?: number;
}

export interface FrameOptions {
  style: 'none' | 'square' | 'rounded' | 'circle' | 'banner';
  text?: string;
  textColor?: string;
  color?: string;
  width?: number;
  padding?: number;
}

export interface PatternOptions {
  type: 'square' | 'dots' | 'rounded' | 'diamond' | 'circular';
  cornerRadius?: number;
}

export interface EyePatternOptions {
  outer: 'square' | 'rounded' | 'circle' | 'diamond';
  inner: 'square' | 'rounded' | 'circle' | 'diamond';
  color?: string;
}

export interface EffectOptions {
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    direction?: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  backgroundImage?: {
    buffer: Buffer;
    opacity?: number;
    blend?: 'normal' | 'multiply' | 'overlay';
  };
}

export interface IQRCustomizationService {
  validateCustomization(designConfig: QRDesignConfig, subscriptionTier: string): Promise<CustomizationValidationResult>;
  getCustomizationLimits(subscriptionTier: string): CustomizationLimits;
  applyTierRestrictions(designConfig: QRDesignConfig, subscriptionTier: string): QRDesignConfig;
}

export interface CustomizationLimits {
  maxSize: number;
  allowLogo: boolean;
  allowFrames: boolean;
  allowPatterns: string[];
  allowEyePatterns: boolean;
  allowTransparency: boolean;
  allowGradients: boolean;
  allowEffects: boolean;
}

export interface CustomizationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ServiceError;
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

export type QRType = 'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'location' | 'vcard' | 'swish';
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

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

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

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', details);
    this.name = 'BusinessLogicError';
  }
}

// ===============================================
// DYNAMIC QR CODES INTERFACES
// ===============================================

// QR Content Version Interface
export interface QRContentVersion {
  id: string;
  qrCodeId: string;
  versionNumber: number;
  content: any; // JSONB content
  redirectUrl?: string;
  isActive: boolean;
  scheduledAt?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Create Content Version Request
export interface CreateContentVersionRequest {
  content: any;
  redirectUrl?: string;
  scheduledAt?: string;
  isActive?: boolean;
}

// A/B Test Interface
export interface QRABTest {
  id: string;
  qrCodeId: string;
  testName: string;
  description?: string;
  variantAVersionId: string;
  variantBVersionId: string;
  trafficSplit: number; // Percentage for variant A (0-100)
  startDate: string;
  endDate?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  winnerVariant?: 'A' | 'B';
  createdAt: string;
  updatedAt: string;
}

// Create A/B Test Request
export interface CreateABTestRequest {
  testName: string;
  description?: string;
  variantAVersionId: string;
  variantBVersionId: string;
  trafficSplit?: number;
  startDate: string;
  endDate?: string;
}

// Redirect Rule Interface
export interface QRRedirectRule {
  id: string;
  qrCodeId: string;
  ruleName: string;
  ruleType: 'geographic' | 'device' | 'time' | 'custom';
  conditions: any; // JSONB conditions
  targetVersionId: string;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create Redirect Rule Request
export interface CreateRedirectRuleRequest {
  ruleName: string;
  ruleType: 'geographic' | 'device' | 'time' | 'custom';
  conditions: any;
  targetVersionId: string;
  priority?: number;
  isEnabled?: boolean;
}

// Content Schedule Interface
export interface QRContentSchedule {
  id: string;
  qrCodeId: string;
  versionId: string;
  scheduleName: string;
  startTime: string;
  endTime?: string;
  repeatPattern: 'none' | 'daily' | 'weekly' | 'monthly';
  repeatDays?: number[]; // Days of week (1-7)
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create Content Schedule Request
export interface CreateContentScheduleRequest {
  versionId: string;
  scheduleName: string;
  startTime: string;
  endTime?: string;
  repeatPattern?: 'none' | 'daily' | 'weekly' | 'monthly';
  repeatDays?: number[];
  timezone?: string;
  isActive?: boolean;
}

// Dynamic Analytics Interface
export interface QRDynamicAnalytics {
  id: string;
  qrCodeId: string;
  versionId?: string;
  abTestId?: string;
  variant?: 'A' | 'B';
  redirectRuleId?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  region?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  conversionEvent?: string;
  sessionId?: string;
  scanTimestamp: string;
}

// Dynamic QR Query Options
export interface DynamicQRQueryOptions {
  includeVersions?: boolean;
  includeABTests?: boolean;
  includeRules?: boolean;
  includeSchedules?: boolean;
  versionLimit?: number;
}

// Dynamic QR Statistics
export interface DynamicQRStats {
  qrCodeId: string;
  totalVersions: number;
  activeVersion: number;
  totalScans: number;
  versionsPerformance: Array<{
    versionId: string;
    versionNumber: number;
    scans: number;
    conversionRate: number;
  }>;
  abTestsRunning: number;
  redirectRulesActive: number;
  scheduledContent: number;
}

// Dynamic QR Service Interface
export interface IDynamicQRService {
  // Content Version Management
  createContentVersion(qrCodeId: string, versionData: CreateContentVersionRequest): Promise<ServiceResponse<QRContentVersion>>;
  getContentVersions(qrCodeId: string): Promise<ServiceResponse<QRContentVersion[]>>;
  getActiveContentVersion(qrCodeId: string): Promise<ServiceResponse<QRContentVersion | null>>;
  updateContentVersion(versionId: string, versionData: Partial<CreateContentVersionRequest>): Promise<ServiceResponse<QRContentVersion>>;
  activateContentVersion(versionId: string): Promise<ServiceResponse<QRContentVersion>>;
  deactivateContentVersion(versionId: string): Promise<ServiceResponse<QRContentVersion>>;
  deleteContentVersion(versionId: string): Promise<ServiceResponse<boolean>>;

  // A/B Testing
  createABTest(qrCodeId: string, testData: CreateABTestRequest): Promise<ServiceResponse<QRABTest>>;
  getABTests(qrCodeId: string): Promise<ServiceResponse<QRABTest[]>>;
  updateABTest(testId: string, testData: Partial<CreateABTestRequest>): Promise<ServiceResponse<QRABTest>>;
  startABTest(testId: string): Promise<ServiceResponse<QRABTest>>;
  pauseABTest(testId: string): Promise<ServiceResponse<QRABTest>>;
  completeABTest(testId: string, winnerVariant?: 'A' | 'B'): Promise<ServiceResponse<QRABTest>>;
  deleteABTest(testId: string): Promise<ServiceResponse<boolean>>;

  // Redirect Rules
  createRedirectRule(qrCodeId: string, ruleData: CreateRedirectRuleRequest): Promise<ServiceResponse<QRRedirectRule>>;
  getRedirectRules(qrCodeId: string): Promise<ServiceResponse<QRRedirectRule[]>>;
  updateRedirectRule(ruleId: string, ruleData: Partial<CreateRedirectRuleRequest>): Promise<ServiceResponse<QRRedirectRule>>;
  deleteRedirectRule(ruleId: string): Promise<ServiceResponse<boolean>>;

  // Content Scheduling
  createContentSchedule(qrCodeId: string, scheduleData: CreateContentScheduleRequest): Promise<ServiceResponse<QRContentSchedule>>;
  getContentSchedules(qrCodeId: string): Promise<ServiceResponse<QRContentSchedule[]>>;
  updateContentSchedule(scheduleId: string, scheduleData: Partial<CreateContentScheduleRequest>): Promise<ServiceResponse<QRContentSchedule>>;
  deleteContentSchedule(scheduleId: string): Promise<ServiceResponse<boolean>>;

  // Analytics & Statistics
  getDynamicQRStats(qrCodeId: string): Promise<ServiceResponse<DynamicQRStats>>;
  resolveRedirect(qrCodeId: string, context: any): Promise<ServiceResponse<string>>; // Returns redirect URL
}

// Dynamic QR Repository Interface
export interface IDynamicQRRepository {
  // Content Versions
  createContentVersion(versionData: any): Promise<QRContentVersion>;
  findContentVersionById(versionId: string): Promise<QRContentVersion | null>;
  findContentVersionsByQRCode(qrCodeId: string): Promise<QRContentVersion[]>;
  getActiveContentVersion(qrCodeId: string): Promise<QRContentVersion | null>;
  updateContentVersion(versionId: string, versionData: Partial<any>): Promise<QRContentVersion>;
  deleteContentVersion(versionId: string): Promise<boolean>;

  // A/B Tests
  createABTest(testData: any): Promise<QRABTest>;
  findABTestById(testId: string): Promise<QRABTest | null>;
  findABTestsByQRCode(qrCodeId: string): Promise<QRABTest[]>;
  updateABTest(testId: string, testData: Partial<any>): Promise<QRABTest>;
  deleteABTest(testId: string): Promise<boolean>;

  // Redirect Rules
  createRedirectRule(ruleData: any): Promise<QRRedirectRule>;
  findRedirectRuleById(ruleId: string): Promise<QRRedirectRule | null>;
  findRedirectRulesByQRCode(qrCodeId: string): Promise<QRRedirectRule[]>;
  updateRedirectRule(ruleId: string, ruleData: Partial<any>): Promise<QRRedirectRule>;
  deleteRedirectRule(ruleId: string): Promise<boolean>;

  // Content Schedules
  createContentSchedule(scheduleData: any): Promise<QRContentSchedule>;
  findContentScheduleById(scheduleId: string): Promise<QRContentSchedule | null>;
  findContentSchedulesByQRCode(qrCodeId: string): Promise<QRContentSchedule[]>;
  updateContentSchedule(scheduleId: string, scheduleData: Partial<any>): Promise<QRContentSchedule>;
  deleteContentSchedule(scheduleId: string): Promise<boolean>;

  // Analytics
  recordDynamicAnalytics(analyticsData: any): Promise<QRDynamicAnalytics>;
  getDynamicAnalytics(qrCodeId: string, options?: any): Promise<QRDynamicAnalytics[]>;
  getDynamicQRStats(qrCodeId: string): Promise<DynamicQRStats>;
}

// ===============================================
// BULK QR GENERATION INTERFACES
// ===============================================

// Bulk QR Generation Service Interface
export interface IBulkQRService {
  // Bulk Templates
  getBulkTemplates(userId?: string): Promise<ServiceResponse<BulkQRTemplate[]>>;
  getBulkTemplateById(templateId: string): Promise<ServiceResponse<BulkQRTemplate>>;
  createBulkTemplate(userId: string, templateData: CreateBulkTemplateRequest): Promise<ServiceResponse<BulkQRTemplate>>;
  updateBulkTemplate(templateId: string, templateData: Partial<CreateBulkTemplateRequest>): Promise<ServiceResponse<BulkQRTemplate>>;
  deleteBulkTemplate(templateId: string): Promise<ServiceResponse<boolean>>;
  
  // Bulk Batch Operations
  createBulkBatch(userId: string, batchData: CreateBulkBatchRequest): Promise<ServiceResponse<BulkQRBatch>>;
  getBulkBatch(batchId: string, userId: string): Promise<ServiceResponse<BulkQRBatch>>;
  getUserBulkBatches(userId: string, options?: BulkBatchQueryOptions): Promise<ServiceResponse<BulkQRBatch[]>>;
  processBulkBatch(batchId: string): Promise<ServiceResponse<BulkProcessingResult>>;
  cancelBulkBatch(batchId: string, userId: string): Promise<ServiceResponse<boolean>>;
  deleteBulkBatch(batchId: string, userId: string): Promise<ServiceResponse<boolean>>;
  
  // Bulk Processing
  processCsvData(csvData: string, templateId?: string): Promise<ServiceResponse<ParsedBulkData>>;
  validateBulkData(data: any[], templateId?: string): Promise<ServiceResponse<BulkValidationResult>>;
  getBulkBatchProgress(batchId: string): Promise<ServiceResponse<BulkBatchProgress>>;
  
  // Bulk Statistics
  getBulkStats(userId: string, days?: number): Promise<ServiceResponse<BulkStats>>;
}

// Bulk QR Generation Repository Interface
export interface IBulkQRRepository {
  // Bulk Templates
  createBulkTemplate(templateData: any): Promise<BulkQRTemplate>;
  findBulkTemplateById(templateId: string): Promise<BulkQRTemplate | null>;
  findBulkTemplatesByUser(userId: string): Promise<BulkQRTemplate[]>;
  findSystemBulkTemplates(): Promise<BulkQRTemplate[]>;
  updateBulkTemplate(templateId: string, templateData: any): Promise<BulkQRTemplate>;
  deleteBulkTemplate(templateId: string): Promise<boolean>;
  incrementTemplateUsage(templateId: string): Promise<void>;
  
  // Bulk Batches
  createBulkBatch(batchData: any): Promise<BulkQRBatch>;
  findBulkBatchById(batchId: string): Promise<BulkQRBatch | null>;
  findBulkBatchesByUser(userId: string, options?: any): Promise<BulkQRBatch[]>;
  updateBulkBatch(batchId: string, batchData: any): Promise<BulkQRBatch>;
  deleteBulkBatch(batchId: string): Promise<boolean>;
  
  // Bulk Items
  createBulkItems(items: any[]): Promise<BulkQRItem[]>;
  findBulkItemsByBatch(batchId: string): Promise<BulkQRItem[]>;
  updateBulkItem(itemId: string, itemData: any): Promise<BulkQRItem>;
  updateBulkItemsStatus(batchId: string, status: BulkItemStatus, itemIds?: string[]): Promise<number>;
  getBulkItemsStats(batchId: string): Promise<BulkItemStats>;
  
  // Statistics
  getBulkStats(userId: string, days: number): Promise<BulkStats>;
}

// Core Bulk QR Types
export interface BulkQRTemplate {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  templateType: BulkTemplateType;
  fieldMappings: Record<string, string>;
  defaultValues: Record<string, any>;
  validationRules: Record<string, any>;
  qrSettings: Record<string, any>;
  isSystemTemplate: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BulkQRBatch {
  id: string;
  userId: string;
  batchName: string;
  description?: string;
  templateId?: string;
  categoryId?: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  status: BulkBatchStatus;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  inputFileId?: string;
  inputData?: any;
  errorLog?: any;
  progressPercentage: number;
  estimatedCompletionTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkQRItem {
  id: string;
  batchId: string;
  qrCodeId?: string;
  rowNumber: number;
  inputData: any;
  status: BulkItemStatus;
  errorMessage?: string;
  errorDetails?: any;
  processedAt?: string;
  createdAt: string;
}

// Request/Response Types
export interface CreateBulkTemplateRequest {
  name: string;
  description?: string;
  templateType: BulkTemplateType;
  fieldMappings: Record<string, string>;
  defaultValues?: Record<string, any>;
  validationRules?: Record<string, any>;
  qrSettings?: Record<string, any>;
}

export interface CreateBulkBatchRequest {
  batchName: string;
  description?: string;
  templateId?: string;
  categoryId?: string;
  inputData: any[];
  inputFileId?: string;
  processImmediately?: boolean;
}

export interface BulkBatchQueryOptions {
  limit?: number;
  offset?: number;
  status?: BulkBatchStatus;
  sortBy?: 'created_at' | 'updated_at' | 'batch_name';
  sortOrder?: 'asc' | 'desc';
}

export interface ParsedBulkData {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  data: any[];
  errors: BulkDataError[];
}

export interface BulkValidationResult {
  isValid: boolean;
  totalItems: number;
  validItems: number;
  invalidItems: number;
  errors: BulkDataError[];
  warnings: BulkDataWarning[];
}

export interface BulkDataError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface BulkDataWarning {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface BulkBatchProgress {
  batchId: string;
  status: BulkBatchStatus;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  progressPercentage: number;
  estimatedCompletionTime?: string;
  currentItem?: string;
  errorLog?: any;
}

export interface BulkProcessingResult {
  batchId: string;
  success: boolean;
  totalProcessed: number;
  successfullyCreated: number;
  failed: number;
  errors: BulkDataError[];
}

export interface BulkItemStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  skipped: number;
}

export interface BulkStats {
  totalBatches: number;
  completedBatches: number;
  processingBatches: number;
  failedBatches: number;
  totalQRCodes: number;
  avgBatchSize: number;
  successRate: number;
}

// Enums
export type BulkTemplateType = 
  | 'url_list' 
  | 'vcard_bulk' 
  | 'product_bulk' 
  | 'event_tickets' 
  | 'wifi_bulk' 
  | 'csv_mapping'
  | 'custom';

export type BulkBatchStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type BulkItemStatus = 
  | 'pending' 
  | 'processing' 
  | 'success' 
  | 'failed' 
  | 'skipped';

export interface IQRContentRulesService {
  createContentRule(qrCodeId: string, ruleData: CreateContentRuleRequest): Promise<ServiceResponse<ContentRule>>;
  getQRContentRules(qrCodeId: string): Promise<ServiceResponse<ContentRule[]>>;
  updateContentRule(ruleId: string, ruleData: Partial<CreateContentRuleRequest>): Promise<ServiceResponse<ContentRule>>;
  deleteContentRule(ruleId: string): Promise<ServiceResponse<boolean>>;
  resolveQRContent(qrCodeId: string, context: ScanContext): Promise<ServiceResponse<any>>;
}

export interface IDynamicQRService {
  // Content Version Management
  createContentVersion(qrCodeId: string, versionData: any): Promise<ServiceResponse<any>>;
  getContentVersions(qrCodeId: string): Promise<ServiceResponse<any[]>>;
  getActiveContentVersion(qrCodeId: string): Promise<ServiceResponse<any>>;
  updateContentVersion(versionId: string, updateData: any): Promise<ServiceResponse<any>>;
  activateContentVersion(versionId: string): Promise<ServiceResponse<any>>;
  deactivateContentVersion(versionId: string): Promise<ServiceResponse<any>>;
  deleteContentVersion(versionId: string): Promise<ServiceResponse<boolean>>;
  
  // A/B Testing
  createABTest(qrCodeId: string, testData: any): Promise<ServiceResponse<any>>;
  getABTests(qrCodeId: string): Promise<ServiceResponse<any[]>>;
  updateABTest(testId: string, updateData: any): Promise<ServiceResponse<any>>;
  startABTest(testId: string): Promise<ServiceResponse<any>>;
  pauseABTest(testId: string): Promise<ServiceResponse<any>>;
  completeABTest(testId: string, winnerVariant?: string): Promise<ServiceResponse<any>>;
  deleteABTest(testId: string): Promise<ServiceResponse<boolean>>;
  
  // Redirect Rules
  createRedirectRule(qrCodeId: string, ruleData: any): Promise<ServiceResponse<any>>;
  getRedirectRules(qrCodeId: string): Promise<ServiceResponse<any[]>>;
  updateRedirectRule(ruleId: string, updateData: any): Promise<ServiceResponse<any>>;
  deleteRedirectRule(ruleId: string): Promise<ServiceResponse<boolean>>;
  
  // Content Scheduling
  createContentSchedule(qrCodeId: string, scheduleData: any): Promise<ServiceResponse<any>>;
  getContentSchedules(qrCodeId: string): Promise<ServiceResponse<any[]>>;
  updateContentSchedule(scheduleId: string, updateData: any): Promise<ServiceResponse<any>>;
  deleteContentSchedule(scheduleId: string): Promise<ServiceResponse<boolean>>;
  
  // Analytics & Resolution
  getDynamicQRStats(qrCodeId: string): Promise<ServiceResponse<any>>;
  resolveRedirect(qrCodeId: string, context: any): Promise<ServiceResponse<string>>;
}

export interface ContentRule {
  id: string;
  qr_code_id: string;
  rule_name: string;
  rule_type: 'time' | 'location' | 'language' | 'device';
  rule_data: any;
  content_type: 'url' | 'text' | 'landing_page';
  content_value: string;
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContentRuleRequest {
  rule_name: string;
  rule_type: 'time' | 'location' | 'language' | 'device';
  rule_data: any;
  content_type: 'url' | 'text' | 'landing_page';
  content_value: string;
  priority?: number;
  is_active?: boolean;
}

export interface ScanContext {
  timestamp: Date;
  timezone: string;
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates?: { lat: number; lng: number; };
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    screen_size: { width: number; height: number; };
  };
  language: {
    browser_languages: string[];
    detected_language: string;
  };
  ip_address: string;
  user_agent: string;
}

// CSV Processing Interface
export interface ICsvProcessor {
  parse(csvData: string): Promise<any[]>;
  validate(data: any[], template?: BulkQRTemplate): Promise<BulkValidationResult>;
  mapFields(data: any[], fieldMappings: Record<string, string>): any[];
  applyDefaults(data: any[], defaultValues: Record<string, any>): any[];
}

// ===============================================
// REPOSITORY INTERFACES - Missing Implementations
// ===============================================

// Template Repository Interface
export interface IQRTemplateRepository {
  findAll(): Promise<QRTemplate[]>;
  findById(id: string): Promise<QRTemplate | null>;
  findByCategory(category: QRTemplateCategory): Promise<QRTemplate[]>;
  findBySubscriptionTier(tier: SubscriptionTier): Promise<QRTemplate[]>;
  findPopular(): Promise<QRTemplate[]>;
  create(templateData: Partial<QRTemplate>): Promise<QRTemplate>;
  update(id: string, templateData: Partial<QRTemplate>): Promise<QRTemplate>;
  delete(id: string): Promise<boolean>;
}

// Content Rules Repository Interface  
export interface IQRContentRulesRepository {
  create(ruleData: any): Promise<ContentRule>;
  findById(id: string): Promise<ContentRule | null>;
  findByQRCodeId(qrCodeId: string): Promise<ContentRule[]>;
  update(id: string, ruleData: any): Promise<ContentRule>;
  delete(id: string): Promise<boolean>;
  findActiveRulesByQRCodeId(qrCodeId: string): Promise<ContentRule[]>;
  findRulesByPriority(qrCodeId: string, ascending?: boolean): Promise<ContentRule[]>;
}