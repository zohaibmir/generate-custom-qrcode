import { 
  FileUpload,
  FileEntity,
  FileInfo,
  FileUploadRequest,
  UploadFileRequest,
  GetFileRequest,
  DeleteFileRequest,
  ListFilesRequest,
  IFileService,
  IFileRepository,
  IStorageProvider,
  IFileValidator,
  ILogger,
  ServiceResponse,
  FileServiceResponse,
  ValidationError,
  NotFoundError,
  StorageError,
  AppError,
  FileTooLargeError,
  UnsupportedFileTypeError
} from '../interfaces';

export class FileService implements IFileService {
  constructor(
    private fileRepository: IFileRepository,
    private storageProvider: IStorageProvider,
    private fileValidator: IFileValidator,
    private logger: ILogger
  ) {}

  async uploadFile(request: FileUploadRequest): Promise<FileServiceResponse<FileInfo>> {
    try {
      this.logger.info('Upload file requested', { userId: request.userId });

      if (!request.originalName || !request.userId || !request.buffer) {
        throw new ValidationError('File data and user ID are required');
      }

      const validationResult = await this.fileValidator.validateFile({
        mimeType: request.mimeType,
        size: request.size,
        filename: request.originalName
      });

      if (!validationResult.isValid) {
        throw new ValidationError(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(request.originalName);
      const filename = `${request.userId}_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;

      this.logger.info('Uploading file to storage', {
        userId: request.userId,
        filename,
        originalName: request.originalName
      });

      const uploadResult = await this.storageProvider.uploadFile(
        filename,
        request.buffer,
        {
          mimeType: request.mimeType,
          originalName: request.originalName,
          size: request.size
        }
      );

      const fileUpload = await this.fileRepository.create({
        userId: request.userId,
        filename,
        originalName: request.originalName,
        mimeType: request.mimeType,
        fileSize: request.size,
        filePath: uploadResult.path,
        uploadType: 'general'
      });

      const fileInfo: FileInfo = {
        id: fileUpload.id,
        filename: fileUpload.filename,
        originalName: fileUpload.originalName,
        mimeType: fileUpload.mimeType,
        fileSize: fileUpload.fileSize,
        url: uploadResult.url,
        uploadType: fileUpload.uploadType,
        createdAt: fileUpload.createdAt
      };

      this.logger.info('File uploaded successfully', {
        fileId: fileInfo.id,
        userId: request.userId,
        filename: fileInfo.filename,
        size: fileInfo.fileSize,
        mimeType: fileInfo.mimeType
      });

      return {
        success: true,
        data: fileInfo,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: Date.now().toString()
        }
      };

    } catch (error) {
      this.logger.error('File upload failed', {
        error,
        userId: request.userId,
        filename: request.originalName
      });

      if (error instanceof ValidationError || error instanceof StorageError) {
        throw error;
      }

      throw new StorageError('File upload failed');
    }
  }

  async getFile(request: GetFileRequest): Promise<FileServiceResponse<FileInfo>> {
    try {
      if (!request.fileId) {
        throw new ValidationError('File ID is required');
      }

      const fileUpload = await this.fileRepository.findById(request.fileId);
      if (!fileUpload) {
        throw new NotFoundError('File not found');
      }

      // Check ownership if userId is provided
      if (request.userId && fileUpload.userId !== request.userId) {
        throw new NotFoundError('File not found or access denied');
      }

      const fileInfo: FileInfo = {
        id: fileUpload.id,
        filename: fileUpload.filename,
        originalName: fileUpload.originalName,
        mimeType: fileUpload.mimeType,
        fileSize: fileUpload.fileSize,
        url: this.storageProvider.getFileUrl(this.getStorageKeyFromPath(fileUpload.filePath)),
        uploadType: fileUpload.uploadType,
        createdAt: fileUpload.createdAt
      };

      this.logger.debug('File info retrieved', {
        fileId: request.fileId,
        userId: fileUpload.userId
      });

      return {
        success: true,
        data: fileInfo,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to get file info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: request.fileId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'FILE_GET_FAILED',
          message: 'Failed to get file information',
          statusCode: 500
        }
      };
    }
  }

  async getFileById(fileId: string, userId?: string): Promise<FileEntity> {
    try {
      const file = await this.fileRepository.findById(fileId);
      
      if (!file) {
        throw new NotFoundError('File not found');
      }

      if (userId && file.userId !== userId) {
        throw new NotFoundError('File not found');
      }

      return {
        id: file.id,
        userId: file.userId,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.fileSize,
        filePath: file.filePath,
        uploadedAt: file.createdAt
      };

    } catch (error) {
      this.logger.error('Get file by ID failed', { error, fileId, userId });
      throw error;
    }
  }

  async downloadFile(fileId: string, userId?: string): Promise<FileServiceResponse<{ buffer: Buffer; mimeType: string; filename: string; size: number; stream: any }>> {
    try {
      if (!fileId) {
        throw new ValidationError('File ID is required');
      }

      const fileUpload = await this.fileRepository.findById(fileId);
      if (!fileUpload) {
        throw new NotFoundError('File not found');
      }

      // Check ownership if userId is provided
      if (userId && fileUpload.userId !== userId) {
        throw new NotFoundError('File not found or access denied');
      }

      // Download from storage
      const storageKey = this.getStorageKeyFromPath(fileUpload.filePath);
      const buffer = await this.storageProvider.downloadFile(storageKey);

      this.logger.info('File downloaded', {
        fileId,
        userId: fileUpload.userId,
        filename: fileUpload.filename,
        size: buffer.length
      });

      const fs = require('fs');
      const stream = fs.createReadStream(fileUpload.filePath);

      return {
        success: true,
        data: {
          buffer,
          mimeType: fileUpload.mimeType,
          filename: fileUpload.originalName,
          size: fileUpload.fileSize,
          stream: stream
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to download file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'FILE_DOWNLOAD_FAILED',
          message: 'Failed to download file',
          statusCode: 500
        }
      };
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      this.logger.info('File deletion requested', { fileId, userId });

      if (!fileId || !userId) {
        throw new ValidationError('File ID and user ID are required');
      }

      const fileUpload = await this.fileRepository.findById(fileId);

      if (!fileUpload) {
        throw new NotFoundError('File not found');
      }

      if (fileUpload.userId !== userId) {
        throw new NotFoundError('File not found');
      }

      // Delete from storage
      const storageKey = `${fileUpload.userId}/${fileUpload.filename}`;
      await this.storageProvider.deleteFile(storageKey);

      // Delete from database
      const deleted = await this.fileRepository.delete(fileId);

      if (!deleted) {
        throw new StorageError('Failed to delete file record');
      }

      this.logger.info('File deleted successfully', {
        fileId,
        userId,
        filename: fileUpload.filename
      });

    } catch (error) {
      this.logger.error('Failed to delete file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
        userId
      });

      throw error;
    }
  }

  async listUserFiles(userId: string, page: number = 1, limit: number = 10): Promise<FileServiceResponse<{
    files: FileInfo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>> {
    try {
      this.logger.info('List user files requested', { userId, page, limit });

      const offset = (page - 1) * limit;
      const result = await this.fileRepository.findByUserId(userId, {
        limit,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      const fileInfos: FileInfo[] = result.files.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        url: this.storageProvider.getFileUrl(`${file.userId}/${file.filename}`),
        uploadType: file.uploadType,
        createdAt: file.createdAt
      }));

      const totalPages = Math.ceil(result.total / limit);

      return {
        success: true,
        data: {
          files: fileInfos,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: Date.now().toString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to list user files', { error, userId });
      throw error;
    }
  }

  async generatePresignedUrl(fileId: string, userId: string, operation: string = 'download', expiresIn: number = 3600): Promise<FileServiceResponse<{ url: string; expiresAt: string }>> {
    try {
      this.logger.info('Generate presigned URL requested', { fileId, userId, operation });

      const file = await this.fileRepository.findById(fileId);
      
      if (!file) {
        throw new NotFoundError('File not found');
      }

      if (file.userId !== userId) {
        throw new NotFoundError('File not found');
      }

      const storageKey = `${file.userId}/${file.filename}`;
      const presignedUrl = await this.storageProvider.generatePresignedUrl(
        storageKey,
        operation === 'download' ? 'get' : 'put',
        expiresIn
      );

      const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

      return {
        success: true,
        data: {
          url: presignedUrl,
          expiresAt
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: Date.now().toString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate presigned URL', { error, fileId, userId });
      throw error;
    }
  }

  async listFiles(request: ListFilesRequest): Promise<FileServiceResponse<{
    files: FileInfo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>> {
    try {
      if (!request.userId) {
        throw new ValidationError('User ID is required');
      }

      const page = request.page || 1;
      const limit = Math.min(request.limit || 20, 100);
      const offset = (page - 1) * limit;

      const result = await this.fileRepository.findByUserId(request.userId, {
        uploadType: request.uploadType,
        mimeTypes: request.mimeTypes,
        limit,
        offset,
        sortBy: request.sortBy || 'created_at',
        sortOrder: request.sortOrder || 'desc'
      });

      const files: FileInfo[] = result.files.map(fileUpload => ({
        id: fileUpload.id,
        filename: fileUpload.filename,
        originalName: fileUpload.originalName,
        mimeType: fileUpload.mimeType,
        fileSize: fileUpload.fileSize,
        url: this.storageProvider.getFileUrl(this.getStorageKeyFromPath(fileUpload.filePath)),
        uploadType: fileUpload.uploadType,
        createdAt: fileUpload.createdAt
      }));

      const totalPages = Math.ceil(result.total / limit);

      this.logger.debug('Files listed', {
        userId: request.userId,
        fileCount: files.length,
        total: result.total,
        page,
        limit
      });

      return {
        success: true,
        data: {
          files,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to list files', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'FILE_LIST_FAILED',
          message: 'Failed to list files',
          statusCode: 500
        }
      };
    }
  }

  async getStorageStats(userId: string): Promise<FileServiceResponse<{
    totalFiles: number;
    totalSize: number;
    usedStorageFormatted: string;
    byType: Record<string, { count: number; size: number; sizeFormatted: string }>;
  }>> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const stats = await this.fileRepository.getStorageStats(userId);

      const byType: Record<string, { count: number; size: number; sizeFormatted: string }> = {};
      Object.entries(stats.byType).forEach(([type, data]) => {
        byType[type] = {
          count: data.count,
          size: data.size,
          sizeFormatted: this.formatBytes(data.size)
        };
      });

      const result = {
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        usedStorageFormatted: this.formatBytes(stats.totalSize),
        byType
      };

      this.logger.debug('Storage stats retrieved', {
        userId,
        totalFiles: stats.totalFiles,
        totalSize: result.usedStorageFormatted
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to get storage stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'STORAGE_STATS_FAILED',
          message: 'Failed to get storage statistics',
          statusCode: 500
        }
      };
    }
  }

  async generateUploadUrl(userId: string, filename: string, mimeType: string): Promise<FileServiceResponse<{ uploadUrl: string; fileKey: string }>> {
    try {
      if (!userId || !filename || !mimeType) {
        throw new ValidationError('User ID, filename, and MIME type are required');
      }

      // Validate file type
      if (!this.fileValidator.validateMimeType(mimeType)) {
        throw new UnsupportedFileTypeError(mimeType);
      }

      // Generate storage key
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = this.getFileExtension(filename);
      const uniqueFilename = `${timestamp}_${randomString}${fileExtension ? '.' + fileExtension : ''}`;
      
      const dateFolder = new Date().toISOString().split('T')[0];
      const fileKey = `${userId}/${dateFolder}/${uniqueFilename}`;

      // Generate presigned URL
      const uploadUrl = await this.storageProvider.generatePresignedUrl(fileKey, 'put', 3600);

      this.logger.info('Upload URL generated', {
        userId,
        filename,
        mimeType,
        fileKey
      });

      return {
        success: true,
        data: {
          uploadUrl,
          fileKey
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate upload URL', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        filename
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'UPLOAD_URL_FAILED',
          message: 'Failed to generate upload URL',
          statusCode: 500
        }
      };
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  private getStorageKeyFromPath(filePath: string): string {
    // Extract storage key from file path
    // This assumes the file path contains the storage key
    const pathParts = filePath.split('/');
    if (pathParts.length >= 3) {
      return pathParts.slice(-3).join('/'); // userId/date/filename
    }
    return pathParts[pathParts.length - 1]; // fallback to just filename
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}