// File Domain Types
export interface FileUpload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadType: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileEntity {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
  uploadedAt: Date;
  updatedAt?: Date;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  colorSpace?: string;
  compression?: string;
}

// Request/Response Types
export interface FileUploadRequest {
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
  userId: string;
}

export interface FileInfo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  url: string;
  uploadType: string;
  metadata?: FileMetadata;
  createdAt: Date;
}

export interface FileListRequest {
  userId: string;
  uploadType?: string;
  mimeTypes?: string[];
  pagination?: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface FileListResponse {
  files: FileInfo[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FileDownloadResponse {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
  stream: any;
}

export interface FileStorageStats {
  totalFiles: number;
  totalSize: number;
  usedStorageFormatted: string;
  byType: Record<string, { count: number; size: number; sizeFormatted: string }>;
}

export interface PresignedUrlResponse {
  url: string;
  expiresAt: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// File Upload Configuration
export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  dangerousExtensions: string[];
  storagePath: string;
  urlPrefix: string;
}

// File Processing Options
export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill';
  };
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface FileProcessingResult {
  buffer: Buffer;
  metadata: FileMetadata;
}