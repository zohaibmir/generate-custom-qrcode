// Import shared types
import { 
  FileEntity,
  FileUpload,
  FileMetadata,
  FileUploadRequest,
  FileInfo,
  FileListRequest,
  FileListResponse,
  FileDownloadResponse,
  FileStorageStats,
  PresignedUrlResponse,
  ValidationResult,
  ServiceResponse
} from '@qr-saas/shared';

// Re-export shared types for local use
export {
  FileEntity,
  FileUpload,
  FileMetadata,
  FileUploadRequest,
  FileInfo,
  FileListRequest,
  FileListResponse,
  FileDownloadResponse,
  FileStorageStats,
  PresignedUrlResponse,
  ValidationResult,
  ServiceResponse
};

// Extended ServiceResponse with metadata for file operations
export interface FileServiceResponse<T = any> extends ServiceResponse<T> {
  metadata?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

// Additional local request types
export interface UploadFileRequest {
  file: {
    filename: string;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
    size: number;
  };
  userId: string;
  uploadType?: string;
  metadata?: FileMetadata;
}

export interface GetFileRequest {
  fileId: string;
  userId?: string;
  includeMetadata?: boolean;
}

export interface ListFilesRequest {
  userId: string;
  uploadType?: string;
  mimeTypes?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeleteFileRequest {
  fileId: string;
  userId: string;
}

// Repository Interfaces
export interface IFileRepository {
  create(fileUpload: Omit<FileUpload, 'id' | 'createdAt' | 'updatedAt'>): Promise<FileUpload>;
  findById(id: string): Promise<FileUpload | null>;
  findByUserId(userId: string, options?: {
    uploadType?: string;
    mimeTypes?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ files: FileUpload[]; total: number }>;
  update(id: string, updates: Partial<FileUpload>): Promise<FileUpload | null>;
  delete(id: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  getStorageStats(userId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  }>;
}

// Storage Provider Interfaces
export interface IStorageProvider {
  uploadFile(key: string, buffer: Buffer, metadata: {
    mimeType: string;
    originalName: string;
    size: number;
  }): Promise<{ url: string; path: string }>;
  
  downloadFile(key: string): Promise<Buffer>;
  
  deleteFile(key: string): Promise<boolean>;
  
  getFileUrl(key: string): string;
  
  generatePresignedUrl(key: string, operation: 'get' | 'put', expiresIn?: number): Promise<string>;
}

// Service Interfaces
export interface IFileService {
  uploadFile(request: FileUploadRequest): Promise<FileServiceResponse<FileInfo>>;
  getFileById(fileId: string, userId?: string): Promise<FileEntity>;
  downloadFile(fileId: string, userId?: string): Promise<FileServiceResponse<{ buffer: Buffer; mimeType: string; filename: string; size: number; stream: any }>>;
  deleteFile(fileId: string, userId: string): Promise<void>;
  listUserFiles(userId: string, page?: number, limit?: number): Promise<FileServiceResponse<{
    files: FileInfo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>>;
  getStorageStats(userId: string): Promise<FileServiceResponse<{
    totalFiles: number;
    totalSize: number;
    usedStorageFormatted: string;
    byType: Record<string, { count: number; size: number; sizeFormatted: string }>;
  }>>;
  generatePresignedUrl(fileId: string, userId: string, operation?: string, expiresIn?: number): Promise<FileServiceResponse<{ url: string; expiresAt: string }>>;
}

// Utility Interfaces
export interface IFileValidator {
  validateFile(file: { mimeType: string; size: number; filename: string }): Promise<ValidationResult>;
  validateMimeType(mimeType: string): boolean;
  validateFileSize(size: number, mimeType: string): boolean;
  validateFilename(filename: string): boolean;
}

export interface IFileProcessor {
  processImage(buffer: Buffer, options?: {
    resize?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' };
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
  }): Promise<{ buffer: Buffer; metadata: FileMetadata }>;
  
  extractMetadata(buffer: Buffer, mimeType: string): Promise<FileMetadata>;
  
  generateThumbnail(buffer: Buffer, mimeType: string, size?: number): Promise<Buffer>;
}

// Infrastructure Interfaces
export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDependencyContainer {
  register<T>(token: string, instance: T): void;
  resolve<T>(token: string): T;
  getRegisteredTokens(): string[];
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
}

// Health Status interface (local specific)
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

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: any) {
    super('STORAGE_ERROR', message, 500, details);
    this.name = 'StorageError';
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxSize: number) {
    super('FILE_TOO_LARGE', `File size exceeds maximum allowed size of ${maxSize} bytes`, 413);
    this.name = 'FileTooLargeError';
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(mimeType: string) {
    super('UNSUPPORTED_FILE_TYPE', `File type '${mimeType}' is not supported`, 415);
    this.name = 'UnsupportedFileTypeError';
  }
}