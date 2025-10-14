// Clean Architecture Interfaces for User Service
// Following SOLID principles with proper abstraction layers

// Import shared types (only essential ones to avoid conflicts)
import { ServiceResponse as SharedServiceResponse, AppError, ValidationError } from '@qr-saas/shared';

// Re-export for consistency
export type ServiceResponse<T = any> = SharedServiceResponse<T>;
export { AppError, ValidationError };

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
  fullName?: string;
  subscription: 'free' | 'premium' | 'enterprise';
  isEmailVerified: boolean;
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
  subscription?: 'free' | 'premium' | 'enterprise';
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
  expiresIn: number;
}

export interface AuthUser {
  user: User;
  tokens: AuthTokens;
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
}

export interface IAuthService {
  login(credentials: LoginRequest): Promise<ServiceResponse<AuthUser>>;
  register(userData: CreateUserRequest): Promise<ServiceResponse<AuthUser>>;
  refreshToken(refreshToken: string): Promise<ServiceResponse<AuthTokens>>;
  logout(userId: string, refreshToken: string): Promise<ServiceResponse<void>>;
  forgotPassword(email: string): Promise<ServiceResponse<void>>;
  resetPassword(token: string, newPassword: string): Promise<ServiceResponse<void>>;
  verifyEmailToken(token: string): Promise<ServiceResponse<User>>;
}

// Repository interfaces (Data access layer)
export interface IUserRepository {
  create(userData: any): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  update(id: string, updates: any): Promise<User>;
  delete(id: string): Promise<void>;
  findMany(options: PaginationOptions): Promise<{ users: User[]; total: number }>;
  findByEmailVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
}

export interface ITokenRepository {
  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  validateRefreshToken(token: string): Promise<{ userId: string; isValid: boolean }>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  saveEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  savePasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
}

// Utility interfaces
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface ITokenGenerator {
  generateAccessToken(user: User): string;
  generateRefreshToken(): string;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  verifyAccessToken(token: string): { userId: string; isValid: boolean };
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

// Type guards
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
};

export const isServiceResponse = <T>(obj: any): obj is ServiceResponse<T> => {
  return obj && typeof obj.success === 'boolean';
};