// Clean Architecture Interfaces for User Service
// Following SOLID principles with proper abstraction layers

// Import shared types (only essential ones to avoid conflicts)
import { ServiceResponse as SharedServiceResponse, AppError, ValidationError, NotFoundError, ConflictError } from '@qr-saas/shared';

// Re-export for consistency
export type ServiceResponse<T = any> = SharedServiceResponse<T>;
export { AppError, ValidationError, NotFoundError, ConflictError };

// Basic interfaces needed by user service
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Domain models
export interface User {
  id: string;
  email: string;
  username: string;
  password?: string; // Optional for responses, required for creation
  fullName?: string;
  subscription: 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
  isEmailVerified: boolean;
  isActive: boolean; // Added for auth service
  avatar?: string;
  preferences?: UserPreferences;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy?: {
    profileVisibility: 'public' | 'private';
    allowAnalytics: boolean;
  };
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  fullName?: string;
  subscription?: 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  fullName?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: number; // Added for auth service
  expiresIn: number;
}

export interface AuthUser {
  user: User;
  tokens: AuthTokens;
}

// Subscription domain models
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  qrLimit: number | null; // null means unlimited
  analyticsRetentionDays: number;
  features: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
  plan?: SubscriptionPlan; // For joined queries
}

export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  status?: 'active' | 'cancelled' | 'expired' | 'pending';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionUsage {
  qrCodesUsed: number;
  qrCodesLimit: number | null;
  analyticsRetentionDays: number;
  features: Record<string, any>;
}

// Service interfaces (Business logic layer)
export interface IUserService {
  createUser(userData: CreateUserRequest): Promise<ServiceResponse<User>>;
  getUserById(id: string): Promise<ServiceResponse<User>>;
  getUserByEmail(email: string): Promise<ServiceResponse<User>>;
  getUserByUsername(username: string): Promise<ServiceResponse<User>>;
  updateUser(id: string, updates: UpdateUserRequest): Promise<ServiceResponse<User>>;
  deleteUser(id: string): Promise<ServiceResponse<void>>;
  getUsers(pagination: PaginationOptions): Promise<ServiceResponse<User[]>>;
  verifyEmail(userId: string, token: string): Promise<ServiceResponse<void>>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<ServiceResponse<void>>;
  
  // Subscription management
  getUserSubscription(userId: string): Promise<ServiceResponse<UserSubscription>>;
  upgradeSubscription(userId: string, planId: string): Promise<ServiceResponse<UserSubscription>>;
  downgradeSubscription(userId: string, planId: string): Promise<ServiceResponse<UserSubscription>>;
  cancelSubscription(userId: string, cancelAtPeriodEnd?: boolean): Promise<ServiceResponse<UserSubscription>>;
  renewSubscription(userId: string): Promise<ServiceResponse<UserSubscription>>;
  getSubscriptionUsage(userId: string): Promise<ServiceResponse<SubscriptionUsage>>;
}

export interface ISubscriptionService {
  createSubscription(request: CreateSubscriptionRequest): Promise<ServiceResponse<UserSubscription>>;
  getSubscriptionByUserId(userId: string): Promise<ServiceResponse<UserSubscription>>;
  updateSubscription(subscriptionId: string, updates: UpdateSubscriptionRequest): Promise<ServiceResponse<UserSubscription>>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<ServiceResponse<UserSubscription>>;
  getSubscriptionPlans(): Promise<ServiceResponse<SubscriptionPlan[]>>;
  getSubscriptionPlan(planId: string): Promise<ServiceResponse<SubscriptionPlan>>;
  validatePlanUpgrade(currentPlanId: string, newPlanId: string): Promise<ServiceResponse<boolean>>;
  calculateProration(userId: string, newPlanId: string): Promise<ServiceResponse<{ amount: number; currency: string }>>;
  getSubscriptionUsage(userId: string): Promise<ServiceResponse<SubscriptionUsage>>;
}



// Repository interfaces (Data access layer)
export interface IUserRepository {
  create(userData: any): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<(User & { password: string }) | null>;
  findByUsername(username: string): Promise<User | null>;
  update(id: string, updates: any): Promise<User>;
  delete(id: string): Promise<void>;
  findMany(options: PaginationOptions): Promise<{ users: User[]; total: number }>;
  findByEmailVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
}



export interface ISubscriptionRepository {
  // Subscription Plans
  getPlans(): Promise<SubscriptionPlan[]>;
  getPlanById(planId: string): Promise<SubscriptionPlan | null>;
  getPlanByName(name: string): Promise<SubscriptionPlan | null>;
  
  // User Subscriptions
  create(subscription: CreateSubscriptionRequest): Promise<UserSubscription>;
  findByUserId(userId: string): Promise<UserSubscription | null>;
  findById(subscriptionId: string): Promise<UserSubscription | null>;
  update(subscriptionId: string, updates: UpdateSubscriptionRequest): Promise<UserSubscription>;
  delete(subscriptionId: string): Promise<void>;
  
  // Subscription analytics
  findExpiredSubscriptions(): Promise<UserSubscription[]>;
  findSubscriptionsByPlan(planId: string): Promise<UserSubscription[]>;
  getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    cancelled: number;
    expired: number;
    byPlan: Record<string, number>;
  }>;
}

// Utility interfaces
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}



export interface IEmailService {
  sendVerificationEmail(user: User, token: string): Promise<void>;
  sendPasswordResetEmail(user: User, token: string): Promise<void>;
  sendWelcomeEmail(user: User): Promise<void>;
}

// Infrastructure interfaces
export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDependencyContainer {
  register<T>(token: string, instance: T): void;
  resolve<T>(token: string): T;
  getRegisteredTokens(): string[];
}

export interface IHealthChecker {
  checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    service: string;
    timestamp: string;
    dependencies: Record<string, any>;
  }>;
}

// Additional error classes specific to user service
export class DatabaseError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 500, 'DATABASE_ERROR', true);
  }
}

//Payment Integration Exports
export * from './payment.interface';

// Type guards
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
};

export const isServiceResponse = <T>(obj: any): obj is ServiceResponse<T> => {
  return obj && typeof obj.success === 'boolean';
};