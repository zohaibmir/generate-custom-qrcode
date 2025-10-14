import { IFileValidator, ValidationResult, ILogger } from '../interfaces';

export class FileValidator implements IFileValidator {
  private readonly allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/flac',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    
    // Video
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/ogg'
  ];

  private readonly maxFileSizes = {
    // Images: 10MB
    'image': 10 * 1024 * 1024,
    // Documents: 25MB  
    'application': 25 * 1024 * 1024,
    'text': 25 * 1024 * 1024,
    // Audio: 50MB
    'audio': 50 * 1024 * 1024,
    // Video: 100MB
    'video': 100 * 1024 * 1024,
    // Default: 10MB
    'default': 10 * 1024 * 1024
  };

  private readonly dangerousExtensions = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'app', 'deb', 'pkg', 'rpm', 'dmg', 'iso', 'msi', 'dll', 'sys',
    'ini', 'cfg', 'conf', 'reg', 'ps1', 'sh', 'bash', 'zsh'
  ];

  constructor(private logger: ILogger) {}

  async validateFile(file: { mimeType: string; size: number; filename: string }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate MIME type
      if (!this.validateMimeType(file.mimeType)) {
        errors.push(`Unsupported file type: ${file.mimeType}`);
      }

      // Validate file size
      if (!this.validateFileSize(file.size, file.mimeType)) {
        const maxSize = this.getMaxFileSize(file.mimeType);
        errors.push(`File size ${this.formatBytes(file.size)} exceeds maximum allowed size of ${this.formatBytes(maxSize)}`);
      }

      // Validate filename
      if (!this.validateFilename(file.filename)) {
        errors.push('Invalid filename. Filename contains illegal characters or dangerous extensions.');
      }

      // Security checks
      const securityCheck = this.performSecurityChecks(file);
      if (securityCheck.errors.length > 0) {
        errors.push(...securityCheck.errors);
      }
      if (securityCheck.warnings.length > 0) {
        warnings.push(...securityCheck.warnings);
      }

      const isValid = errors.length === 0;

      this.logger.info('File validation completed', {
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
      this.logger.error('File validation failed', { error, filename: file.filename });
      return {
        isValid: false,
        errors: ['File validation failed due to an internal error']
      };
    }
  }

  validateMimeType(mimeType: string): boolean {
    return this.allowedMimeTypes.includes(mimeType.toLowerCase());
  }

  validateFileSize(size: number, mimeType: string): boolean {
    const maxSize = this.getMaxFileSize(mimeType);
    return size <= maxSize;
  }

  validateFilename(filename: string): boolean {
    // Check for null or empty filename
    if (!filename || filename.trim().length === 0) {
      return false;
    }

    // Check filename length
    if (filename.length > 255) {
      return false;
    }

    // Check for illegal characters
    const illegalChars = /[<>:"|?*\x00-\x1f]/;
    if (illegalChars.test(filename)) {
      return false;
    }

    // Check for reserved Windows filenames
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(filename)) {
      return false;
    }

    // Check for dangerous extensions
    const extension = this.getFileExtension(filename).toLowerCase();
    if (this.dangerousExtensions.includes(extension)) {
      return false;
    }

    // Check for hidden files (starting with dot) - allow but warn
    if (filename.startsWith('.')) {
      return true; // Allow but will be flagged as warning in security checks
    }

    return true;
  }

  private performSecurityChecks(file: { mimeType: string; size: number; filename: string }): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for suspiciously large files
    if (file.size > 500 * 1024 * 1024) { // 500MB
      warnings.push('File is unusually large');
    }

    // Check for hidden files
    if (file.filename.startsWith('.')) {
      warnings.push('Hidden file detected');
    }

    // Check for multiple extensions (potential bypass attempt)
    const dots = (file.filename.match(/\./g) || []).length;
    if (dots > 1) {
      warnings.push('Multiple file extensions detected');
    }

    // Check for MIME type and extension mismatch
    const extension = this.getFileExtension(file.filename).toLowerCase();
    if (!this.isMimeTypeMatchingExtension(file.mimeType, extension)) {
      warnings.push('MIME type does not match file extension');
    }

    // Check for zero-byte files
    if (file.size === 0) {
      errors.push('Empty files are not allowed');
    }

    return { errors, warnings };
  }

  private getMaxFileSize(mimeType: string): number {
    const category = mimeType.split('/')[0];
    return this.maxFileSizes[category as keyof typeof this.maxFileSizes] || this.maxFileSizes.default;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot + 1) : '';
  }

  private isMimeTypeMatchingExtension(mimeType: string, extension: string): boolean {
    const mimeToExtension: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'image/svg+xml': ['svg'],
      'image/bmp': ['bmp'],
      'image/tiff': ['tiff', 'tif'],
      'application/pdf': ['pdf'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
      'application/vnd.ms-powerpoint': ['ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
      'text/plain': ['txt'],
      'text/csv': ['csv'],
      'application/zip': ['zip'],
      'audio/mpeg': ['mp3'],
      'audio/wav': ['wav'],
      'video/mp4': ['mp4'],
      'video/quicktime': ['mov']
    };

    const expectedExtensions = mimeToExtension[mimeType];
    return expectedExtensions ? expectedExtensions.includes(extension) : true;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}