import { 
  IFileValidator, 
  ValidationResult, 
  ILogger,
  UnsupportedFileTypeError,
  FileTooLargeError 
} from '../interfaces';

export class FileValidator implements IFileValidator {
  private readonly MAX_FILE_SIZES: Record<string, number> = {
    // Images (MB)
    'image/jpeg': 10 * 1024 * 1024,
    'image/png': 10 * 1024 * 1024,
    'image/gif': 5 * 1024 * 1024,
    'image/webp': 10 * 1024 * 1024,
    'image/svg+xml': 2 * 1024 * 1024,
    
    // Documents (MB)
    'application/pdf': 50 * 1024 * 1024,
    'application/msword': 25 * 1024 * 1024,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 25 * 1024 * 1024,
    'application/vnd.ms-excel': 25 * 1024 * 1024,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 25 * 1024 * 1024,
    
    // Text files
    'text/plain': 10 * 1024 * 1024,
    'text/csv': 10 * 1024 * 1024,
    'application/json': 10 * 1024 * 1024,
    
    // Archives
    'application/zip': 100 * 1024 * 1024,
    'application/x-rar-compressed': 100 * 1024 * 1024,
    'application/x-7z-compressed': 100 * 1024 * 1024,
    
    // Audio
    'audio/mpeg': 20 * 1024 * 1024,
    'audio/wav': 50 * 1024 * 1024,
    'audio/ogg': 20 * 1024 * 1024,
    
    // Video (limited support)
    'video/mp4': 200 * 1024 * 1024,
    'video/webm': 200 * 1024 * 1024,
    'video/quicktime': 200 * 1024 * 1024
  };

  private readonly ALLOWED_MIME_TYPES = new Set(Object.keys(this.MAX_FILE_SIZES));

  private readonly DANGEROUS_EXTENSIONS = new Set([
    'exe', 'scr', 'bat', 'cmd', 'com', 'pif', 'vbs', 'js', 'jar',
    'msi', 'dll', 'sh', 'ps1', 'php', 'asp', 'aspx', 'jsp'
  ]);

  constructor(private logger: ILogger) {}

  async validateFile(file: { mimeType: string; size: number; filename: string }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate MIME type
      if (!this.validateMimeType(file.mimeType)) {
        errors.push(`File type '${file.mimeType}' is not supported`);
      }

      // Validate file size
      if (!this.validateFileSize(file.size, file.mimeType)) {
        const maxSize = this.MAX_FILE_SIZES[file.mimeType];
        if (maxSize) {
          errors.push(`File size ${this.formatBytes(file.size)} exceeds maximum allowed size of ${this.formatBytes(maxSize)}`);
        } else {
          errors.push(`File size ${this.formatBytes(file.size)} is too large`);
        }
      }

      // Validate filename
      if (!this.validateFilename(file.filename)) {
        errors.push('Invalid filename. Filename contains prohibited characters or extensions');
      }

      // Additional validations
      this.validateFilenameSecurity(file.filename, warnings);
      this.validateFileTypeConsistency(file.filename, file.mimeType, warnings);

      const isValid = errors.length === 0;

      this.logger.debug('File validation completed', {
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length
      });

      return {
        isValid,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      this.logger.error('File validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: file.filename
      });

      return {
        isValid: false,
        errors: ['File validation failed due to internal error']
      };
    }
  }

  validateMimeType(mimeType: string): boolean {
    return this.ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
  }

  validateFileSize(size: number, mimeType: string): boolean {
    const maxSize = this.MAX_FILE_SIZES[mimeType.toLowerCase()];
    if (!maxSize) {
      return false; // Unknown MIME type
    }
    return size <= maxSize;
  }

  validateFilename(filename: string): boolean {
    // Check for null or empty filename
    if (!filename || filename.trim().length === 0) {
      return false;
    }

    // Check for maximum filename length
    if (filename.length > 255) {
      return false;
    }

    // Check for prohibited characters
    const prohibitedChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (prohibitedChars.test(filename)) {
      return false;
    }

    // Check for dangerous file extensions
    const extension = this.getFileExtension(filename);
    if (this.DANGEROUS_EXTENSIONS.has(extension)) {
      return false;
    }

    // Check for reserved Windows filenames
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(filename)) {
      return false;
    }

    // Check for files starting with dot (hidden files)
    if (filename.startsWith('.')) {
      return false;
    }

    return true;
  }

  private validateFilenameSecurity(filename: string, warnings: string[]): void {
    // Check for double extensions
    if (filename.split('.').length > 2) {
      warnings.push('File has multiple extensions, ensure this is intentional');
    }

    // Check for very long filenames
    if (filename.length > 100) {
      warnings.push('Filename is very long, consider using a shorter name');
    }

    // Check for special characters that might cause issues
    if (/[#%&{}\\$!'":@<>*?/+`|=]/.test(filename)) {
      warnings.push('Filename contains special characters that may cause compatibility issues');
    }
  }

  private validateFileTypeConsistency(filename: string, mimeType: string, warnings: string[]): void {
    const extension = this.getFileExtension(filename);
    const expectedMimeTypes = this.getExpectedMimeTypes(extension);

    if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(mimeType.toLowerCase())) {
      warnings.push(`File extension '${extension}' doesn't match MIME type '${mimeType}'`);
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  private getExpectedMimeTypes(extension: string): string[] {
    const mimeTypeMap: Record<string, string[]> = {
      'jpg': ['image/jpeg'],
      'jpeg': ['image/jpeg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'webp': ['image/webp'],
      'svg': ['image/svg+xml'],
      'pdf': ['application/pdf'],
      'doc': ['application/msword'],
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'xls': ['application/vnd.ms-excel'],
      'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'txt': ['text/plain'],
      'csv': ['text/csv'],
      'json': ['application/json'],
      'zip': ['application/zip'],
      'rar': ['application/x-rar-compressed'],
      '7z': ['application/x-7z-compressed'],
      'mp3': ['audio/mpeg'],
      'wav': ['audio/wav'],
      'ogg': ['audio/ogg'],
      'mp4': ['video/mp4'],
      'webm': ['video/webm'],
      'mov': ['video/quicktime']
    };

    return mimeTypeMap[extension] || [];
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Utility method to get max file size for a MIME type
  getMaxFileSize(mimeType: string): number {
    return this.MAX_FILE_SIZES[mimeType.toLowerCase()] || 0;
  }

  // Utility method to get all supported MIME types
  getSupportedMimeTypes(): string[] {
    return Array.from(this.ALLOWED_MIME_TYPES);
  }

  // Utility method to check if file type supports thumbnails
  supportsThumbnails(mimeType: string): boolean {
    return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
  }
}