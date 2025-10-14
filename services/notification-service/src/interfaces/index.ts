// Import shared types
import { ServiceResponse } from '@qr-saas/shared';

// Re-export shared types for local use
export { ServiceResponse };

// Notification Domain Types
export interface EmailMessage {
  id: string;
  to: string;
  from?: string;
  subject: string;
  body?: string;
  template?: string;
  templateData?: any;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SMSMessage {
  id: string;
  to: string;
  from?: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Request/Response Types
export interface EmailRequest {
  to: string;
  from?: string;
  subject: string;
  body?: string;
  template?: string;
  templateData?: Record<string, any>;
}

export interface SMSRequest {
  to: string;
  from?: string;
  message: string;
}

export interface NotificationResponse {
  messageId: string;
  status: 'sent' | 'queued';
  sentAt: Date;
}

export interface NotificationStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

// Repository Interfaces
export interface INotificationRepository {
  saveEmail(email: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailMessage>;
  saveSMS(sms: Omit<SMSMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<SMSMessage>;
  findEmailById(id: string): Promise<EmailMessage | null>;
  findSMSById(id: string): Promise<SMSMessage | null>;
  updateEmailStatus(id: string, status: EmailMessage['status'], deliveredAt?: Date): Promise<void>;
  updateSMSStatus(id: string, status: SMSMessage['status'], deliveredAt?: Date): Promise<void>;
  getNotificationsByUserId(userId: string, type?: 'email' | 'sms'): Promise<(EmailMessage | SMSMessage)[]>;
}

export interface ITemplateRepository {
  create(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate>;
  findById(id: string): Promise<NotificationTemplate | null>;
  findByName(name: string): Promise<NotificationTemplate | null>;
  findByType(type: 'email' | 'sms'): Promise<NotificationTemplate[]>;
  update(id: string, template: Partial<NotificationTemplate>): Promise<NotificationTemplate | null>;
  delete(id: string): Promise<boolean>;
}

// Service Interfaces
export interface IEmailProvider {
  sendEmail(email: EmailRequest): Promise<{ messageId: string; status: string }>;
  getEmailStatus(messageId: string): Promise<{ status: string; deliveredAt?: Date }>;
}

export interface ISMSProvider {
  sendSMS(sms: SMSRequest): Promise<{ messageId: string; status: string }>;
  getSMSStatus(messageId: string): Promise<{ status: string; deliveredAt?: Date }>;
}

export interface ITemplateService {
  renderTemplate(templateName: string, data: Record<string, any>): Promise<{ subject?: string; body: string }>;
  validateTemplate(template: string, variables: string[]): Promise<{ isValid: boolean; errors: string[] }>;
}

export interface INotificationService {
  sendEmail(request: EmailRequest): Promise<ServiceResponse<NotificationResponse>>;
  sendSMS(request: SMSRequest): Promise<ServiceResponse<NotificationResponse>>;
  getNotificationStatus(messageId: string): Promise<ServiceResponse<NotificationStatus>>;
  getUserNotifications(userId: string, type?: 'email' | 'sms'): Promise<ServiceResponse<(EmailMessage | SMSMessage)[]>>;
}

// Provider Interfaces
export interface INotificationProvider {
  sendEmail(email: EmailRequest): Promise<{ messageId: string; status: string }>;
  sendSMS(sms: SMSRequest): Promise<{ messageId: string; status: string }>;
  getMessageStatus(messageId: string, type: 'email' | 'sms'): Promise<{ status: string; deliveredAt?: Date }>;
}

// Infrastructure Interfaces
export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDependencyContainer {
  register<T>(token: string, instance: T | (() => T)): void;
  resolve<T>(token: string): T;
  getRegisteredTokens(): string[];
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
}

// Health Status interface
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  dependencies?: Record<string, any>;
}

// Error Classes
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class NotificationError extends AppError {
  constructor(message: string, details?: any) {
    super('NOTIFICATION_ERROR', message, 500, details);
    this.name = 'NotificationError';
  }
}

export class TemplateError extends AppError {
  constructor(message: string, details?: any) {
    super('TEMPLATE_ERROR', message, 400, details);
    this.name = 'TemplateError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}